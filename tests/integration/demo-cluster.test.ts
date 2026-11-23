// End-to-end checks of a running sk8r server against the demo cluster (scripts/demo-cluster.sh).
// Run with `npm run test:integration`, which starts both and sets the env vars below.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { navigationConfig } from '#lib/config/navigationConfig.js';
import { dashboardConfig } from '#lib/config/dashboardConfig.js';
import { resourceMetricsConfig } from '#lib/config/metricsConfig.js';

const BASE = process.env.SK8R_TEST_URL ?? 'http://127.0.0.1:4173';
const SERVER = process.env.SK8R_DEMO_SERVER ?? 'https://demo.localhost:16443';
const TOKEN = process.env.SK8R_DEMO_TOKEN ?? '';

const k8sHeaders = {
	Authorization: `Bearer ${TOKEN}`,
	'X-K8s-Server': SERVER,
	'X-K8s-Skip-TLS': 'true'
};

type Item = {
	metadata: { name: string; namespace?: string };
	status?: Record<string, unknown>;
	data?: Record<string, string>;
};

async function api(
	path: string,
	init: RequestInit = {},
	headers: Record<string, string> = k8sHeaders
) {
	const res = await fetch(BASE + path, {
		...init,
		headers: { 'Content-Type': 'application/json', ...headers, ...init.headers }
	});
	const text = await res.text();
	let body: unknown = text;
	try {
		body = JSON.parse(text);
	} catch {
		// logs come back as plain text
	}
	return { status: res.status, body: body as Record<string, unknown> & { items: Item[] } };
}

const list = async (type: string, namespace = '*') =>
	(await api(`/api/resources/list?type=${type}&namespace=${namespace}`)).body.items;

const podOf = async (app: string) =>
	(await list('pods', 'shop')).find(
		(p) => p.metadata.name.startsWith(`${app}-`) && p.status?.phase === 'Running'
	)!.metadata.name;

beforeAll(() => {
	if (!TOKEN) throw new Error('SK8R_DEMO_TOKEN is not set; run via `npm run test:integration`');
});

describe('cluster connection', () => {
	it('accepts the demo cluster and names it after the host', async () => {
		const { status, body } = await api(
			'/api/clusters/info',
			{
				method: 'POST',
				body: JSON.stringify({ server: SERVER, token: TOKEN, skipTLSVerify: true })
			},
			{}
		);
		expect(status).toBe(200);
		expect(body.name).toBe('demo.localhost');
	});

	it('rejects a bad token', async () => {
		const { status } = await api(
			'/api/clusters/info',
			{
				method: 'POST',
				body: JSON.stringify({ server: SERVER, token: 'nope', skipTLSVerify: true })
			},
			{}
		);
		expect(status).toBe(401);
	});

	it('requires credentials on resource routes', async () => {
		expect((await api('/api/namespaces', {}, {})).status).toBe(401);
	});
});

describe('resources', () => {
	it('lists the demo namespaces', async () => {
		const { body } = await api('/api/namespaces');
		expect(body.namespaces).toEqual(
			expect.arrayContaining(['shop', 'payments', 'data', 'monitoring'])
		);
	});

	it('shows three ready nodes', async () => {
		const nodes = await list('nodes');
		expect(nodes.map((n) => n.metadata.name).sort()).toEqual([
			'demo-control-plane',
			'demo-worker-1',
			'demo-worker-2'
		]);
	});

	it('reports dashboard stats', async () => {
		const { body } = await api('/api/dashboard/stats');
		expect(body.nodes).toEqual({ total: 3, ready: 3 });
		expect((body.namespaces as { total: number }).total).toBeGreaterThanOrEqual(7);
	});

	const types = navigationConfig.sections
		.flatMap((s) => s.items.map((i) => i.resourceType))
		.filter((t): t is string => !!t);

	// cert-manager isn't installed in the demo cluster; its views must still answer (empty list)
	it.each(types)('lists %s', async (type) => {
		const { status, body } = await api(`/api/resources/list?type=${type}&namespace=*`);
		expect(status, JSON.stringify(body)).toBe(200);
		expect(Array.isArray(body.items)).toBe(true);
	});

	it.each(['deployments', 'services', 'ingresses', 'ingressroutes', 'statefulsets', 'cronjobs'])(
		'finds the demo %s',
		async (type) => {
			expect((await list(type)).length).toBeGreaterThan(0);
		}
	);

	it('gets a single resource', async () => {
		const { status, body } = await api('/api/resources/deployments/storefront?namespace=shop');
		expect(status).toBe(200);
		expect(body.kind).toBe('Deployment');
	});

	it('searches resources by name', async () => {
		const { body } = await api('/api/search?q=store&type=deployments&namespace=*');
		expect(body.items.map((i) => i.metadata.name)).toEqual(['storefront']);
	});

	it('creates, updates and deletes a resource from YAML', async () => {
		const name = `sk8r-it-${Date.now()}`;
		const yaml = (v: string) =>
			`apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: ${name}\n  namespace: shop\ndata:\n  value: "${v}"\n`;

		const dry = await api('/api/resources', {
			method: 'POST',
			body: JSON.stringify({ yaml: yaml('1'), dryRun: true })
		});
		expect(dry.status).toBe(200);
		expect((await api(`/api/resources/configmaps/${name}?namespace=shop`)).status).not.toBe(200);

		const created = await api('/api/resources', {
			method: 'POST',
			body: JSON.stringify({ yaml: yaml('1') })
		});
		expect(created.status, JSON.stringify(created.body)).toBe(200);

		const updated = await api('/api/resources', {
			method: 'PUT',
			body: JSON.stringify({ yaml: yaml('2') })
		});
		expect(updated.status, JSON.stringify(updated.body)).toBe(200);
		const fetched = await api(`/api/resources/configmaps/${name}?namespace=shop`);
		expect((fetched.body as unknown as Item).data).toEqual({ value: '2' });

		const deleted = await api(`/api/resources/configmaps/${name}`, {
			method: 'DELETE',
			body: JSON.stringify({ namespace: 'shop' })
		});
		expect(deleted.status).toBe(200);
		expect((await api(`/api/resources/configmaps/${name}?namespace=shop`)).status).not.toBe(200);
	});

	it('rejects invalid YAML', async () => {
		const { status } = await api('/api/resources', {
			method: 'POST',
			body: JSON.stringify({ yaml: 'kind: [unclosed' })
		});
		expect(status).toBe(400);
	});
});

describe('pods', () => {
	it('returns pod logs', async () => {
		const pod = await podOf('traffic-generator');
		const { status, body } = await api(`/api/pods/shop/${pod}/logs?container=load&tailLines=20`);
		expect(status).toBe(200);
		expect(String(body)).toContain('level=info');
	});

	it('runs commands over the exec WebSocket', async () => {
		const pod = await podOf('storefront');
		const params = new URLSearchParams({
			server: SERVER,
			token: TOKEN,
			skipTLSVerify: 'true',
			container: 'web'
		});
		const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}/api/pods/shop/${pod}/exec?${params}`);
		let output = '';
		const done = new Promise<void>((resolve, reject) => {
			ws.onmessage = async (e) => {
				output += typeof e.data === 'string' ? e.data : await (e.data as Blob).text();
				if (output.includes('sk8r-42')) resolve();
			};
			ws.onerror = () => reject(new Error(`WebSocket error; output so far: ${output}`));
		});
		ws.onopen = () => ws.send('echo sk8r-$((40+2))\n');
		await done;
		ws.close();
		expect(output).toContain('sk8r-42');
	});

	it('streams cluster events', async () => {
		const controller = new AbortController();
		const res = await fetch(`${BASE}/api/events/stream?namespace=shop`, {
			headers: k8sHeaders,
			signal: controller.signal
		});
		expect(res.status).toBe(200);
		const reader = res.body!.getReader();
		const decoder = new TextDecoder();
		let text = '';
		while (!/"reason":/.test(text)) {
			const { value, done } = await reader.read();
			if (done) break;
			text += decoder.decode(value);
		}
		controller.abort();
		expect(text).toMatch(/"reason":/);
	});
});

describe('prometheus', () => {
	const queries = [
		...dashboardConfig.cards.flatMap((c) => [c.query, c.statusQuery]),
		...[
			...dashboardConfig.charts,
			...Object.values(resourceMetricsConfig).flatMap((r) => r.charts)
		].flatMap((c) => [c.query, ...(c.queries ?? []).map((q) => q.query)])
	].filter((q): q is string => !!q);

	// Every dashboard query must return data, which catches metric names that drift between
	// kube-prometheus-stack releases. rate() needs a few scrapes, so a fresh cluster gets time.
	it.each([...new Set(queries)])(
		'returns data for %s',
		async (q) => {
			await expect
				.poll(
					async () => {
						const { body } = await api(`/api/prometheus/query?q=${encodeURIComponent(q)}`);
						return (body.data as { result?: unknown[] } | undefined)?.result?.length ?? 0;
					},
					{ timeout: 180_000, interval: 5_000 }
				)
				.toBeGreaterThan(0);
		},
		200_000
	);

	it('refuses queries that are not on the dashboard', async () => {
		expect((await api(`/api/prometheus/query?q=${encodeURIComponent('up')}`)).status).toBe(403);
	});
});

describe('ui', () => {
	let browser: Browser;
	beforeAll(async () => {
		browser = await chromium.launch();
	});
	afterAll(() => browser?.close());

	it('renders the dashboard and a resource list without page errors', async () => {
		const ctx = await browser.newContext();
		await ctx.addInitScript(
			([server, token]) => {
				localStorage.setItem(
					'k8s-custom-clusters',
					JSON.stringify([{ id: 'demo', server, token, name: 'demo', skipTLSVerify: true }])
				);
				localStorage.setItem('k8s-current-cluster-id', 'demo');
			},
			[SERVER, TOKEN]
		);
		const page = await ctx.newPage();
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));

		await page.goto(BASE + '/');
		await expect
			.poll(() => page.getByText('3/3 healthy').count(), { timeout: 20_000 })
			.toBeGreaterThan(0);

		await page.goto(BASE + '/?resource=deployments&namespace=shop');
		await expect
			.poll(() => page.getByRole('link', { name: 'storefront' }).count(), { timeout: 20_000 })
			.toBeGreaterThan(0);

		expect(errors).toEqual([]);
		await ctx.close();
	});
});

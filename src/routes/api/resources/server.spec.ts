import { describe, expect, it } from 'vitest';
import { DELETE, POST, PUT } from './+server';

const auth = { Authorization: 'Bearer t', 'X-K8s-Server': 'https://k:6443' };

async function call(
	handler: typeof POST,
	body: unknown,
	headers: Record<string, string> = auth
): Promise<{ status: number; body: Record<string, unknown> }> {
	const request = new Request('http://x/api/resources', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
	const res = await handler({ request } as Parameters<typeof POST>[0]);
	return { status: res.status, body: await res.json() };
}

const deployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: prod
`;

describe('/api/resources validation (no cluster calls)', () => {
	it('rejects requests without credentials', async () => {
		for (const h of [POST, PUT, DELETE]) {
			expect((await call(h, {}, {})).status).toBe(401);
		}
	});

	it('rejects missing, invalid and incomplete YAML', async () => {
		expect((await call(POST, {})).status).toBe(400);
		expect((await call(POST, { yaml: 'a: [unclosed' })).body.error).toMatch(/Invalid YAML/);
		const noName = await call(POST, { yaml: 'apiVersion: v1\nkind: ConfigMap\nmetadata: {}' });
		expect(noName.status).toBe(400);
		expect(noName.body.error).toMatch(/metadata\.name/);
	});

	it('dry-run POST validates every document and reports resources', async () => {
		const r = await call(POST, {
			dryRun: true,
			yaml: `${deployment}---\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: cfg\n`
		});
		expect(r.status).toBe(200);
		expect(r.body.resources).toEqual([
			{ kind: 'Deployment', name: 'web', namespace: 'prod' },
			{ kind: 'ConfigMap', name: 'cfg', namespace: 'default' }
		]);
	});

	it('resolves YAML merge keys', async () => {
		const r = await call(POST, {
			dryRun: true,
			yaml: 'base: &m\n  name: merged\napiVersion: v1\nkind: ConfigMap\nmetadata:\n  <<: *m\n'
		});
		expect(r.body.resources).toEqual([{ kind: 'ConfigMap', name: 'merged', namespace: 'default' }]);
	});

	it('PUT accepts exactly one document', async () => {
		const two = await call(PUT, { dryRun: true, yaml: `${deployment}---\n${deployment}` });
		expect(two.status).toBe(400);
		expect((await call(PUT, { dryRun: true, yaml: deployment })).status).toBe(200);
	});

	it('DELETE requires kind, apiVersion and name', async () => {
		expect((await call(DELETE, { kind: 'Pod', name: 'p' })).status).toBe(400);
	});
});

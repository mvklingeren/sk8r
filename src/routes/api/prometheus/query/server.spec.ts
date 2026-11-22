import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardConfig } from '#lib/config/dashboardConfig.js';

const env = vi.hoisted(() => ({ PROMETHEUS_URL: undefined as string | undefined }));
vi.mock('$app/env/private', () => ({
	get PROMETHEUS_URL() {
		return env.PROMETHEUS_URL;
	}
}));

const { GET } = await import('./+server');

const allowed = dashboardConfig.cards[0].query;
const fetchMock = vi.fn();

async function call(params: Record<string, string>) {
	const url = new URL('http://x/api/prometheus/query');
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
	const res = await GET({ url } as Parameters<typeof GET>[0]);
	return res.status;
}

beforeEach(() => {
	env.PROMETHEUS_URL = 'http://prom:9090';
	fetchMock.mockReset().mockResolvedValue(Response.json({ status: 'success', data: {} }));
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('/api/prometheus/query', () => {
	it('only proxies the dashboard and node-metrics queries', async () => {
		expect(await call({})).toBe(400);
		expect(await call({ q: 'count(kube_secret_info)' })).toBe(403);
		expect(await call({ q: allowed })).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('rejects invalid params without calling Prometheus', async () => {
		for (const p of <Record<string, string>[]>[
			{ type: 'bogus' },
			{ type: 'range', step: '0' },
			{ type: 'range', step: 'abc' },
			{ type: 'range', range: '-5' },
			{ type: 'range', start: '100' },
			{ type: 'range', start: '700', end: '100' }
		]) {
			expect(await call({ q: allowed, ...p }), JSON.stringify(p)).toBe(400);
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('forwards an absolute range to query_range', async () => {
		expect(await call({ q: allowed, type: 'range', start: '100', end: '700', step: '60' })).toBe(
			200
		);
		const url = new URL(fetchMock.mock.calls[0][0]);
		expect(url.pathname).toBe('/api/v1/query_range');
		expect(Object.fromEntries(url.searchParams)).toEqual({
			query: allowed,
			start: '100',
			end: '700',
			step: '60'
		});
	});

	it('returns 503 when unconfigured and 502 when Prometheus fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		env.PROMETHEUS_URL = undefined;
		expect(await call({ q: allowed })).toBe(503);
		env.PROMETHEUS_URL = 'http://prom:9090';
		fetchMock.mockRejectedValue(new TypeError('fetch failed'));
		expect(await call({ q: allowed })).toBe(502);
	});
});

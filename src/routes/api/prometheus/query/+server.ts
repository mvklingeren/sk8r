import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PROMETHEUS_URL } from '$app/env/private';
import { PrometheusService } from '#lib/services/prometheusService.js';
import { dashboardConfig } from '#lib/config/dashboardConfig.js';
import { resourceMetricsConfig } from '#lib/config/metricsConfig.js';

// Only proxy the PromQL the UI itself sends; otherwise any caller could run arbitrary
// (or arbitrarily expensive) queries against an otherwise cluster-internal Prometheus.
const allowedQueries = new Set(
	[
		...dashboardConfig.cards.flatMap((card) => [card.query, card.statusQuery]),
		...[
			...dashboardConfig.charts,
			...Object.values(resourceMetricsConfig).flatMap((r) => r.charts)
		].flatMap((chart) => [chart.query, ...(chart.queries ?? []).map((q) => q.query)])
	].filter((q): q is string => !!q)
);

/** A positive integer, `fallback` when the param is absent, NaN when it is invalid. */
function positiveInt(params: URLSearchParams, name: string, fallback?: number) {
	const value = params.get(name);
	if (value === null) return fallback;
	return /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : NaN;
}

const badRequest = (error: string) => json({ error }, { status: 400 });

export const GET: RequestHandler = async ({ url }) => {
	const params = url.searchParams;
	const query = params.get('q');
	const type = params.get('type') ?? 'instant'; // 'instant' or 'range'

	if (!query) return badRequest('Query parameter "q" is required.');
	if (!allowedQueries.has(query)) {
		return json({ error: 'Query is not one of the dashboard queries.' }, { status: 403 });
	}
	if (type !== 'instant' && type !== 'range') return badRequest('"type" must be instant or range.');

	// Range options: absolute start/end (Unix seconds) or the last `range` minutes
	const step = positiveInt(params, 'step', 15);
	const rangeMinutes = positiveInt(params, 'range', 5);
	const start = positiveInt(params, 'start');
	const end = positiveInt(params, 'end');
	if (type === 'range') {
		if (Number.isNaN(step) || Number.isNaN(rangeMinutes)) {
			return badRequest('"step" and "range" must be positive integers.');
		}
		if ((start === undefined) !== (end === undefined)) {
			return badRequest('"start" and "end" must be given together.');
		}
		if (start !== undefined && end !== undefined && !(start < end)) {
			return badRequest('"start" and "end" must be Unix seconds with start < end.');
		}
	}

	if (!PROMETHEUS_URL) {
		return json({ error: 'Prometheus is not configured (PROMETHEUS_URL).' }, { status: 503 });
	}

	try {
		const prometheusService = new PrometheusService();
		const result =
			type === 'range'
				? await prometheusService.queryRange(
						query,
						start !== undefined ? { start, end, step } : { rangeMinutes, step }
					)
				: await prometheusService.query(query);
		return json(result);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		// One line per failure: the dashboard polls ~24 queries every 10s, so stack traces flood the log
		console.error(`Failed to execute Prometheus query: ${query}: ${errorMessage}`);
		return json({ error: `Failed to execute Prometheus query: ${errorMessage}` }, { status: 502 });
	}
};

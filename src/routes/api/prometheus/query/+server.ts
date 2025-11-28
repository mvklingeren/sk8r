import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrometheusService } from '$lib/services/prometheusService';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	const type = url.searchParams.get('type') || 'instant'; // 'instant' or 'range'
	const rangeMinutes = parseInt(url.searchParams.get('range') || '5', 10);
	const step = parseInt(url.searchParams.get('step') || '15', 10);

	if (!query) {
		return json({ error: 'Query parameter "q" is required.' }, { status: 400 });
	}

	try {
		const prometheusService = new PrometheusService();
		
		if (type === 'range') {
			// Use range query for charts (returns multiple data points)
			const result = await prometheusService.queryRange(query, { rangeMinutes, step });
			return json(result);
		} else {
			// Use instant query for current values (returns single data point)
			const result = await prometheusService.query(query);
			return json(result);
		}

	} catch (error) {
		console.error(`Failed to execute Prometheus query: ${query}`, error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json(
			{ error: `Failed to execute Prometheus query: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

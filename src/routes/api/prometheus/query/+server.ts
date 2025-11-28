import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrometheusService } from '$lib/services/prometheusService';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');

	if (!query) {
		return json({ error: 'Query parameter "q" is required.' }, { status: 400 });
	}

	try {
		const prometheusService = new PrometheusService();
		const result = await prometheusService.query(query);
		return json(result);

	} catch (error) {
		console.error(`Failed to execute Prometheus query: ${query}`, error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json(
			{ error: `Failed to execute Prometheus query: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

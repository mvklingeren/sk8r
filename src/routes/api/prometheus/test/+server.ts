import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PrometheusService } from '$lib/services/prometheusService';

// A simple query to check if Prometheus is up and reporting targets.
const PROMETHEUS_HEALTH_CHECK_QUERY = 'up';

export const GET: RequestHandler = async () => {
	try {
		const prometheusService = new PrometheusService();

		console.log('--- Prometheus Test Route: Querying Prometheus... ---');
		const result = await prometheusService.query(PROMETHEUS_HEALTH_CHECK_QUERY);
		console.log('--- Prometheus Test Route: Query successful. ---');

		return json({
			message: 'Successfully connected to Prometheus and executed a query.',
			prometheus_url: process.env.PROMETHEUS_URL, // For debugging
			query: PROMETHEUS_HEALTH_CHECK_QUERY,
			response: result
		});

	} catch (error) {
		console.error('Prometheus test route failed:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return json(
			{ 
				error: `Failed to connect to Prometheus or execute query: ${errorMessage}`,
				prometheus_url: process.env.PROMETHEUS_URL, // For debugging
			},
			{ status: 500 }
		);
	}
};

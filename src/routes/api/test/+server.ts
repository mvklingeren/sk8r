import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const prometheusUrl = env.PROMETHEUS_URL;
		if (!prometheusUrl) {
			return json({ error: 'PROMETHEUS_URL not configured' }, { status: 500 });
		}

		const query = url.searchParams.get('q') || 
			'sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) / sum(machine_cpu_cores)';

		// Test 1: Instant query (single point)
		const instantUrl = new URL('/api/v1/query', prometheusUrl);
		instantUrl.searchParams.append('query', query);
		
		const instantResponse = await fetch(instantUrl.toString());
		const instantData = await instantResponse.json();

		// Test 2: Range query (multiple points over time)
		const rangeUrl = new URL('/api/v1/query_range', prometheusUrl);
		rangeUrl.searchParams.append('query', query);
		
		// Get data for the last 5 minutes with 15-second step
		const end = Math.floor(Date.now() / 1000);
		const start = end - (5 * 60); // 5 minutes ago
		rangeUrl.searchParams.append('start', start.toString());
		rangeUrl.searchParams.append('end', end.toString());
		rangeUrl.searchParams.append('step', '15'); // 15 second intervals
		
		const rangeResponse = await fetch(rangeUrl.toString());
		const rangeData = await rangeResponse.json();

		return json({
			query,
			instant: {
				endpoint: '/api/v1/query',
				description: 'Returns a SINGLE data point (current value)',
				resultType: instantData.data?.resultType,
				resultCount: instantData.data?.result?.length,
				data: instantData
			},
			range: {
				endpoint: '/api/v1/query_range',
				description: 'Returns MULTIPLE data points over time (for charts)',
				timeRange: '5 minutes',
				step: '15 seconds',
				resultType: rangeData.data?.resultType,
				resultCount: rangeData.data?.result?.length,
				pointsPerSeries: rangeData.data?.result?.[0]?.values?.length,
				data: rangeData
			}
		});
	} catch (error) {
		console.error('Test API error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined
		}, { status: 500 });
	}
};

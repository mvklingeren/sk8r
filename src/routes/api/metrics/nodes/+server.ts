import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { MetricsService } from '$lib/services/metricsService';
import { K8sApiServiceSimple } from '$lib/services/k8sApiSimple';
import { getK8sCredentials, unauthorizedResponse } from '$lib/server/k8sAuth';

export const GET: RequestHandler = async ({ request }) => {
	const credentials = getK8sCredentials(request);
	if (!credentials) {
		return unauthorizedResponse();
	}

	try {
		console.log('--- Metrics API Request Received ---');

		// Initialize services with credentials
		const k8sApi = new K8sApiServiceSimple(credentials.server, credentials.token);
		const metricsService = new MetricsService(k8sApi.kubeConfig);

		// Fetch and process node metrics
		const nodeMetrics = await metricsService.processNodeMetrics();
		console.log('Successfully fetched and processed metrics.');
		
		// Get historical data for charts
		const historicalData: any[] = [];
		
		// Get all nodes to ensure we have data for each
		const nodesResponse = await k8sApi.listResources('nodes', { namespace: '*' });
		const nodes = nodesResponse.items || [];

		for (const node of nodes) {
			const nodeName = node.metadata.name;
			const currentMetrics = nodeMetrics.get(nodeName);
			
			if (currentMetrics) {
				// Get historical data
				const cpuHistory = metricsService.getCachedMetrics(`${nodeName}.cpu`, 5);
				const memoryHistory = metricsService.getCachedMetrics(`${nodeName}.memory`, 5);

				// If we have historical data, return it
				if (cpuHistory.length > 0 || memoryHistory.length > 0) {
					// Merge timestamps and create a unified dataset
					const timestamps = new Set<number>();
					cpuHistory.forEach(dp => timestamps.add(dp.timestamp.getTime()));
					memoryHistory.forEach(dp => timestamps.add(dp.timestamp.getTime()));
					
					const sortedTimestamps = Array.from(timestamps).sort();
					
					for (const timestamp of sortedTimestamps) {
						const cpuPoint = cpuHistory.find(dp => dp.timestamp.getTime() === timestamp);
						const memoryPoint = memoryHistory.find(dp => dp.timestamp.getTime() === timestamp);
						
						if (cpuPoint || memoryPoint) {
							historicalData.push({
								node: nodeName,
								timestamp: new Date(timestamp),
								cpu: cpuPoint?.value || 0,
								memory: memoryPoint?.value || 0
							});
						}
					}
				} else {
					// If no historical data, just return current
					historicalData.push({
						node: nodeName,
						timestamp: currentMetrics.timestamp,
						cpu: currentMetrics.cpu,
						memory: currentMetrics.memory
					});
				}
			}
		}

		// If we have multiple nodes, aggregate the data
		if (nodes.length > 1) {
			// Group by timestamp and aggregate
			const aggregatedData = new Map<number, { timestamp: Date; cpu: number; memory: number; count: number }>();
			
			for (const dataPoint of historicalData) {
				const key = dataPoint.timestamp.getTime();
				const existing = aggregatedData.get(key);
				
				if (existing) {
					existing.cpu += dataPoint.cpu;
					existing.memory += dataPoint.memory;
					existing.count += 1;
				} else {
					aggregatedData.set(key, {
						timestamp: dataPoint.timestamp,
						cpu: dataPoint.cpu,
						memory: dataPoint.memory,
						count: 1
					});
				}
			}

			// Calculate averages and return
			const result = Array.from(aggregatedData.values()).map(item => ({
				timestamp: item.timestamp,
				cpu: item.cpu / item.count,
				memory: item.memory / item.count
			}));

			return json(result);
		}

		return json(historicalData);
	} catch (error) {
		console.error('Failed to fetch metrics:', error);
		
		// Check if it's a metrics-server not found error
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const errorStack = error instanceof Error ? error.stack : '';
		
		console.error('Error details:', { errorMessage, errorStack });
		
		if (errorMessage.includes('metrics-server') || errorMessage.includes('404')) {
			return json(
				{ error: 'Metrics server is not installed. Please install metrics-server to enable monitoring.' },
				{ status: 503 }
			);
		}

		return json(
			{ error: `Failed to fetch metrics: ${errorMessage}` },
			{ status: 500 }
		);
	}
};

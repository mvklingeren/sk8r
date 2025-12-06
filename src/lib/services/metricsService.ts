import * as k8s from '@kubernetes/client-node';
import type { MetricsApiResponse, NodeMetrics, MetricDataPoint } from '$lib/types/metricsTypes';

export class MetricsService {
	private kubeConfig: k8s.KubeConfig;
	private metricsCache: Map<string, MetricDataPoint[]> = new Map();
	private maxCacheSize = 100; // Maximum data points per metric

	constructor(kubeConfig: k8s.KubeConfig) {
		this.kubeConfig = kubeConfig;
	}

	async getNodeMetrics(): Promise<NodeMetrics[]> {
		try {
			// Create a custom object client for the metrics API
			const client = k8s.KubernetesObjectApi.makeApiClient(this.kubeConfig);
			
			// Query the metrics API for node metrics
			const response = await client.list(
				'metrics.k8s.io',
				'v1beta1',
				'nodes'
			);
			
			// Transform the response to our NodeMetrics type
			const responseAny = response as any;
			if (responseAny.body && responseAny.body.items) {
				return responseAny.body.items.map((item: any) => ({
					metadata: {
						name: item.metadata.name,
						selfLink: item.metadata.selfLink || '',
						creationTimestamp: item.metadata.creationTimestamp || new Date().toISOString()
					},
					timestamp: item.timestamp || new Date().toISOString(),
					window: item.window || '30s',
					usage: {
						cpu: item.usage?.cpu || '0',
						memory: item.usage?.memory || '0'
					}
				}));
			}
			
			return [];
		} catch (error: any) {
			// If metrics API is not available, return empty array
			if (error.response?.statusCode === 404 || error.message?.includes('404')) {
				console.warn('Metrics API not available or insufficient permissions.');
				return [];
			}
			
			console.error('Failed to fetch metrics via API:', error);
			throw error;
		}
	}

	// Convert CPU value from nano-cores to cores
	parseCpuValue(cpuString: string): number {
		// Remove 'n' suffix if present (nano-cores)
		if (cpuString.endsWith('n')) {
			return parseInt(cpuString.slice(0, -1)) / 1_000_000_000;
		}
		// Remove 'm' suffix if present (milli-cores)
		if (cpuString.endsWith('m')) {
			return parseInt(cpuString.slice(0, -1)) / 1000;
		}
		// Assume it's already in cores
		return parseFloat(cpuString);
	}

	// Convert memory value to bytes
	parseMemoryValue(memoryString: string): number {
		const units: { [key: string]: number } = {
			'Ki': 1024,
			'Mi': 1024 * 1024,
			'Gi': 1024 * 1024 * 1024,
			'Ti': 1024 * 1024 * 1024 * 1024,
			'K': 1000,
			'M': 1000 * 1000,
			'G': 1000 * 1000 * 1000,
			'T': 1000 * 1000 * 1000 * 1000
		};

		for (const [unit, multiplier] of Object.entries(units)) {
			if (memoryString.endsWith(unit)) {
				const value = parseFloat(memoryString.slice(0, -unit.length));
				return value * multiplier;
			}
		}

		return parseFloat(memoryString);
	}

	// Store metrics data point for historical charts
	cacheMetricDataPoint(key: string, value: number) {
		if (!this.metricsCache.has(key)) {
			this.metricsCache.set(key, []);
		}

		const dataPoints = this.metricsCache.get(key)!;
		dataPoints.push({
			timestamp: new Date(),
			value
		});

		// Keep only the last N data points
		if (dataPoints.length > this.maxCacheSize) {
			dataPoints.shift();
		}
	}

	// Get cached metric data for charts
	getCachedMetrics(key: string, timeRangeMinutes: number = 5): MetricDataPoint[] {
		const dataPoints = this.metricsCache.get(key) || [];
		const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
		
		return dataPoints.filter(dp => dp.timestamp >= cutoffTime);
	}

	// Process and cache node metrics
	async processNodeMetrics(): Promise<Map<string, any>> {
		const metrics = await this.getNodeMetrics();
		const processedMetrics = new Map<string, any>();

		for (const nodeMetric of metrics) {
			const nodeName = nodeMetric.metadata.name;
			const cpuCores = this.parseCpuValue(nodeMetric.usage.cpu);
			const memoryBytes = this.parseMemoryValue(nodeMetric.usage.memory);

			// Cache the values
			this.cacheMetricDataPoint(`${nodeName}.cpu`, cpuCores);
			this.cacheMetricDataPoint(`${nodeName}.memory`, memoryBytes);

			processedMetrics.set(nodeName, {
				cpu: cpuCores,
				memory: memoryBytes,
				timestamp: new Date(nodeMetric.timestamp)
			});
		}

		return processedMetrics;
	}
}
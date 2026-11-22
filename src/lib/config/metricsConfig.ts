import type { ResourceMetricsConfig } from '#lib/types/metricsTypes.js';

export const resourceMetricsConfig: ResourceMetricsConfig = {
	nodes: {
		enabled: true,
		charts: [
			{
				id: 'node-cpu',
				type: 'line',
				title: 'Average CPU Usage',
				height: 250,
				query:
					'100 * sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) / sum(machine_cpu_cores)',
				unit: 'percentage',
				color: 'rgb(59, 130, 246)', // blue-500
				fill: true, // Fill area under the line
				timeRange: 5,
				refreshInterval: 30,
				yAxis: {
					min: 0,
					max: 100,
					label: 'CPU (%)'
				}
			},
			{
				id: 'node-memory',
				type: 'line',
				title: 'Average Memory Usage',
				height: 250,
				query:
					'100 * sum(container_memory_working_set_bytes{container!=""}) / sum(machine_memory_bytes)',
				unit: 'percentage',
				color: 'rgb(34, 197, 94)', // green-500
				fill: true, // Fill area under the line
				timeRange: 5,
				refreshInterval: 30,
				yAxis: {
					min: 0,
					max: 100,
					label: 'Memory (%)'
				}
			}
		]
	},
	pods: {
		enabled: false, // Can be enabled later
		charts: []
	}
};

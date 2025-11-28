import type { MetricChartConfig } from '$lib/types/metricsTypes';

export interface DashboardCardConfig {
	id: string;
	title: string;
	icon: string;
	color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan' | 'orange' | 'gray';
	/** PromQL query for the main value */
	query: string;
	/** Format type for displaying the value */
	format: 'number' | 'percentage' | 'bytes' | 'duration';
	/** Optional query for status/health indicator */
	statusQuery?: string;
	/** Link to resource list */
	link?: string;
}

export interface DashboardConfig {
	cards: DashboardCardConfig[];
	charts: MetricChartConfig[];
}

export const dashboardConfig: DashboardConfig = {
	cards: [
		{
			id: 'nodes',
			title: 'Nodes',
			icon: 'server',
			color: 'blue',
			query: 'count(kube_node_info)',
			format: 'number',
			statusQuery: 'sum(kube_node_status_condition{condition="Ready",status="true"})',
			link: '/?resource=nodes'
		},
		{
			id: 'pods',
			title: 'Pods',
			icon: 'box',
			color: 'green',
			query: 'count(kube_pod_info)',
			format: 'number',
			statusQuery: 'count(kube_pod_status_phase{phase="Running"})',
			link: '/?resource=pods'
		},
		{
			id: 'deployments',
			title: 'Deployments',
			icon: 'rocket',
			color: 'purple',
			query: 'count(kube_deployment_created)',
			format: 'number',
			statusQuery: 'count(kube_deployment_status_replicas_available > 0)',
			link: '/?resource=deployments'
		},
		{
			id: 'namespaces',
			title: 'Namespaces',
			icon: 'folder',
			color: 'cyan',
			query: 'count(kube_namespace_created)',
			format: 'number',
			link: '/?resource=namespaces'
		},
		{
			id: 'services',
			title: 'Services',
			icon: 'globe',
			color: 'orange',
			query: 'count(kube_service_info)',
			format: 'number',
			link: '/?resource=services'
		},
		{
			id: 'pvcs',
			title: 'PVCs',
			icon: 'hard-drive',
			color: 'yellow',
			query: 'count(kube_persistentvolumeclaim_info)',
			format: 'number',
			statusQuery: 'count(kube_persistentvolumeclaim_status_phase{phase="Bound"})',
			link: '/?resource=persistentvolumeclaims'
		}
	],
	charts: [
		{
			id: 'cluster-cpu',
			type: 'line',
			title: 'CPU Usage',
			height: 200,
			// Using cAdvisor metrics (container_*) instead of node-exporter (node_*)
			query: '100 * sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) / sum(machine_cpu_cores)',
			unit: 'percentage',
			color: 'rgb(59, 130, 246)', // blue-500
			fill: true,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: {
				min: 0,
				max: 100
			}
		},
		{
			id: 'cluster-memory',
			type: 'line',
			title: 'Memory Usage',
			height: 200,
			// Using cAdvisor metrics
			query: '100 * sum(container_memory_working_set_bytes{container!=""}) / sum(machine_memory_bytes)',
			unit: 'percentage',
			color: 'rgb(34, 197, 94)', // green-500
			fill: true,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: {
				min: 0,
				max: 100
			}
		},
		{
			id: 'pod-count',
			type: 'line',
			title: 'Running Pods',
			height: 200,
			query: 'sum(kube_pod_status_phase{phase="Running"})',
			unit: 'custom',
			color: 'rgb(168, 85, 247)', // purple-500
			fill: true,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: {
				min: 0
			}
		},
		{
			id: 'network-io',
			type: 'line',
			title: 'Network I/O',
			height: 200,
			queries: [
				{
					label: 'In',
					query: 'sum(rate(container_network_receive_bytes_total[5m]))',
					color: 'rgb(34, 197, 94)' // green-500
				},
				{
					label: 'Out',
					query: 'sum(rate(container_network_transmit_bytes_total[5m]))',
					color: 'rgb(239, 68, 68)' // red-500
				}
			],
			unit: 'bytes',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: {
				min: 0
			}
		},
		{
			id: 'disk-io',
			type: 'line',
			title: 'Disk I/O',
			height: 200,
			query: 'sum(rate(container_fs_reads_bytes_total[5m])) + sum(rate(container_fs_writes_bytes_total[5m]))',
			unit: 'bytes',
			color: 'rgb(249, 115, 22)', // orange-500
			fill: true,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: {
				min: 0
			}
		},
		{
			id: 'containers',
			type: 'line',
			title: 'Running Containers',
			height: 200,
			query: 'sum(kube_pod_container_status_running)',
			unit: 'custom',
			color: 'rgb(139, 92, 246)', // violet-500
			fill: true,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: {
				min: 0
			}
		}
	]
};

// Alternative queries for different Prometheus setups (cadvisor vs node-exporter vs kube-state-metrics)
export const alternativeQueries = {
	// If using cadvisor metrics
	cpuCadvisor: 'sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) / sum(machine_cpu_cores) * 100',
	memoryCadvisor: 'sum(container_memory_working_set_bytes{container!=""}) / sum(machine_memory_bytes) * 100',
	
	// If kube-state-metrics is not available, use kubernetes API metrics
	nodesKubeApi: 'count(up{job="kubernetes-nodes"})',
	podsKubeApi: 'count(up{job="kubernetes-pods"})'
};


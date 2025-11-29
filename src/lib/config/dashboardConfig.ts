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
		// Row 1: Core resource utilization
		{
			id: 'cluster-cpu',
			type: 'line',
			title: 'CPU Usage',
			height: 200,
			query: '100 * sum(rate(container_cpu_usage_seconds_total{container!=""}[5m])) / sum(machine_cpu_cores)',
			unit: 'percentage',
			color: 'rgb(59, 130, 246)', // blue-500
			fill: true,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0, max: 100 }
		},
		{
			id: 'cluster-memory',
			type: 'line',
			title: 'Memory Usage',
			height: 200,
			query: '100 * sum(container_memory_working_set_bytes{container!=""}) / sum(machine_memory_bytes)',
			unit: 'percentage',
			color: 'rgb(34, 197, 94)', // green-500
			fill: true,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0, max: 100 }
		},
		// Row 2: Network & I/O
		{
			id: 'network-io',
			type: 'line',
			title: 'Network I/O',
			height: 200,
			queries: [
				{
					label: 'rx',
					query: 'sum(rate(container_network_receive_bytes_total[5m]))',
					color: 'rgb(34, 197, 94)' // green-500
				},
				{
					label: 'tx',
					query: 'sum(rate(container_network_transmit_bytes_total[5m]))',
					color: 'rgb(239, 68, 68)' // red-500
				}
			],
			unit: 'bytes',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		{
			id: 'disk-io',
			type: 'line',
			title: 'Disk I/O',
			height: 200,
			queries: [
				{
					label: 'Read',
					query: 'sum(rate(container_fs_reads_bytes_total[5m]))',
					color: 'rgb(59, 130, 246)' // blue-500
				},
				{
					label: 'Write',
					query: 'sum(rate(container_fs_writes_bytes_total[5m]))',
					color: 'rgb(249, 115, 22)' // orange-500
				}
			],
			unit: 'bytes',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		// Row 3: Pod & Container metrics
		{
			id: 'container-restarts',
			type: 'line',
			title: 'Container Restarts',
			height: 200,
			query: 'sum(increase(kube_pod_container_status_restarts_total[1h]))',
			unit: 'custom',
			color: 'rgb(239, 68, 68)', // red-500
			fill: true,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		// Row 4: Pod phases & states
		{
			id: 'pod-phases',
			type: 'line',
			title: 'Pod Phases',
			height: 200,
			queries: [
				{
					label: 'Running',
					query: 'sum(kube_pod_status_phase{phase="Running"})',
					color: 'rgb(34, 197, 94)' // green-500
				},
				{
					label: 'Pending',
					query: 'sum(kube_pod_status_phase{phase="Pending"})',
					color: 'rgb(234, 179, 8)' // yellow-500
				},
				{
					label: 'Failed',
					query: 'sum(kube_pod_status_phase{phase="Failed"})',
					color: 'rgb(239, 68, 68)' // red-500
				}
			],
			unit: 'custom',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		// Row 3: Workloads & Storage
		{
			id: 'deployment-replicas',
			type: 'line',
			title: 'Deployment Replicas',
			height: 200,
			queries: [
				{
					label: 'Desired',
					query: 'sum(kube_deployment_spec_replicas)',
					color: 'rgb(59, 130, 246)' // blue-500
				},
				{
					label: 'Available',
					query: 'sum(kube_deployment_status_replicas_available)',
					color: 'rgb(34, 197, 94)' // green-500
				},
				{
					label: 'Unavailable',
					query: 'sum(kube_deployment_status_replicas_unavailable)',
					color: 'rgb(239, 68, 68)' // red-500
				}
			],
			unit: 'custom',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		// Row 3: Storage
		{
			id: 'pvc-usage',
			type: 'line',
			title: 'Persistent Volume Capacity',
			height: 200,
			query: 'sum(kube_persistentvolumeclaim_resource_requests_storage_bytes)',
			unit: 'bytes',
			color: 'rgb(234, 179, 8)', // yellow-500
			fill: true,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
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


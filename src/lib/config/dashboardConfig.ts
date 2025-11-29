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
		{
			id: 'filesystem-usage',
			type: 'line',
			title: 'Filesystem Usage',
			height: 200,
			query: '100 * sum(container_fs_usage_bytes) / sum(container_fs_limit_bytes)',
			unit: 'percentage',
			color: 'rgb(249, 115, 22)', // orange-500
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
					label: 'Receive',
					query: 'sum(rate(container_network_receive_bytes_total[5m]))',
					color: 'rgb(34, 197, 94)' // green-500
				},
				{
					label: 'Transmit',
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
		{
			id: 'network-packets',
			type: 'line',
			title: 'Network Packets',
			height: 200,
			queries: [
				{
					label: 'Rx',
					query: 'sum(rate(container_network_receive_packets_total[5m]))',
					color: 'rgb(34, 197, 94)' // green-500
				},
				{
					label: 'Tx',
					query: 'sum(rate(container_network_transmit_packets_total[5m]))',
					color: 'rgb(239, 68, 68)' // red-500
				}
			],
			unit: 'custom',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		// Row 3: Pod & Container metrics
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
			yAxis: { min: 0 }
		},
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
		{
			id: 'container-states',
			type: 'line',
			title: 'Container States',
			height: 200,
			queries: [
				{
					label: 'Running',
					query: 'sum(kube_pod_container_status_running)',
					color: 'rgb(34, 197, 94)' // green-500
				},
				{
					label: 'Waiting',
					query: 'sum(kube_pod_container_status_waiting)',
					color: 'rgb(234, 179, 8)' // yellow-500
				},
				{
					label: 'Terminated',
					query: 'sum(kube_pod_container_status_terminated)',
					color: 'rgb(107, 114, 128)' // gray-500
				}
			],
			unit: 'custom',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		{
			id: 'pod-ready',
			type: 'line',
			title: 'Pod Readiness',
			height: 200,
			queries: [
				{
					label: 'Ready',
					query: 'sum(kube_pod_status_ready{condition="true"})',
					color: 'rgb(34, 197, 94)' // green-500
				},
				{
					label: 'Not Ready',
					query: 'sum(kube_pod_status_ready{condition="false"})',
					color: 'rgb(239, 68, 68)' // red-500
				}
			],
			unit: 'custom',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		// Row 5: Deployment & ReplicaSet health
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
		{
			id: 'replicaset-replicas',
			type: 'line',
			title: 'ReplicaSet Replicas',
			height: 200,
			queries: [
				{
					label: 'Desired',
					query: 'sum(kube_replicaset_spec_replicas)',
					color: 'rgb(59, 130, 246)' // blue-500
				},
				{
					label: 'Ready',
					query: 'sum(kube_replicaset_status_ready_replicas)',
					color: 'rgb(34, 197, 94)' // green-500
				}
			],
			unit: 'custom',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		{
			id: 'statefulset-replicas',
			type: 'line',
			title: 'StatefulSet Replicas',
			height: 200,
			queries: [
				{
					label: 'Desired',
					query: 'sum(kube_statefulset_replicas)',
					color: 'rgb(59, 130, 246)' // blue-500
				},
				{
					label: 'Ready',
					query: 'sum(kube_statefulset_status_replicas_ready)',
					color: 'rgb(34, 197, 94)' // green-500
				}
			],
			unit: 'custom',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		// Row 6: Resource requests & limits
		{
			id: 'cpu-requests-limits',
			type: 'line',
			title: 'CPU Requests vs Limits',
			height: 200,
			queries: [
				{
					label: 'Requests',
					query: 'sum(kube_pod_container_resource_requests{resource="cpu"})',
					color: 'rgb(59, 130, 246)' // blue-500
				},
				{
					label: 'Limits',
					query: 'sum(kube_pod_container_resource_limits{resource="cpu"})',
					color: 'rgb(239, 68, 68)' // red-500
				}
			],
			unit: 'custom',
			fill: false,
			timeRange: 30,
			refreshInterval: 30,
			yAxis: { min: 0 }
		},
		{
			id: 'memory-requests-limits',
			type: 'line',
			title: 'Memory Requests vs Limits',
			height: 200,
			queries: [
				{
					label: 'Requests',
					query: 'sum(kube_pod_container_resource_requests{resource="memory"})',
					color: 'rgb(59, 130, 246)' // blue-500
				},
				{
					label: 'Limits',
					query: 'sum(kube_pod_container_resource_limits{resource="memory"})',
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
			id: 'pvc-usage',
			type: 'line',
			title: 'PVC Capacity',
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


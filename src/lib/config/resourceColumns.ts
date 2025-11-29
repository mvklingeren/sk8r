import type { ResourceColumnConfigs } from '$lib/types/columnConfig';

export const resourceColumnConfigs: ResourceColumnConfigs = {
	pods: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'ready',
				label: 'Ready',
				path: 'status',
				type: 'fraction',
				formatter: 'podReady'
			},
			{
				key: 'status',
				label: 'Status',
				path: 'status.phase',
				type: 'badge',
				colorMap: {
					'Running': 'green',
					'Pending': 'yellow',
					'Succeeded': 'green',
					'Failed': 'red',
					'Unknown': 'gray'
				}
			},
			{
				key: 'restarts',
				label: 'Restarts',
				path: 'status',
				type: 'text',
				formatter: 'podRestarts'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	deployments: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'ready',
				label: 'Ready',
				path: 'status',
				type: 'fraction',
				formatter: 'deploymentReady'
			},
			{
				key: 'upToDate',
				label: 'Up-to-date',
				path: 'status.updatedReplicas',
				type: 'text'
			},
			{
				key: 'available',
				label: 'Available',
				path: 'status.availableReplicas',
				type: 'text'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	services: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'type',
				label: 'Type',
				path: 'spec.type',
				type: 'text'
			},
			{
				key: 'clusterIp',
				label: 'Cluster-IP',
				path: 'spec.clusterIP',
				type: 'text'
			},
			{
				key: 'externalIp',
				label: 'External-IP',
				path: 'status',
				type: 'text',
				formatter: 'serviceExternalIp'
			},
			{
				key: 'ports',
				label: 'Port(s)',
				path: 'spec.ports',
				type: 'list',
				formatter: 'servicePorts'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	configmaps: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'data',
				label: 'Data',
				path: 'data',
				type: 'text',
				formatter: 'objectKeys'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	secrets: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'type',
				label: 'Type',
				path: 'type',
				type: 'text'
			},
			{
				key: 'data',
				label: 'Data',
				path: 'data',
				type: 'text',
				formatter: 'objectKeys'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	ingresses: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'hosts',
				label: 'Hosts',
				path: 'spec.rules',
				type: 'list',
				formatter: 'ingressHosts'
			},
			{
				key: 'address',
				label: 'Address',
				path: 'status.loadBalancer.ingress',
				type: 'list',
				formatter: 'ingressAddresses'
			},
			{
				key: 'ports',
				label: 'Ports',
				path: 'spec.tls',
				type: 'text',
				formatter: 'ingressPorts'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	persistentvolumeclaims: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'status',
				label: 'Status',
				path: 'status.phase',
				type: 'badge',
				colorMap: {
					'Bound': 'green',
					'Pending': 'yellow',
					'Lost': 'red'
				}
			},
			{
				key: 'volume',
				label: 'Volume',
				path: 'spec.volumeName',
				type: 'text'
			},
			{
				key: 'capacity',
				label: 'Capacity',
				path: 'status.capacity.storage',
				type: 'text'
			},
			{
				key: 'accessModes',
				label: 'Access Modes',
				path: 'spec.accessModes',
				type: 'list',
				formatter: 'accessModes'
			},
			{
				key: 'storageClass',
				label: 'Storage Class',
				path: 'spec.storageClassName',
				type: 'text'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	nodes: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'status',
				label: 'Status',
				path: 'status',
				type: 'badge',
				formatter: 'nodeStatus',
				colorMap: {
					'Ready': 'green',
					'NotReady': 'red',
					'Unknown': 'gray'
				}
			},
			{
				key: 'roles',
				label: 'Roles',
				path: 'metadata.labels',
				type: 'list',
				formatter: 'nodeRoles'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'version',
				label: 'Version',
				path: 'status.nodeInfo.kubeletVersion',
				type: 'text'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	// Custom Resources
	ingressroutes: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'entryPoints',
				label: 'Entry Points',
				path: 'spec.entryPoints',
				type: 'list',
				formatter: 'simpleList'
			},
			{
				key: 'hosts',
				label: 'Hosts',
				path: 'spec.routes',
				type: 'list',
				formatter: 'traefikHosts'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	certificates: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'ready',
				label: 'Ready',
				path: 'status.conditions',
				type: 'badge',
				formatter: 'certificateReady',
				colorMap: {
					'True': 'green',
					'False': 'red',
					'Unknown': 'gray'
				}
			},
			{
				key: 'secret',
				label: 'Secret',
				path: 'spec.secretName',
				type: 'text'
			},
			{
				key: 'issuer',
				label: 'Issuer',
				path: 'spec.issuerRef.name',
				type: 'text'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	// Additional resource types
	statefulsets: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'ready',
				label: 'Ready',
				path: 'status',
				type: 'fraction',
				formatter: 'deploymentReady'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	daemonsets: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'desired',
				label: 'Desired',
				path: 'status.desiredNumberScheduled',
				type: 'text'
			},
			{
				key: 'current',
				label: 'Current',
				path: 'status.currentNumberScheduled',
				type: 'text'
			},
			{
				key: 'ready',
				label: 'Ready',
				path: 'status.numberReady',
				type: 'text'
			},
			{
				key: 'upToDate',
				label: 'Up-to-date',
				path: 'status.updatedNumberScheduled',
				type: 'text'
			},
			{
				key: 'available',
				label: 'Available',
				path: 'status.numberAvailable',
				type: 'text'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	replicasets: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'desired',
				label: 'Desired',
				path: 'spec.replicas',
				type: 'text'
			},
			{
				key: 'current',
				label: 'Current',
				path: 'status.replicas',
				type: 'text'
			},
			{
				key: 'ready',
				label: 'Ready',
				path: 'status.readyReplicas',
				type: 'text'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	jobs: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'completions',
				label: 'Completions',
				path: 'spec.completions',
				type: 'text'
			},
			{
				key: 'duration',
				label: 'Duration',
				path: 'status',
				type: 'text',
				formatter: 'jobDuration'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	cronjobs: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'schedule',
				label: 'Schedule',
				path: 'spec.schedule',
				type: 'text'
			},
			{
				key: 'suspend',
				label: 'Suspend',
				path: 'spec.suspend',
				type: 'text'
			},
			{
				key: 'active',
				label: 'Active',
				path: 'status.active',
				type: 'text',
				formatter: 'cronJobActive'
			},
			{
				key: 'lastSchedule',
				label: 'Last Schedule',
				path: 'status.lastScheduleTime',
				type: 'age'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	namespaces: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'status',
				label: 'Status',
				path: 'status.phase',
				type: 'badge',
				colorMap: {
					'Active': 'green',
					'Terminating': 'yellow',
					'Failed': 'red'
				}
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	events: {
		columns: [
			{
				key: 'type',
				label: 'Type',
				path: 'type',
				type: 'badge',
				colorMap: {
					'Normal': 'green',
					'Warning': 'yellow'
				}
			},
			{
				key: 'reason',
				label: 'Reason',
				path: 'reason',
				type: 'text'
			},
			{
				key: 'object',
				label: 'Object',
				path: 'involvedObject',
				type: 'text',
				formatter: 'eventObject'
			},
			{
				key: 'message',
				label: 'Message',
				path: 'message',
				type: 'text',
				flex: 3
			},
			{
				key: 'count',
				label: 'Count',
				path: 'count',
				type: 'text'
			},
			{
				key: 'age',
				label: 'Last Seen',
				path: 'lastTimestamp',
				type: 'age'
			}
		]
	},

	serviceaccounts: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'secrets',
				label: 'Secrets',
				path: 'secrets',
				type: 'text',
				formatter: 'arrayLength'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	},

	// Alias for persistentvolumeclaims
	pvc: {
		columns: [
			{
				key: 'name',
				label: 'Name',
				path: 'metadata.name',
				type: 'link',
				flex: 2
			},
			{
				key: 'status',
				label: 'Status',
				path: 'status.phase',
				type: 'badge',
				colorMap: {
					'Bound': 'green',
					'Pending': 'yellow',
					'Lost': 'red'
				}
			},
			{
				key: 'volume',
				label: 'Volume',
				path: 'spec.volumeName',
				type: 'text'
			},
			{
				key: 'capacity',
				label: 'Capacity',
				path: 'status.capacity.storage',
				type: 'text'
			},
			{
				key: 'accessModes',
				label: 'Access Modes',
				path: 'spec.accessModes',
				type: 'list',
				formatter: 'accessModes'
			},
			{
				key: 'storageClass',
				label: 'Storage Class',
				path: 'spec.storageClassName',
				type: 'text'
			},
			{
				key: 'age',
				label: 'Age',
				path: 'metadata.creationTimestamp',
				type: 'age'
			},
			{
				key: 'labels',
				label: 'Labels',
				path: 'metadata.labels',
				type: 'labels',
				flex: 2
			}
		]
	}
};

// Default fallback configuration for unknown resource types
export const defaultColumnConfig = {
	columns: [
		{
			key: 'name',
			label: 'Name',
			path: 'metadata.name',
			type: 'link' as const,
			flex: 2
		},
		{
			key: 'age',
			label: 'Age',
			path: 'metadata.creationTimestamp',
			type: 'age' as const
		},
		{
			key: 'labels',
			label: 'Labels',
			path: 'metadata.labels',
			type: 'labels' as const,
			flex: 2
		}
	]
};
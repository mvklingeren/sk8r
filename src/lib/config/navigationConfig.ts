import type { NavigationConfig } from '$lib/types/navigationConfig';

export const navigationConfig: NavigationConfig = {
	sections: [
		{
			key: 'cluster',
			label: 'Cluster',
			icon: 'server',
			items: [
				{
					key: 'nodes',
					label: 'Nodes',
					resourceType: 'nodes',
					icon: 'server',
					color: 'blue',
					description: 'Kubernetes worker and master nodes'
				},
				{
					key: 'namespaces',
					label: 'Namespaces',
					resourceType: 'namespaces',
					icon: 'folder',
					color: 'purple',
					description: 'Virtual clusters for resource isolation'
				}
			]
		},
		{
			key: 'workloads',
			label: 'Workloads',
			icon: 'cpu',
			items: [
				{
					key: 'pods',
					label: 'Pods',
					resourceType: 'pods',
					icon: 'box',
					color: 'green',
					description: 'Running instances of your applications'
				},
				{
					key: 'deployments',
					label: 'Deployments',
					resourceType: 'deployments',
					icon: 'rocket',
					color: 'blue',
					description: 'Declarative updates for Pods and ReplicaSets'
				},
				{
					key: 'statefulsets',
					label: 'StatefulSets',
					resourceType: 'statefulsets',
					icon: 'database',
					color: 'indigo',
					description: 'Manages stateful applications'
				},
				{
					key: 'daemonsets',
					label: 'DaemonSets',
					resourceType: 'daemonsets',
					icon: 'layers',
					color: 'orange',
					description: 'Ensures all nodes run a copy of a Pod'
				},
				{
					key: 'replicasets',
					label: 'ReplicaSets',
					resourceType: 'replicasets',
					icon: 'copy',
					color: 'gray',
					description: 'Maintains a stable set of replica Pods'
				},
				{
					key: 'jobs',
					label: 'Jobs',
					resourceType: 'jobs',
					icon: 'play',
					color: 'yellow',
					description: 'Creates one or more Pods to run a task'
				},
				{
					key: 'cronjobs',
					label: 'CronJobs',
					resourceType: 'cronjobs',
					icon: 'clock',
					color: 'pink',
					description: 'Creates Jobs on a repeating schedule'
				}
			]
		},
		{
			key: 'services',
			label: 'Services & Networking',
			icon: 'network',
			items: [
				{
					key: 'services',
					label: 'Services',
					resourceType: 'services',
					icon: 'globe',
					color: 'cyan',
					description: 'Exposes a set of Pods as a network service'
				},
				{
					key: 'ingresses',
					label: 'Ingresses',
					resourceType: 'ingresses',
					icon: 'arrow-right',
					color: 'teal',
					description: 'Manages external access to services'
				},
				{
					key: 'endpoints',
					label: 'Endpoints',
					resourceType: 'endpoints',
					icon: 'target',
					color: 'gray',
					description: 'Lists the endpoints for a service'
				},
				{
					key: 'networkpolicies',
					label: 'Network Policies',
					resourceType: 'networkpolicies',
					icon: 'shield',
					color: 'red',
					description: 'Controls traffic flow between Pods'
				}
			]
		},
		{
			key: 'configuration',
			label: 'Configuration & Storage',
			icon: 'settings',
			items: [
				{
					key: 'configmaps',
					label: 'ConfigMaps',
					resourceType: 'configmaps',
					icon: 'file-text',
					color: 'green',
					description: 'Stores configuration data in key-value pairs'
				},
				{
					key: 'secrets',
					label: 'Secrets',
					resourceType: 'secrets',
					icon: 'key',
					color: 'red',
					description: 'Stores sensitive data securely'
				},
				{
					key: 'persistentvolumes',
					label: 'Persistent Volumes',
					resourceType: 'persistentvolumes',
					icon: 'hard-drive',
					color: 'blue',
					description: 'Cluster-wide storage resources'
				},
				{
					key: 'persistentvolumeclaims',
					label: 'Persistent Volume Claims',
					resourceType: 'persistentvolumeclaims',
					icon: 'hard-drive',
					color: 'purple',
					description: 'Requests for storage by users'
				},
				{
					key: 'storageclasses',
					label: 'Storage Classes',
					resourceType: 'storageclasses',
					icon: 'database',
					color: 'indigo',
					description: 'Defines classes of storage'
				}
			]
		},
		{
			key: 'access',
			label: 'Access Control',
			icon: 'shield-check',
			items: [
				{
					key: 'serviceaccounts',
					label: 'Service Accounts',
					resourceType: 'serviceaccounts',
					icon: 'user',
					color: 'blue',
					description: 'Provides an identity for processes in a Pod'
				},
				{
					key: 'roles',
					label: 'Roles',
					resourceType: 'roles',
					icon: 'user-check',
					color: 'green',
					description: 'Defines permissions within a namespace'
				},
				{
					key: 'clusterroles',
					label: 'Cluster Roles',
					resourceType: 'clusterroles',
					icon: 'users',
					color: 'orange',
					description: 'Defines permissions cluster-wide'
				},
				{
					key: 'rolebindings',
					label: 'Role Bindings',
					resourceType: 'rolebindings',
					icon: 'link',
					color: 'yellow',
					description: 'Grants permissions to users or groups'
				},
				{
					key: 'clusterrolebindings',
					label: 'Cluster Role Bindings',
					resourceType: 'clusterrolebindings',
					icon: 'link-2',
					color: 'red',
					description: 'Grants cluster-wide permissions'
				}
			]
		},
		{
			key: 'custom',
			label: 'Custom Resources',
			icon: 'puzzle',
			items: [
				{
					key: 'ingressroutes',
					label: 'Ingress Routes',
					resourceType: 'ingressroutes',
					icon: 'route',
					color: 'blue',
					description: 'Traefik ingress routing rules'
				},
				{
					key: 'middlewares',
					label: 'Middlewares',
					resourceType: 'middlewares',
					icon: 'filter',
					color: 'purple',
					description: 'Traefik HTTP middlewares'
				},
				{
					key: 'tlsoptions',
					label: 'TLS Options',
					resourceType: 'tlsoptions',
					icon: 'lock',
					color: 'green',
					description: 'Traefik TLS configuration'
				},
				{
					key: 'certificates',
					label: 'Certificates',
					resourceType: 'certificates',
					icon: 'certificate',
					color: 'yellow',
					description: 'cert-manager SSL certificates'
				},
				{
					key: 'certificaterequests',
					label: 'Certificate Requests',
					resourceType: 'certificaterequests',
					icon: 'file-plus',
					color: 'orange',
					description: 'cert-manager certificate requests'
				},
				{
					key: 'issuers',
					label: 'Issuers',
					resourceType: 'issuers',
					icon: 'award',
					color: 'cyan',
					description: 'cert-manager certificate issuers'
				},
				{
					key: 'clusterissuers',
					label: 'Cluster Issuers',
					resourceType: 'clusterissuers',
					icon: 'award',
					color: 'teal',
					description: 'cert-manager cluster-wide issuers'
				}
			]
		}
	]
};
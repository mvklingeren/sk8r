import type { K8sResource } from '$lib/types/k8s';

// Utility function to get nested property value using dot notation
function getNestedValue(obj: any, path: string): any {
	return path.split('.').reduce((current, key) => current?.[key], obj);
}

export const columnFormatters = {
	// Pod specific formatters
	podReady(resource: K8sResource): string {
		const containerStatuses = resource.status?.containerStatuses || [];
		const readyCount = containerStatuses.filter((status: any) => status.ready).length;
		const totalCount = containerStatuses.length;
		return `${readyCount}/${totalCount}`;
	},

	podRestarts(resource: K8sResource): string {
		const containerStatuses = resource.status?.containerStatuses || [];
		const totalRestarts = containerStatuses.reduce((sum: number, status: any) => {
			return sum + (status.restartCount || 0);
		}, 0);
		return totalRestarts.toString();
	},

	// Deployment specific formatters
	deploymentReady(resource: K8sResource): string {
		const ready = resource.status?.readyReplicas || 0;
		const desired = resource.status?.replicas || 0;
		return `${ready}/${desired}`;
	},

	// Service specific formatters
	serviceExternalIp(resource: K8sResource): string {
		if (resource.spec?.type === 'LoadBalancer') {
			const ingress = resource.status?.loadBalancer?.ingress;
			if (ingress && ingress.length > 0) {
				return ingress.map((ing: any) => ing.ip || ing.hostname).join(', ');
			}
			return '<pending>';
		}
		if (resource.spec?.externalIPs) {
			return resource.spec.externalIPs.join(', ');
		}
		return '<none>';
	},

	servicePorts(resource: K8sResource): string {
		const ports = resource.spec?.ports || [];
		return ports.map((port: any) => {
			const protocol = port.protocol ? `/${port.protocol}` : '';
			if (port.nodePort) {
				return `${port.port}:${port.nodePort}${protocol}`;
			}
			return `${port.port}${protocol}`;
		}).join(', ');
	},

	// Ingress specific formatters
	ingressHosts(resource: K8sResource): string {
		const rules = resource.spec?.rules || [];
		const hosts = rules.map((rule: any) => rule.host || '*').filter(Boolean);
		return hosts.join(', ') || '*';
	},

	ingressAddresses(resource: K8sResource): string {
		const ingress = resource.status?.loadBalancer?.ingress || [];
		if (ingress.length === 0) return '';
		return ingress.map((ing: any) => ing.ip || ing.hostname).join(', ');
	},

	ingressPorts(resource: K8sResource): string {
		const tls = resource.spec?.tls;
		const ports = ['80'];
		if (tls && tls.length > 0) {
			ports.push('443');
		}
		return ports.join(', ');
	},

	// Node specific formatters
	nodeStatus(resource: K8sResource): string {
		const conditions = resource.status?.conditions || [];
		const readyCondition = conditions.find((c: any) => c.type === 'Ready');
		return readyCondition?.status === 'True' ? 'Ready' : 'NotReady';
	},

	nodeRoles(resource: K8sResource): string {
		const labels = resource.metadata?.labels || {};
		const roles: string[] = [];
		
		if (labels['node-role.kubernetes.io/control-plane'] || labels['node-role.kubernetes.io/master']) {
			roles.push('control-plane');
		}
		if (labels['node-role.kubernetes.io/worker']) {
			roles.push('worker');
		}
		
		// Check for other role labels
		Object.keys(labels).forEach(key => {
			if (key.startsWith('node-role.kubernetes.io/') && key !== 'node-role.kubernetes.io/control-plane' && key !== 'node-role.kubernetes.io/master' && key !== 'node-role.kubernetes.io/worker') {
				const role = key.replace('node-role.kubernetes.io/', '');
				if (!roles.includes(role)) {
					roles.push(role);
				}
			}
		});

		return roles.length > 0 ? roles.join(', ') : '<none>';
	},

	// Certificate specific formatters
	certificateReady(resource: K8sResource): string {
		const conditions = resource.status?.conditions || [];
		const readyCondition = conditions.find((c: any) => c.type === 'Ready');
		return readyCondition?.status || 'Unknown';
	},

	// Traefik specific formatters
	traefikHosts(resource: K8sResource): string {
		const routes = resource.spec?.routes || [];
		const hosts: string[] = [];
		
		routes.forEach((route: any) => {
			if (route.match) {
				// Extract Host() rules from match
				const hostMatches = route.match.match(/Host\(`([^`]+)`\)/g);
				if (hostMatches) {
					hostMatches.forEach((match: string) => {
						const host = match.match(/Host\(`([^`]+)`\)/)?.[1];
						if (host && !hosts.includes(host)) {
							hosts.push(host);
						}
					});
				}
			}
		});
		
		return hosts.join(', ') || '*';
	},

	// Generic formatters
	simpleList(resource: K8sResource, path: string): string {
		const value = getNestedValue(resource, path);
		if (Array.isArray(value)) {
			return value.join(', ');
		}
		return value || '';
	},

	objectKeys(resource: K8sResource, path: string): string {
		const value = getNestedValue(resource, path);
		if (value && typeof value === 'object') {
			return Object.keys(value).length.toString();
		}
		return '0';
	},

	accessModes(resource: K8sResource): string {
		const modes = resource.spec?.accessModes || [];
		return modes.map((mode: string) => {
			switch (mode) {
				case 'ReadWriteOnce': return 'RWO';
				case 'ReadOnlyMany': return 'ROX';
				case 'ReadWriteMany': return 'RWX';
				default: return mode;
			}
		}).join(', ');
	},

	// Job specific formatters
	jobDuration(resource: K8sResource): string {
		const startTime = resource.status?.startTime;
		const completionTime = resource.status?.completionTime;
		
		if (!startTime) return '';
		
		const start = new Date(startTime);
		const end = completionTime ? new Date(completionTime) : new Date();
		const diff = end.getTime() - start.getTime();
		
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		
		if (hours > 0) return `${hours}h${minutes % 60}m`;
		if (minutes > 0) return `${minutes}m${seconds % 60}s`;
		return `${seconds}s`;
	},

	// CronJob specific formatters
	cronJobActive(resource: K8sResource): string {
		const active = resource.status?.active || [];
		return active.length.toString();
	},

	// Event specific formatters
	eventObject(resource: K8sResource): string {
		const involvedObject = (resource as any).involvedObject;
		if (!involvedObject) return '';
		const kind = involvedObject.kind || '';
		const name = involvedObject.name || '';
		return kind && name ? `${kind}/${name}` : name || kind;
	},

	// Generic utility formatters
	arrayLength(resource: K8sResource, path: string): string {
		const value = getNestedValue(resource, path);
		if (Array.isArray(value)) {
			return value.length.toString();
		}
		return '0';
	},

	// Labels formatter - returns array of {key, value} objects for rendering as tags
	labels(resource: K8sResource): Array<{ key: string; value: string }> {
		const labels = resource.metadata?.labels || {};
		return Object.entries(labels).map(([key, value]) => ({ key, value: value as string }));
	}
};

// Helper function to extract value from resource using path and formatter
export function extractColumnValue(resource: K8sResource, path: string, formatter?: string): any {
	if (formatter && columnFormatters[formatter as keyof typeof columnFormatters]) {
		const formatterFn = columnFormatters[formatter as keyof typeof columnFormatters] as any;
		return formatterFn(resource, path);
	}
	
	return getNestedValue(resource, path);
}

// Helper function to get age string
export function getAge(timestamp: string | undefined): string {
	if (!timestamp) return 'Unknown';
	
	const created = new Date(timestamp);
	const now = new Date();
	const diff = now.getTime() - created.getTime();
	
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
	
	if (days > 0) return `${days}d${hours > 0 ? ` ${hours}h` : ''}`;
	if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
	return `${minutes}m`;
}
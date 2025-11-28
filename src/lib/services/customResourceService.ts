import { exec } from 'child_process';
import { promisify } from 'util';
import type { K8sListResponse, ResourceFilter } from '$lib/types/k8s';

const execAsync = promisify(exec);

export class CustomResourceService {
	async listCustomResources(resourceType: string, filter: ResourceFilter = {}): Promise<K8sListResponse> {
		const namespace = filter.namespace || '*';
		
		// Map resource types to their actual CRD names (use short names from kubectl api-resources)
		const crdMap: Record<string, string> = {
			'ingressroutes': 'ingressroutes',
			'middlewares': 'middlewares', 
			'tlsoptions': 'tlsoptions',
			'certificates': 'certificates',
			'certificaterequests': 'certificaterequests',
			'issuers': 'issuers',
			'clusterissuers': 'clusterissuers'
		};

		const crdName = crdMap[resourceType];
		if (!crdName) {
			throw new Error(`Unsupported custom resource type: ${resourceType}`);
		}

		try {
			let cmd: string;
			if (namespace === '*') {
				cmd = `kubectl get ${crdName} --all-namespaces -o json`;
			} else {
				cmd = `kubectl get ${crdName} -n ${namespace} -o json`;
			}

			const { stdout } = await execAsync(cmd);
			const result = JSON.parse(stdout);
			
			return result as K8sListResponse;
		} catch (error) {
			console.error(`Error fetching custom resource ${resourceType}:`, error);
			// Return empty list on error
			return {
				apiVersion: 'v1',
				kind: 'List',
				items: []
			} as K8sListResponse;
		}
	}

	async getCustomResource(resourceType: string, name: string, namespace: string = 'default'): Promise<any> {
		const crdMap: Record<string, string> = {
			'ingressroutes': 'ingressroutes',
			'middlewares': 'middlewares',
			'tlsoptions': 'tlsoptions',
			'certificates': 'certificates',
			'certificaterequests': 'certificaterequests',
			'issuers': 'issuers',
			'clusterissuers': 'clusterissuers'
		};

		const crdName = crdMap[resourceType];
		if (!crdName) {
			throw new Error(`Unsupported custom resource type: ${resourceType}`);
		}

		try {
			let cmd: string;
			if (resourceType === 'clusterissuers' || resourceType === 'clusterroles') {
				// Cluster-scoped resources
				cmd = `kubectl get ${crdName} ${name} -o json`;
			} else {
				cmd = `kubectl get ${crdName} ${name} -n ${namespace} -o json`;
			}

			const { stdout } = await execAsync(cmd);
			const result = JSON.parse(stdout);
			
			return result;
		} catch (error) {
			console.error(`Error fetching custom resource ${resourceType}/${name}:`, error);
			throw error;
		}
	}

	async deleteCustomResource(resourceType: string, name: string, namespace: string = 'default'): Promise<void> {
		const crdMap: Record<string, string> = {
			'ingressroutes': 'ingressroutes',
			'middlewares': 'middlewares',
			'tlsoptions': 'tlsoptions',
			'certificates': 'certificates',
			'certificaterequests': 'certificaterequests',
			'issuers': 'issuers',
			'clusterissuers': 'clusterissuers'
		};

		const crdName = crdMap[resourceType];
		if (!crdName) {
			throw new Error(`Unsupported custom resource type: ${resourceType}`);
		}

		try {
			const cmd = `kubectl delete ${crdName} ${name} -n ${namespace}`;
			await execAsync(cmd);
		} catch (error) {
			console.error(`Error deleting custom resource ${resourceType}/${name}:`, error);
			throw error;
		}
	}
}
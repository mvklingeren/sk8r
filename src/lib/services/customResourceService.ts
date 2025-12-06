import * as k8s from '@kubernetes/client-node';
import type { K8sListResponse, ResourceFilter } from '$lib/types/k8s';

// CRD definitions for known custom resources
const crdDefinitions: Record<string, { group: string; version: string; plural: string; namespaced: boolean }> = {
	'ingressroutes': { group: 'traefik.io', version: 'v1alpha1', plural: 'ingressroutes', namespaced: true },
	'middlewares': { group: 'traefik.io', version: 'v1alpha1', plural: 'middlewares', namespaced: true },
	'tlsoptions': { group: 'traefik.io', version: 'v1alpha1', plural: 'tlsoptions', namespaced: true },
	'certificates': { group: 'cert-manager.io', version: 'v1', plural: 'certificates', namespaced: true },
	'certificaterequests': { group: 'cert-manager.io', version: 'v1', plural: 'certificaterequests', namespaced: true },
	'issuers': { group: 'cert-manager.io', version: 'v1', plural: 'issuers', namespaced: true },
	'clusterissuers': { group: 'cert-manager.io', version: 'v1', plural: 'clusterissuers', namespaced: false }
};

export class CustomResourceService {
	private kc: k8s.KubeConfig;
	private customObjectsApi: k8s.CustomObjectsApi;

	constructor(server: string, token: string) {
		if (!server || !token) {
			throw new Error('Server URL and token are required');
		}

		// Remove trailing slash from server URL
		const cleanServer = server.replace(/\/+$/, '');

		this.kc = new k8s.KubeConfig();
		this.kc.loadFromOptions({
			clusters: [{
				name: 'current-cluster',
				server: cleanServer,
				skipTLSVerify: true
			}],
			users: [{
				name: 'current-user',
				token: token
			}],
			contexts: [{
				name: 'current-context',
				cluster: 'current-cluster',
				user: 'current-user'
			}],
			currentContext: 'current-context'
		});

		this.customObjectsApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
	}

	async listCustomResources(resourceType: string, filter: ResourceFilter = {}): Promise<K8sListResponse> {
		const namespace = filter.namespace || '*';
		const allNamespaces = namespace === '*';

		const crdDef = crdDefinitions[resourceType];
		if (!crdDef) {
			console.warn(`Unsupported custom resource type: ${resourceType}`);
			return {
				apiVersion: 'v1',
				kind: 'List',
				items: []
			} as K8sListResponse;
		}

		try {
			let result: any;
			
			if (crdDef.namespaced) {
				if (allNamespaces) {
					result = await this.customObjectsApi.listClusterCustomObject({
						group: crdDef.group,
						version: crdDef.version,
						plural: crdDef.plural
					});
				} else {
					result = await this.customObjectsApi.listNamespacedCustomObject({
						group: crdDef.group,
						version: crdDef.version,
						namespace,
						plural: crdDef.plural
					});
				}
			} else {
				// Cluster-scoped resource
				result = await this.customObjectsApi.listClusterCustomObject({
					group: crdDef.group,
					version: crdDef.version,
					plural: crdDef.plural
				});
			}

			// Handle response structure
			if (result.body) {
				return result.body as K8sListResponse;
			}
			return result as K8sListResponse;
		} catch (error) {
			console.error(`Error fetching custom resource ${resourceType}:`, error);
			// Return empty list on error (CRD might not be installed)
			return {
				apiVersion: 'v1',
				kind: 'List',
				items: []
			} as K8sListResponse;
		}
	}

	async getCustomResource(resourceType: string, name: string, namespace: string = 'default'): Promise<any> {
		const crdDef = crdDefinitions[resourceType];
		if (!crdDef) {
			throw new Error(`Unsupported custom resource type: ${resourceType}`);
		}

		try {
			let result: any;
			
			if (crdDef.namespaced) {
				result = await this.customObjectsApi.getNamespacedCustomObject({
					group: crdDef.group,
					version: crdDef.version,
					namespace,
					plural: crdDef.plural,
					name
				});
			} else {
				result = await this.customObjectsApi.getClusterCustomObject({
					group: crdDef.group,
					version: crdDef.version,
					plural: crdDef.plural,
					name
				});
			}

			if (result.body) {
				return result.body;
			}
			return result;
		} catch (error) {
			console.error(`Error fetching custom resource ${resourceType}/${name}:`, error);
			throw error;
		}
	}

	async deleteCustomResource(resourceType: string, name: string, namespace: string = 'default'): Promise<void> {
		const crdDef = crdDefinitions[resourceType];
		if (!crdDef) {
			throw new Error(`Unsupported custom resource type: ${resourceType}`);
		}

		try {
			if (crdDef.namespaced) {
				await this.customObjectsApi.deleteNamespacedCustomObject({
					group: crdDef.group,
					version: crdDef.version,
					namespace,
					plural: crdDef.plural,
					name
				});
			} else {
				await this.customObjectsApi.deleteClusterCustomObject({
					group: crdDef.group,
					version: crdDef.version,
					plural: crdDef.plural,
					name
				});
			}
		} catch (error) {
			console.error(`Error deleting custom resource ${resourceType}/${name}:`, error);
			throw error;
		}
	}
}

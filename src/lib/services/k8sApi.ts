import { KubeConfig, CoreV1Api, AppsV1Api, NetworkingV1Api, BatchV1Api, RbacAuthorizationV1Api, AutoscalingV1Api, StorageV1Api } from '@kubernetes/client-node';
import type { K8sResource, K8sListResponse, ResourceFilter } from '$lib/types/k8s';
import * as jsonpatch from 'fast-json-patch';

export class K8sApiService {
	private kc: KubeConfig;
	private coreApi: CoreV1Api;
	private appsApi: AppsV1Api;
	private networkingApi: NetworkingV1Api;
	private batchApi: BatchV1Api;
	private rbacApi: RbacAuthorizationV1Api;
	private autoscalingApi: AutoscalingV1Api;
	private storageApi: StorageV1Api;

	constructor() {
		try {
			this.kc = new KubeConfig();
			this.kc.loadFromDefault();
			
			console.log('KubeConfig loaded, current context:', this.kc.currentContext);
			
			this.coreApi = this.kc.makeApiClient(CoreV1Api);
			this.appsApi = this.kc.makeApiClient(AppsV1Api);
			this.networkingApi = this.kc.makeApiClient(NetworkingV1Api);
			this.batchApi = this.kc.makeApiClient(BatchV1Api);
			this.rbacApi = this.kc.makeApiClient(RbacAuthorizationV1Api);
			this.autoscalingApi = this.kc.makeApiClient(AutoscalingV1Api);
			this.storageApi = this.kc.makeApiClient(StorageV1Api);
		} catch (error) {
			console.error('Failed to initialize KubeConfig:', error);
			throw error;
		}
	}

	async listResources(resourceType: string, filter: ResourceFilter = {}): Promise<K8sListResponse> {
		const { namespace, labelSelector, fieldSelector, limit } = filter;
		// Ensure ns is always a string and never null/undefined
		let ns: string = 'default';
		if (namespace && typeof namespace === 'string') {
			ns = namespace;
		}
		
		console.log(`Listing ${resourceType} in namespace: "${ns}" (type: ${typeof ns}, original: "${namespace}", filter:`, filter, `)`);

		try {
			switch (resourceType) {
				case 'pods':
					console.log('About to call listNamespacedPod with namespace:', ns, 'type:', typeof ns);
					if (!ns || typeof ns !== 'string') {
						throw new Error(`Invalid namespace: ${ns} (type: ${typeof ns})`);
					}
					const pods = await this.coreApi.listNamespacedPod(
						ns,
						undefined, // pretty
						undefined, // allowWatchBookmarks
						undefined, // _continue
						fieldSelector,
						labelSelector,
						limit
					);
					return pods.body as any;

				case 'deployments':
					const deployments = await this.appsApi.listNamespacedDeployment(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return deployments.body as any;

				case 'services':
					const services = await this.coreApi.listNamespacedService(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return services.body as any;

				case 'configmaps':
					const configMaps = await this.coreApi.listNamespacedConfigMap(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return configMaps.body as any;

				case 'secrets':
					const secrets = await this.coreApi.listNamespacedSecret(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return secrets.body as any;

				case 'ingresses':
					const ingresses = await this.networkingApi.listNamespacedIngress(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return ingresses.body as any;

				case 'statefulsets':
					const statefulSets = await this.appsApi.listNamespacedStatefulSet(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return statefulSets.body as any;

				case 'daemonsets':
					const daemonSets = await this.appsApi.listNamespacedDaemonSet(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return daemonSets.body as any;

				case 'jobs':
					const jobs = await this.batchApi.listNamespacedJob(
						ns,
						undefined, // pretty
						undefined, // allowWatchBookmarks
						undefined, // _continue
						fieldSelector,
						labelSelector,
						limit
					);
					return jobs.body as any;

				case 'cronjobs':
					const cronJobs = await this.batchApi.listNamespacedCronJob(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return cronJobs.body as any;

				case 'replicasets':
					const replicaSets = await this.appsApi.listNamespacedReplicaSet(
						ns,
						undefined, // pretty
						undefined, // allowWatchBookmarks
						undefined, // _continue
						fieldSelector,
						labelSelector,
						limit
					);
					return replicaSets.body as any;

				case 'networkpolicies':
					const networkPolicies = await this.networkingApi.listNamespacedNetworkPolicy(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return networkPolicies.body as any;

				case 'pvc':
				case 'persistentvolumeclaims':
					const pvcs = await this.coreApi.listNamespacedPersistentVolumeClaim(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return pvcs.body as any;

				case 'serviceaccounts':
					const serviceAccounts = await this.coreApi.listNamespacedServiceAccount(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return serviceAccounts.body as any;

				case 'roles':
					const roles = await this.rbacApi.listNamespacedRole(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return roles.body as any;

				case 'rolebindings':
					const roleBindings = await this.rbacApi.listNamespacedRoleBinding(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return roleBindings.body as any;

				case 'resourcequotas':
					const resourceQuotas = await this.coreApi.listNamespacedResourceQuota(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return resourceQuotas.body as any;

				case 'hpa':
				case 'horizontalpodautoscalers':
					const hpas = await this.autoscalingApi.listNamespacedHorizontalPodAutoscaler(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return hpas.body as any;

				case 'limitranges':
					const limitRanges = await this.coreApi.listNamespacedLimitRange(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return limitRanges.body as any;

				case 'endpoints':
					const endpoints = await this.coreApi.listNamespacedEndpoints(
						ns,
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return endpoints.body as any;

				// Cluster-scoped resources (no namespace)
				case 'pv':
				case 'persistentvolumes':
					const pvs = await this.coreApi.listPersistentVolume(
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return pvs.body as any;

				case 'storageclasses':
					const storageClasses = await this.storageApi.listStorageClass(
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return storageClasses.body as any;

				case 'clusterroles':
					const clusterRoles = await this.rbacApi.listClusterRole(
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return clusterRoles.body as any;

				case 'clusterrolebindings':
					const clusterRoleBindings = await this.rbacApi.listClusterRoleBinding(
						undefined,
						undefined,
						undefined,
						fieldSelector,
						labelSelector,
						limit
					);
					return clusterRoleBindings.body as any;

				default:
					throw new Error(`Unsupported resource type: ${resourceType}`);
			}
		} catch (error) {
			console.error('Error listing resources:', error);
			throw error;
		}
	}

	async getResource(resourceType: string, name: string, namespace: string = 'default'): Promise<K8sResource> {
		try {
			switch (resourceType) {
				case 'pods':
					const pod = await this.coreApi.readNamespacedPod(name, namespace);
					return pod.body as any;

				case 'deployments':
					const deployment = await this.appsApi.readNamespacedDeployment(name, namespace);
					return deployment.body as any;

				case 'services':
					const service = await this.coreApi.readNamespacedService(name, namespace);
					return service.body as any;

				case 'configmaps':
					const configMap = await this.coreApi.readNamespacedConfigMap(name, namespace);
					return configMap.body as any;

				case 'secrets':
					const secret = await this.coreApi.readNamespacedSecret(name, namespace);
					return secret.body as any;

				default:
					throw new Error(`Unsupported resource type: ${resourceType}`);
			}
		} catch (error) {
			console.error('Error getting resource:', error);
			throw error;
		}
	}

	async patchResource(
		resourceType: string,
		name: string,
		namespace: string,
		originalResource: K8sResource,
		modifiedResource: K8sResource
	): Promise<K8sResource> {
		const patches = jsonpatch.compare(originalResource, modifiedResource);
		
		if (patches.length === 0) {
			return originalResource;
		}

		try {
			const options = {
				headers: {
					'Content-Type': 'application/json-patch+json'
				}
			};

			switch (resourceType) {
				case 'pods':
					const pod = await this.coreApi.patchNamespacedPod(
						name,
						namespace,
						patches,
						undefined,
						undefined,
						undefined,
						undefined,
						undefined,
						options
					);
					return pod.body as any;

				case 'deployments':
					const deployment = await this.appsApi.patchNamespacedDeployment(
						name,
						namespace,
						patches,
						undefined,
						undefined,
						undefined,
						undefined,
						undefined,
						options
					);
					return deployment.body as any;

				case 'services':
					const service = await this.coreApi.patchNamespacedService(
						name,
						namespace,
						patches,
						undefined,
						undefined,
						undefined,
						undefined,
						undefined,
						options
					);
					return service.body as any;

				case 'configmaps':
					const configMap = await this.coreApi.patchNamespacedConfigMap(
						name,
						namespace,
						patches,
						undefined,
						undefined,
						undefined,
						undefined,
						undefined,
						options
					);
					return configMap.body as any;

				default:
					throw new Error(`Unsupported resource type: ${resourceType}`);
			}
		} catch (error) {
			console.error('Error patching resource:', error);
			throw error;
		}
	}

	async deleteResource(resourceType: string, name: string, namespace: string = 'default'): Promise<void> {
		try {
			switch (resourceType) {
				case 'pods':
					await this.coreApi.deleteNamespacedPod(name, namespace);
					break;

				case 'deployments':
					await this.appsApi.deleteNamespacedDeployment(name, namespace);
					break;

				case 'services':
					await this.coreApi.deleteNamespacedService(name, namespace);
					break;

				case 'configmaps':
					await this.coreApi.deleteNamespacedConfigMap(name, namespace);
					break;

				case 'secrets':
					await this.coreApi.deleteNamespacedSecret(name, namespace);
					break;

				default:
					throw new Error(`Unsupported resource type: ${resourceType}`);
			}
		} catch (error) {
			console.error('Error deleting resource:', error);
			throw error;
		}
	}

	async listNamespaces(): Promise<string[]> {
		try {
			const namespaces = await this.coreApi.listNamespace();
			return namespaces.body.items.map(ns => ns.metadata?.name || '');
		} catch (error) {
			console.error('Error listing namespaces:', error);
			return ['default'];
		}
	}
}
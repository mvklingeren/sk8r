import * as k8s from '@kubernetes/client-node';
import type { K8sResource, K8sListResponse, ResourceFilter } from '$lib/types/k8s';
import { CustomResourceService } from './customResourceService';

// Create a simple wrapper that avoids the complex factory pattern
export class K8sApiServiceSimple {
	private kc: k8s.KubeConfig;
	private customResourceService: CustomResourceService;
	
	get kubeConfig(): k8s.KubeConfig {
		return this.kc;
	}

	constructor(token?: string) {
		this.kc = new k8s.KubeConfig();
		this.kc.loadFromDefault();

		if (token) {
			const user = this.kc.getCurrentUser();
			if (user) {
				// Clear existing authentication fields
				delete user.authProvider;
				delete user.exec;
				delete user.clientCertificate;
				delete user.clientKey;
				delete user.password;
				delete user.username;
				
				// Set the token for authentication
				user.token = token;
			}
		}

		this.customResourceService = new CustomResourceService();
	}

	async listResources(resourceType: string, filter: ResourceFilter = {}): Promise<K8sListResponse> {
		// Force namespace to be a string
		const namespace = String(filter.namespace || '*');
		
		// Ensure we have a valid namespace
		if (!namespace || typeof namespace !== 'string') {
			throw new Error(`Invalid namespace: ${namespace} (type: ${typeof namespace})`);
		}
		
		// Check if we should list resources from all namespaces
		const allNamespaces = namespace === '*';
		
		const k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
		const appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
		const batchApi = this.kc.makeApiClient(k8s.BatchV1Api);
		const networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
		const rbacApi = this.kc.makeApiClient(k8s.RbacAuthorizationV1Api);
		const autoscalingApi = this.kc.makeApiClient(k8s.AutoscalingV1Api);
		const storageApi = this.kc.makeApiClient(k8s.StorageV1Api);

		try {
			let result: any;
			
			switch (resourceType) {
				case 'pods':
					result = allNamespaces 
						? await k8sApi.listPodForAllNamespaces({})
						: await k8sApi.listNamespacedPod({ namespace });
					break;
					
				case 'deployments':
					result = allNamespaces 
						? await appsApi.listDeploymentForAllNamespaces({})
						: await appsApi.listNamespacedDeployment({ namespace });
					break;
					
				case 'services':
					result = allNamespaces 
						? await k8sApi.listServiceForAllNamespaces({})
						: await k8sApi.listNamespacedService({ namespace });
					break;
					
				case 'configmaps':
					result = allNamespaces 
						? await k8sApi.listConfigMapForAllNamespaces({})
						: await k8sApi.listNamespacedConfigMap({ namespace });
					break;
					
				case 'secrets':
					result = allNamespaces 
						? await k8sApi.listSecretForAllNamespaces({})
						: await k8sApi.listNamespacedSecret({ namespace });
					break;
					
				case 'ingresses':
					result = allNamespaces 
						? await networkingApi.listIngressForAllNamespaces({})
						: await networkingApi.listNamespacedIngress({ namespace });
					break;
					
				case 'statefulsets':
					result = allNamespaces 
						? await appsApi.listStatefulSetForAllNamespaces({})
						: await appsApi.listNamespacedStatefulSet({ namespace });
					break;
					
				case 'daemonsets':
					result = allNamespaces 
						? await appsApi.listDaemonSetForAllNamespaces({})
						: await appsApi.listNamespacedDaemonSet({ namespace });
					break;
					
				case 'replicasets':
					result = allNamespaces 
						? await appsApi.listReplicaSetForAllNamespaces({})
						: await appsApi.listNamespacedReplicaSet({ namespace });
					break;
					
				case 'jobs':
					result = allNamespaces 
						? await batchApi.listJobForAllNamespaces({})
						: await batchApi.listNamespacedJob({ namespace });
					break;
					
				case 'cronjobs':
					result = allNamespaces 
						? await batchApi.listCronJobForAllNamespaces({})
						: await batchApi.listNamespacedCronJob({ namespace });
					break;
					
				case 'networkpolicies':
					// NetworkPolicies don't have ForAllNamespaces method, handle manually
					if (allNamespaces) {
						result = { body: { items: [], apiVersion: 'networking.k8s.io/v1', kind: 'NetworkPolicyList' } };
					} else {
						result = await networkingApi.listNamespacedNetworkPolicy({ namespace });
					}
					break;
					
				case 'pvc':
				case 'persistentvolumeclaims':
					result = allNamespaces 
						? await k8sApi.listPersistentVolumeClaimForAllNamespaces({})
						: await k8sApi.listNamespacedPersistentVolumeClaim({ namespace });
					break;
					
			case 'endpoints':
				result = allNamespaces 
					? await k8sApi.listEndpointsForAllNamespaces({})
					: await k8sApi.listNamespacedEndpoints({ namespace });
				break;
				
			case 'events':
				result = allNamespaces 
					? await k8sApi.listEventForAllNamespaces({})
					: await k8sApi.listNamespacedEvent({ namespace });
				break;
					
				case 'serviceaccounts':
					result = allNamespaces 
						? await k8sApi.listServiceAccountForAllNamespaces({})
						: await k8sApi.listNamespacedServiceAccount({ namespace });
					break;
					
				case 'resourcequotas':
					// ResourceQuotas don't have ForAllNamespaces method in some versions
					if (allNamespaces) {
						result = { body: { items: [], apiVersion: 'v1', kind: 'ResourceQuotaList' } };
					} else {
						result = await k8sApi.listNamespacedResourceQuota({ namespace });
					}
					break;
					
				case 'hpa':
				case 'horizontalpodautoscalers':
					// HPAs don't have ForAllNamespaces method in some versions
					if (allNamespaces) {
						result = { body: { items: [], apiVersion: 'autoscaling/v1', kind: 'HorizontalPodAutoscalerList' } };
					} else {
						result = await autoscalingApi.listNamespacedHorizontalPodAutoscaler({ namespace });
					}
					break;
					
				case 'limitranges':
					// LimitRanges don't have ForAllNamespaces method in some versions
					if (allNamespaces) {
						result = { body: { items: [], apiVersion: 'v1', kind: 'LimitRangeList' } };
					} else {
						result = await k8sApi.listNamespacedLimitRange({ namespace });
					}
					break;
					
				case 'roles':
					// Roles don't have ForAllNamespaces method in some versions
					if (allNamespaces) {
						result = { body: { items: [], apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'RoleList' } };
					} else {
						result = await rbacApi.listNamespacedRole({ namespace });
					}
					break;
					
				case 'rolebindings':
					// RoleBindings don't have ForAllNamespaces method in some versions
					if (allNamespaces) {
						result = { body: { items: [], apiVersion: 'rbac.authorization.k8s.io/v1', kind: 'RoleBindingList' } };
					} else {
						result = await rbacApi.listNamespacedRoleBinding({ namespace });
					}
					break;
					
				// Cluster-scoped resources (no namespace)
				case 'namespaces':
					result = await k8sApi.listNamespace({});
					break;
					
				case 'nodes':
					result = await k8sApi.listNode({});
					break;
					
				case 'pv':
				case 'persistentvolumes':
					result = await k8sApi.listPersistentVolume({});
					break;
					
				case 'storageclasses':
					result = await storageApi.listStorageClass({});
					break;
					
				case 'clusterroles':
					result = await rbacApi.listClusterRole({});
					break;
					
				case 'clusterrolebindings':
					result = await rbacApi.listClusterRoleBinding({});
					break;

				case 'pdb':
				case 'poddisruptionbudgets':
					// Note: PodDisruptionBudgets require PolicyV1Api
					try {
						const policyApi = this.kc.makeApiClient(k8s.PolicyV1Api);
						result = await policyApi.listNamespacedPodDisruptionBudget({ namespace });
					} catch (error) {
						console.warn('PodDisruptionBudgets not supported or not available');
						result = { body: { items: [], apiVersion: 'policy/v1', kind: 'PodDisruptionBudgetList' } };
					}
					break;

				// Custom Resources (using kubectl)
				case 'ingressroutes':
				case 'middlewares':
				case 'tlsoptions':
				case 'certificates':
				case 'certificaterequests':
				case 'issuers':
				case 'clusterissuers':
					result = await this.customResourceService.listCustomResources(resourceType, { namespace });
					return result; // Return directly since CustomResourceService already returns the right format
					
				// These are often custom resources, return empty for now
				case 'volumesnapshots':
				case 'volumesnapshotclasses':
				case 'endpointslices':
					console.warn(`Resource type ${resourceType} not yet implemented`);
					result = { body: { items: [], apiVersion: 'v1', kind: 'List' } };
					break;
					
				default:
					console.warn(`Unsupported resource type: ${resourceType}`);
					result = { body: { items: [], apiVersion: 'v1', kind: 'List' } };
					break;
			}
			
			// Handle different response structures
			if (result.body) {
				return result.body as K8sListResponse;
			} else if (result.items) {
				return result as K8sListResponse;
			} else {
				console.error('Unexpected response structure:', result);
				return { items: [], apiVersion: '', kind: '' } as K8sListResponse;
			}
		} catch (error) {
			console.error('Error listing resources:', error);
			throw error;
		}
	}

	async getResource(
		resourceType: string,
		name: string,
		namespace = 'default'
	): Promise<K8sResource> {
		const k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
		const appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
		const batchApi = this.kc.makeApiClient(k8s.BatchV1Api);
		const networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
		const rbacApi = this.kc.makeApiClient(k8s.RbacAuthorizationV1Api);
		const storageApi = this.kc.makeApiClient(k8s.StorageV1Api);

		try {
			let result: any;

			switch (resourceType) {
				case 'pods':
					result = await k8sApi.readNamespacedPod({ name, namespace });
					break;
				case 'deployments':
					result = await appsApi.readNamespacedDeployment({ name, namespace });
					break;
				case 'services':
					result = await k8sApi.readNamespacedService({ name, namespace });
					break;
				case 'configmaps':
					result = await k8sApi.readNamespacedConfigMap({ name, namespace });
					break;
				case 'secrets':
					result = await k8sApi.readNamespacedSecret({ name, namespace });
					break;
				case 'ingresses':
					result = await networkingApi.readNamespacedIngress({ name, namespace });
					break;
				case 'statefulsets':
					result = await appsApi.readNamespacedStatefulSet({ name, namespace });
					break;
				case 'daemonsets':
					result = await appsApi.readNamespacedDaemonSet({ name, namespace });
					break;
				case 'jobs':
					result = await batchApi.readNamespacedJob({ name, namespace });
					break;
			case 'cronjobs':
				result = await batchApi.readNamespacedCronJob({ name, namespace });
				break;
			case 'events':
				result = await k8sApi.readNamespacedEvent({ name, namespace });
				break;
			// Cluster-scoped resources
			case 'namespaces':
				result = await k8sApi.readNamespace({ name });
				break;
			case 'nodes':
					result = await k8sApi.readNode({ name });
					break;
				case 'persistentvolumes':
					result = await k8sApi.readPersistentVolume({ name });
					break;
				case 'storageclasses':
					result = await storageApi.readStorageClass({ name });
					break;
				case 'clusterroles':
					result = await rbacApi.readClusterRole({ name });
					break;
				case 'clusterrolebindings':
					result = await rbacApi.readClusterRoleBinding({ name });
					break;
				// Custom Resources
				case 'ingressroutes':
				case 'middlewares':
				case 'certificates':
					result = await this.customResourceService.getCustomResource(resourceType, name, namespace);
					return result; // Return directly
				default:
					// Fallback for other custom resources or unhandled types
					try {
						const customResource = await this.customResourceService.getCustomResource(
							resourceType,
							name,
							namespace
						);
						return customResource;
					} catch (e) {
						throw new Error(`Get not implemented for resource type: ${resourceType}`);
					}
			}

			if (result.body) {
				return result.body as K8sResource;
			}
			return result as K8sResource;
		} catch (error) {
			console.error(`Error getting resource ${name} of type ${resourceType}:`, error);
			throw error;
		}
	}

	async deleteResource(resourceType: string, name: string, namespace: string = 'default'): Promise<void> {
		const k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
		const appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
		const batchApi = this.kc.makeApiClient(k8s.BatchV1Api);

		try {
			switch (resourceType) {
				case 'pods':
					await k8sApi.deleteNamespacedPod({ name, namespace });
					break;
					
				case 'deployments':
					await appsApi.deleteNamespacedDeployment({ name, namespace });
					break;
					
				case 'services':
					await k8sApi.deleteNamespacedService({ name, namespace });
					break;
					
				case 'configmaps':
					await k8sApi.deleteNamespacedConfigMap({ name, namespace });
					break;
					
				case 'secrets':
					await k8sApi.deleteNamespacedSecret({ name, namespace });
					break;
					
				case 'jobs':
					await batchApi.deleteNamespacedJob({ name, namespace });
					break;
					
				// Custom Resources
				case 'ingressroutes':
				case 'middlewares':
				case 'tlsoptions':
				case 'certificates':
					await this.customResourceService.deleteCustomResource(resourceType, name, namespace);
					break;
					
				default:
					throw new Error(`Delete not implemented for resource type: ${resourceType}`);
			}
		} catch (error) {
			console.error('Error deleting resource:', error);
			throw error;
		}
	}

	async listNamespaces(): Promise<string[]> {
		try {
			const k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
			const namespaces = await k8sApi.listNamespace({});
			return namespaces.body.items.map(ns => ns.metadata?.name || '').filter(name => name);
		} catch (error) {
			console.error('Error listing namespaces:', error);
			return ['default'];
		}
	}
}

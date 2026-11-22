import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { K8sApiServiceSimple } from '#lib/services/k8sApiSimple.js';
import { getK8sCredentials, unauthorizedResponse } from '#lib/server/k8sAuth.js';
import type { V1NodeCondition } from '@kubernetes/client-node';
import type { K8sResource } from '#lib/types/k8s.js';

export interface DashboardStats {
	nodes: { total: number; ready: number };
	pods: { total: number; running: number; pending: number; failed: number };
	deployments: { total: number; available: number };
	namespaces: { total: number };
	services: { total: number };
	pvcs: { total: number; bound: number };
}

export const GET: RequestHandler = async ({ request }) => {
	const credentials = getK8sCredentials(request);
	if (!credentials) {
		return unauthorizedResponse();
	}

	try {
		const k8sApi = new K8sApiServiceSimple(
			credentials.server,
			credentials.token,
			credentials.skipTLSVerify
		);

		// Fetch all resources in parallel
		const [nodes, pods, deployments, namespaces, services, pvcs] = await Promise.all([
			k8sApi.listResources('nodes', { namespace: '*' }).catch(() => ({ items: [] })),
			k8sApi.listResources('pods', { namespace: '*' }).catch(() => ({ items: [] })),
			k8sApi.listResources('deployments', { namespace: '*' }).catch(() => ({ items: [] })),
			k8sApi.listResources('namespaces', { namespace: '*' }).catch(() => ({ items: [] })),
			k8sApi.listResources('services', { namespace: '*' }).catch(() => ({ items: [] })),
			k8sApi
				.listResources('persistentvolumeclaims', { namespace: '*' })
				.catch(() => ({ items: [] }))
		]);

		// Calculate stats
		const stats: DashboardStats = {
			nodes: {
				total: nodes.items?.length || 0,
				ready:
					nodes.items?.filter((n: K8sResource) =>
						n.status?.conditions?.some(
							(c: V1NodeCondition) => c.type === 'Ready' && c.status === 'True'
						)
					).length || 0
			},
			pods: {
				total: pods.items?.length || 0,
				running: pods.items?.filter((p: K8sResource) => p.status?.phase === 'Running').length || 0,
				pending: pods.items?.filter((p: K8sResource) => p.status?.phase === 'Pending').length || 0,
				failed: pods.items?.filter((p: K8sResource) => p.status?.phase === 'Failed').length || 0
			},
			deployments: {
				total: deployments.items?.length || 0,
				available:
					deployments.items?.filter((d: K8sResource) => d.status?.availableReplicas > 0).length || 0
			},
			namespaces: {
				total: namespaces.items?.length || 0
			},
			services: {
				total: services.items?.length || 0
			},
			pvcs: {
				total: pvcs.items?.length || 0,
				bound: pvcs.items?.filter((p: K8sResource) => p.status?.phase === 'Bound').length || 0
			}
		};

		return json(stats);
	} catch (error) {
		console.error('Failed to fetch dashboard stats:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats' },
			{ status: 500 }
		);
	}
};

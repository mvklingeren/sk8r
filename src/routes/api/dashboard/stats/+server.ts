import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { K8sApiServiceSimple } from '$lib/services/k8sApiSimple';

export interface DashboardStats {
	nodes: { total: number; ready: number };
	pods: { total: number; running: number; pending: number; failed: number };
	deployments: { total: number; available: number };
	namespaces: { total: number };
	services: { total: number };
	pvcs: { total: number; bound: number };
}

export const GET: RequestHandler = async () => {
	try {
		const k8sApi = new K8sApiServiceSimple();
		
		// Fetch all resources in parallel
		const [nodes, pods, deployments, namespaces, services, pvcs] = await Promise.all([
			k8sApi.listResources('nodes', { namespace: '*' }).catch(() => ({ items: [] })),
			k8sApi.listResources('pods', { namespace: '*' }).catch(() => ({ items: [] })),
			k8sApi.listResources('deployments', { namespace: '*' }).catch(() => ({ items: [] })),
			k8sApi.listResources('namespaces', { namespace: '*' }).catch(() => ({ items: [] })),
			k8sApi.listResources('services', { namespace: '*' }).catch(() => ({ items: [] })),
			k8sApi.listResources('persistentvolumeclaims', { namespace: '*' }).catch(() => ({ items: [] }))
		]);

		// Calculate stats
		const stats: DashboardStats = {
			nodes: {
				total: nodes.items?.length || 0,
				ready: nodes.items?.filter((n: any) => 
					n.status?.conditions?.some((c: any) => c.type === 'Ready' && c.status === 'True')
				).length || 0
			},
			pods: {
				total: pods.items?.length || 0,
				running: pods.items?.filter((p: any) => p.status?.phase === 'Running').length || 0,
				pending: pods.items?.filter((p: any) => p.status?.phase === 'Pending').length || 0,
				failed: pods.items?.filter((p: any) => p.status?.phase === 'Failed').length || 0
			},
			deployments: {
				total: deployments.items?.length || 0,
				available: deployments.items?.filter((d: any) => 
					d.status?.availableReplicas > 0
				).length || 0
			},
			namespaces: {
				total: namespaces.items?.length || 0
			},
			services: {
				total: services.items?.length || 0
			},
			pvcs: {
				total: pvcs.items?.length || 0,
				bound: pvcs.items?.filter((p: any) => p.status?.phase === 'Bound').length || 0
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


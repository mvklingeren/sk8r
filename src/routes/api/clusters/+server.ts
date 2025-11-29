import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { KubeConfig } from '@kubernetes/client-node';

export const GET: RequestHandler = async () => {
	try {
		const kc = new KubeConfig();
		kc.loadFromDefault();
		
		const contexts = kc.getContexts();
		const currentContext = kc.getCurrentContext();
		const clusters = kc.getClusters();
		const users = kc.getUsers();
		
		// Build context information with cluster and user details
		const contextDetails = contexts.map(ctx => {
			const cluster = clusters.find(c => c.name === ctx.cluster);
			const user = users.find(u => u.name === ctx.user);
			
			return {
				name: ctx.name,
				cluster: ctx.cluster,
				user: ctx.user,
				namespace: ctx.namespace || 'default',
				isCurrent: ctx.name === currentContext,
				// Include server URL for display (without sensitive info)
				server: cluster?.server ? new URL(cluster.server).host : 'unknown'
			};
		});
		
		return json({
			contexts: contextDetails,
			currentContext,
			totalContexts: contexts.length
		});
	} catch (error) {
		console.error('Error loading kubeconfig contexts:', error);
		return json(
			{ 
				error: 'Failed to load kubeconfig contexts',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};


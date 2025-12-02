import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { K8sApiServiceSimple } from '$lib/services/k8sApiSimple';

export const GET: RequestHandler = async () => {
	try {
		const k8sApi = new K8sApiServiceSimple();
		const namespaces = await k8sApi.listNamespaces();
		
		// Sort namespaces alphabetically, but keep 'default' and 'kube-system' at top
		const priorityNamespaces = ['default', 'kube-system'];
		const sortedNamespaces = namespaces.sort((a, b) => {
			const aIndex = priorityNamespaces.indexOf(a);
			const bIndex = priorityNamespaces.indexOf(b);
			
			// Both are priority namespaces - sort by priority order
			if (aIndex !== -1 && bIndex !== -1) {
				return aIndex - bIndex;
			}
			// Only a is priority - a comes first
			if (aIndex !== -1) return -1;
			// Only b is priority - b comes first
			if (bIndex !== -1) return 1;
			// Neither is priority - sort alphabetically
			return a.localeCompare(b);
		});
		
		return json({
			namespaces: sortedNamespaces,
			total: sortedNamespaces.length
		});
	} catch (error) {
		console.error('Error listing namespaces:', error);
		return json(
			{ 
				error: 'Failed to list namespaces',
				message: error instanceof Error ? error.message : 'Unknown error',
				namespaces: ['default'] // Fallback to default namespace
			},
			{ status: 500 }
		);
	}
};


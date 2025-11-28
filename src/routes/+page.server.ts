import type { PageServerLoad } from './$types';
import { K8sApiServiceSimple } from '$lib/services/k8sApiSimple';
import type { K8sResource } from '$lib/types/k8s';
import { resourceMetricsConfig } from '$lib/config/metricsConfig';

export const load: PageServerLoad = async ({ url }) => {
	const resourceType = url.searchParams.get('resource') || '';
	const namespace = url.searchParams.get('namespace') || '*';
	
	// Debug logging
	// console.log('PageServerLoad - resourceType:', resourceType, 'namespace:', namespace, 'type:', typeof namespace);
	
	if (!resourceType || resourceType === 'overview') {
		return {
			resourceType: 'overview',
			resources: [],
			namespace
		};
	}

	try {
		const k8sApi = new K8sApiServiceSimple();
		// Ensure namespace is a string
		const namespaceStr = String(namespace || 'default');
		const response = await k8sApi.listResources(resourceType, { namespace: namespaceStr });
		
		// Debug logging
		// console.log('Response from k8sApi:', response);
		
		// Convert to serializable objects
		const serializedResources = (response?.items || []).map(item => 
			JSON.parse(JSON.stringify(item))
		);
		
		// Check if metrics are enabled for this resource type
		const metricsConfig = resourceMetricsConfig[resourceType];
		
		return {
			resourceType,
			resources: serializedResources,
			namespace: namespaceStr,
			metricsEnabled: metricsConfig?.enabled || false,
			metricsCharts: metricsConfig?.charts || []
		};
	} catch (error) {
		console.error('Failed to load resources:', error);
		return {
			resourceType,
			resources: [],
			namespace,
			error: error instanceof Error ? error.message : 'Failed to load resources',
			metricsEnabled: false,
			metricsCharts: []
		};
	}
};
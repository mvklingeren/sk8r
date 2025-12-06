import type { PageServerLoad } from './$types';
import { resourceMetricsConfig } from '$lib/config/metricsConfig';

// Data is now loaded client-side since credentials are stored in localStorage
// This server load just passes through the query params
export const load: PageServerLoad = async ({ url }) => {
	const resourceType = url.searchParams.get('resource') || '';
	const namespace = url.searchParams.get('namespace') || '*';
	
	if (!resourceType || resourceType === 'overview') {
		return {
			resourceType: 'overview',
			resources: [],
			namespace
		};
	}

	// Check if metrics are enabled for this resource type
	const metricsConfig = resourceMetricsConfig[resourceType];
	
	// Return empty resources - they will be loaded client-side
	return {
		resourceType,
		resources: [],
		namespace: String(namespace || 'default'),
		metricsEnabled: metricsConfig?.enabled || false,
		metricsCharts: metricsConfig?.charts || [],
		loadClientSide: true // Flag to indicate client-side loading is needed
	};
};

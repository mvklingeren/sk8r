import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { K8sApiServiceSimple } from '$lib/services/k8sApiSimple';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	const resourceType = url.searchParams.get('type');
	const namespace = url.searchParams.get('namespace') || '*';

	if (!query || !resourceType) {
		return json({ items: [] });
	}

	try {
		const k8sApi = new K8sApiServiceSimple();
		const response = await k8sApi.listResources(resourceType, { namespace });
		
		// Filter results by search query (name contains query)
		const filteredItems = (response?.items || []).filter(item => {
			const name = item.metadata?.name?.toLowerCase() || '';
			const searchQuery = query.toLowerCase();
			return name.includes(searchQuery);
		});

		// Convert to serializable objects and limit results
		const serializedItems = filteredItems.slice(0, 20).map(item => 
			JSON.parse(JSON.stringify(item))
		);

		return json({ items: serializedItems });
	} catch (error) {
		console.error(`Search error for ${resourceType}:`, error);
		return json({ items: [] });
	}
};
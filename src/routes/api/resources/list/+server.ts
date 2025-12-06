import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { K8sApiServiceSimple } from '$lib/services/k8sApiSimple';
import { getK8sCredentials, unauthorizedResponse } from '$lib/server/k8sAuth';

export const GET: RequestHandler = async ({ url, request }) => {
	const credentials = getK8sCredentials(request);
	if (!credentials) {
		return unauthorizedResponse();
	}

	const resourceType = url.searchParams.get('type');
	const namespace = url.searchParams.get('namespace') || '*';

	if (!resourceType) {
		return json({ error: 'Resource type is required' }, { status: 400 });
	}

	try {
		const k8sApi = new K8sApiServiceSimple(credentials.server, credentials.token);
		const response = await k8sApi.listResources(resourceType, { namespace });
		
		// Convert to serializable objects
		const serializedItems = (response?.items || []).map(item => 
			JSON.parse(JSON.stringify(item))
		);

		return json({
			items: serializedItems,
			apiVersion: response.apiVersion,
			kind: response.kind
		});
	} catch (error) {
		console.error(`Failed to list ${resourceType}:`, error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to list resources' },
			{ status: 500 }
		);
	}
};


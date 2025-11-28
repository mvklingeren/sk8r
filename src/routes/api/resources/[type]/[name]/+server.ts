import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { K8sApiServiceSimple } from '$lib/services/k8sApiSimple';

export const GET: RequestHandler = async ({ params, url }) => {
	const { type, name } = params;
	const namespace = url.searchParams.get('namespace') || 'default';

	try {
		const k8sApi = new K8sApiServiceSimple();
		const resource = await k8sApi.getResource(type, name, namespace);
		return json(resource);
	} catch (error) {
		console.error(`Failed to get resource ${type}/${name}:`, error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to get resource' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const { type, name } = params;
	const body = await request.json();
	const namespace = body.namespace || 'default';

	try {
		const k8sApi = new K8sApiServiceSimple();
		await k8sApi.deleteResource(type, name, namespace);
		
		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete resource:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to delete resource' },
			{ status: 500 }
		);
	}
};
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { K8sApiServiceSimple } from '$lib/services/k8sApiSimple';

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
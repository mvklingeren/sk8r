import type { PageServerLoad } from './$types';
import { K8sApiServiceSimple } from '$lib/services/k8sApiSimple';
import type { K8sResource } from '$lib/types/k8s';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url }) => {
	const { resourceType, name } = params;
	const namespace = url.searchParams.get('namespace') || 'default';

	try {
		const k8sApi = new K8sApiServiceSimple();
		const resource = await k8sApi.getResource(resourceType, name, namespace);

		// Convert to serializable object
		const serializedResource = JSON.parse(JSON.stringify(resource));

		return {
			resource: serializedResource,
			resourceType,
			name,
			namespace
		};
	} catch (err) {
		console.error(`Failed to load resource ${resourceType}/${name}:`, err);
		throw error(404, {
			message: `Resource ${resourceType}/${name} not found in namespace ${namespace}`
		});
	}
};
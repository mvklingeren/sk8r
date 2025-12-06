import type { PageServerLoad } from './$types';

// Data is now loaded client-side since credentials are stored in localStorage
// This server load just passes through the params
export const load: PageServerLoad = async ({ params, url }) => {
	const { resourceType, name } = params;
	const namespace = url.searchParams.get('namespace') || 'default';

	// Return empty resource - it will be loaded client-side
	return {
		resource: null,
		resourceType,
		name,
		namespace,
		loadClientSide: true // Flag to indicate client-side loading is needed
	};
};

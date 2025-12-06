import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This endpoint no longer uses kubeconfig - all clusters are managed client-side
export const GET: RequestHandler = async () => {
	// Return empty contexts - clusters are now stored in localStorage on the client
	return json({
		contexts: [],
		currentContext: '',
		totalContexts: 0
	});
};

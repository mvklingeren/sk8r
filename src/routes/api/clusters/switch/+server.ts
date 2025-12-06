import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This endpoint is no longer needed - cluster switching is handled client-side
export const POST: RequestHandler = async () => {
	return json(
		{ 
			error: 'Not implemented',
			message: 'Cluster switching is now handled client-side. Use the cluster selector in the UI.'
		},
		{ status: 410 } // Gone - endpoint is deprecated
	);
};

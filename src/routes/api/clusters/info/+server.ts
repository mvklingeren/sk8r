import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CoreV1Api } from '@kubernetes/client-node';
import { createKubeConfig, isServerAllowed } from '$lib/server/k8sAuth';
import { isK8sClientError, type K8sClientError } from '$lib/types/k8s';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { server, token, skipTLSVerify = false } = await request.json();

		if (!server || !token) {
			return json({ error: 'Server URL and token are required' }, { status: 400 });
		}

		// Trim whitespace from token (common when pasting)
		const trimmedToken = token.trim();
		// Remove trailing slash from server URL (important!)
		const trimmedServer = server.trim().replace(/\/+$/, '');

		// Validate server URL format
		let serverUrl: URL;
		try {
			serverUrl = new URL(trimmedServer);
		} catch {
			return json({ error: 'Invalid server URL format' }, { status: 400 });
		}

		if (!isServerAllowed(trimmedServer)) {
			return json({ error: 'Server is not in K8S_ALLOWED_SERVERS' }, { status: 403 });
		}

		const kc = createKubeConfig(trimmedServer, trimmedToken, skipTLSVerify === true);

		// Try to connect to cluster and verify credentials
		const coreApi = kc.makeApiClient(CoreV1Api);

		try {
			// Use listNamespace as the connectivity test
			await coreApi.listNamespace({ limit: 1 });

			// Connection successful - extract cluster name from server URL
			const clusterName = serverUrl.hostname || serverUrl.host;

			console.info('Cluster connection successful:', clusterName);

			return json({
				name: clusterName,
				version: 'unknown',
				platform: 'unknown'
			});
		} catch (err) {
			console.error('Failed to connect to cluster:', err);
			const apiError: K8sClientError = isK8sClientError(err) ? err : {};

			// Extract detailed error message from Kubernetes API response
			let errorMessage = 'Invalid token or server URL';
			if (apiError.body) {
				if (typeof apiError.body === 'string') {
					errorMessage = apiError.body;
				} else if (apiError.body.message) {
					errorMessage = apiError.body.message;
				} else if (apiError.body.reason) {
					errorMessage = apiError.body.reason;
				}
			} else if (apiError.message) {
				errorMessage = apiError.message;
			}

			// Determine the appropriate status code
			const statusCode = apiError.statusCode || apiError.response?.statusCode || 401;

			return json(
				{
					error: 'Failed to connect to cluster',
					message: errorMessage
				},
				{ status: statusCode }
			);
		}
	} catch (error) {
		console.error('Error fetching cluster info:', error);
		return json(
			{
				error: 'Failed to fetch cluster info',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

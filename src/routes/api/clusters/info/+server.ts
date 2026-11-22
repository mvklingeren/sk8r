import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CoreV1Api } from '@kubernetes/client-node';
import { createKubeConfig, isServerAllowed } from '$lib/server/k8sAuth';
import { k8sErrorMessage, k8sErrorStatus } from '$lib/types/k8s';

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
			const errorMessage = k8sErrorMessage(err, 'Invalid token or server URL');
			// No HTTP status means the API server wasn't reachable (DNS, refused, TLS)
			const statusCode = k8sErrorStatus(err) ?? 502;

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

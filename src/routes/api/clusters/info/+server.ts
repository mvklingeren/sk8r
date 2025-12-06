import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { KubeConfig, CoreV1Api } from '@kubernetes/client-node';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { server, token, skipTLSVerify = true } = await request.json();
		
		if (!server || !token) {
			return json(
				{ error: 'Server URL and token are required' },
				{ status: 400 }
			);
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
			return json(
				{ error: 'Invalid server URL format' },
				{ status: 400 }
			);
		}
		
		// Create a temporary KubeConfig with the provided server and token
		const kc = new KubeConfig();
		
		// Create a minimal kubeconfig structure
		kc.loadFromOptions({
			clusters: [{
				name: 'temp-cluster',
				server: trimmedServer,
				skipTLSVerify: skipTLSVerify
			}],
			users: [{
				name: 'temp-user',
				token: trimmedToken
			}],
			contexts: [{
				name: 'temp-context',
				cluster: 'temp-cluster',
				user: 'temp-user'
			}],
			currentContext: 'temp-context'
		});
		
		// Try to connect to cluster and verify credentials
		const coreApi = kc.makeApiClient(CoreV1Api);
		
		console.log('Testing cluster connectivity:', trimmedServer);
		
		try {
			// Use listNamespace as the connectivity test
			await coreApi.listNamespace({ limit: 1 });
			
			// Connection successful - extract cluster name from server URL
			const clusterName = serverUrl.hostname || serverUrl.host;
			
			console.log('Cluster connection successful:', clusterName);
			
			return json({
				name: clusterName,
				version: 'unknown',
				platform: 'unknown'
			});
		} catch (apiError: any) {
			console.error('Failed to connect to cluster:', apiError);
			
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


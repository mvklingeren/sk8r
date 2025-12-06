import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import https from 'https';

// Helper function to make HTTPS request with self-signed cert support
function httpsRequest(url: string, token: string): Promise<{ status: number; data: string }> {
	return new Promise((resolve, reject) => {
		const parsedUrl = new URL(url);
		
		const options: https.RequestOptions = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || 443,
			path: parsedUrl.pathname + parsedUrl.search,
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/json'
			},
			rejectUnauthorized: false // Allow self-signed certificates
		};
		
		const req = https.request(options, (res) => {
			let data = '';
			res.on('data', (chunk) => { data += chunk; });
			res.on('end', () => {
				resolve({ status: res.statusCode || 500, data });
			});
		});
		
		req.on('error', (error) => {
			reject(error);
		});
		
		req.setTimeout(10000, () => {
			req.destroy();
			reject(new Error('Request timeout'));
		});
		
		req.end();
	});
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { server, token } = await request.json();
		
		if (!server || !token) {
			return json(
				{ error: 'Server URL and token are required' },
				{ status: 400 }
			);
		}
		
		// Trim whitespace from token (common when pasting)
		const trimmedToken = token.trim();
		const trimmedServer = server.trim();
		
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
		
		// Use direct HTTPS request to test connectivity (same as curl -k command)
		// Remove trailing slash from server URL if present
		const cleanServer = trimmedServer.replace(/\/+$/, '');
		const apiUrl = `${cleanServer}/api/v1/namespaces?limit=1`;
		
		console.log('Testing cluster connectivity:');
		console.log('  Original server:', server);
		console.log('  Trimmed server:', trimmedServer);
		console.log('  Clean server:', cleanServer);
		console.log('  Full API URL:', apiUrl);
		
		try {
			const response = await httpsRequest(apiUrl, trimmedToken);
			
			console.log('Cluster response status:', response.status);
			
			if (response.status >= 400) {
				let errorMessage = `HTTP ${response.status}`;
				
				try {
					const errorJson = JSON.parse(response.data);
					if (errorJson.message) {
						errorMessage = errorJson.message;
					} else if (errorJson.reason) {
						errorMessage = errorJson.reason;
					}
				} catch {
					if (response.data) {
						errorMessage = response.data.substring(0, 200);
					}
				}
				
				return json(
					{ 
						error: 'Failed to connect to cluster',
						message: errorMessage
					},
					{ status: response.status }
				);
			}
			
			// Connection successful - extract cluster name from server URL
			const clusterName = serverUrl.hostname || serverUrl.host;
			
			console.log('Cluster connection successful:', clusterName);
			
			return json({
				name: clusterName,
				version: 'unknown',
				platform: 'unknown'
			});
		} catch (requestError: any) {
			console.error('Failed to connect to cluster:', requestError);
			
			// Handle network errors
			let errorMessage = 'Failed to connect to cluster';
			if (requestError.code === 'ECONNREFUSED') {
				errorMessage = 'Connection refused - check server URL and port';
			} else if (requestError.code === 'ENOTFOUND') {
				errorMessage = 'Server not found - check hostname';
			} else if (requestError.code === 'ETIMEDOUT' || requestError.message === 'Request timeout') {
				errorMessage = 'Connection timeout - server not reachable';
			} else if (requestError.code === 'ECONNRESET') {
				errorMessage = 'Connection reset by server';
			} else if (requestError.message) {
				errorMessage = requestError.message;
			}
			
			return json(
				{ 
					error: 'Failed to connect to cluster',
					message: errorMessage
				},
				{ status: 500 }
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


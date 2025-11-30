import type { RequestHandler } from './$types';

// This endpoint handles the initial HTTP request for WebSocket upgrade
// The actual WebSocket connection is handled by the Vite plugin (dev) or custom server (prod)
// in src/lib/server/websocket.ts

export const GET: RequestHandler = async ({ params, url, request }) => {
	const { namespace, name } = params;
	const container = url.searchParams.get('container') || '';
	const command = url.searchParams.get('command') || '/bin/sh';

	// Check for WebSocket upgrade header
	const upgradeHeader = request.headers.get('upgrade');
	
	if (upgradeHeader?.toLowerCase() !== 'websocket') {
		// Return info about the endpoint if not a WebSocket request
		return new Response(JSON.stringify({
			message: 'Pod exec endpoint - requires WebSocket upgrade',
			pod: name,
			namespace: namespace,
			container: container || 'default',
			command: command,
			usage: 'Connect via WebSocket to execute commands in the pod'
		}), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	// WebSocket upgrade is handled by the server/vite plugin
	// This response signals that upgrade should proceed
	return new Response(null, {
		status: 426,
		statusText: 'Upgrade Required',
		headers: {
			'Upgrade': 'websocket',
			'Connection': 'Upgrade'
		}
	});
};

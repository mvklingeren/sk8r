import type { Handle } from '@sveltejs/kit';

// Global WebSocket server reference (set by custom server or vite plugin)
declare global {
	// eslint-disable-next-line no-var
	var __wss: import('ws').WebSocketServer | undefined;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Handle WebSocket upgrade requests for exec endpoint
	const url = new URL(event.request.url);
	
	if (url.pathname.match(/^\/api\/pods\/[^/]+\/[^/]+\/exec$/)) {
		const upgradeHeader = event.request.headers.get('upgrade');
		
		if (upgradeHeader?.toLowerCase() === 'websocket') {
			// The actual WebSocket handling is done by the WebSocket server
			// This just marks the request as a WebSocket request
			// The vite plugin or production server handles the upgrade
			return new Response(null, {
				status: 426,
				statusText: 'Upgrade Required',
				headers: {
					'Content-Type': 'text/plain'
				}
			});
		}
	}

	return resolve(event);
};


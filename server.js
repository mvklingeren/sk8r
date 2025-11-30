// Custom production server with WebSocket support
import { handler } from './build/handler.js';
import express from 'express';
import { createServer } from 'http';
import { createWebSocketServer, handleUpgrade, cleanupAllConnections } from './build/server/lib/server/websocket.js';

const app = express();
const server = createServer(app);

// Create WebSocket server
const wss = createWebSocketServer();

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
	const url = new URL(request.url || '', `http://${request.headers.host}`);

	// Only handle exec endpoint
	if (url.pathname.match(/^\/api\/pods\/[^/]+\/[^/]+\/exec$/)) {
		handleUpgrade(wss, request, socket, head);
	} else {
		socket.destroy();
	}
});

// Let SvelteKit handle everything else
app.use(handler);

const port = process.env.PORT || 3000;
server.listen(port, () => {
	console.log(`Server listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
	console.log('SIGTERM received, shutting down...');
	cleanupAllConnections();
	server.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
});

process.on('SIGINT', () => {
	console.log('SIGINT received, shutting down...');
	cleanupAllConnections();
	server.close(() => {
		console.log('Server closed');
		process.exit(0);
	});
});


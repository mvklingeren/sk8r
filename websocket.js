// Standalone WebSocket server for pod exec functionality
import { WebSocketServer, WebSocket } from 'ws';
import { Exec } from '@kubernetes/client-node';
import * as stream from 'stream';
import { createKubeConfig } from './src/lib/server/k8sAuth.js';

// Store active connections for cleanup
const activeConnections = new Map();

export function createWebSocketServer() {
	const wss = new WebSocketServer({ noServer: true });

	wss.on('connection', (ws, request) => {
		const url = new URL(request.url || '', `http://${request.headers.host}`);
		const pathMatch = url.pathname.match(/^\/api\/pods\/([^/]+)\/([^/]+)\/exec$/);

		if (!pathMatch) {
			ws.close(1008, 'Invalid path');
			return;
		}

		// Extract credentials from query params (passed from client)
		const server = url.searchParams.get('server');
		const token = url.searchParams.get('token');
		const skipTLSVerify = url.searchParams.get('skipTLSVerify') !== 'false';

		if (!server || !token) {
			ws.send('\x1b[31mError: Missing Kubernetes credentials\x1b[0m\r\n');
			ws.close(1008, 'Missing credentials');
			return;
		}

		const namespace = decodeURIComponent(pathMatch[1]);
		const podName = decodeURIComponent(pathMatch[2]);
		const container = url.searchParams.get('container') || undefined;
		const command = url.searchParams.get('command') || '/bin/sh';

		handleExecConnection(ws, namespace, podName, container, command, server, token, skipTLSVerify);
	});

	return wss;
}

export function handleUpgrade(wss, request, socket, head) {
	const url = new URL(request.url || '', `http://${request.headers.host}`);

	// Only handle exec endpoint
	if (!url.pathname.match(/^\/api\/pods\/[^/]+\/[^/]+\/exec$/)) {
		socket.destroy();
		return;
	}

	wss.handleUpgrade(request, socket, head, (ws) => {
		wss.emit('connection', ws, request);
	});
}

async function handleExecConnection(ws, namespace, podName, container, command, server, token, skipTLSVerify = true) {
	const connectionId = `${namespace}/${podName}/${container || 'default'}/${Date.now()}`;

	console.log(`[WebSocket] New exec connection: ${connectionId}`);

	const kc = createKubeConfig(server, token, skipTLSVerify);
	const exec = new Exec(kc);

	// Track K8s connection for cleanup
	let k8sConnection = {
		stdin: null,
		close: () => {}
	};

	const cleanup = () => {
		console.log(`[WebSocket] Cleaning up connection: ${connectionId}`);
		k8sConnection.close();
		activeConnections.delete(connectionId);
	};

	activeConnections.set(connectionId, { ws, cleanup });

	const sendToClient = (data) => {
		if (ws.readyState === WebSocket.OPEN) {
			try {
				ws.send(typeof data === 'string' ? data : data.toString('utf8'));
			} catch (err) {
				console.error(`[WebSocket] Error sending to client:`, err);
			}
		}
	};

	try {
		// Create streams for K8s exec output
		const stdout = new stream.Writable({
			write(chunk, _encoding, callback) {
				sendToClient(chunk);
				callback();
			}
		});

		const stderr = new stream.Writable({
			write(chunk, _encoding, callback) {
				sendToClient(chunk);
				callback();
			}
		});

		// Handle incoming messages from browser
		ws.on('message', (data) => {
			const message = typeof data === 'string' ? data : data.toString('utf8');

			// Check if it's a control message (JSON)
			if (message.startsWith('{')) {
				try {
					const msg = JSON.parse(message);
					if (msg.type === 'resize' && msg.cols && msg.rows) {
						// Terminal resize - K8s exec doesn't support resize after connection
						// but we acknowledge it to prevent errors
						console.log(`[WebSocket] Resize request: ${msg.cols}x${msg.rows}`);
						return;
					}
				} catch {
					// Not valid JSON, treat as regular input
				}
			}

			// Send to K8s stdin
			if (k8sConnection.stdin && !k8sConnection.stdin.destroyed) {
				k8sConnection.stdin.write(message);
			}
		});

		ws.on('close', () => {
			console.log(`[WebSocket] Client disconnected: ${connectionId}`);
			cleanup();
		});

		ws.on('error', (error) => {
			console.error(`[WebSocket] Error: ${connectionId}`, error);
			cleanup();
		});

		// Send connection message
		sendToClient(`\x1b[32mConnecting to ${podName}${container ? `/${container}` : ''}...\x1b[0m\r\n`);

		// Try different shells
		const shellCommands =
			command === '/bin/sh' ? ['/bin/sh', '/bin/bash', '/bin/ash', 'sh'] : [command];

		let lastError = null;

		for (const shell of shellCommands) {
			try {
				console.log(`[WebSocket] Trying shell: ${shell}`);

				// Create a passthrough stream for stdin
				const stdinStream = new stream.PassThrough();
				k8sConnection.stdin = stdinStream;

				await new Promise((resolve, reject) => {
					exec.exec(
						namespace,
						podName,
						container || '',
						[shell],
						stdout,
						stderr,
						stdinStream,
						true, // tty
						(status) => {
							console.log(`[WebSocket] Exec completed for ${connectionId}:`, status);
							if (ws.readyState === WebSocket.OPEN) {
								sendToClient(`\r\n\x1b[33m[Session ended]\x1b[0m\r\n`);
								ws.close(1000, 'Session ended');
							}
						}
					)
						.then((execWebSocket) => {
							console.log(`[WebSocket] Exec started successfully with ${shell}`);

							// Store close function
							k8sConnection.close = () => {
								if (stdinStream && !stdinStream.destroyed) {
									stdinStream.end();
								}
								if (execWebSocket && typeof execWebSocket.close === 'function') {
									try {
										execWebSocket.close();
									} catch {
										// Ignore close errors
									}
								}
							};

							resolve();
						})
						.catch(reject);
				});

				// If we got here, the shell worked
				lastError = null;
				break;
			} catch (err) {
				lastError = err;
				console.log(`[WebSocket] Shell ${shell} failed:`, err.message);
			}
		}

		if (lastError) {
			throw lastError;
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[WebSocket] Exec error for ${connectionId}:`, message);
		sendToClient(`\r\n\x1b[31mError: ${message}\x1b[0m\r\n`);
		sendToClient(`\r\n\x1b[33mMake sure the pod is running and the container exists.\x1b[0m\r\n`);
		ws.close(1011, message);
		cleanup();
	}
}

// Cleanup all connections on shutdown
export function cleanupAllConnections() {
	console.log(`[WebSocket] Cleaning up ${activeConnections.size} connections`);
	for (const [, { cleanup }] of activeConnections) {
		cleanup();
	}
	activeConnections.clear();
}

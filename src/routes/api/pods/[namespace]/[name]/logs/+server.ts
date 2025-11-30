import type { RequestHandler } from './$types';
import { KubeConfig, Log } from '@kubernetes/client-node';
import { Readable } from 'stream';

export const GET: RequestHandler = async ({ params, url }) => {
	const { namespace, name } = params;
	const container = url.searchParams.get('container') || undefined;
	const follow = url.searchParams.get('follow') === 'true';
	const tailLines = parseInt(url.searchParams.get('tailLines') || '100', 10);
	const timestamps = url.searchParams.get('timestamps') === 'true';
	const previous = url.searchParams.get('previous') === 'true';

	// Load kubeconfig
	const kc = new KubeConfig();
	kc.loadFromDefault();

	const log = new Log(kc);

	// Create a readable stream for SSE
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			const sendEvent = (data: string, event?: string) => {
				let message = '';
				if (event) {
					message += `event: ${event}\n`;
				}
				message += `data: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(message));
			};

			try {
				// Send initial connection event
				sendEvent('Connected to pod logs', 'connected');

				// Create a writable stream to capture log output
				const logStream = new Readable({
					read() {}
				});

				// Buffer for incomplete lines
				let buffer = '';

				logStream.on('data', (chunk: Buffer) => {
					const text = chunk.toString('utf8');
					buffer += text;
					
					// Split by newlines and send complete lines
					const lines = buffer.split('\n');
					buffer = lines.pop() || ''; // Keep incomplete line in buffer
					
					for (const line of lines) {
						if (line.trim()) {
							sendEvent(line, 'log');
						}
					}
				});

				logStream.on('end', () => {
					// Send any remaining buffer content
					if (buffer.trim()) {
						sendEvent(buffer, 'log');
					}
					sendEvent('Log stream ended', 'end');
					controller.close();
				});

				logStream.on('error', (err) => {
					sendEvent(`Error: ${err.message}`, 'error');
					controller.close();
				});

				// Start streaming logs
				// Container is required, use first container if not specified
				const containerName = container || 'main';
				await log.log(
					namespace,
					name,
					containerName,
					logStream,
					{
						follow,
						tailLines,
						timestamps,
						previous
					}
				);

				// If not following, the stream will end naturally
				if (!follow) {
					// Give some time for the stream to complete
					await new Promise(resolve => setTimeout(resolve, 1000));
					logStream.push(null); // Signal end of stream
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				sendEvent(`Failed to stream logs: ${message}`, 'error');
				controller.close();
			}
		},

		cancel() {
			// Cleanup when client disconnects
			console.log('Client disconnected from log stream');
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'X-Accel-Buffering': 'no' // Disable nginx buffering
		}
	});
};


import type { RequestHandler } from './$types';
import { Watch, CoreV1Api, type CoreV1Event } from '@kubernetes/client-node';
import { getK8sCredentials, createKubeConfig } from '$lib/server/k8sAuth';

export const GET: RequestHandler = async ({ url, request }) => {
	const credentials = getK8sCredentials(request);
	if (!credentials) {
		return new Response(
			`event: error\ndata: ${JSON.stringify({ message: 'Missing or invalid Kubernetes credentials' })}\n\n`,
			{
				status: 401,
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive'
				}
			}
		);
	}

	const namespace = url.searchParams.get('namespace') || '';
	const fieldSelector = url.searchParams.get('fieldSelector') || '';
	const involvedObjectKind = url.searchParams.get('kind') || '';
	const involvedObjectName = url.searchParams.get('name') || '';

	// Build field selector for filtering by involved object
	let effectiveFieldSelector = fieldSelector;
	if (involvedObjectKind && involvedObjectName) {
		const kindFilter = `involvedObject.kind=${involvedObjectKind}`;
		const nameFilter = `involvedObject.name=${involvedObjectName}`;
		effectiveFieldSelector = effectiveFieldSelector
			? `${effectiveFieldSelector},${kindFilter},${nameFilter}`
			: `${kindFilter},${nameFilter}`;
	}

	// Load kubeconfig from credentials
	const kc = createKubeConfig(credentials.server, credentials.token, credentials.skipTLSVerify);
	const watch = new Watch(kc);
	const coreApi = kc.makeApiClient(CoreV1Api);

	// Create a readable stream for SSE
	let watchRequest: AbortController | undefined;
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			// Callbacks can fire after the client cancelled; closing twice throws and would crash the server
			const close = () => {
				try {
					controller.close();
				} catch {
					// already closed or cancelled
				}
			};
			// Watch from the list's version so existing events aren't replayed as ADDED
			let listResourceVersion: string | undefined;

			const sendEvent = (data: unknown, event?: string) => {
				try {
					let message = '';
					if (event) {
						message += `event: ${event}\n`;
					}
					message += `data: ${JSON.stringify(data)}\n\n`;
					controller.enqueue(encoder.encode(message));
				} catch {
					// Controller might be closed
				}
			};

			try {
				// Send initial connection event
				sendEvent({ message: 'Connected to events stream' }, 'connected');

				// First, fetch existing events to show recent history
				try {
					const existingEvents = namespace
						? await coreApi.listNamespacedEvent({
								namespace,
								fieldSelector: effectiveFieldSelector || undefined
							})
						: await coreApi.listEventForAllNamespaces({
								fieldSelector: effectiveFieldSelector || undefined
							});

					listResourceVersion = existingEvents.metadata?.resourceVersion;

					// Send existing events (last 50)
					const events = existingEvents.items || [];
					const recentEvents = events
						.sort((a, b) => {
							const aTime = new Date(
								a.lastTimestamp || a.metadata?.creationTimestamp || 0
							).getTime();
							const bTime = new Date(
								b.lastTimestamp || b.metadata?.creationTimestamp || 0
							).getTime();
							return bTime - aTime;
						})
						.slice(0, 50)
						.reverse();

					for (const event of recentEvents) {
						sendEvent(formatEvent(event, 'EXISTING'), 'event');
					}
				} catch (err) {
					console.error('Error fetching existing events:', err);
				}

				// Build watch path
				const watchPath = namespace ? `/api/v1/namespaces/${namespace}/events` : '/api/v1/events';

				const queryParams: Record<string, string> = { watch: 'true' };
				if (effectiveFieldSelector) {
					queryParams.fieldSelector = effectiveFieldSelector;
				}
				if (listResourceVersion) {
					queryParams.resourceVersion = listResourceVersion;
				}

				// Start watching for new events
				watchRequest = await watch.watch(
					watchPath,
					queryParams,
					(type, apiObj) => {
						sendEvent(formatEvent(apiObj, type), 'event');
					},
					(err) => {
						if (err) {
							sendEvent({ message: `Watch error: ${err.message}` }, 'error');
						}
						sendEvent({ message: 'Watch ended' }, 'end');
						close();
					}
				);
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				sendEvent({ message: `Failed to start events stream: ${message}` }, 'error');
				close();
			}
		},

		cancel() {
			watchRequest?.abort();
			console.info('Client disconnected from events stream');
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};

function formatEvent(event: CoreV1Event, watchType: string) {
	return {
		watchType,
		type: event.type || 'Normal',
		reason: event.reason || '',
		message: event.message || '',
		involvedObject: {
			kind: event.involvedObject?.kind || '',
			name: event.involvedObject?.name || '',
			namespace: event.involvedObject?.namespace || ''
		},
		source: {
			component: event.source?.component || '',
			host: event.source?.host || ''
		},
		firstTimestamp: event.firstTimestamp || event.metadata?.creationTimestamp || '',
		lastTimestamp: event.lastTimestamp || event.metadata?.creationTimestamp || '',
		count: event.count || 1,
		metadata: {
			name: event.metadata?.name || '',
			namespace: event.metadata?.namespace || '',
			uid: event.metadata?.uid || ''
		}
	};
}

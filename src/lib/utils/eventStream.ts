import { apiClient } from './apiClient';

export type StreamHandlers = Record<string, (data: string) => void>;

/**
 * Splits a server-sent-events text stream into events. Feed it chunks in any
 * split; it calls onEvent once per complete "event:/data:" block.
 */
export function createSSEParser(onEvent: (event: string, data: string) => void) {
	let buffer = '';
	return (chunk: string) => {
		buffer += chunk;
		let end;
		while ((end = buffer.indexOf('\n\n')) >= 0) {
			const block = buffer.slice(0, end);
			buffer = buffer.slice(end + 2);
			let event = 'message';
			const data: string[] = [];
			for (const line of block.split('\n')) {
				if (line.startsWith('event:')) event = line.slice(6).trim();
				else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
			}
			if (data.length) onEvent(event, data.join('\n'));
		}
	};
}

/**
 * EventSource replacement that sends the cluster auth headers (EventSource
 * can't set headers). Returns a function that closes the stream.
 * onClose gets an error only when the connection failed, not on normal end or close().
 * shortcut: no auto-reconnect; callers expose a manual refresh instead.
 */
export function openEventStream(
	url: string,
	handlers: StreamHandlers,
	onClose: (err?: unknown) => void
): () => void {
	const controller = new AbortController();
	const parse = createSSEParser((event, data) => handlers[event]?.(data));

	(async () => {
		const res = await apiClient(url, {
			signal: controller.signal,
			headers: { Accept: 'text/event-stream' }
		});
		if (!res.body) throw new Error(`HTTP ${res.status}`);
		const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			parse(value);
		}
	})().then(
		() => onClose(),
		(err) => {
			if (!controller.signal.aborted) onClose(err);
		}
	);

	return () => controller.abort();
}

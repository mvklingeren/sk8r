import { describe, expect, it } from 'vitest';
import { createSSEParser } from './eventStream';

describe('createSSEParser', () => {
	it('emits complete events across arbitrary chunk splits', () => {
		const seen: [string, string][] = [];
		const push = createSSEParser((e, d) => seen.push([e, d]));
		push('event: connected\ndata: {}\n\nevent: lo');
		expect(seen).toEqual([['connected', '{}']]);
		push('g\ndata: "line 1"\n');
		push('\ndata: plain\n\n');
		expect(seen).toEqual([
			['connected', '{}'],
			['log', '"line 1"'],
			['message', 'plain']
		]);
	});

	it('joins multi-line data and skips comment-only blocks', () => {
		const seen: [string, string][] = [];
		const push = createSSEParser((e, d) => seen.push([e, d]));
		push(': keepalive\n\nevent: error\ndata: a\ndata: b\n\n');
		expect(seen).toEqual([['error', 'a\nb']]);
	});
});

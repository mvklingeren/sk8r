import { describe, expect, it } from 'vitest';
import { normalizeServerUrl } from './serverUrl';

describe('normalizeServerUrl', () => {
	it('adds https and the default API port to bare hosts', () => {
		expect(normalizeServerUrl(' k8s.example.com/ ')).toBe('https://k8s.example.com:6443');
		expect(normalizeServerUrl('10.0.0.1:8443')).toBe('https://10.0.0.1:8443');
	});

	it('keeps full https URLs and strips the trailing slash', () => {
		expect(normalizeServerUrl('https://k8s.example.com:6443/')).toBe(
			'https://k8s.example.com:6443'
		);
	});

	it('rejects empty input, plain http and junk', () => {
		expect(() => normalizeServerUrl('  ')).toThrow(/required/);
		expect(() => normalizeServerUrl('http://k8s.example.com')).toThrow(/HTTPS/);
		expect(() => normalizeServerUrl('<script>')).toThrow(/Invalid/);
	});
});

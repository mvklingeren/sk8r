import { afterEach, describe, expect, it, vi } from 'vitest';
import { getK8sCredentials, isServerAllowed } from './k8sAuth';

const req = (headers: Record<string, string>) => new Request('http://x', { headers });

describe('getK8sCredentials', () => {
	it('returns null without token or server', () => {
		expect(getK8sCredentials(req({}))).toBeNull();
		expect(getK8sCredentials(req({ Authorization: 'Bearer t' }))).toBeNull();
		expect(getK8sCredentials(req({ 'X-K8s-Server': 'https://k' }))).toBeNull();
		expect(
			getK8sCredentials(req({ Authorization: 'Bearer ', 'X-K8s-Server': 'https://k' }))
		).toBeNull();
	});

	it('parses token, trims server slash, reads TLS flag', () => {
		expect(
			getK8sCredentials(
				req({
					Authorization: 'bearer abc',
					'X-K8s-Server': 'https://k:6443//',
					'X-K8s-Skip-TLS': 'false'
				})
			)
		).toEqual({ server: 'https://k:6443', token: 'abc', skipTLSVerify: false });
	});
});

describe('TLS and server allowlist', () => {
	const base = { Authorization: 'Bearer t', 'X-K8s-Server': 'https://k:6443' };
	afterEach(() => vi.unstubAllEnvs());

	it('verifies TLS unless the client explicitly opts out', () => {
		expect(getK8sCredentials(req(base))?.skipTLSVerify).toBe(false);
		expect(getK8sCredentials(req({ ...base, 'X-K8s-Skip-TLS': 'true' }))?.skipTLSVerify).toBe(true);
	});

	it('allows any server when K8S_ALLOWED_SERVERS is unset', () => {
		expect(isServerAllowed('https://anything')).toBe(true);
	});

	it('only accepts listed servers when K8S_ALLOWED_SERVERS is set', () => {
		vi.stubEnv('K8S_ALLOWED_SERVERS', 'https://a:6443/, https://k:6443');
		expect(isServerAllowed('https://a:6443')).toBe(true);
		expect(getK8sCredentials(req(base))).not.toBeNull();
		expect(
			getK8sCredentials(req({ ...base, 'X-K8s-Server': 'http://169.254.169.254' }))
		).toBeNull();
	});
});

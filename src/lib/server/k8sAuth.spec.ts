import { describe, expect, it } from 'vitest';
import { getK8sCredentials } from './k8sAuth';

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

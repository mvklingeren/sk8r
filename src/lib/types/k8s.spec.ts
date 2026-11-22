import { describe, expect, it } from 'vitest';
import { ApiException } from '@kubernetes/client-node';
import { k8sErrorMessage, k8sErrorStatus } from './k8s';

const status404 = JSON.stringify({
	kind: 'Status',
	message: 'deployments.apps "web" not found',
	reason: 'NotFound',
	code: 404
});

describe('k8sErrorStatus', () => {
	it('reads the 1.x ApiException code and pre-1.0 shapes', () => {
		expect(k8sErrorStatus(new ApiException(404, 'x', status404, {}))).toBe(404);
		expect(k8sErrorStatus({ statusCode: 403 })).toBe(403);
		expect(k8sErrorStatus({ response: { statusCode: 401 } })).toBe(401);
	});

	it('ignores string codes from network errors and non-objects', () => {
		expect(k8sErrorStatus(Object.assign(new Error('x'), { code: 'ECONNREFUSED' }))).toBeUndefined();
		expect(k8sErrorStatus(null)).toBeUndefined();
	});
});

describe('k8sErrorMessage', () => {
	it('prefers the Status message from a 1.x JSON text body', () => {
		expect(k8sErrorMessage(new ApiException(404, 'x', status404, {}))).toBe(
			'deployments.apps "web" not found'
		);
	});

	it('falls back to reason, raw text body, error message, then the fallback', () => {
		expect(k8sErrorMessage({ body: { reason: 'Forbidden' } })).toBe('Forbidden');
		expect(k8sErrorMessage({ body: 'plain text' })).toBe('plain text');
		expect(k8sErrorMessage(new ApiException(401, 'Unauthorized', undefined, {}))).toBe(
			'HTTP 401: Unauthorized'
		);
		expect(k8sErrorMessage(new Error('connect ECONNREFUSED'))).toBe('connect ECONNREFUSED');
		expect(k8sErrorMessage(undefined, 'nope')).toBe('nope');
	});
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { K8sResource } from '#lib/types/k8s.js';
import { columnFormatters, extractColumnValue, getAge } from './columnFormatters';

const res = (r: Record<string, unknown>) =>
	({ apiVersion: 'v1', kind: 'X', metadata: { name: 'n' }, ...r }) as unknown as K8sResource;

describe('columnFormatters', () => {
	it('counts ready containers and restarts', () => {
		const pod = res({
			status: {
				containerStatuses: [
					{ ready: true, restartCount: 2 },
					{ ready: false, restartCount: 3 }
				]
			}
		});
		expect(columnFormatters.podReady(pod)).toBe('1/2');
		expect(columnFormatters.podRestarts(pod)).toBe('5');
		expect(columnFormatters.podReady(res({}))).toBe('0/0');
	});

	it('formats service external IPs and ports', () => {
		const lb = (ingress?: unknown[]) =>
			res({ spec: { type: 'LoadBalancer' }, status: { loadBalancer: { ingress } } });
		expect(columnFormatters.serviceExternalIp(lb())).toBe('<pending>');
		expect(columnFormatters.serviceExternalIp(lb([{ ip: '1.2.3.4' }, { hostname: 'h' }]))).toBe(
			'1.2.3.4, h'
		);
		expect(columnFormatters.serviceExternalIp(res({ spec: { type: 'ClusterIP' } }))).toBe('<none>');
		expect(
			columnFormatters.servicePorts(
				res({
					spec: {
						ports: [
							{ port: 80, protocol: 'TCP' },
							{ port: 443, nodePort: 30443 }
						]
					}
				})
			)
		).toBe('80/TCP, 443:30443');
	});
});

describe('extractColumnValue', () => {
	it('reads nested paths and tolerates missing ones', () => {
		const r = res({ spec: { a: { b: 7 } } });
		expect(extractColumnValue(r, 'spec.a.b')).toBe(7);
		expect(extractColumnValue(r, 'spec.missing.b')).toBeUndefined();
	});

	it('uses a named formatter when given', () => {
		expect(extractColumnValue(res({ status: { containerStatuses: [] } }), '', 'podReady')).toBe(
			'0/0'
		);
	});
});

describe('getAge', () => {
	afterEach(() => vi.useRealTimers());

	it('formats days, hours and minutes', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-10T12:00:00Z'));
		expect(getAge(undefined)).toBe('Unknown');
		expect(getAge('2026-01-08T10:00:00Z')).toBe('2d 2h');
		expect(getAge('2026-01-10T09:30:00Z')).toBe('2h 30m');
		expect(getAge('2026-01-10T11:55:00Z')).toBe('5m');
	});
});

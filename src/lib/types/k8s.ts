export type JsonValue =
	string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface K8sResource {
	apiVersion: string;
	kind: string;
	metadata: {
		name: string;
		namespace?: string;
		labels?: Record<string, string>;
		annotations?: Record<string, string>;
		creationTimestamp?: string;
		uid?: string;
		resourceVersion?: string;
	};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic over every kind; formatters and many .svelte components read kind-specific fields
	spec?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic over every kind; formatters and many .svelte components read kind-specific fields
	status?: any;
}

export interface K8sResourceType {
	kind: string;
	apiVersion: string;
	namespaced: boolean;
	schema?: unknown;
}

export interface K8sListResponse<T = K8sResource> {
	apiVersion: string;
	kind: string;
	items: T[];
	metadata?: {
		continue?: string;
		remainingItemCount?: number;
		resourceVersion?: string;
	};
}

export interface ResourceFilter {
	namespace?: string;
	labelSelector?: string;
	fieldSelector?: string;
	limit?: number;
}

/**
 * HTTP status of an error thrown by @kubernetes/client-node: 1.x ApiException has a numeric
 * `code`; pre-1.0 used `statusCode` / `response.statusCode`. Undefined for network errors.
 */
export function k8sErrorStatus(err: unknown): number | undefined {
	if (typeof err !== 'object' || err === null) return undefined;
	const e = err as { code?: unknown; statusCode?: unknown; response?: { statusCode?: unknown } };
	// Node system errors also have `code`, but as a string (ECONNREFUSED), so require a number
	for (const status of [e.code, e.statusCode, e.response?.statusCode]) {
		if (typeof status === 'number') return status;
	}
	return undefined;
}

/**
 * Readable message for a @kubernetes/client-node error: the API's Status.message when the body
 * has one (1.x passes it as JSON text), else the error's own message.
 */
export function k8sErrorMessage(err: unknown, fallback = 'Unknown error'): string {
	if (typeof err !== 'object' || err === null) return fallback;
	const e = err as { body?: unknown; message?: unknown };
	let body = e.body;
	if (typeof e.body === 'string') {
		const text = e.body.trim();
		try {
			body = JSON.parse(text);
		} catch {
			if (text) return text;
		}
	}
	if (typeof body === 'object' && body !== null) {
		const { message, reason } = body as { message?: unknown; reason?: unknown };
		if (typeof message === 'string' && message) return message;
		if (typeof reason === 'string' && reason) return reason;
	}
	if (typeof e.message !== 'string' || !e.message) return fallback;
	// 1.x ApiException.message is "HTTP-Code: 401\nMessage: Unauthorized\nBody: ...\nHeaders: ..."
	const short = /^HTTP-Code: (\d+)\nMessage: (.*)$/m.exec(e.message);
	return short ? `HTTP ${short[1]}: ${short[2]}` : e.message;
}

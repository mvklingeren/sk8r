export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

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
 * Fields read from errors thrown by @kubernetes/client-node calls. 1.x throws ApiException
 * (`code`, string `body`); `statusCode`, `response` and an object `body` are pre-1.0 shapes.
 */
export interface K8sClientError {
	message?: string;
	statusCode?: number;
	response?: { statusCode?: number };
	body?: string | { message?: string; reason?: string };
}

export function isK8sClientError(err: unknown): err is K8sClientError {
	return typeof err === 'object' && err !== null;
}

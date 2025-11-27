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
	spec?: any;
	status?: any;
}

export interface K8sResourceType {
	kind: string;
	apiVersion: string;
	namespaced: boolean;
	schema?: any;
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
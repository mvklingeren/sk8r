export interface MetricDataPoint {
	timestamp: Date;
	value: number;
}

export interface MetricSeries {
	label: string;
	data: MetricDataPoint[];
	color?: string; // Optional color override for multi-series charts
}

export interface MetricChartConfig {
	id: string;
	type: 'line' | 'area' | 'bar';
	title: string;
	height?: number; // pixels, defaults to 300
	// Option 1: Use a single PromQL query
	query?: string; // PromQL query string
	// Option 2: Use multiple queries for multi-series charts
	queries?: {
		label: string;
		query: string;
		color: string;
	}[];
	unit?: string; // e.g., 'cores', '%', 'bytes'
	color?: string; // Chart color (for single query)
	fill?: boolean; // Fill area under the line (for line charts)
	// Option 3: Use metrics array for non-Prometheus sources
	metrics?: {
		label: string;
		metricPath: string; // e.g., "usage.cpu", "usage.memory"
		color: string;
		unit?: 'percentage' | 'bytes' | 'cores' | 'custom';
		customUnit?: string;
		aggregation?: 'sum' | 'average' | 'max' | 'min';
	}[];
	timeRange?: number; // minutes to show, defaults to 5
	refreshInterval?: number; // seconds, defaults to 30
	yAxis?: {
		min?: number;
		max?: number;
		suggestedMax?: number;
	};
}

export interface ResourceMetricsConfig {
	[resourceType: string]: {
		enabled: boolean;
		charts: MetricChartConfig[];
		metricsEndpoint?: string; // Custom endpoint if needed
	};
}

export interface NodeMetrics {
	metadata: {
		name: string;
		selfLink: string;
		creationTimestamp: string;
	};
	timestamp: string;
	window: string;
	usage: {
		cpu: string; // e.g., "138896414n"
		memory: string; // e.g., "1597440Ki"
	};
}

export interface MetricsApiResponse {
	kind: string;
	apiVersion: string;
	metadata: {
		selfLink: string;
	};
	items: NodeMetrics[];
}
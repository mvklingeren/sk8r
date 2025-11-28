import { env } from '$env/dynamic/private';

export interface PrometheusQueryResponse {
	status: 'success' | 'error';
	data: {
		resultType: 'matrix' | 'vector' | 'scalar' | 'string';
		result: PrometheusResult[];
	};
	errorType?: string;
	error?: string;
}

export interface PrometheusResult {
	metric: Record<string, string>;
	// For range vectors (query_range)
	values?: [number, string][];
	// For instant vectors (query)
	value?: [number, string];
}

export interface RangeQueryOptions {
	/** Start time in seconds since epoch */
	start?: number;
	/** End time in seconds since epoch */
	end?: number;
	/** Time range in minutes (alternative to start/end) */
	rangeMinutes?: number;
	/** Step interval in seconds (default: 15) */
	step?: number;
}

export class PrometheusService {
	private prometheusUrl: string;

	constructor() {
		if (!env.PROMETHEUS_URL) {
			throw new Error('PROMETHEUS_URL environment variable is not set.');
		}
		this.prometheusUrl = env.PROMETHEUS_URL;
	}

	/**
	 * Execute an instant query - returns a single data point (current value)
	 * Use this for gauges, current status, etc.
	 */
	async query(promql: string): Promise<PrometheusQueryResponse> {
		const queryUrl = new URL('/api/v1/query', this.prometheusUrl);
		queryUrl.searchParams.append('query', promql);

		try {
			const response = await fetch(queryUrl.toString());
			if (!response.ok) {
				throw new Error(`Prometheus query failed with status ${response.status}: ${await response.text()}`);
			}
			const data = await response.json();
			return data as PrometheusQueryResponse;
		} catch (error) {
			console.error('Error querying Prometheus:', error);
			throw error;
		}
	}

	/**
	 * Execute a range query - returns multiple data points over time
	 * Use this for line charts, historical data, etc.
	 */
	async queryRange(promql: string, options: RangeQueryOptions = {}): Promise<PrometheusQueryResponse> {
		const queryUrl = new URL('/api/v1/query_range', this.prometheusUrl);
		queryUrl.searchParams.append('query', promql);

		const now = Math.floor(Date.now() / 1000);
		const rangeMinutes = options.rangeMinutes ?? 5;
		const end = options.end ?? now;
		const start = options.start ?? (end - rangeMinutes * 60);
		const step = options.step ?? 15;

		queryUrl.searchParams.append('start', start.toString());
		queryUrl.searchParams.append('end', end.toString());
		queryUrl.searchParams.append('step', step.toString());

		try {
			const response = await fetch(queryUrl.toString());
			if (!response.ok) {
				throw new Error(`Prometheus range query failed with status ${response.status}: ${await response.text()}`);
			}
			const data = await response.json();
			return data as PrometheusQueryResponse;
		} catch (error) {
			console.error('Error querying Prometheus range:', error);
			throw error;
		}
	}
}

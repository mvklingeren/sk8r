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
	// For range vectors
	values?: [number, string][];
	// For instant vectors
	value?: [number, string];
}

export class PrometheusService {
	private prometheusUrl: string;

	constructor() {
		if (!env.PROMETHEUS_URL) {
			throw new Error('PROMETHEUS_URL environment variable is not set.');
		}
		this.prometheusUrl = env.PROMETHEUS_URL;
	}

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
}

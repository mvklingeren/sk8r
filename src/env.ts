import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PROMETHEUS_URL: {
		// Optional: the dashboard shows "not configured" when unset
		schema: (value) => value || undefined,
		description: 'Base URL of the Prometheus server, e.g. http://prometheus:9090'
	}
});

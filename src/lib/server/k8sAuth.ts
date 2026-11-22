import { json } from '@sveltejs/kit';
import { KubeConfig } from '@kubernetes/client-node';

export interface K8sCredentials {
	server: string;
	token: string;
	skipTLSVerify: boolean;
}

/**
 * Extract Kubernetes credentials from request headers
 * Returns credentials or null if not found
 */
export function getK8sCredentials(request: Request): K8sCredentials | null {
	const authHeader = request.headers.get('Authorization');
	const server = request.headers.get('X-K8s-Server');
	const skipTLSHeader = request.headers.get('X-K8s-Skip-TLS');

	if (!authHeader || !server) {
		return null;
	}

	// Extract token from Bearer header
	const token = authHeader.replace(/^Bearer(\s+|$)/i, '').trim();
	if (!token) {
		return null;
	}

	// Remove trailing slash from server URL
	const cleanServer = server.replace(/\/+$/, '');
	if (!isServerAllowed(cleanServer)) {
		return null;
	}

	// Verify TLS unless the client explicitly opts out (the UI always sends this header)
	const skipTLSVerify = skipTLSHeader === 'true';

	return { server: cleanServer, token, skipTLSVerify };
}

/**
 * The backend connects to whatever API server the client names. When
 * K8S_ALLOWED_SERVERS (comma-separated URLs) is set, only those are accepted,
 * so an exposed sk8r can't be used to reach arbitrary internal hosts.
 */
export function isServerAllowed(server: string): boolean {
	const allowed = process.env.K8S_ALLOWED_SERVERS;
	if (!allowed) return true;
	const ok = allowed
		.split(',')
		.map((s) => s.trim().replace(/\/+$/, ''))
		.includes(server.trim().replace(/\/+$/, ''));
	if (!ok) console.warn(`[k8sAuth] Rejected server not in K8S_ALLOWED_SERVERS: ${server}`);
	return ok;
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Missing or invalid Kubernetes credentials') {
	return json({ error: 'Unauthorized', message }, { status: 401 });
}

/**
 * Create a KubeConfig from server URL and token
 */
export function createKubeConfig(
	server: string,
	token: string,
	skipTLSVerify: boolean
): KubeConfig {
	const kc = new KubeConfig();
	kc.loadFromOptions({
		clusters: [{ name: 'current-cluster', server: server.replace(/\/+$/, ''), skipTLSVerify }],
		users: [{ name: 'current-user', token }],
		contexts: [{ name: 'current-context', cluster: 'current-cluster', user: 'current-user' }],
		currentContext: 'current-context'
	});
	return kc;
}

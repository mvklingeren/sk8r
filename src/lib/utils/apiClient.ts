import { authToken } from '$lib/stores/auth';

type Fetch = typeof fetch;

export const apiClient: Fetch = async (input, init) => {
	// Get token and server from cluster-aware auth store
	const token = authToken.getCurrentToken();
	const server = authToken.getCurrentServer();

	const headers = new Headers(init?.headers);
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}
	if (server) {
		headers.set('X-K8s-Server', server);
	}

	const newInit: RequestInit = {
		...init,
		headers
	};

	return fetch(input, newInit);
};

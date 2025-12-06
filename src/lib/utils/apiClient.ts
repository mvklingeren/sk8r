import { authToken } from '$lib/stores/auth';

type Fetch = typeof fetch;

export const apiClient: Fetch = async (input, init) => {
	// Get token from cluster-aware auth store
	const token = authToken.getCurrentToken();

	const headers = new Headers(init?.headers);
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	const newInit: RequestInit = {
		...init,
		headers
	};

	return fetch(input, newInit);
};

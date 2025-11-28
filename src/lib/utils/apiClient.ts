import { authToken } from '$lib/stores/auth';
import { get } from 'svelte/store';

type Fetch = typeof fetch;

export const apiClient: Fetch = async (input, init) => {
	const token = get(authToken);

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

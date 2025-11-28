import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Create a writable store with an initial value of null
const createAuthStore = () => {
	const { subscribe, set } = writable<string | null>(null);

	// On initialization, try to load the token from localStorage
	if (browser) {
		const storedToken = localStorage.getItem('k8s-token');
		if (storedToken) {
			set(storedToken);
		}
	}

	return {
		subscribe,
		setToken: (token: string) => {
			if (browser) {
				localStorage.setItem('k8s-token', token);
			}
			set(token);
		},
		clearToken: () => {
			if (browser) {
				localStorage.removeItem('k8s-token');
			}
			set(null);
		}
	};
};

export const authToken = createAuthStore();

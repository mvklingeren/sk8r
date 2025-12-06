import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { clusterStore } from './cluster';

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
		},
		// Get current token from the current custom cluster
		getCurrentToken: (): string | null => {
			const state = get(clusterStore);
			if (state.currentCustomClusterId) {
				const cluster = state.customClusters.find(c => c.id === state.currentCustomClusterId);
				if (cluster) {
					return cluster.token;
				}
			}
			return null;
		},
		// Get current server URL from the current custom cluster
		getCurrentServer: (): string | null => {
			const state = get(clusterStore);
			if (state.currentCustomClusterId) {
				const cluster = state.customClusters.find(c => c.id === state.currentCustomClusterId);
				if (cluster) {
					return cluster.server;
				}
			}
			return null;
		}
	};
};

export const authToken = createAuthStore();

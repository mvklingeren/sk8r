import { writable } from 'svelte/store';
import { apiClient } from '$lib/utils/apiClient';

export interface NamespaceState {
	namespaces: string[];
	loading: boolean;
	error: string | null;
}

function createNamespaceStore() {
	const { subscribe, set, update } = writable<NamespaceState>({
		namespaces: [],
		loading: false,
		error: null
	});

	return {
		subscribe,
		
		// Fetch available namespaces from the API
		async fetchNamespaces() {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				const response = await apiClient('/api/namespaces');
				if (!response.ok) {
					throw new Error(`Failed to fetch namespaces: ${response.statusText}`);
				}
				
				const data = await response.json();
				update(state => ({
					...state,
					namespaces: data.namespaces || [],
					loading: false
				}));
				
				return data.namespaces;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				update(state => ({ 
					...state, 
					loading: false, 
					error: message,
					// Keep existing namespaces or fallback to default
					namespaces: state.namespaces.length > 0 ? state.namespaces : ['default']
				}));
				throw error;
			}
		},
		
		setError: (error: string | null) => update(state => ({ ...state, error })),
		reset: () => set({
			namespaces: [],
			loading: false,
			error: null
		})
	};
}

export const namespaceStore = createNamespaceStore();


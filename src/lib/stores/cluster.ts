import { writable, derived } from 'svelte/store';

export interface ClusterContext {
	name: string;
	cluster: string;
	user: string;
	namespace?: string;
	isCurrent: boolean;
	server?: string;
}

export interface ClusterState {
	contexts: ClusterContext[];
	currentContext: string;
	loading: boolean;
	error: string | null;
}

function createClusterStore() {
	const { subscribe, set, update } = writable<ClusterState>({
		contexts: [],
		currentContext: '',
		loading: false,
		error: null
	});

	return {
		subscribe,
		
		// Fetch available contexts from the API
		async fetchContexts() {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				const response = await fetch('/api/clusters');
				if (!response.ok) {
					throw new Error(`Failed to fetch clusters: ${response.statusText}`);
				}
				
				const data = await response.json();
				update(state => ({
					...state,
					contexts: data.contexts,
					currentContext: data.currentContext,
					loading: false
				}));
				
				return data;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				update(state => ({ ...state, loading: false, error: message }));
				throw error;
			}
		},
		
		// Switch to a different context
		async switchContext(contextName: string) {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				const response = await fetch('/api/clusters/switch', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ context: contextName })
				});
				
				if (!response.ok) {
					throw new Error(`Failed to switch context: ${response.statusText}`);
				}
				
				const data = await response.json();
				
				update(state => ({
					...state,
					currentContext: contextName,
					contexts: state.contexts.map(ctx => ({
						...ctx,
						isCurrent: ctx.name === contextName
					})),
					loading: false
				}));
				
				// Reload the page to refresh all data with new context
				window.location.reload();
				
				return data;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				update(state => ({ ...state, loading: false, error: message }));
				throw error;
			}
		},
		
		setError: (error: string | null) => update(state => ({ ...state, error })),
		reset: () => set({
			contexts: [],
			currentContext: '',
			loading: false,
			error: null
		})
	};
}

export const clusterStore = createClusterStore();

// Derived store for the current context details
export const currentCluster = derived(clusterStore, $store => {
	return $store.contexts.find(ctx => ctx.isCurrent) || null;
});


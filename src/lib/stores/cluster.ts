import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface ClusterContext {
	name: string;
	cluster: string;
	user: string;
	namespace?: string;
	isCurrent: boolean;
	server?: string;
}

export interface CustomCluster {
	id: string;
	server: string;
	token: string;
	name: string;
	isCurrent?: boolean;
}

export interface ClusterState {
	contexts: ClusterContext[];
	customClusters: CustomCluster[];
	currentContext: string;
	currentCustomClusterId: string | null;
	loading: boolean;
	error: string | null;
}

const STORAGE_KEY = 'k8s-custom-clusters';
const CURRENT_CLUSTER_KEY = 'k8s-current-cluster-id';

function createClusterStore() {
	// Load custom clusters from localStorage
	let initialCustomClusters: CustomCluster[] = [];
	let initialCurrentClusterId: string | null = null;
	
	if (browser) {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				initialCustomClusters = JSON.parse(stored);
			}
			const currentId = localStorage.getItem(CURRENT_CLUSTER_KEY);
			if (currentId) {
				initialCurrentClusterId = currentId;
			}
		} catch (e) {
			console.error('Failed to load custom clusters from localStorage:', e);
		}
	}

	const { subscribe, set, update } = writable<ClusterState>({
		contexts: [],
		customClusters: initialCustomClusters,
		currentContext: '',
		currentCustomClusterId: initialCurrentClusterId,
		loading: false,
		error: null
	});

	// Helper to persist custom clusters to localStorage
	const persistCustomClusters = (clusters: CustomCluster[]) => {
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(clusters));
			} catch (e) {
				console.error('Failed to save custom clusters to localStorage:', e);
			}
		}
	};

	// Helper to persist current cluster ID
	const persistCurrentClusterId = (id: string | null) => {
		if (browser) {
			try {
				if (id) {
					localStorage.setItem(CURRENT_CLUSTER_KEY, id);
				} else {
					localStorage.removeItem(CURRENT_CLUSTER_KEY);
				}
			} catch (e) {
				console.error('Failed to save current cluster ID to localStorage:', e);
			}
		}
	};

	return {
		subscribe,
		
		// Fetch available contexts from the API (deprecated - returns empty for backward compatibility)
		async fetchContexts() {
			// No longer uses kubeconfig - all clusters are managed client-side
			update(state => ({
				...state,
				contexts: [],
				currentContext: '',
				loading: false
			}));
			return { contexts: [], currentContext: '', totalContexts: 0 };
		},
		
		// Switch to a different cluster (custom clusters only now)
		async switchContext(clusterId: string) {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				// Get current state to check for custom cluster
				const currentState = get({ subscribe });
				
				// Find the custom cluster
				const customCluster = currentState.customClusters.find(c => c.id === clusterId);
				if (!customCluster) {
					throw new Error('Cluster not found');
				}
				
				// Switch to custom cluster
				persistCurrentClusterId(customCluster.id);
				
				update(state => ({
					...state,
					currentCustomClusterId: customCluster.id,
					currentContext: '',
					customClusters: state.customClusters.map(c => ({
						...c,
						isCurrent: c.id === customCluster.id
					})),
					contexts: [],
					loading: false
				}));
				
				// Reload the page to refresh all data with new cluster
				if (browser) {
					window.location.reload();
				}
				return { success: true, currentContext: customCluster.id };
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				update(state => ({ ...state, loading: false, error: message }));
				throw error;
			}
		},
		
		setError: (error: string | null) => update(state => ({ ...state, error })),
		
		// Add a new custom cluster
		async addCluster(server: string, token: string): Promise<CustomCluster> {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				// Fetch cluster info from API
				const response = await fetch('/api/clusters/info', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ server, token })
				});
				
				if (!response.ok) {
					// Try to extract detailed error message from response
					let errorMessage = `Failed to fetch cluster info: ${response.statusText}`;
					try {
						const errorData = await response.json();
						if (errorData.message) {
							errorMessage = errorData.message;
						} else if (errorData.error) {
							errorMessage = errorData.error;
						}
					} catch {
						// If JSON parsing fails, use status text
					}
					throw new Error(errorMessage);
				}
				
				const clusterInfo = await response.json();
				const newCluster: CustomCluster = {
					id: crypto.randomUUID(),
					server,
					token,
					name: clusterInfo.name || new URL(server).hostname,
					isCurrent: false
				};
				
				update(state => {
					const updatedClusters = [...state.customClusters, newCluster];
					persistCustomClusters(updatedClusters);
					return {
						...state,
						customClusters: updatedClusters,
						loading: false
					};
				});
				
				return newCluster;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				update(state => ({ ...state, loading: false, error: message }));
				throw error;
			}
		},
		
		// Update an existing custom cluster
		async updateCluster(id: string, server: string, token: string): Promise<CustomCluster> {
			update(state => ({ ...state, loading: true, error: null }));
			
			try {
				// Fetch cluster info from API
				const response = await fetch('/api/clusters/info', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ server, token })
				});
				
				if (!response.ok) {
					// Try to extract detailed error message from response
					let errorMessage = `Failed to fetch cluster info: ${response.statusText}`;
					try {
						const errorData = await response.json();
						if (errorData.message) {
							errorMessage = errorData.message;
						} else if (errorData.error) {
							errorMessage = errorData.error;
						}
					} catch {
						// If JSON parsing fails, use status text
					}
					throw new Error(errorMessage);
				}
				
				const clusterInfo = await response.json();
				let updatedCluster: CustomCluster | null = null;
				
				update(state => {
					const updatedClusters = state.customClusters.map(cluster => {
						if (cluster.id === id) {
							updatedCluster = { ...cluster, server, token, name: clusterInfo.name || new URL(server).hostname };
							return updatedCluster;
						}
						return cluster;
					});
					persistCustomClusters(updatedClusters);
					return {
						...state,
						customClusters: updatedClusters,
						loading: false
					};
				});
				
				if (!updatedCluster) {
					throw new Error('Cluster not found');
				}
				return updatedCluster;
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				update(state => ({ ...state, loading: false, error: message }));
				throw error;
			}
		},
		
		// Remove a custom cluster
		removeCluster(id: string) {
			update(state => {
				const updatedClusters = state.customClusters.filter(cluster => cluster.id !== id);
				persistCustomClusters(updatedClusters);
				
				// If removing the current cluster, clear it
				let newCurrentId = state.currentCustomClusterId;
				if (state.currentCustomClusterId === id) {
					newCurrentId = null;
					persistCurrentClusterId(null);
				}
				
				return {
					...state,
					customClusters: updatedClusters,
					currentCustomClusterId: newCurrentId
				};
			});
		},
		
		// Get token for a specific cluster
		getClusterToken(clusterId: string): string | null {
			let token: string | null = null;
			clusterStore.subscribe(state => {
				const cluster = state.customClusters.find(c => c.id === clusterId);
				token = cluster?.token || null;
			})();
			return token;
		},
		
		// Switch to a custom cluster
		switchToCustomCluster(clusterId: string) {
			update(state => {
				const cluster = state.customClusters.find(c => c.id === clusterId);
				if (!cluster) {
					return { ...state, error: 'Cluster not found' };
				}
				
				persistCurrentClusterId(clusterId);
				
				return {
					...state,
					currentCustomClusterId: clusterId,
					customClusters: state.customClusters.map(c => ({
						...c,
						isCurrent: c.id === clusterId
					})),
					currentContext: '', // Clear kubeconfig context
					error: null
				};
			});
		},
		
		reset: () => {
			if (browser) {
				localStorage.removeItem(STORAGE_KEY);
				localStorage.removeItem(CURRENT_CLUSTER_KEY);
			}
			set({
				contexts: [],
				customClusters: [],
				currentContext: '',
				currentCustomClusterId: null,
				loading: false,
				error: null
			});
		}
	};
}

export const clusterStore = createClusterStore();

// Derived store for the current context details
export const currentCluster = derived(clusterStore, $store => {
	return $store.contexts.find(ctx => ctx.isCurrent) || null;
});


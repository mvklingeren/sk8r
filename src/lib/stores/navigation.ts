import { writable } from 'svelte/store';

export interface NavigationState {
	selectedResource: string;
	namespace: string;
	cluster: string;
}

function createNavigationStore() {
	const { subscribe, set, update } = writable<NavigationState>({
		selectedResource: 'overview',
		namespace: 'default',
		cluster: 'default'
	});

	return {
		subscribe,
		selectResource: (resource: string) => update(state => ({ ...state, selectedResource: resource })),
		setNamespace: (namespace: string) => update(state => ({ ...state, namespace })),
		setCluster: (cluster: string) => update(state => ({ ...state, cluster })),
		reset: () => set({
			selectedResource: 'overview',
			namespace: 'default',
			cluster: 'default'
		})
	};
}

export const navigation = createNavigationStore();
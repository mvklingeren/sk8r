import { writable } from 'svelte/store';

export type DataSourceType = 'prometheus' | 'kubernetes';

export interface DataSourceState {
	source: DataSourceType;
	connected: boolean;
}

function createDataSourceStore() {
	const { subscribe, set, update } = writable<DataSourceState>({
		source: 'prometheus',
		connected: true
	});

	return {
		subscribe,
		setSource: (source: DataSourceType) => update(state => ({ ...state, source })),
		setConnected: (connected: boolean) => update(state => ({ ...state, connected })),
		update: (source: DataSourceType, connected: boolean) => set({ source, connected })
	};
}

export const dataSource = createDataSourceStore();


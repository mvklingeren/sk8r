import { writable } from 'svelte/store';

interface ResourceCreatorState {
	isOpen: boolean;
	mode: 'create' | 'edit';
	initialYaml?: string;
}

function createResourceCreatorStore() {
	const { subscribe, set, update } = writable<ResourceCreatorState>({
		isOpen: false,
		mode: 'create',
		initialYaml: undefined
	});

	return {
		subscribe,
		open: () => {
			update(state => ({
				...state,
				isOpen: true,
				mode: 'create',
				initialYaml: undefined
			}));
		},
		openEdit: (yaml: string) => {
			update(state => ({
				...state,
				isOpen: true,
				mode: 'edit',
				initialYaml: yaml
			}));
		},
		close: () => {
			update(state => ({
				...state,
				isOpen: false
			}));
		},
		reset: () => {
			set({
				isOpen: false,
				mode: 'create',
				initialYaml: undefined
			});
		}
	};
}

export const resourceCreator = createResourceCreatorStore();


import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'sk8tes-learning-mode';

const createLearningModeStore = () => {
	// Default to true for new users to help them learn
	const initialValue = browser 
		? localStorage.getItem(STORAGE_KEY) !== 'false'
		: true;
	
	const { subscribe, set, update } = writable<boolean>(initialValue);

	return {
		subscribe,
		toggle: () => {
			update(value => {
				const newValue = !value;
				if (browser) {
					localStorage.setItem(STORAGE_KEY, String(newValue));
				}
				return newValue;
			});
		},
		enable: () => {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, 'true');
			}
			set(true);
		},
		disable: () => {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, 'false');
			}
			set(false);
		}
	};
};

export const learningMode = createLearningModeStore();


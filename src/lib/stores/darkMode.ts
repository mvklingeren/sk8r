import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createDarkModeStore() {
	// Initialize from localStorage or system preference
	const getInitialValue = (): boolean => {
		if (!browser) return false;
		
		const stored = localStorage.getItem('darkMode');
		if (stored !== null) {
			return stored === 'true';
		}
		
		// Fall back to system preference
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	};

	const { subscribe, set, update } = writable<boolean>(getInitialValue());

	return {
		subscribe,
		toggle: () => {
			update(value => {
				const newValue = !value;
				if (browser) {
					localStorage.setItem('darkMode', String(newValue));
					// Apply/remove dark class on document
					if (newValue) {
						document.documentElement.classList.add('dark');
					} else {
						document.documentElement.classList.remove('dark');
					}
				}
				return newValue;
			});
		},
		set: (value: boolean) => {
			if (browser) {
				localStorage.setItem('darkMode', String(value));
				if (value) {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
			}
			set(value);
		},
		initialize: () => {
			if (browser) {
				const value = getInitialValue();
				if (value) {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
				set(value);
			}
		}
	};
}

export const darkMode = createDarkModeStore();


import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

// Runs against a live sk8r server and the demo cluster: use `npm run test:integration`.
export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['tests/integration/**/*.test.ts'],
		environment: 'node',
		testTimeout: 30_000,
		hookTimeout: 60_000
	}
});

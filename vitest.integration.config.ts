import { defineConfig } from 'vitest/config';

// Runs against a live sk8r server and the demo cluster: use `npm run test:integration`.
export default defineConfig({
	test: {
		include: ['tests/integration/**/*.test.ts'],
		environment: 'node',
		testTimeout: 30_000,
		hookTimeout: 60_000
	}
});

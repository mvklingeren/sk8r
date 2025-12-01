import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin } from 'vite';
import { version } from './package.json';

// WebSocket plugin for development server
function webSocketPlugin(): Plugin {
	return {
		name: 'websocket-plugin',
		configureServer(server) {
			// Dynamically import the WebSocket server module
			import('./src/lib/server/websocket.js').then(({ createWebSocketServer, handleUpgrade }) => {
				const wss = createWebSocketServer();

				server.httpServer?.on('upgrade', (request, socket, head) => {
					const url = new URL(request.url || '', `http://${request.headers.host}`);

					// Only handle exec endpoint
					if (url.pathname.match(/^\/api\/pods\/[^/]+\/[^/]+\/exec$/)) {
						handleUpgrade(wss, request, socket, head);
					}
				});

				console.log('[Vite] WebSocket server configured for /api/pods/.../exec');
			}).catch((err) => {
				console.error('[Vite] Failed to load WebSocket module:', err);
			});
		}
	};
}

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(version)
	},
	plugins: [tailwindcss(), sveltekit(), webSocketPlugin()],
	ssr: {
		noExternal: ['lucide-svelte']
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

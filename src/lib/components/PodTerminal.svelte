<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { X, RefreshCw, ChevronDown, Maximize2, Minimize2 } from 'lucide-svelte';
	import { authToken } from '$lib/stores/auth';

	interface Props {
		podName: string;
		namespace: string;
		containers: string[];
		onClose: () => void;
	}

	let { podName, namespace, containers, onClose }: Props = $props();

	let selectedContainer = $state(containers[0] || '');
	let isConnected = $state(false);
	let isConnecting = $state(false);
	let error = $state<string | null>(null);
	let isFullscreen = $state(false);

	let terminalEl: HTMLDivElement;
	let terminal = $state<import('@xterm/xterm').Terminal | null>(null);
	let fitAddon = $state<import('@xterm/addon-fit').FitAddon | null>(null);
	let ws: WebSocket | null = null;
	let resizeObserver: ResizeObserver | null = null;

	// Dynamically import xterm modules (browser-only)
	async function initTerminal() {
		const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
			import('@xterm/xterm'),
			import('@xterm/addon-fit'),
			import('@xterm/addon-web-links')
		]);

		// Import CSS
		await import('@xterm/xterm/css/xterm.css');

		terminal = new Terminal({
			cursorBlink: true,
			cursorStyle: 'block',
			fontSize: 14,
			fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',
			theme: {
				background: '#0a0a0a',
				foreground: '#c0caf5',
				cursor: '#c0caf5',
				cursorAccent: '#0a0a0a',
				selectionBackground: '#33467c',
				black: '#15161e',
				red: '#f7768e',
				green: '#9ece6a',
				yellow: '#e0af68',
				blue: '#7aa2f7',
				magenta: '#bb9af7',
				cyan: '#7dcfff',
				white: '#a9b1d6',
				brightBlack: '#414868',
				brightRed: '#f7768e',
				brightGreen: '#9ece6a',
				brightYellow: '#e0af68',
				brightBlue: '#7aa2f7',
				brightMagenta: '#bb9af7',
				brightCyan: '#7dcfff',
				brightWhite: '#c0caf5'
			},
			allowProposedApi: true
		});

		fitAddon = new FitAddon();
		terminal.loadAddon(fitAddon);
		terminal.loadAddon(new WebLinksAddon());

		terminal.open(terminalEl);

		// Fit terminal to container
		requestAnimationFrame(() => {
			fitAddon?.fit();
		});

		// Handle terminal input
		terminal.onData((data) => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(data);
			}
		});

		// Set up resize observer
		resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(() => {
				if (fitAddon && terminal) {
					fitAddon.fit();
					sendResize();
				}
			});
		});
		resizeObserver.observe(terminalEl);

		// Connect to pod
		connect();
	}

	function buildExecUrl(): string {
		const params = new URLSearchParams();
		if (selectedContainer) params.set('container', selectedContainer);
		params.set('command', '/bin/sh');

		// Include credentials for WebSocket connection
		const server = authToken.getCurrentServer();
		const token = authToken.getCurrentToken();
		const skipTLSVerify = authToken.getSkipTLSVerify();
		if (server) params.set('server', server);
		if (token) params.set('token', token);
		params.set('skipTLSVerify', String(skipTLSVerify));

		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		return `${protocol}//${window.location.host}/api/pods/${namespace}/${podName}/exec?${params.toString()}`;
	}

	function connect() {
		disconnect();

		isConnecting = true;
		error = null;

		const url = buildExecUrl();

		ws = new WebSocket(url);

		ws.onopen = () => {
			isConnected = true;
			isConnecting = false;
			terminal?.focus();
			sendResize();
		};

		ws.onmessage = (event) => {
			if (terminal && typeof event.data === 'string') {
				terminal.write(event.data);
			}
		};

		ws.onerror = (event) => {
			console.error('[PodTerminal] WebSocket error:', event);
			error = 'Connection error';
			isConnected = false;
			isConnecting = false;
		};

		ws.onclose = (event) => {
			isConnected = false;
			isConnecting = false;

			if (event.code !== 1000 && event.code !== 1001) {
				error = event.reason || 'Connection closed unexpectedly';
			}
		};
	}

	function disconnect() {
		if (ws) {
			ws.close();
			ws = null;
		}
		isConnected = false;
	}

	function sendResize() {
		if (ws && ws.readyState === WebSocket.OPEN && terminal) {
			const message = JSON.stringify({
				type: 'resize',
				cols: terminal.cols,
				rows: terminal.rows
			});
			ws.send(message);
		}
	}

	function reconnect() {
		terminal?.clear();
		connect();
	}

	function handleContainerChange(e: Event) {
		selectedContainer = (e.target as HTMLSelectElement).value;
		terminal?.clear();
		connect();
	}

	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
		// Re-fit terminal after layout change
		requestAnimationFrame(() => {
			fitAddon?.fit();
			sendResize();
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isFullscreen) {
			onClose();
		} else if (e.key === 'Escape' && isFullscreen) {
			isFullscreen = false;
			requestAnimationFrame(() => {
				fitAddon?.fit();
				sendResize();
			});
		}
	}

	onMount(() => {
		initTerminal();
		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		disconnect();
		resizeObserver?.disconnect();
		terminal?.dispose();
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 z-40 bg-black/50"
	onclick={onClose}
	role="button"
	tabindex="-1"
	onkeydown={(e) => e.key === 'Enter' && onClose()}
></div>

<!-- Modal -->
<div
	class="fixed z-50 flex flex-col overflow-hidden rounded-xl bg-neutral-900 shadow-2xl {isFullscreen
		? 'inset-0'
		: 'inset-4 md:inset-8 lg:inset-12'}"
>
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-neutral-700 bg-neutral-800 px-4 py-3">
		<div class="flex items-center gap-4">
			<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
				<span
					class="h-2 w-2 rounded-full {isConnected
						? 'bg-green-400'
						: isConnecting
							? 'animate-pulse bg-yellow-400'
							: 'bg-neutral-500'}"
				></span>
				Terminal: {podName}
			</h2>

			{#if containers.length > 1}
				<div class="relative">
					<select
						value={selectedContainer}
						onchange={handleContainerChange}
						class="appearance-none rounded border border-neutral-600 bg-neutral-700 px-3 py-1.5 pr-8 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
					>
						{#each containers as container (container)}
							<option value={container}>{container}</option>
						{/each}
					</select>
					<ChevronDown
						size={14}
						class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-neutral-400"
					/>
				</div>
			{:else if selectedContainer}
				<span class="text-sm text-neutral-400">Container: {selectedContainer}</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- Reconnect -->
			<button
				onclick={reconnect}
				class="rounded border border-neutral-600 bg-neutral-700 p-1.5 text-neutral-300 transition-colors hover:bg-neutral-600"
				title="Reconnect"
				disabled={isConnecting}
			>
				<RefreshCw size={16} class={isConnecting ? 'animate-spin' : ''} />
			</button>

			<!-- Fullscreen toggle -->
			<button
				onclick={toggleFullscreen}
				class="rounded border border-neutral-600 bg-neutral-700 p-1.5 text-neutral-300 transition-colors hover:bg-neutral-600"
				title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
			>
				{#if isFullscreen}
					<Minimize2 size={16} />
				{:else}
					<Maximize2 size={16} />
				{/if}
			</button>

			<!-- Close -->
			<button
				onclick={onClose}
				class="ml-2 rounded border border-neutral-600 bg-neutral-700 p-1.5 text-neutral-300 transition-colors hover:border-red-500 hover:bg-red-600"
				title="Close (Esc)"
			>
				<X size={16} />
			</button>
		</div>
	</div>

	<!-- Terminal content -->
	<div class="relative flex-1 overflow-hidden bg-[#0a0a0a]">
		{#if error}
			<div class="absolute inset-0 flex items-center justify-center bg-neutral-900/80">
				<div class="rounded-lg bg-red-900/50 px-6 py-4 text-center">
					<p class="text-red-400">{error}</p>
					<button
						onclick={reconnect}
						class="mt-3 rounded bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
					>
						Retry Connection
					</button>
				</div>
			</div>
		{/if}

		{#if isConnecting && !terminal}
			<div class="absolute inset-0 flex items-center justify-center">
				<div class="flex items-center gap-2 text-neutral-400">
					<RefreshCw size={20} class="animate-spin" />
					<span>Connecting to pod...</span>
				</div>
			</div>
		{/if}

		<div bind:this={terminalEl} class="h-full w-full p-2"></div>
	</div>

	<!-- Footer status -->
	<div
		class="flex items-center justify-between border-t border-neutral-700 bg-neutral-800 px-4 py-2 text-xs text-neutral-400"
	>
		<span>
			{#if isConnected}
				Connected to {selectedContainer || 'default'} container
			{:else if isConnecting}
				Connecting...
			{:else}
				Disconnected
			{/if}
		</span>
		<span>
			Press <kbd class="rounded bg-neutral-700 px-1.5 py-0.5 text-neutral-300"
				>{isFullscreen ? 'Esc' : 'Esc'}</kbd
			>
			to {isFullscreen ? 'exit fullscreen' : 'close'}
		</span>
	</div>
</div>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { X, Download, Trash2, RefreshCw, Pause, Play, ChevronDown } from 'lucide-svelte';

	interface Props {
		podName: string;
		namespace: string;
		containers: string[];
		onClose: () => void;
	}

	let { podName, namespace, containers, onClose }: Props = $props();

	let logs = $state<string[]>([]);
	let selectedContainer = $state(containers[0] || '');
	let tailLines = $state(100);
	let follow = $state(true);
	let timestamps = $state(false);
	let autoScroll = $state(true);
	let isConnected = $state(false);
	let isLoading = $state(false);
	let error = $state<string | null>(null);

	let eventSource: EventSource | null = null;
	let logContainer: HTMLDivElement;

	const tailOptions = [
		{ value: 100, label: '100 lines' },
		{ value: 500, label: '500 lines' },
		{ value: 1000, label: '1000 lines' },
		{ value: -1, label: 'All logs' }
	];

	function buildLogUrl(): string {
		const params = new URLSearchParams();
		if (selectedContainer) params.set('container', selectedContainer);
		params.set('follow', String(follow));
		if (tailLines > 0) params.set('tailLines', String(tailLines));
		params.set('timestamps', String(timestamps));
		
		return `/api/pods/${namespace}/${podName}/logs?${params.toString()}`;
	}

	function connect() {
		disconnect();
		
		isLoading = true;
		error = null;
		logs = [];

		const url = buildLogUrl();
		eventSource = new EventSource(url);

		eventSource.addEventListener('connected', (e) => {
			isConnected = true;
			isLoading = false;
		});

		eventSource.addEventListener('log', (e) => {
			try {
				const logLine = JSON.parse(e.data);
				logs = [...logs, logLine];
				
				if (autoScroll && logContainer) {
					requestAnimationFrame(() => {
						logContainer.scrollTop = logContainer.scrollHeight;
					});
				}
			} catch (err) {
				console.error('Failed to parse log line:', err);
			}
		});

		eventSource.addEventListener('error', (e) => {
			if (e instanceof MessageEvent) {
				try {
					error = JSON.parse(e.data);
				} catch {
					error = 'Connection error';
				}
			} else {
				error = 'Connection lost';
			}
			isConnected = false;
			isLoading = false;
		});

		eventSource.addEventListener('end', () => {
			isConnected = false;
			isLoading = false;
		});

		eventSource.onerror = () => {
			if (eventSource?.readyState === EventSource.CLOSED) {
				isConnected = false;
				isLoading = false;
			}
		};
	}

	function disconnect() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		isConnected = false;
	}

	function refresh() {
		connect();
	}

	function clearLogs() {
		logs = [];
	}

	function downloadLogs() {
		const content = logs.join('\n');
		const blob = new Blob([content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${podName}-${selectedContainer || 'logs'}-${new Date().toISOString()}.log`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function toggleFollow() {
		follow = !follow;
		if (follow && isConnected) {
			// Reconnect with follow enabled
			connect();
		}
	}

	function toggleAutoScroll() {
		autoScroll = !autoScroll;
		if (autoScroll && logContainer) {
			logContainer.scrollTop = logContainer.scrollHeight;
		}
	}

	function handleContainerChange(e: Event) {
		selectedContainer = (e.target as HTMLSelectElement).value;
		connect();
	}

	function handleTailLinesChange(e: Event) {
		tailLines = parseInt((e.target as HTMLSelectElement).value, 10);
		connect();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	onMount(() => {
		connect();
		document.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		disconnect();
		document.removeEventListener('keydown', handleKeydown);
	});
</script>

<!-- Backdrop -->
<div 
	class="fixed inset-0 bg-black/50 z-40"
	onclick={onClose}
	role="button"
	tabindex="-1"
	onkeydown={(e) => e.key === 'Enter' && onClose()}
></div>

<!-- Modal -->
<div class="fixed inset-4 md:inset-8 lg:inset-12 bg-gray-900 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
		<div class="flex items-center gap-4">
			<h2 class="text-lg font-semibold text-white flex items-center gap-2">
				<span class="w-2 h-2 rounded-full {isConnected ? 'bg-green-400' : 'bg-gray-500'}"></span>
				Pod Logs: {podName}
			</h2>
			
			{#if containers.length > 1}
				<div class="relative">
					<select
						value={selectedContainer}
						onchange={handleContainerChange}
						class="appearance-none bg-gray-700 text-gray-200 text-sm px-3 py-1.5 pr-8 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
					>
						{#each containers as container}
							<option value={container}>{container}</option>
						{/each}
					</select>
					<ChevronDown size={14} class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
				</div>
			{:else if selectedContainer}
				<span class="text-sm text-gray-400">Container: {selectedContainer}</span>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<!-- Tail lines selector -->
			<select
				value={tailLines}
				onchange={handleTailLinesChange}
				class="appearance-none bg-gray-700 text-gray-200 text-sm px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
			>
				{#each tailOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>

			<!-- Timestamps toggle -->
			<button
				onclick={() => { timestamps = !timestamps; connect(); }}
				class="px-3 py-1.5 text-sm rounded border transition-colors {timestamps ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}"
				title="Show timestamps"
			>
				Time
			</button>

			<!-- Auto-scroll toggle -->
			<button
				onclick={toggleAutoScroll}
				class="p-1.5 rounded border transition-colors {autoScroll ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}"
				title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
			>
				{#if autoScroll}
					<Play size={16} />
				{:else}
					<Pause size={16} />
				{/if}
			</button>

			<!-- Refresh -->
			<button
				onclick={refresh}
				class="p-1.5 rounded bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 transition-colors"
				title="Refresh logs"
				disabled={isLoading}
			>
				<RefreshCw size={16} class={isLoading ? 'animate-spin' : ''} />
			</button>

			<!-- Clear -->
			<button
				onclick={clearLogs}
				class="p-1.5 rounded bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 transition-colors"
				title="Clear logs"
			>
				<Trash2 size={16} />
			</button>

			<!-- Download -->
			<button
				onclick={downloadLogs}
				class="p-1.5 rounded bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 transition-colors"
				title="Download logs"
				disabled={logs.length === 0}
			>
				<Download size={16} />
			</button>

			<!-- Close -->
			<button
				onclick={onClose}
				class="p-1.5 rounded bg-gray-700 border border-gray-600 text-gray-300 hover:bg-red-600 hover:border-red-500 transition-colors ml-2"
				title="Close (Esc)"
			>
				<X size={16} />
			</button>
		</div>
	</div>

	<!-- Log content -->
	<div 
		bind:this={logContainer}
		class="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed"
	>
		{#if isLoading && logs.length === 0}
			<div class="flex items-center justify-center h-full text-gray-400">
				<RefreshCw size={24} class="animate-spin mr-2" />
				Connecting to pod logs...
			</div>
		{:else if error}
			<div class="flex items-center justify-center h-full text-red-400">
				<span class="bg-red-900/30 px-4 py-2 rounded">{error}</span>
			</div>
		{:else if logs.length === 0}
			<div class="flex items-center justify-center h-full text-gray-500">
				No logs available
			</div>
		{:else}
			{#each logs as line, i}
				<div class="log-line hover:bg-gray-800/50 px-2 -mx-2 rounded">
					<span class="text-gray-600 select-none mr-4">{String(i + 1).padStart(4, ' ')}</span>
					<span class="text-gray-200 whitespace-pre-wrap break-all">{line}</span>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Footer status -->
	<div class="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex items-center justify-between">
		<span>
			{logs.length} lines
			{#if isConnected && follow}
				· Streaming...
			{/if}
		</span>
		<span>
			Press <kbd class="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Esc</kbd> to close
		</span>
	</div>
</div>

<style>
	.log-line {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	}
</style>


<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { openEventStream } from '$lib/utils/eventStream';
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

	let closeStream: (() => void) | null = null;
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

		closeStream = openEventStream(
			buildLogUrl(),
			{
				connected: () => {
					isConnected = true;
					isLoading = false;
				},
				log: (data) => {
					try {
						const logLine = JSON.parse(data);
						logs = [...logs, logLine];

						if (autoScroll && logContainer) {
							requestAnimationFrame(() => {
								logContainer.scrollTop = logContainer.scrollHeight;
							});
						}
					} catch (err) {
						console.error('Failed to parse log line:', err);
					}
				},
				error: (data) => {
					try {
						error = JSON.parse(data);
					} catch {
						error = 'Connection error';
					}
					isConnected = false;
					isLoading = false;
				},
				end: () => {
					isConnected = false;
					isLoading = false;
				}
			},
			(err) => {
				if (err) error = 'Connection lost';
				isConnected = false;
				isLoading = false;
			}
		);
	}

	function disconnect() {
		closeStream?.();
		closeStream = null;
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
	class="fixed inset-0 z-40 bg-black/50"
	onclick={onClose}
	role="button"
	tabindex="-1"
	onkeydown={(e) => e.key === 'Enter' && onClose()}
></div>

<!-- Modal -->
<div
	class="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl bg-neutral-900 shadow-2xl md:inset-8 lg:inset-12"
>
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-neutral-700 bg-neutral-800 px-4 py-3">
		<div class="flex items-center gap-4">
			<h2 class="flex items-center gap-2 text-lg font-semibold text-white">
				<span class="h-2 w-2 rounded-full {isConnected ? 'bg-green-400' : 'bg-neutral-500'}"></span>
				Pod Logs: {podName}
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
			<!-- Tail lines selector -->
			<select
				value={tailLines}
				onchange={handleTailLinesChange}
				class="appearance-none rounded border border-neutral-600 bg-neutral-700 px-3 py-1.5 text-sm text-neutral-200 focus:border-blue-500 focus:outline-none"
			>
				{#each tailOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>

			<!-- Timestamps toggle -->
			<button
				onclick={() => {
					timestamps = !timestamps;
					connect();
				}}
				class="rounded border px-3 py-1.5 text-sm transition-colors {timestamps
					? 'border-blue-500 bg-blue-600 text-white'
					: 'border-neutral-600 bg-neutral-700 text-neutral-300 hover:bg-neutral-600'}"
				title="Show timestamps"
			>
				Time
			</button>

			<!-- Auto-scroll toggle -->
			<button
				onclick={toggleAutoScroll}
				class="rounded border p-1.5 transition-colors {autoScroll
					? 'border-blue-500 bg-blue-600 text-white'
					: 'border-neutral-600 bg-neutral-700 text-neutral-300 hover:bg-neutral-600'}"
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
				class="rounded border border-neutral-600 bg-neutral-700 p-1.5 text-neutral-300 transition-colors hover:bg-neutral-600"
				title="Refresh logs"
				disabled={isLoading}
			>
				<RefreshCw size={16} class={isLoading ? 'animate-spin' : ''} />
			</button>

			<!-- Clear -->
			<button
				onclick={clearLogs}
				class="rounded border border-neutral-600 bg-neutral-700 p-1.5 text-neutral-300 transition-colors hover:bg-neutral-600"
				title="Clear logs"
			>
				<Trash2 size={16} />
			</button>

			<!-- Download -->
			<button
				onclick={downloadLogs}
				class="rounded border border-neutral-600 bg-neutral-700 p-1.5 text-neutral-300 transition-colors hover:bg-neutral-600"
				title="Download logs"
				disabled={logs.length === 0}
			>
				<Download size={16} />
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

	<!-- Log content -->
	<div bind:this={logContainer} class="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed">
		{#if isLoading && logs.length === 0}
			<div class="flex h-full items-center justify-center text-neutral-400">
				<RefreshCw size={24} class="mr-2 animate-spin" />
				Connecting to pod logs...
			</div>
		{:else if error}
			<div class="flex h-full items-center justify-center text-red-400">
				<span class="rounded bg-red-900/30 px-4 py-2">{error}</span>
			</div>
		{:else if logs.length === 0}
			<div class="flex h-full items-center justify-center text-neutral-500">No logs available</div>
		{:else}
			{#each logs as line, i (i)}
				<div class="log-line -mx-2 rounded px-2 hover:bg-neutral-800/50">
					<span class="mr-4 text-neutral-600 select-none">{String(i + 1).padStart(4, ' ')}</span>
					<span class="break-all whitespace-pre-wrap text-neutral-200">{line}</span>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Footer status -->
	<div
		class="flex items-center justify-between border-t border-neutral-700 bg-neutral-800 px-4 py-2 text-xs text-neutral-400"
	>
		<span>
			{logs.length} lines
			{#if isConnected && follow}
				· Streaming...
			{/if}
		</span>
		<span>
			Press <kbd class="rounded bg-neutral-700 px-1.5 py-0.5 text-neutral-300">Esc</kbd> to close
		</span>
	</div>
</div>

<style>
	.log-line {
		font-family:
			ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono',
			'Courier New', monospace;
	}
</style>

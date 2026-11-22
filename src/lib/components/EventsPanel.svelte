<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { openEventStream } from '$lib/utils/eventStream';
	import {
		Activity,
		ChevronDown,
		ChevronUp,
		Trash2,
		RefreshCw,
		Pause,
		Play,
		AlertTriangle,
		CheckCircle,
		X,
		Filter
	} from 'lucide-svelte';

	interface K8sEvent {
		watchType: string;
		type: 'Normal' | 'Warning';
		reason: string;
		message: string;
		involvedObject: {
			kind: string;
			name: string;
			namespace: string;
		};
		source: {
			component: string;
			host: string;
		};
		firstTimestamp: string;
		lastTimestamp: string;
		count: number;
		metadata: {
			name: string;
			namespace: string;
			uid: string;
		};
	}

	interface Props {
		namespace?: string;
		filterKind?: string;
		filterName?: string;
		collapsed?: boolean;
		maxEvents?: number;
		fillHeight?: boolean;
		onClose?: () => void;
		onCollapseChange?: (collapsed: boolean) => void;
	}

	let {
		namespace = '',
		filterKind = '',
		filterName = '',
		collapsed = false,
		maxEvents = 100,
		fillHeight = false,
		onClose,
		onCollapseChange
	}: Props = $props();

	let events = $state<K8sEvent[]>([]);
	// Follows the prop, but stays locally writable
	let isCollapsed = $derived(collapsed);
	let isConnected = $state(false);
	let isLoading = $state(false);
	let isPaused = $state(false);
	let error = $state<string | null>(null);
	let filterType = $state<'all' | 'Normal' | 'Warning'>('all');
	let autoScroll = $state(true);

	let closeStream: (() => void) | null = null;
	let eventsContainer = $state<HTMLDivElement | null>(null);

	// Filtered events based on type filter
	let filteredEvents = $derived.by(() => {
		if (filterType === 'all') return events;
		return events.filter((e) => e.type === filterType);
	});

	// Count by type
	let normalCount = $derived(events.filter((e) => e.type === 'Normal').length);
	let warningCount = $derived(events.filter((e) => e.type === 'Warning').length);

	function buildStreamUrl(): string {
		const params = new URLSearchParams();
		if (namespace) params.set('namespace', namespace);
		if (filterKind) params.set('kind', filterKind);
		if (filterName) params.set('name', filterName);
		return `/api/events/stream?${params.toString()}`;
	}

	function connect() {
		disconnect();

		isLoading = true;
		error = null;

		closeStream = openEventStream(
			buildStreamUrl(),
			{
				connected: () => {
					isConnected = true;
					isLoading = false;
				},
				event: (data) => {
					if (isPaused) return;

					try {
						const event = JSON.parse(data) as K8sEvent;

						// Add to events array, maintaining max limit
						events = [...events, event].slice(-maxEvents);

						if (autoScroll && eventsContainer) {
							const el = eventsContainer;
							requestAnimationFrame(() => {
								el.scrollTop = el.scrollHeight;
							});
						}
					} catch (err) {
						console.error('Failed to parse event:', err);
					}
				},
				error: (data) => {
					try {
						error = JSON.parse(data).message || 'Connection error';
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
		events = [];
		connect();
	}

	function clearEvents() {
		events = [];
	}

	function togglePause() {
		isPaused = !isPaused;
	}

	function toggleAutoScroll() {
		autoScroll = !autoScroll;
		if (autoScroll && eventsContainer) {
			eventsContainer.scrollTop = eventsContainer.scrollHeight;
		}
	}

	function formatTimestamp(timestamp: string): string {
		if (!timestamp) return '';
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function getTimeAgo(timestamp: string): string {
		if (!timestamp) return '';
		const now = new Date();
		const then = new Date(timestamp);
		const diff = now.getTime() - then.getTime();

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return `${seconds}s ago`;
	}

	onMount(() => {
		if (!isCollapsed) {
			connect();
		}
	});

	onDestroy(() => {
		disconnect();
	});

	// Reconnect when filter changes
	$effect(() => {
		if (!isCollapsed && (namespace || filterKind || filterName)) {
			events = [];
			connect();
		}
	});
</script>

<div
	class="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 {fillHeight
		? 'flex h-full flex-col'
		: ''}"
>
	<!-- Header -->
	<div
		class="flex cursor-pointer items-center justify-between border-b border-neutral-700 bg-neutral-800 px-4 py-3 select-none"
		onclick={() => {
			isCollapsed = !isCollapsed;
			onCollapseChange?.(isCollapsed);
			if (!isCollapsed && !isConnected) connect();
		}}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Enter') {
				isCollapsed = !isCollapsed;
				onCollapseChange?.(isCollapsed);
			}
		}}
	>
		<div class="flex items-center gap-3">
			<Activity size={18} class="text-cyan-400" />
			<h3 class="text-sm font-semibold text-white">
				Events Stream
				{#if filterKind && filterName}
					<span class="ml-2 font-normal text-neutral-400">
						({filterKind}/{filterName})
					</span>
				{/if}
			</h3>
			<div class="flex items-center gap-2">
				<span
					class="h-2 w-2 rounded-full {isConnected
						? 'animate-pulse bg-green-400'
						: 'bg-neutral-500'}"
				></span>
				<span class="text-xs text-neutral-400">
					{events.length} events
				</span>
				{#if warningCount > 0}
					<span class="flex items-center gap-1 text-xs text-yellow-400">
						<AlertTriangle size={12} />
						{warningCount}
					</span>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if !isCollapsed}
				<!-- Filter buttons -->
				<div class="mr-2 flex items-center gap-1">
					<button
						onclick={(e) => {
							e.stopPropagation();
							filterType = 'all';
						}}
						class="rounded px-2 py-1 text-xs transition-colors {filterType === 'all'
							? 'bg-neutral-600 text-white'
							: 'text-neutral-400 hover:text-neutral-200'}"
					>
						All
					</button>
					<button
						onclick={(e) => {
							e.stopPropagation();
							filterType = 'Normal';
						}}
						class="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors {filterType ===
						'Normal'
							? 'bg-green-600 text-white'
							: 'text-neutral-400 hover:text-neutral-200'}"
					>
						<CheckCircle size={12} />
						{normalCount}
					</button>
					<button
						onclick={(e) => {
							e.stopPropagation();
							filterType = 'Warning';
						}}
						class="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors {filterType ===
						'Warning'
							? 'bg-yellow-600 text-white'
							: 'text-neutral-400 hover:text-neutral-200'}"
					>
						<AlertTriangle size={12} />
						{warningCount}
					</button>
				</div>

				<!-- Auto-scroll toggle -->
				<button
					onclick={(e) => {
						e.stopPropagation();
						toggleAutoScroll();
					}}
					class="rounded p-1.5 transition-colors {autoScroll
						? 'bg-blue-600 text-white'
						: 'bg-neutral-700 text-neutral-400 hover:text-neutral-200'}"
					title={autoScroll ? 'Auto-scroll enabled' : 'Auto-scroll disabled'}
				>
					{#if autoScroll}
						<Play size={14} />
					{:else}
						<Pause size={14} />
					{/if}
				</button>

				<!-- Pause/Resume -->
				<button
					onclick={(e) => {
						e.stopPropagation();
						togglePause();
					}}
					class="rounded p-1.5 transition-colors {isPaused
						? 'bg-yellow-600 text-white'
						: 'bg-neutral-700 text-neutral-400 hover:text-neutral-200'}"
					title={isPaused ? 'Resume' : 'Pause'}
				>
					{#if isPaused}
						<Play size={14} />
					{:else}
						<Pause size={14} />
					{/if}
				</button>

				<!-- Refresh -->
				<button
					onclick={(e) => {
						e.stopPropagation();
						refresh();
					}}
					class="rounded bg-neutral-700 p-1.5 text-neutral-400 transition-colors hover:text-neutral-200"
					title="Refresh"
					disabled={isLoading}
				>
					<RefreshCw size={14} class={isLoading ? 'animate-spin' : ''} />
				</button>

				<!-- Clear -->
				<button
					onclick={(e) => {
						e.stopPropagation();
						clearEvents();
					}}
					class="rounded bg-neutral-700 p-1.5 text-neutral-400 transition-colors hover:text-neutral-200"
					title="Clear events"
				>
					<Trash2 size={14} />
				</button>

				{#if onClose}
					<button
						onclick={(e) => {
							e.stopPropagation();
							onClose();
						}}
						class="ml-1 rounded bg-neutral-700 p-1.5 text-neutral-400 transition-colors hover:text-red-400"
						title="Close"
					>
						<X size={14} />
					</button>
				{/if}
			{/if}

			{#if isCollapsed}
				<ChevronDown size={18} class="text-neutral-400" />
			{:else}
				<ChevronUp size={18} class="text-neutral-400" />
			{/if}
		</div>
	</div>

	<!-- Events list -->
	{#if !isCollapsed}
		<div
			bind:this={eventsContainer}
			class="{fillHeight ? 'min-h-0 flex-1' : 'max-h-64'} overflow-y-auto"
		>
			{#if error}
				<div class="p-4 text-center text-sm text-red-400">
					{error}
				</div>
			{:else if isLoading && events.length === 0}
				<div
					class="flex items-center justify-center gap-2 p-4 text-center text-sm text-neutral-400"
				>
					<RefreshCw size={14} class="animate-spin" />
					Connecting to events stream...
				</div>
			{:else if filteredEvents.length === 0}
				<div class="p-4 text-center text-sm text-neutral-500">
					No events
					{#if filterType !== 'all'}
						matching filter
					{/if}
				</div>
			{:else}
				<div class="divide-y divide-neutral-800">
					{#each filteredEvents as event (event.metadata.uid + event.lastTimestamp)}
						<div class="px-4 py-2 text-sm transition-colors hover:bg-neutral-800/50">
							<div class="flex items-start gap-3">
								<!-- Type indicator -->
								<div class="mt-0.5 flex-shrink-0">
									{#if event.type === 'Warning'}
										<AlertTriangle size={14} class="text-yellow-400" />
									{:else}
										<CheckCircle size={14} class="text-green-400" />
									{/if}
								</div>

								<!-- Event content -->
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<span class="font-medium text-white">{event.reason}</span>
										<span class="rounded bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-300">
											{event.involvedObject.kind}/{event.involvedObject.name}
										</span>
										{#if event.count > 1}
											<span class="text-xs text-neutral-500">×{event.count}</span>
										{/if}
									</div>
									<p class="mt-0.5 text-xs break-words text-neutral-400">{event.message}</p>
								</div>

								<!-- Timestamp -->
								<div class="flex-shrink-0 text-right text-xs text-neutral-500">
									<div>{formatTimestamp(event.lastTimestamp)}</div>
									<div class="text-neutral-600">{getTimeAgo(event.lastTimestamp)}</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div
			class="flex items-center justify-between border-t border-neutral-700 bg-neutral-800 px-4 py-2 text-xs text-neutral-500"
		>
			<span>
				{filteredEvents.length} of {events.length} events
				{#if isPaused}
					· <span class="text-yellow-400">Paused</span>
				{:else if isConnected}
					· <span class="text-green-400">Streaming</span>
				{/if}
			</span>
			{#if filterKind || filterName || namespace}
				<span class="flex items-center gap-1">
					<Filter size={10} />
					Filtered
				</span>
			{/if}
		</div>
	{/if}
</div>

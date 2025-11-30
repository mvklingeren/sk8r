<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
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
		onClose?: () => void;
		onCollapseChange?: (collapsed: boolean) => void;
	}

	let { 
		namespace = '', 
		filterKind = '', 
		filterName = '',
		collapsed = false,
		maxEvents = 100,
		onClose,
		onCollapseChange
	}: Props = $props();

	let events = $state<K8sEvent[]>([]);
	let isCollapsed = $state(collapsed);
	let isConnected = $state(false);
	
	// Sync internal state with prop changes
	$effect(() => {
		isCollapsed = collapsed;
	});
	let isLoading = $state(false);
	let isPaused = $state(false);
	let error = $state<string | null>(null);
	let filterType = $state<'all' | 'Normal' | 'Warning'>('all');
	let autoScroll = $state(true);

	let eventSource: EventSource | null = null;
	let eventsContainer: HTMLDivElement;

	// Filtered events based on type filter
	let filteredEvents = $derived.by(() => {
		if (filterType === 'all') return events;
		return events.filter(e => e.type === filterType);
	});

	// Count by type
	let normalCount = $derived(events.filter(e => e.type === 'Normal').length);
	let warningCount = $derived(events.filter(e => e.type === 'Warning').length);

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

		const url = buildStreamUrl();
		eventSource = new EventSource(url);

		eventSource.addEventListener('connected', () => {
			isConnected = true;
			isLoading = false;
		});

		eventSource.addEventListener('event', (e) => {
			if (isPaused) return;

			try {
				const event = JSON.parse(e.data) as K8sEvent;
				
				// Add to events array, maintaining max limit
				events = [...events, event].slice(-maxEvents);

				if (autoScroll && eventsContainer) {
					requestAnimationFrame(() => {
						eventsContainer.scrollTop = eventsContainer.scrollHeight;
					});
				}
			} catch (err) {
				console.error('Failed to parse event:', err);
			}
		});

		eventSource.addEventListener('error', (e) => {
			if (e instanceof MessageEvent) {
				try {
					const data = JSON.parse(e.data);
					error = data.message || 'Connection error';
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

<div class="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
	<!-- Header -->
	<div 
		class="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 cursor-pointer select-none"
		onclick={() => { isCollapsed = !isCollapsed; onCollapseChange?.(isCollapsed); if (!isCollapsed && !isConnected) connect(); }}
		role="button"
		tabindex="0"
		onkeydown={(e) => { if (e.key === 'Enter') { isCollapsed = !isCollapsed; onCollapseChange?.(isCollapsed); } }}
	>
		<div class="flex items-center gap-3">
			<Activity size={18} class="text-cyan-400" />
			<h3 class="text-sm font-semibold text-white">
				Events Stream
				{#if filterKind && filterName}
					<span class="text-gray-400 font-normal ml-2">
						({filterKind}/{filterName})
					</span>
				{/if}
			</h3>
			<div class="flex items-center gap-2">
				<span class="w-2 h-2 rounded-full {isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}"></span>
				<span class="text-xs text-gray-400">
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
				<div class="flex items-center gap-1 mr-2">
					<button
						onclick={(e) => { e.stopPropagation(); filterType = 'all'; }}
						class="px-2 py-1 text-xs rounded transition-colors {filterType === 'all' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-gray-200'}"
					>
						All
					</button>
					<button
						onclick={(e) => { e.stopPropagation(); filterType = 'Normal'; }}
						class="px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 {filterType === 'Normal' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-gray-200'}"
					>
						<CheckCircle size={12} />
						{normalCount}
					</button>
					<button
						onclick={(e) => { e.stopPropagation(); filterType = 'Warning'; }}
						class="px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 {filterType === 'Warning' ? 'bg-yellow-600 text-white' : 'text-gray-400 hover:text-gray-200'}"
					>
						<AlertTriangle size={12} />
						{warningCount}
					</button>
				</div>

				<!-- Auto-scroll toggle -->
				<button
					onclick={(e) => { e.stopPropagation(); toggleAutoScroll(); }}
					class="p-1.5 rounded transition-colors {autoScroll ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}"
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
					onclick={(e) => { e.stopPropagation(); togglePause(); }}
					class="p-1.5 rounded transition-colors {isPaused ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-200'}"
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
					onclick={(e) => { e.stopPropagation(); refresh(); }}
					class="p-1.5 rounded bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
					title="Refresh"
					disabled={isLoading}
				>
					<RefreshCw size={14} class={isLoading ? 'animate-spin' : ''} />
				</button>

				<!-- Clear -->
				<button
					onclick={(e) => { e.stopPropagation(); clearEvents(); }}
					class="p-1.5 rounded bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
					title="Clear events"
				>
					<Trash2 size={14} />
				</button>

				{#if onClose}
					<button
						onclick={(e) => { e.stopPropagation(); onClose(); }}
						class="p-1.5 rounded bg-gray-700 text-gray-400 hover:text-red-400 transition-colors ml-1"
						title="Close"
					>
						<X size={14} />
					</button>
				{/if}
			{/if}

			{#if isCollapsed}
				<ChevronDown size={18} class="text-gray-400" />
			{:else}
				<ChevronUp size={18} class="text-gray-400" />
			{/if}
		</div>
	</div>

	<!-- Events list -->
	{#if !isCollapsed}
		<div 
			bind:this={eventsContainer}
			class="max-h-64 overflow-y-auto"
		>
			{#if error}
				<div class="p-4 text-center text-red-400 text-sm">
					{error}
				</div>
			{:else if isLoading && events.length === 0}
				<div class="p-4 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
					<RefreshCw size={14} class="animate-spin" />
					Connecting to events stream...
				</div>
			{:else if filteredEvents.length === 0}
				<div class="p-4 text-center text-gray-500 text-sm">
					No events
					{#if filterType !== 'all'}
						matching filter
					{/if}
				</div>
			{:else}
				<div class="divide-y divide-gray-800">
					{#each filteredEvents as event (event.metadata.uid + event.lastTimestamp)}
						<div class="px-4 py-2 hover:bg-gray-800/50 transition-colors text-sm">
							<div class="flex items-start gap-3">
								<!-- Type indicator -->
								<div class="flex-shrink-0 mt-0.5">
									{#if event.type === 'Warning'}
										<AlertTriangle size={14} class="text-yellow-400" />
									{:else}
										<CheckCircle size={14} class="text-green-400" />
									{/if}
								</div>

								<!-- Event content -->
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-medium text-white">{event.reason}</span>
										<span class="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
											{event.involvedObject.kind}/{event.involvedObject.name}
										</span>
										{#if event.count > 1}
											<span class="text-xs text-gray-500">×{event.count}</span>
										{/if}
									</div>
									<p class="text-gray-400 text-xs mt-0.5 break-words">{event.message}</p>
								</div>

								<!-- Timestamp -->
								<div class="flex-shrink-0 text-xs text-gray-500 text-right">
									<div>{formatTimestamp(event.lastTimestamp)}</div>
									<div class="text-gray-600">{getTimeAgo(event.lastTimestamp)}</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
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


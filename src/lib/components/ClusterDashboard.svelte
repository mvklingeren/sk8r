<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Server,
		Box,
		Rocket,
		Folder,
		Globe,
		HardDrive,
		Activity,
		TrendingUp,
		TrendingDown,
		Minus,
		AlertTriangle,
		CheckCircle2,
		LoaderCircle,
		RefreshCw,
		Clock,
		ChevronDown
	} from 'lucide-svelte';
	import MetricsChart from './MetricsChart.svelte';
	import type { DashboardCardConfig, DashboardConfig } from '$lib/config/dashboardConfig';
	import type { MetricSeries } from '$lib/types/metricsTypes';
	import { apiClient } from '$lib/utils/apiClient';
	import { dataSource as dataSourceStore } from '$lib/stores/dataSource';

	interface Props {
		config: DashboardConfig;
	}

	let { config }: Props = $props();

	// State for card values
	let cardValues = $state<Map<string, { value: number; status?: number; loading: boolean; error?: string }>>(new Map());
	let chartData = $state<Map<string, MetricSeries[]>>(new Map());
	let chartsLoading = $state(true);
	let lastRefresh = $state<Date>(new Date());
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let dataSourceType = $state<'prometheus' | 'kubernetes'>('prometheus');
	let countdownSeconds = $state(30);
	let countdownIntervalId: ReturnType<typeof setInterval> | null = null;

	// Time range options for chart data (0 = custom)
	const timeRangeOptions = [
		{ value: 5, label: '5m' },
		{ value: 15, label: '15m' },
		{ value: 30, label: '30m' },
		{ value: 60, label: '1h' },
		{ value: 180, label: '3h' },
		{ value: 360, label: '6h' },
		{ value: 720, label: '12h' },
		{ value: 1440, label: '24h' },
		{ value: 0, label: 'Custom' }
	];

	const TIME_RANGE_STORAGE_KEY = 'dashboard-time-range';
	const CUSTOM_RANGE_STORAGE_KEY = 'dashboard-custom-range';

	// Custom range state
	let showCustomRangeModal = $state(false);
	let isCustomRangeActive = $state(false);
	let customStartDate = $state('');
	let customEndDate = $state('');
	let customStartTimestamp = $state<number | null>(null);
	let customEndTimestamp = $state<number | null>(null);
	let useCurrentEndTime = $state(true); // When true, end time updates to "now" on each refresh

	function getStoredTimeRange(): number {
		if (typeof localStorage === 'undefined') return 30;
		const stored = localStorage.getItem(TIME_RANGE_STORAGE_KEY);
		if (stored) {
			const parsed = parseInt(stored, 10);
			// Check for custom range (0)
			if (parsed === 0) {
				return 0;
			}
			if (timeRangeOptions.some(opt => opt.value === parsed)) {
				return parsed;
			}
		}
		return 30; // default 30 minutes
	}

	function getStoredCustomRange(): { start: number; end: number | null; useCurrentEndTime: boolean } | null {
		if (typeof localStorage === 'undefined') return null;
		const stored = localStorage.getItem(CUSTOM_RANGE_STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				if (parsed.start !== undefined) {
					return {
						start: parsed.start,
						end: parsed.end ?? null,
						useCurrentEndTime: parsed.useCurrentEndTime ?? false
					};
				}
			} catch {
				return null;
			}
		}
		return null;
	}

	function saveTimeRange(value: number) {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(TIME_RANGE_STORAGE_KEY, value.toString());
		}
	}

	function saveCustomRange(start: number, end: number | null, useCurrent: boolean) {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(CUSTOM_RANGE_STORAGE_KEY, JSON.stringify({ 
				start, 
				end: useCurrent ? null : end,
				useCurrentEndTime: useCurrent 
			}));
		}
	}

	// Format datetime-local input value
	function formatDateTimeLocal(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	// Format custom range label for display
	function formatCustomRangeLabel(): string {
		if (!customStartTimestamp) return 'Custom';
		const start = new Date(customStartTimestamp * 1000);
		const formatShort = (d: Date) => {
			const month = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			const hours = String(d.getHours()).padStart(2, '0');
			const mins = String(d.getMinutes()).padStart(2, '0');
			return `${month}/${day} ${hours}:${mins}`;
		};
		
		if (useCurrentEndTime) {
			return `${formatShort(start)} - Now`;
		}
		
		if (!customEndTimestamp) return 'Custom';
		const end = new Date(customEndTimestamp * 1000);
		return `${formatShort(start)} - ${formatShort(end)}`;
	}

	let selectedTimeRange = $state(30);
	let timeRangeDropdownOpen = $state(false);

	function selectTimeRange(value: number) {
		if (value === 0) {
			// Open custom range modal
			timeRangeDropdownOpen = false;
			openCustomRangeModal();
			return;
		}
		
		selectedTimeRange = value;
		isCustomRangeActive = false;
		customStartTimestamp = null;
		customEndTimestamp = null;
		saveTimeRange(value);
		timeRangeDropdownOpen = false;
		// Refresh chart data with new time range
		fetchChartData();
	}

	function openCustomRangeModal() {
		// Set default values: start = 1 hour ago, end = now (with checkbox checked)
		const now = new Date();
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
		customEndDate = formatDateTimeLocal(now);
		customStartDate = formatDateTimeLocal(oneHourAgo);
		useCurrentEndTime = true; // Default to using current time
		showCustomRangeModal = true;
	}

	function applyCustomRange() {
		if (!customStartDate) return;
		
		const start = Math.floor(new Date(customStartDate).getTime() / 1000);
		const now = Math.floor(Date.now() / 1000);
		
		// Determine end time based on checkbox
		let end: number;
		if (useCurrentEndTime) {
			end = now;
		} else {
			if (!customEndDate) return;
			end = Math.floor(new Date(customEndDate).getTime() / 1000);
		}
		
		if (start >= end) {
			alert('Start time must be before end time');
			return;
		}
		
		customStartTimestamp = start;
		customEndTimestamp = useCurrentEndTime ? null : end;
		isCustomRangeActive = true;
		selectedTimeRange = 0;
		saveTimeRange(0);
		saveCustomRange(start, useCurrentEndTime ? null : end, useCurrentEndTime);
		showCustomRangeModal = false;
		fetchChartData();
	}

	function cancelCustomRange() {
		showCustomRangeModal = false;
	}

	function getSelectedTimeRangeLabel(): string {
		if (isCustomRangeActive && customStartTimestamp && customEndTimestamp) {
			return formatCustomRangeLabel();
		}
		return timeRangeOptions.find(opt => opt.value === selectedTimeRange)?.label || '30m';
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.time-range-dropdown')) {
			timeRangeDropdownOpen = false;
		}
		// Don't close modal on click outside - user must use buttons
	}

	const iconMap: Record<string, typeof Server> = {
		server: Server,
		box: Box,
		rocket: Rocket,
		folder: Folder,
		globe: Globe,
		'hard-drive': HardDrive,
		activity: Activity
	};

	const colorClasses: Record<string, { bg: string; text: string; border: string; icon: string }> = {
		blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-900 dark:text-blue-100', border: 'border-blue-200 dark:border-blue-700', icon: 'text-blue-500 dark:text-blue-400' },
		green: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-900 dark:text-green-100', border: 'border-green-200 dark:border-green-700', icon: 'text-green-500 dark:text-green-400' },
		yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-900 dark:text-yellow-100', border: 'border-yellow-200 dark:border-yellow-700', icon: 'text-yellow-500 dark:text-yellow-400' },
		red: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-900 dark:text-red-100', border: 'border-red-200 dark:border-red-700', icon: 'text-red-500 dark:text-red-400' },
		purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-900 dark:text-purple-100', border: 'border-purple-200 dark:border-purple-700', icon: 'text-purple-500 dark:text-purple-400' },
		cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/30', text: 'text-cyan-900 dark:text-cyan-100', border: 'border-cyan-200 dark:border-cyan-700', icon: 'text-cyan-500 dark:text-cyan-400' },
		orange: { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-900 dark:text-orange-100', border: 'border-orange-200 dark:border-orange-700', icon: 'text-orange-500 dark:text-orange-400' },
		gray: { bg: 'bg-gray-50 dark:bg-gray-900/30', text: 'text-gray-900 dark:text-gray-100', border: 'border-gray-200 dark:border-gray-700', icon: 'text-gray-500 dark:text-gray-400' }
	};

	function formatValue(value: number, format: string): string {
		switch (format) {
			case 'percentage':
				return `${value.toFixed(1)}%`;
			case 'bytes':
				const units = ['B', 'KB', 'MB', 'GB', 'TB'];
				let size = value;
				let unitIndex = 0;
				while (size >= 1024 && unitIndex < units.length - 1) {
					size /= 1024;
					unitIndex++;
				}
				return `${size.toFixed(1)} ${units[unitIndex]}`;
			case 'duration':
				const hours = Math.floor(value / 3600);
				const minutes = Math.floor((value % 3600) / 60);
				return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
			default:
				return value.toLocaleString();
		}
	}

	async function fetchCardValue(card: DashboardCardConfig) {
		const current = cardValues.get(card.id) || { value: 0, loading: true };
		cardValues.set(card.id, { ...current, loading: true });
		cardValues = new Map(cardValues);

		try {
			// Fetch main value
			const response = await apiClient(`/api/prometheus/query?q=${encodeURIComponent(card.query)}&type=instant`);
			
			if (!response.ok) {
				throw new Error(`Query failed: ${response.statusText}`);
			}

			const result = await response.json();
			let value = 0;

			if (result.status === 'success' && result.data?.result?.length > 0) {
				const firstResult = result.data.result[0];
				value = parseFloat(firstResult.value?.[1] || '0');
			}

			// Fetch status value if configured
			let status: number | undefined;
			if (card.statusQuery) {
				const statusResponse = await apiClient(`/api/prometheus/query?q=${encodeURIComponent(card.statusQuery)}&type=instant`);
				if (statusResponse.ok) {
					const statusResult = await statusResponse.json();
					if (statusResult.status === 'success' && statusResult.data?.result?.length > 0) {
						status = parseFloat(statusResult.data.result[0].value?.[1] || '0');
					}
				}
			}

			cardValues.set(card.id, { value, status, loading: false });
			cardValues = new Map(cardValues);
		} catch (error) {
			console.error(`Error fetching card ${card.id}:`, error);
			cardValues.set(card.id, { 
				value: 0, 
				loading: false, 
				error: error instanceof Error ? error.message : 'Unknown error' 
			});
			cardValues = new Map(cardValues);
		}
	}

	// Fallback: fetch stats from Kubernetes API when Prometheus is unavailable
	async function fetchStatsFromK8sApi() {
		try {
			const response = await apiClient('/api/dashboard/stats');
			if (!response.ok) {
				throw new Error('Failed to fetch K8s stats');
			}
			
			const stats = await response.json();
			dataSourceType = 'kubernetes';
			dataSourceStore.update('kubernetes', true);
			
			// Map K8s API stats to card values
			const mappings: Record<string, { value: number; status?: number }> = {
				nodes: { value: stats.nodes.total, status: stats.nodes.ready },
				pods: { value: stats.pods.total, status: stats.pods.running },
				deployments: { value: stats.deployments.total, status: stats.deployments.available },
				namespaces: { value: stats.namespaces.total },
				services: { value: stats.services.total },
				pvcs: { value: stats.pvcs.total, status: stats.pvcs.bound }
			};
			
			for (const [id, data] of Object.entries(mappings)) {
				cardValues.set(id, { ...data, loading: false });
			}
			cardValues = new Map(cardValues);
			
			return true;
		} catch (error) {
			console.error('Failed to fetch K8s API stats:', error);
			return false;
		}
	}

	// Calculate appropriate step interval based on time range in minutes
	// Aim for ~60-120 data points for good chart resolution
	function getStepForTimeRange(minutes: number): number {
		if (minutes <= 15) return 15;      // 15s step for 5-15m range
		if (minutes <= 60) return 30;      // 30s step for 30m-1h range
		if (minutes <= 180) return 60;     // 1m step for 1-3h range
		if (minutes <= 360) return 120;    // 2m step for 3-6h range
		if (minutes <= 720) return 300;    // 5m step for 6-12h range
		if (minutes <= 1440) return 600;   // 10m step for 12-24h range
		if (minutes <= 4320) return 1800;  // 30m step for 1-3 days
		if (minutes <= 10080) return 3600; // 1h step for 3-7 days
		return 7200;                        // 2h step for longer ranges
	}

	// Build query URL based on whether custom range is active
	function buildQueryUrl(query: string, step: number, endTimestamp: number): string {
		const baseUrl = `/api/prometheus/query?q=${encodeURIComponent(query)}&type=range&step=${step}`;
		
		if (isCustomRangeActive && customStartTimestamp) {
			// Use absolute start/end timestamps
			return `${baseUrl}&start=${customStartTimestamp}&end=${endTimestamp}`;
		} else {
			// Use relative time range in minutes
			return `${baseUrl}&range=${selectedTimeRange}`;
		}
	}

	async function fetchChartData() {
		chartsLoading = true;
		
		// Determine the end timestamp - use current time if useCurrentEndTime is enabled
		const now = Math.floor(Date.now() / 1000);
		const effectiveEndTimestamp = (isCustomRangeActive && useCurrentEndTime) 
			? now 
			: (customEndTimestamp ?? now);
		
		// Calculate step based on time range
		let rangeMinutes: number;
		if (isCustomRangeActive && customStartTimestamp) {
			// Calculate minutes from custom range
			rangeMinutes = Math.ceil((effectiveEndTimestamp - customStartTimestamp) / 60);
		} else {
			rangeMinutes = selectedTimeRange;
		}
		const step = getStepForTimeRange(rangeMinutes);

		for (const chart of config.charts) {
			const seriesData: MetricSeries[] = [];

			try {
				// Handle multiple queries (for multi-series charts like Network In/Out)
				if (chart.queries && chart.queries.length > 0) {
					for (const q of chart.queries) {
						const queryUrl = buildQueryUrl(q.query, step, effectiveEndTimestamp);
						const response = await apiClient(queryUrl);
						
						if (!response.ok) {
							console.error(`Chart query failed for ${chart.id} - ${q.label}`);
							continue;
						}

						const result = await response.json();
						if (result.status === 'success' && result.data?.result?.length > 0) {
							const series = result.data.result[0];
							if (series.values && series.values.length > 0) {
								const dataPoints = series.values.map((v: [number, string]) => ({
									timestamp: new Date(v[0] * 1000),
									value: parseFloat(v[1])
								}));
								seriesData.push({ label: q.label, data: dataPoints, color: q.color } as MetricSeries & { color: string });
							}
						}
					}
				}
				// Handle single query
				else if (chart.query) {
					const queryUrl = buildQueryUrl(chart.query, step, effectiveEndTimestamp);
					const response = await apiClient(queryUrl);
					
					if (!response.ok) {
						console.error(`Chart query failed for ${chart.id}`);
						continue;
					}

					const result = await response.json();
					if (result.status === 'success' && result.data?.result?.length > 0) {
						for (const series of result.data.result) {
							if (series.values && series.values.length > 0) {
								const dataPoints = series.values.map((v: [number, string]) => ({
									timestamp: new Date(v[0] * 1000),
									value: parseFloat(v[1])
								}));
								const label = series.metric?.phase || series.metric?.instance || chart.title;
								seriesData.push({ label, data: dataPoints });
							}
						}
					}
				}

				chartData.set(chart.id, seriesData);
			} catch (error) {
				console.error(`Error fetching chart ${chart.id}:`, error);
			}
		}

		chartData = new Map(chartData);
		chartsLoading = false;
		lastRefresh = new Date();
	}

	async function refreshAll() {
		// Reset countdown on manual refresh
		countdownSeconds = 10;
		
		// Try Prometheus first for cards
		const cardPromises = config.cards.map(card => fetchCardValue(card));
		await Promise.all(cardPromises);
		
		// Check if all cards have errors (Prometheus unavailable)
		const allCardsHaveErrors = [...cardValues.values()].every(v => v.error);
		
		if (allCardsHaveErrors) {
			// Fallback to Kubernetes API
			console.log('Prometheus unavailable, falling back to Kubernetes API');
			await fetchStatsFromK8sApi();
		} else {
			dataSourceType = 'prometheus';
			dataSourceStore.update('prometheus', true);
		}
		
		// Always try to fetch chart data (will show "no data" if Prometheus unavailable)
		await fetchChartData();
	}

	function startPolling() {
		// Refresh every 10 seconds
		countdownSeconds = 10;
		intervalId = setInterval(() => {
			refreshAll();
			countdownSeconds = 10;
		}, 10000);
		
		// Countdown timer
		countdownIntervalId = setInterval(() => {
			if (countdownSeconds > 0) {
				countdownSeconds--;
			}
		}, 1000);
	}

	function stopPolling() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
		if (countdownIntervalId) {
			clearInterval(countdownIntervalId);
			countdownIntervalId = null;
		}
	}

	onMount(() => {
		// Load saved time range from localStorage
		selectedTimeRange = getStoredTimeRange();
		
		// If custom range was saved, restore it
		if (selectedTimeRange === 0) {
			const customRange = getStoredCustomRange();
			if (customRange) {
				customStartTimestamp = customRange.start;
				customEndTimestamp = customRange.end;
				useCurrentEndTime = customRange.useCurrentEndTime;
				isCustomRangeActive = true;
			} else {
				// No valid custom range, fall back to default
				selectedTimeRange = 30;
			}
		}
		
		refreshAll();
		startPolling();
	});

	onDestroy(() => {
		stopPolling();
	});

	function handleCardClick(card: DashboardCardConfig) {
		if (card.link) {
			goto(card.link);
		}
	}

	function getStatusIndicator(card: DashboardCardConfig, data: { value: number; status?: number }) {
		if (data.status === undefined) return null;
		
		const healthy = data.status;
		const total = data.value;
		
		if (total === 0) return { icon: Minus, color: 'text-gray-400', text: 'No data' };
		
		const ratio = healthy / total;
		if (ratio >= 1) return { icon: CheckCircle2, color: 'text-green-500', text: `${healthy}/${total} healthy` };
		if (ratio >= 0.8) return { icon: TrendingUp, color: 'text-yellow-500', text: `${healthy}/${total} healthy` };
		return { icon: AlertTriangle, color: 'text-red-500', text: `${healthy}/${total} healthy` };
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="cluster-dashboard">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-slate-100">Cluster Dashboard</h1>
			<p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
				Last updated: {lastRefresh.toLocaleTimeString()} · (refreshing in {countdownSeconds}s)
			</p>
		</div>
		<div class="flex items-center gap-2">
			<!-- Time Range Selector -->
			<div class="relative time-range-dropdown">
				<button
					onclick={() => timeRangeDropdownOpen = !timeRangeDropdownOpen}
					class="flex items-center gap-2 px-3 py-2 bg-gray-900 dark:bg-slate-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-slate-500 transition-colors"
				>
					<Clock size={16} />
					<span class="text-sm font-medium">{getSelectedTimeRangeLabel()}</span>
					<ChevronDown size={14} class="transition-transform {timeRangeDropdownOpen ? 'rotate-180' : ''}" />
				</button>
				{#if timeRangeDropdownOpen}
					<div class="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50 overflow-hidden">
						{#each timeRangeOptions as option}
							<button
								onclick={() => selectTimeRange(option.value)}
								class="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors {selectedTimeRange === option.value ? 'bg-gray-100 dark:bg-slate-700 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300'}"
							>
								{option.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>
			<!-- Refresh Button -->
			<button
				onclick={() => refreshAll()}
				class="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-slate-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-slate-500 transition-colors"
			>
				<RefreshCw size={16} />
			</button>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
		{#each config.cards as card}
			{@const data = cardValues.get(card.id) || { value: 0, loading: true }}
			{@const colors = colorClasses[card.color]}
			{@const Icon = iconMap[card.icon] || Box}
			{@const statusIndicator = getStatusIndicator(card, data)}
			
			<button
				onclick={() => handleCardClick(card)}
				class="dashboard-card group bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 border rounded-lg p-3 text-left transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
				data-color={card.color}
			>
				<div class="flex items-start justify-between gap-3">
					<div class="flex items-start gap-3 flex-1 min-w-0">
						<div class="p-1.5 rounded-md bg-white/60 dark:bg-slate-800/60 flex-shrink-0">
							<Icon size={16} class="text-gray-500 dark:text-gray-400 group-hover-icon" />
						</div>
						
						<div class="space-y-0.5 flex-1 min-w-0">
							<p class="text-[10px] font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide truncate">{card.title}</p>
							{#if data.loading}
								<div class="h-6 w-16 bg-gray-200 dark:bg-slate-600 rounded animate-pulse"></div>
							{:else if data.error}
								<p class="text-xl font-bold text-red-500 h-6 leading-6">Error</p>
							{:else}
								<p class="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover-text h-6 leading-6 truncate">{formatValue(data.value, card.format)}</p>
							{/if}
							<p class="text-[10px] text-gray-500 dark:text-slate-400 h-3 truncate">{statusIndicator && !data.loading ? statusIndicator.text : ''}</p>
						</div>
					</div>
					
					<div class="flex-shrink-0">
						{#if data.loading}
							<LoaderCircle size={14} class="animate-spin text-gray-400 dark:text-slate-500" />
						{:else if statusIndicator}
							{@const StatusIcon = statusIndicator.icon}
							<StatusIcon size={14} class={statusIndicator.color} />
						{/if}
					</div>
				</div>
			</button>
		{/each}
	</div>

	<!-- Charts Grid - 4 columns on large screens -->
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
		{#each config.charts as chart}
			{@const data = chartData.get(chart.id) || []}
			<div class="chart-card bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 shadow-sm">
				{#if chartsLoading && data.length === 0}
					<div class="flex items-center justify-center h-[200px]">
						<LoaderCircle size={32} class="animate-spin text-gray-400 dark:text-slate-500" />
					</div>
				{:else if data.length === 0}
					<div class="flex flex-col items-center justify-center h-[200px] text-gray-400 dark:text-slate-500">
						<Activity size={32} class="mb-2 opacity-50" />
						<p class="text-sm">No data available</p>
						<p class="text-xs mt-1">Check Prometheus connection</p>
					</div>
				{:else}
					<MetricsChart config={chart} data={data} />
				{/if}
			</div>
		{/each}
	</div>

	<!-- Quick Actions / Info Section -->
	<div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 hidden">
		<div class="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 text-white">
			<h3 class="font-semibold mb-2">Quick Navigation</h3>
			<p class="text-sm text-gray-300 mb-3">Jump to commonly used resources</p>
			<div class="flex flex-wrap gap-2">
				<a href="/?resource=pods" class="px-3 py-1 bg-white/10 rounded-full text-xs hover:bg-white/20 transition-colors">Pods</a>
				<a href="/?resource=deployments" class="px-3 py-1 bg-white/10 rounded-full text-xs hover:bg-white/20 transition-colors">Deployments</a>
				<a href="/?resource=services" class="px-3 py-1 bg-white/10 rounded-full text-xs hover:bg-white/20 transition-colors">Services</a>
				<a href="/?resource=configmaps" class="px-3 py-1 bg-white/10 rounded-full text-xs hover:bg-white/20 transition-colors">ConfigMaps</a>
			</div>
		</div>
		
		<div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
			<h3 class="font-semibold mb-2">Keyboard Shortcuts</h3>
			<p class="text-sm text-blue-100 mb-3">Navigate faster with shortcuts</p>
			<div class="space-y-1 text-sm">
				<div class="flex items-center gap-2">
					<kbd class="px-2 py-0.5 bg-white/20 rounded text-xs">Ctrl+K</kbd>
					<span class="text-blue-100">Global Search</span>
				</div>
			</div>
		</div>
		
		<div class="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-5 text-white">
			<h3 class="font-semibold mb-2">Cluster Health</h3>
			<p class="text-sm text-purple-100 mb-3">Monitor your cluster status</p>
			<div class="flex items-center gap-2">
				<div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
				<span class="text-sm text-purple-100">All systems operational</span>
			</div>
		</div>
	</div>
</div>

<!-- Custom Date/Time Range Modal -->
{#if showCustomRangeModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
		<div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 border border-gray-200 dark:border-slate-600">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Custom Time Range</h2>
			
			<div class="space-y-4">
				<div>
					<label for="custom-start" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
						Start Date & Time
					</label>
					<input
						id="custom-start"
						type="datetime-local"
						bind:value={customStartDate}
						class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
					/>
				</div>
				
				<div>
					<label for="custom-end" class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
						End Date & Time
					</label>
					<input
						id="custom-end"
						type="datetime-local"
						bind:value={customEndDate}
						disabled={useCurrentEndTime}
						class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-slate-800"
					/>
				</div>
				
				<div class="flex items-center gap-2">
					<input
						id="use-current-time"
						type="checkbox"
						bind:checked={useCurrentEndTime}
						class="w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
					/>
					<label for="use-current-time" class="text-sm text-gray-700 dark:text-slate-300 cursor-pointer select-none">
						Use current date and time
					</label>
				</div>
			</div>
			
			<div class="flex justify-end gap-3 mt-6">
				<button
					onclick={cancelCustomRange}
					class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={applyCustomRange}
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
				>
					Apply
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.cluster-dashboard {
		max-width: 1400px;
		margin: 0 auto;
	}

	.dashboard-card {
		position: relative;
		overflow: hidden;
	}

	.dashboard-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: linear-gradient(90deg, transparent, currentColor, transparent);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.dashboard-card:hover::before {
		opacity: 0.3;
	}

	/* Hover color styles */
	:global(.dashboard-card[data-color="blue"]:hover) {
		background-color: rgb(239 246 255);
		border-color: rgb(191 219 254);
	}

	:global(.dark .dashboard-card[data-color="blue"]:hover) {
		background-color: rgb(30 58 138 / 0.3);
		border-color: rgb(29 78 216);
	}

	:global(.dashboard-card[data-color="blue"]:hover .group-hover-icon) {
		color: rgb(59 130 246);
	}

	:global(.dark .dashboard-card[data-color="blue"]:hover .group-hover-icon) {
		color: rgb(96 165 250);
	}

	:global(.dashboard-card[data-color="blue"]:hover .group-hover-text) {
		color: rgb(30 64 175);
	}

	:global(.dark .dashboard-card[data-color="blue"]:hover .group-hover-text) {
		color: rgb(219 234 254);
	}

	:global(.dashboard-card[data-color="green"]:hover) {
		background-color: rgb(240 253 244);
		border-color: rgb(187 247 208);
	}

	:global(.dark .dashboard-card[data-color="green"]:hover) {
		background-color: rgb(20 83 45 / 0.3);
		border-color: rgb(34 197 94);
	}

	:global(.dashboard-card[data-color="green"]:hover .group-hover-icon) {
		color: rgb(34 197 94);
	}

	:global(.dark .dashboard-card[data-color="green"]:hover .group-hover-icon) {
		color: rgb(74 222 128);
	}

	:global(.dashboard-card[data-color="green"]:hover .group-hover-text) {
		color: rgb(20 83 45);
	}

	:global(.dark .dashboard-card[data-color="green"]:hover .group-hover-text) {
		color: rgb(220 252 231);
	}

	:global(.dashboard-card[data-color="yellow"]:hover) {
		background-color: rgb(254 252 232);
		border-color: rgb(254 240 138);
	}

	:global(.dark .dashboard-card[data-color="yellow"]:hover) {
		background-color: rgb(113 63 18 / 0.3);
		border-color: rgb(202 138 4);
	}

	:global(.dashboard-card[data-color="yellow"]:hover .group-hover-icon) {
		color: rgb(234 179 8);
	}

	:global(.dark .dashboard-card[data-color="yellow"]:hover .group-hover-icon) {
		color: rgb(250 204 21);
	}

	:global(.dashboard-card[data-color="yellow"]:hover .group-hover-text) {
		color: rgb(113 63 18);
	}

	:global(.dark .dashboard-card[data-color="yellow"]:hover .group-hover-text) {
		color: rgb(254 249 195);
	}

	:global(.dashboard-card[data-color="red"]:hover) {
		background-color: rgb(254 242 242);
		border-color: rgb(254 202 202);
	}

	:global(.dark .dashboard-card[data-color="red"]:hover) {
		background-color: rgb(127 29 29 / 0.3);
		border-color: rgb(185 28 28);
	}

	:global(.dashboard-card[data-color="red"]:hover .group-hover-icon) {
		color: rgb(239 68 68);
	}

	:global(.dark .dashboard-card[data-color="red"]:hover .group-hover-icon) {
		color: rgb(248 113 113);
	}

	:global(.dashboard-card[data-color="red"]:hover .group-hover-text) {
		color: rgb(127 29 29);
	}

	:global(.dark .dashboard-card[data-color="red"]:hover .group-hover-text) {
		color: rgb(254 226 226);
	}

	:global(.dashboard-card[data-color="purple"]:hover) {
		background-color: rgb(250 245 255);
		border-color: rgb(233 213 255);
	}

	:global(.dark .dashboard-card[data-color="purple"]:hover) {
		background-color: rgb(88 28 135 / 0.3);
		border-color: rgb(147 51 234);
	}

	:global(.dashboard-card[data-color="purple"]:hover .group-hover-icon) {
		color: rgb(168 85 247);
	}

	:global(.dark .dashboard-card[data-color="purple"]:hover .group-hover-icon) {
		color: rgb(192 132 252);
	}

	:global(.dashboard-card[data-color="purple"]:hover .group-hover-text) {
		color: rgb(88 28 135);
	}

	:global(.dark .dashboard-card[data-color="purple"]:hover .group-hover-text) {
		color: rgb(243 232 255);
	}

	:global(.dashboard-card[data-color="cyan"]:hover) {
		background-color: rgb(236 254 255);
		border-color: rgb(165 243 252);
	}

	:global(.dark .dashboard-card[data-color="cyan"]:hover) {
		background-color: rgb(22 78 99 / 0.3);
		border-color: rgb(14 116 144);
	}

	:global(.dashboard-card[data-color="cyan"]:hover .group-hover-icon) {
		color: rgb(6 182 212);
	}

	:global(.dark .dashboard-card[data-color="cyan"]:hover .group-hover-icon) {
		color: rgb(34 211 238);
	}

	:global(.dashboard-card[data-color="cyan"]:hover .group-hover-text) {
		color: rgb(22 78 99);
	}

	:global(.dark .dashboard-card[data-color="cyan"]:hover .group-hover-text) {
		color: rgb(207 250 254);
	}

	:global(.dashboard-card[data-color="orange"]:hover) {
		background-color: rgb(255 247 237);
		border-color: rgb(254 215 170);
	}

	:global(.dark .dashboard-card[data-color="orange"]:hover) {
		background-color: rgb(154 52 18 / 0.3);
		border-color: rgb(194 65 12);
	}

	:global(.dashboard-card[data-color="orange"]:hover .group-hover-icon) {
		color: rgb(249 115 22);
	}

	:global(.dark .dashboard-card[data-color="orange"]:hover .group-hover-icon) {
		color: rgb(251 146 60);
	}

	:global(.dashboard-card[data-color="orange"]:hover .group-hover-text) {
		color: rgb(154 52 18);
	}

	:global(.dark .dashboard-card[data-color="orange"]:hover .group-hover-text) {
		color: rgb(255 237 213);
	}

	:global(.dashboard-card[data-color="gray"]:hover) {
		background-color: rgb(249 250 251);
		border-color: rgb(229 231 235);
	}

	:global(.dark .dashboard-card[data-color="gray"]:hover) {
		background-color: rgb(17 24 39 / 0.3);
		border-color: rgb(55 65 81);
	}

	:global(.dashboard-card[data-color="gray"]:hover .group-hover-icon) {
		color: rgb(107 114 128);
	}

	:global(.dark .dashboard-card[data-color="gray"]:hover .group-hover-icon) {
		color: rgb(156 163 175);
	}

	:global(.dashboard-card[data-color="gray"]:hover .group-hover-text) {
		color: rgb(17 24 39);
	}

	:global(.dark .dashboard-card[data-color="gray"]:hover .group-hover-text) {
		color: rgb(243 244 246);
	}

	.chart-card {
		transition: box-shadow 0.2s, transform 0.2s;
	}

	.chart-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	kbd {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}
</style>


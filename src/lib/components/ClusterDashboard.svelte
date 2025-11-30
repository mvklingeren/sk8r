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
		RefreshCw
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
		blue: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', icon: 'text-blue-500' },
		green: { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200', icon: 'text-green-500' },
		yellow: { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200', icon: 'text-yellow-500' },
		red: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', icon: 'text-red-500' },
		purple: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', icon: 'text-purple-500' },
		cyan: { bg: 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', icon: 'text-cyan-500' },
		orange: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', icon: 'text-orange-500' },
		gray: { bg: 'bg-gray-50', text: 'text-gray-900', border: 'border-gray-200', icon: 'text-gray-500' }
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

	async function fetchChartData() {
		chartsLoading = true;
		
		for (const chart of config.charts) {
			const seriesData: MetricSeries[] = [];
			const timeRange = chart.timeRange || 30;

			try {
				// Handle multiple queries (for multi-series charts like Network In/Out)
				if (chart.queries && chart.queries.length > 0) {
					for (const q of chart.queries) {
						const queryUrl = `/api/prometheus/query?q=${encodeURIComponent(q.query)}&type=range&range=${timeRange}&step=60`;
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
					const queryUrl = `/api/prometheus/query?q=${encodeURIComponent(chart.query)}&type=range&range=${timeRange}&step=60`;
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

<div class="cluster-dashboard">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Cluster Dashboard</h1>
			<p class="text-sm text-gray-500 mt-1">
				Last updated: {lastRefresh.toLocaleTimeString()} · (refreshing in {countdownSeconds}s)
			</p>
		</div>
		<button
			onclick={() => refreshAll()}
			class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
		>
			<RefreshCw size={16} />
			Refresh
		</button>
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
				class="dashboard-card {colors.bg} {colors.border} border rounded-lg p-3 text-left transition-all hover:scale-105 hover:shadow-lg cursor-pointer h-[100px]"
			>
				<div class="flex items-start justify-between mb-2">
					<div class="p-1.5 rounded-md bg-white/60">
						<Icon size={16} class={colors.icon} />
					</div>
					{#if data.loading}
						<LoaderCircle size={14} class="animate-spin text-gray-400" />
					{:else if statusIndicator}
						{@const StatusIcon = statusIndicator.icon}
						<StatusIcon size={14} class={statusIndicator.color} />
					{/if}
				</div>
				
				<div class="space-y-0.5">
					<p class="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{card.title}</p>
					{#if data.loading}
						<div class="h-7 w-12 bg-gray-200 rounded animate-pulse"></div>
					{:else if data.error}
						<p class="text-xl font-bold text-red-500 h-7 leading-7">Error</p>
					{:else}
						<p class="text-xl font-bold {colors.text} h-7 leading-7">{formatValue(data.value, card.format)}</p>
					{/if}
					<p class="text-[10px] text-gray-500 h-3">{statusIndicator && !data.loading ? statusIndicator.text : ''}</p>
				</div>
			</button>
		{/each}
	</div>

	<!-- Charts Grid - 4 columns on large screens -->
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
		{#each config.charts as chart}
			{@const data = chartData.get(chart.id) || []}
			<div class="chart-card bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
				{#if chartsLoading && data.length === 0}
					<div class="flex items-center justify-center h-[200px]">
						<LoaderCircle size={32} class="animate-spin text-gray-400" />
					</div>
				{:else if data.length === 0}
					<div class="flex flex-col items-center justify-center h-[200px] text-gray-400">
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


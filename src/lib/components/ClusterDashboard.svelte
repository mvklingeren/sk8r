<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Activity, LoaderCircle, RefreshCw } from 'lucide-svelte';
	import MetricsChart from './MetricsChart.svelte';
	import DashboardCard, { type CardValue } from './DashboardCard.svelte';
	import TimeRangePicker, { loadStoredRange, type TimeRange } from './TimeRangePicker.svelte';
	import type { DashboardCardConfig, DashboardConfig } from '$lib/config/dashboardConfig';
	import type { MetricSeries } from '$lib/types/metricsTypes';
	import { apiClient } from '$lib/utils/apiClient';
	import { dataSource as dataSourceStore } from '$lib/stores/dataSource';

	interface Props {
		config: DashboardConfig;
	}

	let { config }: Props = $props();

	// State for card values
	let cardValues = $state<Map<string, CardValue>>(new Map());
	let chartData = $state<Map<string, MetricSeries[]>>(new Map());
	let chartsLoading = $state(true);
	let lastRefresh = $state<Date>(new Date());
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let countdownSeconds = $state(30);
	let countdownIntervalId: ReturnType<typeof setInterval> | null = null;

	let range = $state<TimeRange>({ minutes: 30, start: null, end: null });

	async function fetchCardValue(card: DashboardCardConfig) {
		const current = cardValues.get(card.id) || { value: 0, loading: true };
		cardValues.set(card.id, { ...current, loading: true });
		cardValues = new Map(cardValues);

		try {
			// Fetch main value
			const response = await apiClient(
				`/api/prometheus/query?q=${encodeURIComponent(card.query)}&type=instant`
			);

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
				const statusResponse = await apiClient(
					`/api/prometheus/query?q=${encodeURIComponent(card.statusQuery)}&type=instant`
				);
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
		if (minutes <= 15) return 15; // 15s step for 5-15m range
		if (minutes <= 60) return 30; // 30s step for 30m-1h range
		if (minutes <= 180) return 60; // 1m step for 1-3h range
		if (minutes <= 360) return 120; // 2m step for 3-6h range
		if (minutes <= 720) return 300; // 5m step for 6-12h range
		if (minutes <= 1440) return 600; // 10m step for 12-24h range
		if (minutes <= 4320) return 1800; // 30m step for 1-3 days
		if (minutes <= 10080) return 3600; // 1h step for 3-7 days
		return 7200; // 2h step for longer ranges
	}

	// Build query URL for a relative ("last N minutes") or absolute range
	function buildQueryUrl(query: string, step: number, endTimestamp: number): string {
		const baseUrl = `/api/prometheus/query?q=${encodeURIComponent(query)}&type=range&step=${step}`;
		return range.start !== null
			? `${baseUrl}&start=${range.start}&end=${endTimestamp}`
			: `${baseUrl}&range=${range.minutes}`;
	}

	// Polling and time-range changes can overlap; only the newest fetch may write chart data
	let chartRequestSeq = 0;

	async function fetchChartData() {
		const seq = ++chartRequestSeq;
		const nextChartData = new Map<string, MetricSeries[]>();
		chartsLoading = true;

		// Absolute ranges with end === null follow "now" on every refresh
		const effectiveEndTimestamp = range.end ?? Math.floor(Date.now() / 1000);
		const rangeMinutes =
			range.start !== null ? Math.round((effectiveEndTimestamp - range.start) / 60) : range.minutes;
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
								seriesData.push({
									label: q.label,
									data: dataPoints,
									color: q.color
								} as MetricSeries & { color: string });
							}
						}
					}
				}
				// Handle single query
				else if (chart.query) {
					const queryUrl = buildQueryUrl(chart.query, step, effectiveEndTimestamp);
					const response = await apiClient(queryUrl);

					if (!response.ok) {
						throw new Error(`Chart query failed for ${chart.id}`);
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

				nextChartData.set(chart.id, seriesData);
			} catch (error) {
				console.error(`Error fetching chart ${chart.id}:`, error);
				nextChartData.set(chart.id, []); // don't keep showing stale data from an earlier source
			}
		}

		if (seq !== chartRequestSeq) return; // a newer fetch started meanwhile
		chartData = nextChartData;
		chartsLoading = false;
		lastRefresh = new Date();
	}

	async function refreshAll() {
		// Reset countdown on manual refresh
		countdownSeconds = 10;

		// Try Prometheus first for cards
		const cardPromises = config.cards.map((card) => fetchCardValue(card));
		await Promise.all(cardPromises);

		// Check if all cards have errors (Prometheus unavailable)
		const allCardsHaveErrors = [...cardValues.values()].every((v) => v.error);

		if (allCardsHaveErrors) {
			// Fallback to Kubernetes API
			await fetchStatsFromK8sApi();
		} else {
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
		range = loadStoredRange();
		refreshAll();
		startPolling();
	});

	onDestroy(() => {
		stopPolling();
	});
</script>

<div class="cluster-dashboard">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-slate-100">Cluster Dashboard</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-slate-400">
				Last updated: {lastRefresh.toLocaleTimeString()} · (refreshing in {countdownSeconds}s)
			</p>
		</div>
		<div class="flex items-center gap-2">
			<TimeRangePicker bind:range onchange={fetchChartData} />
			<!-- Refresh Button -->
			<button
				onclick={() => refreshAll()}
				class="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800 dark:bg-slate-600 dark:hover:bg-slate-500"
			>
				<RefreshCw size={16} />
			</button>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
		{#each config.cards as card (card.id)}
			<DashboardCard {card} data={cardValues.get(card.id) || { value: 0, loading: true }} />
		{/each}
	</div>

	<!-- Charts Grid - 4 columns on large screens -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
		{#each config.charts as chart (chart.id)}
			{@const data = chartData.get(chart.id) || []}
			<div
				class="chart-card rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
			>
				{#if chartsLoading && data.length === 0}
					<div class="flex h-[200px] items-center justify-center">
						<LoaderCircle size={32} class="animate-spin text-gray-400 dark:text-slate-500" />
					</div>
				{:else if data.length === 0}
					<div
						class="flex h-[200px] flex-col items-center justify-center text-gray-400 dark:text-slate-500"
					>
						<Activity size={32} class="mb-2 opacity-50" />
						<p class="text-sm">No data available</p>
						<p class="mt-1 text-xs">Check Prometheus connection</p>
					</div>
				{:else}
					<MetricsChart config={chart} {data} />
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.cluster-dashboard {
		max-width: 1400px;
		margin: 0 auto;
	}

	.chart-card {
		transition:
			box-shadow 0.2s,
			transform 0.2s;
	}

	.chart-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
</style>

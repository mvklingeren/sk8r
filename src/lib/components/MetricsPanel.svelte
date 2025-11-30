<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import MetricsChart from './MetricsChart.svelte';
	import type { MetricChartConfig, MetricSeries, MetricDataPoint } from '$lib/types/metricsTypes';
	import { LoaderCircle } from 'lucide-svelte';

	interface Props {
		charts: MetricChartConfig[];
		resourceType: string;
		fetchMetrics: () => Promise<Map<string, MetricSeries[]>>;
		class?: string;
	}

	let { charts, resourceType, fetchMetrics, class: className = '' }: Props = $props();

	let metricsData = $state<Map<string, MetricSeries[]>>(new Map());
	let loading = $state(true);
	let error = $state<string | null>(null);
	let intervalId: NodeJS.Timeout | null = null;

	async function loadMetrics() {
		try {
			const data = await fetchMetrics();
			metricsData = data;
			error = null;
		} catch (err) {
			console.error('Failed to fetch metrics:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch metrics';
		} finally {
			loading = false;
		}
	}

	function startPolling() {
		// Get the shortest refresh interval from all charts
		const shortestInterval = Math.min(
			...charts.map(chart => chart.refreshInterval || 30)
		);

		// Poll for new data
		intervalId = setInterval(() => {
			loadMetrics();
		}, shortestInterval * 1000);
	}

	function stopPolling() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	onMount(() => {
		loadMetrics();
		startPolling();
	});

	onDestroy(() => {
		stopPolling();
	});

	// Handle chart config changes
	$effect(() => {
		// Reset polling when charts config changes
		stopPolling();
		startPolling();
	});
</script>

{#if charts.length > 0}
	<div class="metrics-panel {className}">
		{#if loading}
			<div class="flex items-center justify-center gap-4 p-12 bg-gray-50 dark:bg-slate-800 rounded-lg">
				<LoaderCircle class="animate-spin text-blue-500" size={32} />
				<span class="text-gray-600 dark:text-slate-300">Loading metrics...</span>
			</div>
		{:else if error}
			<div class="my-4">
				<div class="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
					<p class="text-yellow-800 dark:text-yellow-200 text-sm">
						{error}
					</p>
					{#if error.includes('metrics-server')}
						<p class="text-yellow-700 dark:text-yellow-300 text-xs mt-2">
							Ensure metrics-server is installed: <code class="bg-yellow-100 dark:bg-yellow-800 px-1">kubectl apply -f https://github.com/kubernetes-metrics/metrics-server/releases/latest/download/components.yaml</code>
						</p>
					{/if}
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6">
				{#each charts as chart}
					{@const chartData = metricsData.get(chart.id) || []}
					<div class="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
						<MetricsChart config={chart} data={chartData} />
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.metrics-panel {
		margin-bottom: 1.5rem;
	}
</style>
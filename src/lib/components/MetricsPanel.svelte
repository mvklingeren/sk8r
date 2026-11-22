<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import MetricsChart from './MetricsChart.svelte';
	import type { MetricChartConfig, MetricSeries } from '$lib/types/metricsTypes';
	import { LoaderCircle } from 'lucide-svelte';

	interface Props {
		charts: MetricChartConfig[];
		fetchMetrics: () => Promise<Map<string, MetricSeries[]>>;
		class?: string;
	}

	let { charts, fetchMetrics, class: className = '' }: Props = $props();

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
		const shortestInterval = Math.min(...charts.map((chart) => chart.refreshInterval || 30));

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
			<div
				class="flex items-center justify-center gap-4 rounded-lg bg-gray-50 p-12 dark:bg-slate-800"
			>
				<LoaderCircle class="animate-spin text-blue-500" size={32} />
				<span class="text-gray-600 dark:text-slate-300">Loading metrics...</span>
			</div>
		{:else if error}
			<div class="my-4">
				<div
					class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/30"
				>
					<p class="text-sm text-yellow-800 dark:text-yellow-200">
						{error}
					</p>
					{#if error.includes('metrics-server')}
						<p class="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
							Ensure metrics-server is installed: <code
								class="bg-yellow-100 px-1 dark:bg-yellow-800"
								>kubectl apply -f
								https://github.com/kubernetes-metrics/metrics-server/releases/latest/download/components.yaml</code
							>
						</p>
					{/if}
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
				{#each charts as chart (chart.id)}
					{@const chartData = metricsData.get(chart.id) || []}
					<div
						class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
					>
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

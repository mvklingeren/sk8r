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
			<div class="loading-container">
				<LoaderCircle class="animate-spin text-blue-500" size={32} />
				<span class="text-gray-600">Loading metrics...</span>
			</div>
		{:else if error}
			<div class="error-container">
				<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
					<p class="text-yellow-800 text-sm">
						{error}
					</p>
					{#if error.includes('metrics-server')}
						<p class="text-yellow-700 text-xs mt-2">
							Ensure metrics-server is installed: <code class="bg-yellow-100 px-1">kubectl apply -f https://github.com/kubernetes-metrics/metrics-server/releases/latest/download/components.yaml</code>
						</p>
					{/if}
				</div>
			</div>
		{:else}
			<div class="charts-grid">
				{#each charts as chart}
					{@const chartData = metricsData.get(chart.id) || []}
					<div class="chart-wrapper">
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

	.loading-container {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 3rem;
		background-color: #f9fafb;
		border-radius: 0.5rem;
	}

	.error-container {
		margin: 1rem 0;
	}

	.charts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 1.5rem;
	}

	.chart-wrapper {
		background-color: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		padding: 1rem;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
	}

	@media (max-width: 768px) {
		.charts-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
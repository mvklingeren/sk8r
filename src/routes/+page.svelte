<script lang="ts">
	import { navigation } from '$lib/stores/navigation';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import MetricsPanel from '$lib/components/MetricsPanel.svelte';
	import ClusterDashboard from '$lib/components/ClusterDashboard.svelte';
	import type { K8sResource } from '$lib/types/k8s';
	import type { MetricChartConfig, MetricSeries } from '$lib/types/metricsTypes';
	import { goto } from '$app/navigation';
	import { apiClient } from '$lib/utils/apiClient';
	import { browser } from '$app/environment';
	import { dashboardConfig } from '$lib/config/dashboardConfig';

	interface Props {
		data: {
			resourceType: string;
			resources: K8sResource[];
			namespace: string;
			error?: string;
			metricsEnabled: boolean;
			metricsCharts: MetricChartConfig[];
		};
	}

	let { data }: Props = $props();
	let initialized = $state(false);

	// On initial load, sync the store FROM the server data (URL params)
	$effect(() => {
		if (browser && !initialized) {
			// Initialize store from server data (which comes from URL params)
			if (data.resourceType && data.resourceType !== $navigation.selectedResource) {
				navigation.selectResource(data.resourceType);
			}
			if (data.namespace && data.namespace !== $navigation.namespace) {
				navigation.setNamespace(data.namespace);
			}
			initialized = true;
		}
	});

	// After initialization, sync URL FROM store changes (user interactions)
	$effect(() => {
		if (!initialized) return;
		
		if ($navigation.selectedResource !== data.resourceType || $navigation.namespace !== data.namespace) {
			const params = new URLSearchParams();
			if ($navigation.selectedResource && $navigation.selectedResource !== 'overview') {
				params.set('resource', $navigation.selectedResource);
			}
			if ($navigation.namespace && $navigation.namespace !== 'default') {
				params.set('namespace', $navigation.namespace);
			}
			
			const queryString = params.toString();
			goto(queryString ? `/?${queryString}` : '/', { replaceState: true });
		}
	});

	function handleEdit(resource: K8sResource) {
		console.log('Edit resource:', resource);
	}

	async function handleDelete(resource: K8sResource) {
		if (confirm(`Are you sure you want to delete ${resource.metadata.name}?`)) {
			try {
				const response = await apiClient(`/api/resources/${data.resourceType}/${resource.metadata.name}`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ namespace: data.namespace })
				});
				
				if (response.ok) {
					goto(window.location.href);
				}
			} catch (error) {
				console.error('Failed to delete resource:', error);
			}
		}
	}

	function handleRefresh() {
		goto(window.location.href);
	}

	async function fetchNodeMetrics(): Promise<Map<string, MetricSeries[]>> {
		console.log('Fetching node metrics...');
		const metricsMap = new Map<string, MetricSeries[]>();

		try {
			for (const chart of data.metricsCharts) {
				if (!chart.query) continue;

				// Use range query for line charts to get multiple data points
				const timeRange = chart.timeRange || 5; // default 5 minutes
				const queryUrl = `/api/prometheus/query?q=${encodeURIComponent(chart.query)}&type=range&range=${timeRange}&step=15`;
				
				console.log(`Executing range query for chart '${chart.title}':`, chart.query);
				const response = await apiClient(queryUrl);
				
				if (!response.ok) {
					const errorText = await response.text();
					console.error(`Query for '${chart.title}' failed:`, errorText);
					throw new Error(`Query for '${chart.title}' failed: ${errorText}`);
				}

				const result = await response.json();
				console.log(`Raw response for '${chart.title}':`, JSON.stringify(result, null, 2));

				const seriesData: MetricSeries[] = [];

				if (result.status === 'success' && result.data.result.length > 0) {
					// Handle range query result (matrix with multiple values)
					const matrixResult = result.data.result[0];
					
					if (matrixResult.values && matrixResult.values.length > 0) {
						// Range query returns array of [timestamp, value] pairs
						const dataPoints = matrixResult.values.map((v: [number, string]) => ({
							timestamp: new Date(v[0] * 1000),
							value: parseFloat(v[1])
						}));
						
						console.log(`Processed ${dataPoints.length} data points for '${chart.title}'`);
						
						seriesData.push({
							label: chart.title,
							data: dataPoints
						});
					} else if (matrixResult.value) {
						// Fallback for instant query result
						const value = parseFloat(matrixResult.value[1]);
						const timestamp = new Date(matrixResult.value[0] * 1000);
						seriesData.push({
							label: chart.title,
							data: [{ timestamp, value }]
						});
					}
				} else {
					console.warn(`No data returned from Prometheus for query:`, chart.query);
				}
				
				metricsMap.set(chart.id, seriesData);
			}
		} catch (error) {
			console.error('Error fetching or processing Prometheus metrics:', error);
		}

		console.log('Final metrics map:', metricsMap);
		return metricsMap;
	}
</script>

<div>
	{#if data.resourceType === 'overview' || !data.resourceType}
		<ClusterDashboard config={dashboardConfig} />
	{:else if data.error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4">
			<p class="text-red-800">Error: {data.error}</p>
		</div>
	{:else}
		{#if data.metricsEnabled && data.metricsCharts.length > 0}
			<MetricsPanel
				charts={data.metricsCharts}
				resourceType={data.resourceType}
				fetchMetrics={fetchNodeMetrics}
			/>
		{/if}
		
		<ResourceList
			resourceType={data.resourceType}
			resources={data.resources}
			namespace={data.namespace}
			onEdit={handleEdit}
			onDelete={handleDelete}
			onRefresh={handleRefresh}
		/>
	{/if}
</div>
<script lang="ts">
	import { navigation } from '$lib/stores/navigation';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import MetricsPanel from '$lib/components/MetricsPanel.svelte';
	import type { K8sResource } from '$lib/types/k8s';
	import type { MetricChartConfig, MetricSeries } from '$lib/types/metricsTypes';
	import { goto } from '$app/navigation';
	import { apiClient } from '$lib/utils/apiClient';
	
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

	$effect(() => {
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

				console.log(`Executing query for chart '${chart.title}':`, chart.query);
				const response = await apiClient(`/api/prometheus/query?q=${encodeURIComponent(chart.query)}`);
				
				if (!response.ok) {
					const errorText = await response.text();
					console.error(`Query for '${chart.title}' failed:`, errorText);
					throw new Error(`Query for '${chart.title}' failed: ${errorText}`);
				}

				const result = await response.json();
				console.log(`Raw response for '${chart.title}':`, JSON.stringify(result, null, 2));

				const seriesData: MetricSeries[] = [];

				if (result.status === 'success' && result.data.result.length > 0) {
					// Assuming instant vector result
					const value = parseFloat(result.data.result[0].value[1]);
					const timestamp = new Date(result.data.result[0].value[0] * 1000);

					const dataPoint = { timestamp, value };
					console.log(`Processed data point for '${chart.title}':`, dataPoint);

					seriesData.push({
						label: chart.title,
						data: [dataPoint]
					});
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
		<div class="bg-white rounded-lg shadow p-6">
			<h1 class="text-3xl font-bold text-gray-800 mb-4">Welcome to SK8TES</h1>
			<p class="text-gray-600 mb-6">
				A Kubernetes management interface inspired by Lens and k9s, built with SvelteKit.
			</p>
			
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="bg-blue-50 rounded-lg p-4">
					<h3 class="font-semibold text-blue-900 mb-2">Generic Resource Handling</h3>
					<p class="text-sm text-blue-700">
						Auto-generated forms from Kubernetes schemas with uniform CRUD operations for all resource types.
					</p>
				</div>
				
				<div class="bg-green-50 rounded-lg p-4">
					<h3 class="font-semibold text-green-900 mb-2">JSON-Based Architecture</h3>
					<p class="text-sm text-green-700">
						Powered by JSON Forms for UI, JSON Logic for filtering, and JSON Patch for tracking changes.
					</p>
				</div>
				
				<div class="bg-purple-50 rounded-lg p-4">
					<h3 class="font-semibold text-purple-900 mb-2">Real-time Updates</h3>
					<p class="text-sm text-purple-700">
						Live resource status updates with WebSocket connections for instant feedback.
					</p>
				</div>
			</div>
			
			<div class="mt-8 p-4 bg-gray-100 rounded-lg">
				<p class="text-sm text-gray-600">
					Select a resource type from the sidebar to begin managing your Kubernetes cluster.
				</p>
			</div>
		</div>
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
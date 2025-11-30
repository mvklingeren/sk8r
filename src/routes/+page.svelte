<script lang="ts">
	import { onMount } from 'svelte';
	import { navigation } from '$lib/stores/navigation';
	import ResourceList from '$lib/components/ResourceList.svelte';
	import MetricsPanel from '$lib/components/MetricsPanel.svelte';
	import ClusterDashboard from '$lib/components/ClusterDashboard.svelte';
	import EventsPanel from '$lib/components/EventsPanel.svelte';
	import type { K8sResource } from '$lib/types/k8s';
	import type { MetricChartConfig, MetricSeries } from '$lib/types/metricsTypes';
	import { goto } from '$app/navigation';
	import { apiClient } from '$lib/utils/apiClient';
	import { browser } from '$app/environment';
	import { dashboardConfig } from '$lib/config/dashboardConfig';
	import { resourceCreator } from '$lib/stores/resourceCreator';
	
	// Lazy load components to avoid SSR issues with shiki/js-yaml
	let ResourceCreator: any = $state(null);
	let PodLogsViewer: any = $state(null);
	let PodTerminal: any = $state(null);

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
	
	// Pod logs state
	let showLogs = $state(false);
	let logsPodName = $state('');
	let logsPodNamespace = $state('');
	let logsPodContainers = $state<string[]>([]);
	
	// Pod terminal state
	let showTerminal = $state(false);
	let terminalPodName = $state('');
	let terminalPodNamespace = $state('');
	let terminalPodContainers = $state<string[]>([]);
	
	// Events panel state for resource-specific events
	let showResourceEvents = $state(false);
	let eventsFilterKind = $state('');
	let eventsFilterName = $state('');
	let eventsFilterNamespace = $state('');
	
	// Events panel expanded state (for hiding table)
	let eventsExpanded = $state(false);

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

	// Keyboard shortcut for creating resources
	function handleKeydown(e: KeyboardEvent) {
		// Ctrl+N or Cmd+N to open create dialog
		if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
			e.preventDefault();
			resourceCreator.open();
		}
	}

	onMount(async () => {
		document.addEventListener('keydown', handleKeydown);
		
		// Lazy load components
		const [creatorModule, logsModule, terminalModule] = await Promise.all([
			import('$lib/components/ResourceCreator.svelte'),
			import('$lib/components/PodLogsViewer.svelte'),
			import('$lib/components/PodTerminal.svelte')
		]);
		ResourceCreator = creatorModule.default;
		PodLogsViewer = logsModule.default;
		PodTerminal = terminalModule.default;
		
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	async function handleEdit(resource: K8sResource) {
		// Convert resource to YAML for editing
		// Remove managed fields and other metadata that shouldn't be edited
		const cleanResource = {
			apiVersion: resource.apiVersion,
			kind: resource.kind,
			metadata: {
				name: resource.metadata.name,
				namespace: resource.metadata.namespace,
				labels: resource.metadata.labels,
				annotations: resource.metadata.annotations
			},
			spec: resource.spec
		};
		
		// Dynamically import js-yaml only when needed
		const yaml = await import('js-yaml');
		const yamlStr = yaml.dump(cleanResource, { 
			indent: 2, 
			lineWidth: -1,
			noRefs: true,
			sortKeys: false
		});
		resourceCreator.openEdit(yamlStr);
	}

	async function handleDelete(resource: K8sResource) {
		if (confirm(`Are you sure you want to delete ${resource.metadata.name}?`)) {
			try {
				const response = await fetch('/api/resources', {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ 
						kind: resource.kind,
						apiVersion: resource.apiVersion,
						name: resource.metadata.name,
						namespace: resource.metadata.namespace || data.namespace
					})
				});
				
				if (response.ok) {
					handleRefresh();
				} else {
					const result = await response.json();
					alert(`Failed to delete: ${result.error}`);
				}
			} catch (error) {
				console.error('Failed to delete resource:', error);
				alert('Failed to delete resource');
			}
		}
	}

	function handleLogs(resource: K8sResource) {
		// Extract container names from pod spec
		const containers = resource.spec?.containers?.map((c: { name: string }) => c.name) || [];
		logsPodName = resource.metadata.name;
		logsPodNamespace = resource.metadata.namespace || data.namespace;
		logsPodContainers = containers;
		showLogs = true;
	}

	function handleExec(resource: K8sResource) {
		// Extract container names from pod spec
		const containers = resource.spec?.containers?.map((c: { name: string }) => c.name) || [];
		terminalPodName = resource.metadata.name;
		terminalPodNamespace = resource.metadata.namespace || data.namespace;
		terminalPodContainers = containers;
		showTerminal = true;
	}

	function handleEvents(resource: K8sResource) {
		eventsFilterKind = resource.kind;
		eventsFilterName = resource.metadata.name;
		eventsFilterNamespace = resource.metadata.namespace || data.namespace;
		showResourceEvents = true;
	}

	function handleRefresh() {
		goto(window.location.href);
	}

	function handleCreatorSuccess() {
		handleRefresh();
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
		
		<!-- Events Panel on Dashboard -->
		<div class="mt-6">
			<EventsPanel collapsed={true} />
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
			onLogs={data.resourceType === 'pods' ? handleLogs : undefined}
			onExec={data.resourceType === 'pods' ? handleExec : undefined}
			onEvents={handleEvents}
			hideTable={eventsExpanded}
			onToggleEvents={() => eventsExpanded = !eventsExpanded}
		/>
		
		<!-- Events Panel below resource list (only visible when events toggle is on) -->
		{#if eventsExpanded}
			<div class="mt-6">
				<EventsPanel 
					collapsed={false} 
					namespace={data.namespace === '*' ? '' : data.namespace} 
					onCollapseChange={(collapsed) => eventsExpanded = !collapsed}
				/>
			</div>
		{/if}
	{/if}
</div>

<!-- Resource Creator Modal (lazy loaded) -->
{#if ResourceCreator}
	<svelte:component 
		this={ResourceCreator}
		isOpen={$resourceCreator.isOpen}
		onClose={() => resourceCreator.close()}
		onSuccess={handleCreatorSuccess}
		initialYaml={$resourceCreator.initialYaml}
		mode={$resourceCreator.mode}
	/>
{/if}

<!-- Pod Logs Viewer Modal (lazy loaded) -->
{#if PodLogsViewer && showLogs}
	<svelte:component 
		this={PodLogsViewer}
		podName={logsPodName}
		namespace={logsPodNamespace}
		containers={logsPodContainers}
		onClose={() => showLogs = false}
	/>
{/if}

<!-- Pod Terminal Modal (lazy loaded) -->
{#if PodTerminal && showTerminal}
	<svelte:component 
		this={PodTerminal}
		podName={terminalPodName}
		namespace={terminalPodNamespace}
		containers={terminalPodContainers}
		onClose={() => showTerminal = false}
	/>
{/if}

<!-- Resource-specific Events Panel Modal -->
{#if showResourceEvents}
	<div class="fixed inset-0 bg-black/50 z-40" onclick={() => showResourceEvents = false} role="button" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (showResourceEvents = false)}></div>
	<div class="fixed inset-x-4 bottom-4 md:inset-x-8 lg:inset-x-16 z-50 max-h-96">
		<EventsPanel
			filterKind={eventsFilterKind}
			filterName={eventsFilterName}
			namespace={eventsFilterNamespace}
			onClose={() => showResourceEvents = false}
		/>
	</div>
{/if}

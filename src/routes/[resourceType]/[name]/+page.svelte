<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { ArrowLeft, Edit, Trash2, ExternalLink, ScrollText } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { K8sResource } from '$lib/types/k8s';
	import PodLogsViewer from '$lib/components/PodLogsViewer.svelte';
	
	// Lazy load ResourceCreator to avoid SSR issues with shiki/js-yaml
	let ResourceCreator: any = $state(null);
	
	onMount(async () => {
		const module = await import('$lib/components/ResourceCreator.svelte');
		ResourceCreator = module.default;
	});

	interface Props {
		data: {
			resource: K8sResource;
			resourceType: string;
			name: string;
			namespace: string;
		};
	}

	let { data }: Props = $props();
	let showLogs = $state(false);
	let showEditor = $state(false);
	let editYaml = $state<string>('');

	// Check if this is a pod resource
	let isPod = $derived(data.resourceType === 'pods');

	// Get container names from pod spec
	let containers = $derived.by(() => {
		if (!isPod || !data.resource.spec?.containers) return [];
		return data.resource.spec.containers.map((c: { name: string }) => c.name);
	});

	function goBack() {
		const params = new URLSearchParams();
		params.set('resource', data.resourceType);
		if (data.namespace !== 'default') {
			params.set('namespace', data.namespace);
		}
		goto(`/?${params.toString()}`);
	}

	function getAge(timestamp: string | undefined): string {
		if (!timestamp) return 'Unknown';
		
		const created = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - created.getTime();
		
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	async function handleEdit() {
		// Convert resource to YAML for editing
		// Remove managed fields and other metadata that shouldn't be edited
		const cleanResource = {
			apiVersion: data.resource.apiVersion,
			kind: data.resource.kind,
			metadata: {
				name: data.resource.metadata.name,
				namespace: data.resource.metadata.namespace,
				labels: data.resource.metadata.labels,
				annotations: data.resource.metadata.annotations
			},
			spec: data.resource.spec
		};
		
		// Dynamically import js-yaml only when needed
		const yaml = await import('js-yaml');
		editYaml = yaml.dump(cleanResource, { 
			indent: 2, 
			lineWidth: -1,
			noRefs: true,
			sortKeys: false
		});
		showEditor = true;
	}

	async function handleDelete() {
		if (confirm(`Are you sure you want to delete ${data.name}?`)) {
			try {
				const response = await fetch('/api/resources', {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ 
						kind: data.resource.kind,
						apiVersion: data.resource.apiVersion,
						name: data.resource.metadata.name,
						namespace: data.resource.metadata.namespace || data.namespace
					})
				});
				
				if (response.ok) {
					goBack();
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

	function openLogs() {
		showLogs = true;
	}

	function closeLogs() {
		showLogs = false;
	}

	function handleEditSuccess() {
		// Refresh the page to show updated resource
		goto(window.location.href);
	}
</script>

<div class="max-w-6xl mx-auto p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<button
				onclick={goBack}
				class="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
			>
				<ArrowLeft size={20} />
				Back to {data.resourceType}
			</button>
			
			<div class="text-sm text-gray-500">/</div>
			
			<div>
				<h1 class="text-2xl font-bold text-gray-900">{data.name}</h1>
				<p class="text-sm text-gray-600 capitalize">
					{data.resource.kind} in {data.namespace}
				</p>
			</div>
		</div>

		<div class="flex items-center gap-2">
			{#if isPod}
				<button
					onclick={openLogs}
					class="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors"
				>
					<ScrollText size={16} />
					Logs
				</button>
			{/if}
			<button
				onclick={handleEdit}
				class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
			>
				<Edit size={16} />
				Edit
			</button>
			<button
				onclick={handleDelete}
				class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
			>
				<Trash2 size={16} />
				Delete
			</button>
		</div>
	</div>

	<!-- Resource Details -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Metadata Panel -->
		<div class="lg:col-span-1">
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
				
				<dl class="space-y-3">
					<div>
						<dt class="text-sm font-medium text-gray-500">Name</dt>
						<dd class="text-sm text-gray-900">{data.resource.metadata.name}</dd>
					</div>
					
					<div>
						<dt class="text-sm font-medium text-gray-500">Namespace</dt>
						<dd class="text-sm text-gray-900">{data.resource.metadata.namespace || 'N/A'}</dd>
					</div>
					
					<div>
						<dt class="text-sm font-medium text-gray-500">Kind</dt>
						<dd class="text-sm text-gray-900">{data.resource.kind}</dd>
					</div>
					
					<div>
						<dt class="text-sm font-medium text-gray-500">API Version</dt>
						<dd class="text-sm text-gray-900">{data.resource.apiVersion}</dd>
					</div>
					
					<div>
						<dt class="text-sm font-medium text-gray-500">Created</dt>
						<dd class="text-sm text-gray-900">
							{getAge(data.resource.metadata.creationTimestamp)} ago
						</dd>
					</div>
					
					{#if data.resource.metadata.uid}
						<div>
							<dt class="text-sm font-medium text-gray-500">UID</dt>
							<dd class="text-xs text-gray-900 font-mono break-all">{data.resource.metadata.uid}</dd>
						</div>
					{/if}
				</dl>

				{#if data.resource.metadata.labels && Object.keys(data.resource.metadata.labels).length > 0}
					<div class="mt-6">
						<h3 class="text-sm font-medium text-gray-500 mb-2">Labels</h3>
						<div class="space-y-1">
							{#each Object.entries(data.resource.metadata.labels) as [key, value]}
								<div class="flex items-center gap-2">
									<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
										{key}: {value}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if data.resource.metadata.annotations && Object.keys(data.resource.metadata.annotations).length > 0}
					<div class="mt-6">
						<h3 class="text-sm font-medium text-gray-500 mb-2">Annotations</h3>
						<div class="space-y-1 max-h-40 overflow-y-auto">
							{#each Object.entries(data.resource.metadata.annotations) as [key, value]}
								<div class="text-xs">
									<div class="font-medium text-gray-600">{key}</div>
									<div class="text-gray-500 break-all font-mono">{value}</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Main Content -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Status Panel (if exists) -->
			{#if data.resource.status}
				<div class="bg-white rounded-lg shadow p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Status</h2>
					<pre class="text-sm bg-gray-50 p-4 rounded overflow-auto max-h-60">{JSON.stringify(data.resource.status, null, 2)}</pre>
				</div>
			{/if}

			<!-- Spec Panel (if exists) -->
			{#if data.resource.spec}
				<div class="bg-white rounded-lg shadow p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Specification</h2>
					<pre class="text-sm bg-gray-50 p-4 rounded overflow-auto max-h-80">{JSON.stringify(data.resource.spec, null, 2)}</pre>
				</div>
			{/if}

			<!-- Raw YAML -->
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Raw YAML</h2>
				<pre class="text-sm bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-96">{JSON.stringify(data.resource, null, 2)}</pre>
			</div>
		</div>
	</div>
</div>

<!-- Pod Logs Viewer Modal -->
{#if showLogs && isPod}
	<PodLogsViewer
		podName={data.name}
		namespace={data.namespace}
		containers={containers}
		onClose={closeLogs}
	/>
{/if}

<!-- Resource Editor Modal (lazy loaded) -->
{#if ResourceCreator}
	<svelte:component 
		this={ResourceCreator}
		isOpen={showEditor}
		onClose={() => showEditor = false}
		onSuccess={handleEditSuccess}
		initialYaml={editYaml}
		mode="edit"
	/>
{/if}

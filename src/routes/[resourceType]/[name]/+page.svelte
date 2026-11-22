<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowLeft, Edit, Trash2, ScrollText } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import type { K8sResource } from '#lib/types/k8s.js';
	import PodLogsViewer from '#lib/components/PodLogsViewer.svelte';
	import { apiClient } from '#lib/utils/apiClient.js';
	import { browser } from '$app/env';
	import { clusterStore } from '#lib/stores/cluster.js';
	import { get } from 'svelte/store';

	// Lazy load ResourceCreator to avoid SSR issues with shiki/js-yaml
	let ResourceCreator: typeof import('#lib/components/ResourceCreator.svelte').default | null =
		$state(null);

	interface Props {
		data: {
			resource: K8sResource | null;
			resourceType: string;
			name: string;
			namespace: string;
			loadClientSide?: boolean;
		};
	}

	let { data }: Props = $props();
	let showLogs = $state(false);
	let showEditor = $state(false);
	let editYaml = $state<string>('');

	// Client-side loaded resource
	let clientResource = $state<K8sResource | null>(null);
	let clientError = $state<string | null>(null);
	let isLoading = $state(false);

	// Use client resource if loaded, otherwise fall back to server data
	let resource = $derived(clientResource || data.resource);

	// Load resource client-side
	async function loadResource() {
		if (!browser) return;

		const clusterState = get(clusterStore);
		if (!clusterState.currentCustomClusterId) {
			clientError = 'No cluster selected. Please add a cluster first.';
			return;
		}

		isLoading = true;
		clientError = null;

		try {
			const params = new URLSearchParams();
			params.set('namespace', data.namespace);

			const response = await apiClient(
				`/api/resources/${data.resourceType}/${data.name}?${params.toString()}`
			);

			if (!response.ok) {
				const result = await response.json();
				throw new Error(result.error || result.message || 'Failed to load resource');
			}

			clientResource = await response.json();
		} catch (err) {
			console.error('Failed to load resource:', err);
			clientError = err instanceof Error ? err.message : 'Failed to load resource';
			clientResource = null;
		} finally {
			isLoading = false;
		}
	}

	onMount(async () => {
		const module = await import('#lib/components/ResourceCreator.svelte');
		ResourceCreator = module.default;

		// Load resource client-side
		if (data.loadClientSide || !data.resource) {
			loadResource();
		}
	});

	// Check if this is a pod resource
	let isPod = $derived(data.resourceType === 'pods');

	// Get container names from pod spec
	let containers = $derived.by(() => {
		if (!isPod || !resource?.spec?.containers) return [];
		return resource.spec.containers.map((c: { name: string }) => c.name);
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
		if (!resource) return;

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
		editYaml = yaml.dump(cleanResource, {
			indent: 2,
			lineWidth: -1,
			noRefs: true,
			sortKeys: false
		});
		showEditor = true;
	}

	async function handleDelete() {
		if (!resource) return;

		if (confirm(`Are you sure you want to delete ${data.name}?`)) {
			try {
				const response = await apiClient('/api/resources', {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						kind: resource.kind,
						apiVersion: resource.apiVersion,
						name: resource.metadata.name,
						namespace: resource.metadata.namespace || data.namespace
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
		// Refresh the resource
		loadResource();
	}
</script>

{#if isLoading}
	<div class="flex items-center justify-center p-8">
		<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
		<span class="ml-3 text-gray-600 dark:text-neutral-400">Loading resource...</span>
	</div>
{:else if clientError}
	<div class="mx-auto max-w-6xl p-6">
		<div
			class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20"
		>
			<p class="text-red-800 dark:text-red-300">Error: {clientError}</p>
			<button
				onclick={goBack}
				class="mt-4 flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-200"
			>
				<ArrowLeft size={20} />
				Back to {data.resourceType}
			</button>
		</div>
	</div>
{:else if !resource}
	<div class="mx-auto max-w-6xl p-6">
		<div
			class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20"
		>
			<p class="text-yellow-800 dark:text-yellow-300">Resource not found</p>
			<button
				onclick={goBack}
				class="mt-4 flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-200"
			>
				<ArrowLeft size={20} />
				Back to {data.resourceType}
			</button>
		</div>
	</div>
{:else}
	<div class="mx-auto max-w-6xl p-6">
		<!-- Header -->
		<div class="mb-6 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<button
					onclick={goBack}
					class="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-200"
				>
					<ArrowLeft size={20} />
					Back to {data.resourceType}
				</button>

				<div class="text-sm text-gray-500 dark:text-neutral-500">/</div>

				<div>
					<h1 class="text-2xl font-bold text-gray-900 dark:text-neutral-100">{data.name}</h1>
					<p class="text-sm text-gray-600 capitalize dark:text-neutral-400">
						{resource.kind} in {data.namespace}
					</p>
				</div>
			</div>

			<div class="flex items-center gap-2">
				{#if isPod}
					<button
						onclick={openLogs}
						class="flex items-center gap-2 rounded-md bg-neutral-800 px-4 py-2 text-white transition-colors hover:bg-neutral-900"
					>
						<ScrollText size={16} />
						Logs
					</button>
				{/if}
				<button
					onclick={handleEdit}
					class="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
				>
					<Edit size={16} />
					Edit
				</button>
				<button
					onclick={handleDelete}
					class="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
				>
					<Trash2 size={16} />
					Delete
				</button>
			</div>
		</div>

		<!-- Resource Details -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Metadata Panel -->
			<div class="lg:col-span-1">
				<div class="rounded-lg bg-white p-6 shadow dark:bg-neutral-800">
					<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-neutral-100">Metadata</h2>

					<dl class="space-y-3">
						<div>
							<dt class="text-sm font-medium text-gray-500 dark:text-neutral-400">Name</dt>
							<dd class="text-sm text-gray-900 dark:text-neutral-200">{resource.metadata.name}</dd>
						</div>

						<div>
							<dt class="text-sm font-medium text-gray-500 dark:text-neutral-400">Namespace</dt>
							<dd class="text-sm text-gray-900 dark:text-neutral-200">
								{resource.metadata.namespace || 'N/A'}
							</dd>
						</div>

						<div>
							<dt class="text-sm font-medium text-gray-500 dark:text-neutral-400">Kind</dt>
							<dd class="text-sm text-gray-900 dark:text-neutral-200">{resource.kind}</dd>
						</div>

						<div>
							<dt class="text-sm font-medium text-gray-500 dark:text-neutral-400">API Version</dt>
							<dd class="text-sm text-gray-900 dark:text-neutral-200">{resource.apiVersion}</dd>
						</div>

						<div>
							<dt class="text-sm font-medium text-gray-500 dark:text-neutral-400">Created</dt>
							<dd class="text-sm text-gray-900 dark:text-neutral-200">
								{getAge(resource.metadata.creationTimestamp)} ago
							</dd>
						</div>

						{#if resource.metadata.uid}
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-neutral-400">UID</dt>
								<dd class="font-mono text-xs break-all text-gray-900 dark:text-neutral-200">
									{resource.metadata.uid}
								</dd>
							</div>
						{/if}
					</dl>

					{#if resource.metadata.labels && Object.keys(resource.metadata.labels).length > 0}
						<div class="mt-6">
							<h3 class="mb-2 text-sm font-medium text-gray-500 dark:text-neutral-400">Labels</h3>
							<div class="space-y-1">
								{#each Object.entries(resource.metadata.labels) as [key, value] (key)}
									<div class="flex items-center gap-2">
										<span
											class="rounded bg-blue-100 px-2 py-1 font-mono text-xs text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
										>
											{key}: {value}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if resource.metadata.annotations && Object.keys(resource.metadata.annotations).length > 0}
						<div class="mt-6">
							<h3 class="mb-2 text-sm font-medium text-gray-500 dark:text-neutral-400">
								Annotations
							</h3>
							<div class="max-h-40 space-y-1 overflow-y-auto">
								{#each Object.entries(resource.metadata.annotations) as [key, value] (key)}
									<div class="text-xs">
										<div class="font-medium text-gray-600 dark:text-neutral-300">{key}</div>
										<div class="font-mono break-all text-gray-500 dark:text-neutral-400">
											{value}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Main Content -->
			<div class="space-y-6 lg:col-span-2">
				<!-- Status Panel (if exists) -->
				{#if resource.status}
					<div class="rounded-lg bg-white p-6 shadow dark:bg-neutral-800">
						<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-neutral-100">Status</h2>
						<pre
							class="max-h-60 overflow-auto rounded bg-gray-50 p-4 text-sm dark:bg-neutral-900 dark:text-neutral-300">{JSON.stringify(
								resource.status,
								null,
								2
							)}</pre>
					</div>
				{/if}

				<!-- Spec Panel (if exists) -->
				{#if resource.spec}
					<div class="rounded-lg bg-white p-6 shadow dark:bg-neutral-800">
						<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-neutral-100">
							Specification
						</h2>
						<pre
							class="max-h-80 overflow-auto rounded bg-gray-50 p-4 text-sm dark:bg-neutral-900 dark:text-neutral-300">{JSON.stringify(
								resource.spec,
								null,
								2
							)}</pre>
					</div>
				{/if}

				<!-- Raw YAML -->
				<div class="rounded-lg bg-white p-6 shadow dark:bg-neutral-800">
					<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-neutral-100">Raw YAML</h2>
					<pre
						class="max-h-96 overflow-auto rounded bg-neutral-900 p-4 text-sm text-green-400">{JSON.stringify(
							resource,
							null,
							2
						)}</pre>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Pod Logs Viewer Modal -->
{#if showLogs && isPod}
	<PodLogsViewer podName={data.name} namespace={data.namespace} {containers} onClose={closeLogs} />
{/if}

<!-- Resource Editor Modal (lazy loaded) -->
{#if ResourceCreator}
	<ResourceCreator
		isOpen={showEditor}
		onClose={() => (showEditor = false)}
		onSuccess={handleEditSuccess}
		initialYaml={editYaml}
		mode="edit"
	/>
{/if}

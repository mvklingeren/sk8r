<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ChevronRight,
		ChevronDown,
		Box,
		Database,
		Activity,
		GraduationCap,
		BookMarked,
		Sun,
		Moon,
		Server,
		RefreshCw,
		AlertCircle,
		Plus,
		Folder,
		Edit2,
		X,
		Trash2
	} from 'lucide-svelte';
	import { navigationConfig } from '$lib/config/navigationConfig';
	import { getIcon } from '$lib/utils/iconMapping';
	import { navigation } from '$lib/stores/navigation';
	import { dataSource } from '$lib/stores/dataSource';
	import { learningMode } from '$lib/stores/learningMode';
	import { darkMode } from '$lib/stores/darkMode';
	import { clusterStore, type CustomCluster } from '$lib/stores/cluster';
	import { namespaceStore } from '$lib/stores/namespaces';
	import { resourceCreator } from '$lib/stores/resourceCreator';
	import { authToken } from '$lib/stores/auth';

	// Design patterns configuration
	const designPatterns = [
		{
			key: 'from-traditional-to-kubernetes',
			label: 'Traditional → K8s',
			description: 'From simple hosting to Kubernetes mastery',
			icon: 'rocket'
		}
	];

	let patternsExpanded = $state(false);
	let clusterSwitching = $state(false);
	let showClusterModal = $state(false);
	let editingCluster: CustomCluster | null = $state(null);
	let clusterServer = $state('');
	let clusterToken = $state('');
	let clusterSkipTLS = $state(true);
	let clusterModalError = $state<string | null>(null);
	let clusterModalLoading = $state(false);

	// Create reactive state for expanded sections - properly initialize each section
	let sectionStates = $state(
		navigationConfig.sections.map((section) => ({
			key: section.key,
			expanded: section.collapsed === undefined ? false : !section.collapsed
		}))
	);

	// Fetch cluster contexts and namespaces on mount
	onMount(() => {
		clusterStore.fetchContexts().catch((err) => {
			console.warn('Failed to fetch cluster contexts:', err);
		});
		namespaceStore.fetchNamespaces().catch((err) => {
			console.warn('Failed to fetch namespaces:', err);
		});
	});

	function toggleSection(sectionKey: string) {
		const sectionIndex = sectionStates.findIndex((s) => s.key === sectionKey);
		if (sectionIndex !== -1) {
			// Create a new object with the toggled state to ensure reactivity
			const updatedSection = {
				...sectionStates[sectionIndex],
				expanded: !sectionStates[sectionIndex].expanded
			};
			// Replace the object in the array
			sectionStates[sectionIndex] = updatedSection;
		}
	}

	function selectResource(resource: string) {
		navigation.selectResource(resource);
	}

	async function handleClusterChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const newContextOrId = select.value;

		if (newContextOrId && newContextOrId !== getCurrentClusterId()) {
			clusterSwitching = true;
			try {
				// Check if it's a custom cluster and update authToken
				const customCluster = $clusterStore.customClusters.find((c) => c.id === newContextOrId);
				if (customCluster) {
					authToken.setToken(customCluster.token);
				}

				await clusterStore.switchContext(newContextOrId);
			} catch (err) {
				console.error('Failed to switch cluster:', err);
				// Reset the select to the current cluster
				select.value = getCurrentClusterId();
			} finally {
				clusterSwitching = false;
			}
		}
	}

	async function refreshClusters() {
		await clusterStore.fetchContexts();
	}

	async function refreshNamespaces() {
		await namespaceStore.fetchNamespaces();
	}

	function openAddClusterModal() {
		editingCluster = null;
		clusterServer = '';
		clusterToken = '';
		clusterSkipTLS = true;
		clusterModalError = null;
		showClusterModal = true;
	}

	function openEditClusterModal(cluster: CustomCluster) {
		editingCluster = cluster;
		clusterServer = cluster.server;
		clusterToken = cluster.token;
		clusterSkipTLS = cluster.skipTLSVerify ?? true;
		clusterModalError = null;
		showClusterModal = true;
	}

	function closeClusterModal() {
		showClusterModal = false;
		editingCluster = null;
		clusterServer = '';
		clusterToken = '';
		clusterSkipTLS = true;
		clusterModalError = null;
	}

	function deleteCluster(cluster: CustomCluster) {
		const isCurrentCluster = $clusterStore.currentCustomClusterId === cluster.id;
		const message = isCurrentCluster
			? `Are you sure you want to delete "${cluster.name}"? This is your current cluster and will require selecting another cluster.`
			: `Are you sure you want to delete "${cluster.name}"?`;

		if (confirm(message)) {
			clusterStore.removeCluster(cluster.id);

			// If we deleted the current cluster and there are other clusters, reload to reset state
			if (isCurrentCluster) {
				window.location.reload();
			}
		}
	}

	/**
	 * Normalize server input to full URL format
	 * Accepts:
	 * - Full URL: https://kubernetes.example.com:6443
	 * - Hostname/IP: kubernetes.example.com or 192.168.1.100
	 * Returns normalized URL with https:// and default port 6443 if needed
	 */
	function normalizeServerUrl(input: string): string {
		if (!input || !input.trim()) {
			throw new Error('Server address is required');
		}

		const trimmed = input.trim();

		// If it already looks like a full URL, validate and return
		if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
			try {
				const url = new URL(trimmed);
				// Ensure HTTPS
				if (url.protocol !== 'https:') {
					throw new Error('Only HTTPS is supported for Kubernetes API server');
				}
				// Return without trailing slash (url.toString() adds one)
				return url.toString().replace(/\/+$/, '');
			} catch (e) {
				throw new Error(`Invalid URL format: ${e instanceof Error ? e.message : 'Unknown error'}`);
			}
		}

		// If it's just hostname/IP, add https:// and default port
		// Remove any trailing slashes
		const cleanHost = trimmed.replace(/\/+$/, '');

		// Check if it contains a port already
		const hasPort = /:\d+$/.test(cleanHost);

		if (hasPort) {
			// Extract hostname and port
			const lastColonIndex = cleanHost.lastIndexOf(':');
			const host = cleanHost.substring(0, lastColonIndex);
			const port = cleanHost.substring(lastColonIndex + 1);

			// Basic validation - just check it's not empty
			if (!host || !port || isNaN(parseInt(port))) {
				throw new Error('Invalid hostname/IP and port format');
			}

			return `https://${host}:${port}`;
		} else {
			// Basic validation - check it's not empty and doesn't contain invalid characters
			if (!cleanHost || /[<>"']/.test(cleanHost)) {
				throw new Error('Invalid hostname or IP address format');
			}
			// Add default port 6443
			return `https://${cleanHost}:6443`;
		}
	}

	async function saveCluster() {
		if (!clusterServer || !clusterToken) {
			clusterModalError = 'Server address and token are required';
			return;
		}

		// Normalize server URL
		let normalizedServer: string;
		try {
			normalizedServer = normalizeServerUrl(clusterServer);
		} catch (err) {
			clusterModalError = err instanceof Error ? err.message : 'Invalid server address format';
			return;
		}

		clusterModalLoading = true;
		clusterModalError = null;

		try {
			if (editingCluster) {
				await clusterStore.updateCluster(
					editingCluster.id,
					normalizedServer,
					clusterToken,
					clusterSkipTLS
				);
			} else {
				await clusterStore.addCluster(normalizedServer, clusterToken, clusterSkipTLS);
			}
			closeClusterModal();
		} catch (err: any) {
			// Extract detailed error message from API response
			if (err.response) {
				const data = await err.response.json().catch(() => ({}));
				clusterModalError = data.message || data.error || err.message || 'Failed to save cluster';
			} else if (err instanceof Error) {
				clusterModalError = err.message;
			} else {
				clusterModalError = 'Failed to save cluster';
			}
		} finally {
			clusterModalLoading = false;
		}
	}

	function getCurrentClusterId(): string {
		if ($clusterStore.currentCustomClusterId) {
			return $clusterStore.currentCustomClusterId;
		}
		return $clusterStore.currentContext || '';
	}

	function getAllClusters(): Array<{
		id: string;
		name: string;
		server: string;
		isCustom: boolean;
		isCurrent: boolean;
	}> {
		const clusters: Array<{
			id: string;
			name: string;
			server: string;
			isCustom: boolean;
			isCurrent: boolean;
		}> = [];

		// Add kubeconfig contexts
		$clusterStore.contexts.forEach((ctx) => {
			clusters.push({
				id: ctx.name,
				name: ctx.name,
				server: ctx.server || 'unknown',
				isCustom: false,
				isCurrent: ctx.isCurrent
			});
		});

		// Add custom clusters
		$clusterStore.customClusters.forEach((cluster) => {
			clusters.push({
				id: cluster.id,
				name: cluster.name,
				server: new URL(cluster.server).hostname,
				isCustom: true,
				isCurrent: cluster.id === $clusterStore.currentCustomClusterId
			});
		});

		return clusters;
	}
</script>

<aside class="flex h-full w-64 flex-col bg-gray-900 text-gray-100">
	<div class="border-b border-gray-800 px-4 pt-4 pb-1">
		<a href="/" class="block" onclick={() => navigation.reset()}>
			<h1 class="flex items-center gap-2 text-xl font-bold">
				<Box class="h-6 w-6" />
				SK8R
			</h1>
			<p class="mt-1 text-sm text-gray-400">Kubernetes Management</p>
		</a>

		<!-- Search hint -->
		<div class="mt-3 flex items-center gap-2 text-xs text-gray-500">
			<kbd class="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-gray-400">Ctrl</kbd>
			<kbd class="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-gray-400">K</kbd>
			<span>to search</span>
		</div>
	</div>

	<nav class="flex flex-1 flex-col overflow-y-auto px-2">
		<!-- Create Resource Button (bottom-aligned) -->
		<div class="pt-2 pb-4">
			<button
				onclick={() => resourceCreator.open()}
				class="flex w-full items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700"
				title="Create Resource (Ctrl+N)"
			>
				<Plus size={18} />
				<span class="text-sm font-medium">Create Resource</span>
			</button>
		</div>

		{#each navigationConfig.sections as section (section.key)}
			{@const state = sectionStates.find((s) => s.key === section.key)}
			{@const SectionIcon = getIcon(section.icon)}
			<div class="mb-1">
				<button
					onclick={() => toggleSection(section.key)}
					class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-800"
				>
					{#if section.items.length > 0}
						{#if state?.expanded}
							<ChevronDown size={16} />
						{:else}
							<ChevronRight size={16} />
						{/if}
					{:else}
						<div class="w-4"></div>
					{/if}
					<SectionIcon size={18} />
					<span class="flex-1 text-sm">{section.label}</span>
				</button>

				{#if state?.expanded && section.items.length > 0}
					<div class="mt-1 ml-6">
						{#each section.items as item (item.label)}
							{@const ItemIcon = getIcon(item.icon)}
							<button
								onclick={() => (item.resourceType ? selectResource(item.resourceType) : null)}
								class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-gray-800"
								class:bg-gray-800={$navigation.selectedResource === item.resourceType}
								title={item.description || ''}
							>
								<ItemIcon size={14} />
								<span class="text-gray-300">{item.label}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
		<!-- Design Patterns Section -->
		<div class="mt-4 mb-1 border-t border-gray-800 pt-4">
			<button
				onclick={() => (patternsExpanded = !patternsExpanded)}
				class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-800"
			>
				{#if patternsExpanded}
					<ChevronDown size={16} />
				{:else}
					<ChevronRight size={16} />
				{/if}
				<BookMarked size={18} class="text-amber-400" />
				<span class="flex-1 text-sm text-amber-300">Design Patterns</span>
			</button>

			{#if patternsExpanded}
				<div class="mt-1 ml-6">
					{#each designPatterns as pattern (pattern.key)}
						{@const PatternIcon = getIcon(pattern.icon)}
						<a
							href="/patterns/{pattern.key}"
							class="block flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-gray-800"
							title={pattern.description}
						>
							<PatternIcon size={14} class="text-amber-400" />
							<span class="text-gray-300">{pattern.label}</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</nav>

	<div class="border-t border-gray-800 p-4">
		<!-- Cluster Selector -->
		<div class="mb-3">
			<div class="mb-1 flex items-center justify-between">
				<label for="cluster-select" class="flex items-center gap-1.5 text-xs text-gray-400">
					<Server size={12} class="text-cyan-400" />
					Cluster:
				</label>
				<div class="flex items-center gap-1">
					<button
						onclick={refreshClusters}
						class="rounded p-1 transition-colors hover:bg-gray-700"
						title="Refresh cluster list"
						disabled={$clusterStore.loading}
					>
						<RefreshCw
							size={12}
							class="text-gray-500 hover:text-gray-300 {$clusterStore.loading
								? 'animate-spin'
								: ''}"
						/>
					</button>
					<button
						onclick={openAddClusterModal}
						class="rounded p-1 transition-colors hover:bg-gray-700"
						title="Add cluster"
					>
						<Plus size={12} class="text-gray-500 hover:text-gray-300" />
					</button>
				</div>
			</div>

			{#if $clusterStore.error}
				<div class="mb-1 flex items-center gap-1.5 text-xs text-red-400">
					<AlertCircle size={12} />
					<span class="truncate">{$clusterStore.error}</span>
				</div>
			{/if}

			{#if getAllClusters().length > 0}
				{@const allClusters = getAllClusters()}
				<div class="space-y-1">
					<select
						id="cluster-select"
						value={getCurrentClusterId()}
						onchange={handleClusterChange}
						disabled={clusterSwitching || $clusterStore.loading}
						class="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-300 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#each allClusters as cluster (cluster.id)}
							<option value={cluster.id}>
								{cluster.name} ({cluster.server}){cluster.isCustom ? ' [Custom]' : ''}
							</option>
						{/each}
					</select>
					{#if clusterSwitching}
						<div class="flex items-center gap-1 text-xs text-cyan-400">
							<RefreshCw size={10} class="animate-spin" />
							Switching cluster...
						</div>
					{/if}
					<!-- Edit/Delete buttons for custom clusters -->
					{#if $clusterStore.customClusters.length > 0}
						<div class="mt-1 flex flex-wrap gap-1">
							{#each $clusterStore.customClusters as customCluster (customCluster.id)}
								<div
									class="flex items-center overflow-hidden rounded border border-gray-600 bg-gray-800"
								>
									<button
										onclick={() => openEditClusterModal(customCluster)}
										class="flex items-center gap-1 px-2 py-0.5 text-xs transition-colors hover:bg-gray-700"
										title="Edit {customCluster.name}"
									>
										<Edit2 size={10} />
										<span class="max-w-[80px] truncate">{customCluster.name}</span>
									</button>
									<button
										onclick={() => deleteCluster(customCluster)}
										class="border-l border-gray-600 px-1.5 py-0.5 text-xs text-gray-400 transition-colors hover:bg-red-900/50 hover:text-red-400"
										title="Delete {customCluster.name}"
									>
										<Trash2 size={10} />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if $clusterStore.loading}
				<div class="flex items-center gap-1.5 py-1 text-xs text-gray-500">
					<RefreshCw size={12} class="animate-spin" />
					Loading clusters...
				</div>
			{:else}
				<div class="mb-1 py-1 text-xs text-gray-500">No clusters found</div>
				<button
					onclick={openAddClusterModal}
					class="flex w-full items-center justify-center gap-1 rounded bg-cyan-600 px-2 py-1.5 text-xs text-white transition-colors hover:bg-cyan-700"
				>
					<Plus size={12} />
					Add Cluster
				</button>
			{/if}
		</div>

		<!-- Namespace Selector -->
		<div class="mb-2">
			<div class="mb-1 flex items-center justify-between">
				<label for="namespace-select" class="flex items-center gap-1.5 text-xs text-gray-400">
					<Folder size={12} class="text-purple-400" />
					Namespace:
				</label>
				<button
					onclick={refreshNamespaces}
					class="rounded p-1 transition-colors hover:bg-gray-700"
					title="Refresh namespace list"
					disabled={$namespaceStore.loading}
				>
					<RefreshCw
						size={12}
						class="text-gray-500 hover:text-gray-300 {$namespaceStore.loading
							? 'animate-spin'
							: ''}"
					/>
				</button>
			</div>

			{#if $namespaceStore.error}
				<div class="mb-1 flex items-center gap-1.5 text-xs text-red-400">
					<AlertCircle size={12} />
					<span class="truncate">{$namespaceStore.error}</span>
				</div>
			{/if}

			{#if $namespaceStore.namespaces.length > 0}
				<select
					id="namespace-select"
					value={$navigation.namespace}
					onchange={(e) => navigation.setNamespace((e.target as HTMLSelectElement).value)}
					disabled={$namespaceStore.loading}
					class="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-300 focus:border-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="*">* All Namespaces</option>
					{#each $namespaceStore.namespaces as ns (ns)}
						<option value={ns}>{ns}</option>
					{/each}
				</select>
			{:else if $namespaceStore.loading}
				<div class="flex items-center gap-1.5 py-1 text-xs text-gray-500">
					<RefreshCw size={12} class="animate-spin" />
					Loading namespaces...
				</div>
			{:else}
				<select
					id="namespace-select"
					value={$navigation.namespace}
					onchange={(e) => navigation.setNamespace((e.target as HTMLSelectElement).value)}
					class="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-gray-300 focus:border-purple-500 focus:outline-none"
				>
					<option value="*">* All Namespaces</option>
					<option value="default">default</option>
				</select>
			{/if}
		</div>

		<!-- Data Source Status -->
		<div class="mt-3 border-t border-gray-700 pt-3">
			<div class="mb-2 text-xs text-gray-400">Data Source:</div>
			<div class="flex items-center gap-2">
				<div
					class="h-2 w-2 animate-pulse rounded-full {$dataSource.connected
						? 'bg-green-400'
						: 'bg-red-400'}"
				></div>
				{#if $dataSource.source === 'prometheus'}
					<Activity size={14} class="text-purple-400" />
					<span class="text-xs text-gray-300">Prometheus</span>
				{:else}
					<Database size={14} class="text-blue-400" />
					<span class="text-xs text-gray-300">Kubernetes API</span>
				{/if}
			</div>
		</div>

		<!-- Learning Mode Toggle -->
		<div class="mt-3 border-t border-gray-700 pt-3">
			<button
				onclick={() => learningMode.toggle()}
				class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors {$learningMode
					? 'border border-amber-700/50 bg-amber-900/40 hover:bg-amber-900/60'
					: 'border border-transparent hover:bg-gray-800'}"
				title="Toggle learning mode to show explanations for Kubernetes resources"
			>
				<GraduationCap size={16} class={$learningMode ? 'text-amber-400' : 'text-gray-400'} />
				<span class="text-xs {$learningMode ? 'text-amber-300' : 'text-gray-400'}"
					>Learning Mode</span
				>
				<div class="ml-auto">
					<div
						class="h-4 w-8 rounded-full transition-colors {$learningMode
							? 'bg-amber-500'
							: 'bg-gray-600'}"
					>
						<div
							class="mt-0.5 h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform {$learningMode
								? 'ml-0.5 translate-x-4.5'
								: 'translate-x-0.5'}"
						></div>
					</div>
				</div>
			</button>
		</div>

		<!-- Dark Mode Toggle -->
		<div class="mt-3 border-t border-gray-700 pt-3">
			<button
				onclick={() => darkMode.toggle()}
				class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors {$darkMode
					? 'border border-indigo-700/50 bg-indigo-900/40 hover:bg-indigo-900/60'
					: 'border border-transparent hover:bg-gray-800'}"
				title="Toggle dark mode"
			>
				{#if $darkMode}
					<Moon size={16} class="text-indigo-400" />
				{:else}
					<Sun size={16} class="text-gray-400" />
				{/if}
				<span class="text-xs {$darkMode ? 'text-indigo-300' : 'text-gray-400'}">Dark Mode</span>
				<div class="ml-auto">
					<div
						class="h-4 w-8 rounded-full transition-colors {$darkMode
							? 'bg-indigo-500'
							: 'bg-gray-600'}"
					>
						<div
							class="mt-0.5 h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform {$darkMode
								? 'ml-0.5 translate-x-4.5'
								: 'translate-x-0.5'}"
						></div>
					</div>
				</div>
			</button>
		</div>

		<!-- Version -->
		<div class="mt-3 border-t border-gray-700 pt-3 text-center">
			<span class="text-xs text-gray-500">v{__APP_VERSION__}</span>
		</div>
	</div>
</aside>

<!-- Cluster Management Modal -->
{#if showClusterModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && closeClusterModal()}
		onkeydown={(e) => e.key === 'Escape' && closeClusterModal()}
	>
		<div
			class="mx-4 w-full max-w-md rounded-lg border border-gray-600 bg-gray-800 p-6 text-gray-100 shadow-xl"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">
					{editingCluster ? 'Edit Cluster' : 'Add Cluster'}
				</h2>
				<button
					onclick={closeClusterModal}
					class="rounded p-1 transition-colors hover:bg-gray-700"
					title="Close"
				>
					<X size={18} />
				</button>
			</div>

			{#if clusterModalError}
				<div
					class="mb-4 flex items-center gap-2 rounded border border-red-700 bg-red-900/30 p-2 text-xs text-red-300"
				>
					<AlertCircle size={14} />
					<span>{clusterModalError}</span>
				</div>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					saveCluster();
				}}
				class="space-y-4"
			>
				<div>
					<label for="cluster-server" class="mb-1 block text-xs text-gray-400">
						Server Address:
					</label>
					<input
						id="cluster-server"
						type="text"
						bind:value={clusterServer}
						placeholder="kubernetes.example.com or https://kubernetes.example.com:6443"
						disabled={clusterModalLoading}
						class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						required
					/>
					<p class="mt-1 text-xs text-gray-500">
						Enter hostname/IP (defaults to port 6443) or paste full URL from kubeconfig
					</p>
				</div>

				<div>
					<label for="cluster-token" class="mb-1 block text-xs text-gray-400">
						Bearer Token:
					</label>
					<input
						id="cluster-token"
						type="password"
						bind:value={clusterToken}
						placeholder="Enter your Kubernetes bearer token"
						disabled={clusterModalLoading}
						class="w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						required
					/>
				</div>

				<div class="flex items-center gap-2">
					<input
						id="cluster-skip-tls"
						type="checkbox"
						bind:checked={clusterSkipTLS}
						disabled={clusterModalLoading}
						class="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
					/>
					<label for="cluster-skip-tls" class="text-xs text-gray-400">
						Skip TLS certificate verification
					</label>
				</div>

				<div class="flex items-center gap-2 pt-2">
					<button
						type="submit"
						disabled={clusterModalLoading}
						class="flex flex-1 items-center justify-center gap-2 rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if clusterModalLoading}
							<RefreshCw size={14} class="animate-spin" />
							<span>Saving...</span>
						{:else}
							<span>{editingCluster ? 'Update' : 'Add'} Cluster</span>
						{/if}
					</button>
					<button
						type="button"
						onclick={closeClusterModal}
						disabled={clusterModalLoading}
						class="rounded bg-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	aside {
		scrollbar-width: thin;
		scrollbar-color: #4b5563 #1f2937;
	}

	aside::-webkit-scrollbar {
		width: 8px;
	}

	aside::-webkit-scrollbar-track {
		background: #1f2937;
	}

	aside::-webkit-scrollbar-thumb {
		background-color: #4b5563;
		border-radius: 4px;
	}
</style>

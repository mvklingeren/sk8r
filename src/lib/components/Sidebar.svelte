<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronRight, ChevronDown, Box, Database, Activity, GraduationCap, BookMarked, Sun, Moon, Server, RefreshCw, AlertCircle, Plus, Folder, Edit2, X, Trash2 } from 'lucide-svelte';
	import { navigationConfig } from '$lib/config/navigationConfig';
	import { getIcon } from '$lib/utils/iconMapping';
	import { navigation } from '$lib/stores/navigation';
	import { dataSource } from '$lib/stores/dataSource';
	import { learningMode } from '$lib/stores/learningMode';
	import { darkMode } from '$lib/stores/darkMode';
	import { clusterStore, type ClusterContext, type CustomCluster } from '$lib/stores/cluster';
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
		navigationConfig.sections.map(section => ({
			key: section.key,
			expanded: section.collapsed === undefined ? false : !section.collapsed
		}))
	);

	// Fetch cluster contexts and namespaces on mount
	onMount(() => {
		clusterStore.fetchContexts().catch(err => {
			console.warn('Failed to fetch cluster contexts:', err);
		});
		namespaceStore.fetchNamespaces().catch(err => {
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
				const customCluster = $clusterStore.customClusters.find(c => c.id === newContextOrId);
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
				await clusterStore.updateCluster(editingCluster.id, normalizedServer, clusterToken, clusterSkipTLS);
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

	function getAllClusters(): Array<{ id: string; name: string; server: string; isCustom: boolean; isCurrent: boolean }> {
		const clusters: Array<{ id: string; name: string; server: string; isCustom: boolean; isCurrent: boolean }> = [];
		
		// Add kubeconfig contexts
		$clusterStore.contexts.forEach(ctx => {
			clusters.push({
				id: ctx.name,
				name: ctx.name,
				server: ctx.server || 'unknown',
				isCustom: false,
				isCurrent: ctx.isCurrent
			});
		});
		
		// Add custom clusters
		$clusterStore.customClusters.forEach(cluster => {
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

<aside class="w-64 bg-gray-900 text-gray-100 h-full flex flex-col">
	<div class="px-4 pt-4 pb-1 border-b border-gray-800">
		<a href="/" class="block" onclick={() => navigation.reset()}>
			<h1 class="text-xl font-bold flex items-center gap-2">
				<Box class="w-6 h-6" />
				SK8R
			</h1>
			<p class="text-sm text-gray-400 mt-1">Kubernetes Management</p>
		</a>
		
		<!-- Search hint -->
		<div class="mt-3 text-xs text-gray-500 flex items-center gap-2">
			<kbd class="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-400">Ctrl</kbd>
			<kbd class="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-400">K</kbd>
			<span>to search</span>
		</div>
	</div>

	<nav class="flex-1 overflow-y-auto px-2 flex flex-col">

		<!-- Create Resource Button (bottom-aligned) -->
		<div class="pb-4 pt-2">
			<button
				onclick={() => resourceCreator.open()}
				class="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
					class="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-800 transition-colors text-left"
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
					<div class="ml-6 mt-1">
						{#each section.items as item (item.label)}
							{@const ItemIcon = getIcon(item.icon)}
							<button
								onclick={() => (item.resourceType ? selectResource(item.resourceType) : null)}
								class="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors text-left text-sm"
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
		<div class="mb-1 mt-4 pt-4 border-t border-gray-800">
			<button
				onclick={() => patternsExpanded = !patternsExpanded}
				class="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-800 transition-colors text-left"
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
				<div class="ml-6 mt-1">
					{#each designPatterns as pattern (pattern.key)}
						{@const PatternIcon = getIcon(pattern.icon)}
						<a
							href="/patterns/{pattern.key}"
							class="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors text-left text-sm block"
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

	<div class="p-4 border-t border-gray-800">
		<!-- Cluster Selector -->
		<div class="mb-3">
			<div class="flex items-center justify-between mb-1">
				<label for="cluster-select" class="text-xs text-gray-400 flex items-center gap-1.5">
					<Server size={12} class="text-cyan-400" />
					Cluster:
				</label>
				<div class="flex items-center gap-1">
					<button
						onclick={refreshClusters}
						class="p-1 hover:bg-gray-700 rounded transition-colors"
						title="Refresh cluster list"
						disabled={$clusterStore.loading}
					>
						<RefreshCw size={12} class="text-gray-500 hover:text-gray-300 {$clusterStore.loading ? 'animate-spin' : ''}" />
					</button>
					<button
						onclick={openAddClusterModal}
						class="p-1 hover:bg-gray-700 rounded transition-colors"
						title="Add cluster"
					>
						<Plus size={12} class="text-gray-500 hover:text-gray-300" />
					</button>
				</div>
			</div>
			
			{#if $clusterStore.error}
				<div class="flex items-center gap-1.5 text-xs text-red-400 mb-1">
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
						class="w-full text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#each allClusters as cluster (cluster.id)}
							<option value={cluster.id}>
								{cluster.name} ({cluster.server}){cluster.isCustom ? ' [Custom]' : ''}
							</option>
						{/each}
					</select>
					{#if clusterSwitching}
						<div class="text-xs text-cyan-400 flex items-center gap-1">
							<RefreshCw size={10} class="animate-spin" />
							Switching cluster...
						</div>
					{/if}
					<!-- Edit/Delete buttons for custom clusters -->
					{#if $clusterStore.customClusters.length > 0}
						<div class="flex flex-wrap gap-1 mt-1">
							{#each $clusterStore.customClusters as customCluster (customCluster.id)}
								<div class="flex items-center bg-gray-800 border border-gray-600 rounded overflow-hidden">
									<button
										onclick={() => openEditClusterModal(customCluster)}
										class="text-xs px-2 py-0.5 hover:bg-gray-700 flex items-center gap-1 transition-colors"
										title="Edit {customCluster.name}"
									>
										<Edit2 size={10} />
										<span class="truncate max-w-[80px]">{customCluster.name}</span>
									</button>
									<button
										onclick={() => deleteCluster(customCluster)}
										class="text-xs px-1.5 py-0.5 hover:bg-red-900/50 text-gray-400 hover:text-red-400 border-l border-gray-600 transition-colors"
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
				<div class="text-xs text-gray-500 flex items-center gap-1.5 py-1">
					<RefreshCw size={12} class="animate-spin" />
					Loading clusters...
				</div>
			{:else}
				<div class="text-xs text-gray-500 py-1 mb-1">
					No clusters found
				</div>
				<button
					onclick={openAddClusterModal}
					class="w-full text-xs px-2 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors flex items-center justify-center gap-1"
				>
					<Plus size={12} />
					Add Cluster
				</button>
			{/if}
		</div>
		
		<!-- Namespace Selector -->
		<div class="mb-2">
			<div class="flex items-center justify-between mb-1">
				<label for="namespace-select" class="text-xs text-gray-400 flex items-center gap-1.5">
					<Folder size={12} class="text-purple-400" />
					Namespace:
				</label>
				<button
					onclick={refreshNamespaces}
					class="p-1 hover:bg-gray-700 rounded transition-colors"
					title="Refresh namespace list"
					disabled={$namespaceStore.loading}
				>
					<RefreshCw size={12} class="text-gray-500 hover:text-gray-300 {$namespaceStore.loading ? 'animate-spin' : ''}" />
				</button>
			</div>
			
			{#if $namespaceStore.error}
				<div class="flex items-center gap-1.5 text-xs text-red-400 mb-1">
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
					class="w-full text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1.5 focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<option value="*">* All Namespaces</option>
					{#each $namespaceStore.namespaces as ns (ns)}
						<option value={ns}>{ns}</option>
					{/each}
				</select>
			{:else if $namespaceStore.loading}
				<div class="text-xs text-gray-500 flex items-center gap-1.5 py-1">
					<RefreshCw size={12} class="animate-spin" />
					Loading namespaces...
				</div>
			{:else}
				<select 
					id="namespace-select"
					value={$navigation.namespace}
					onchange={(e) => navigation.setNamespace((e.target as HTMLSelectElement).value)}
					class="w-full text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1.5 focus:outline-none focus:border-purple-500"
				>
					<option value="*">* All Namespaces</option>
					<option value="default">default</option>
				</select>
			{/if}
		</div>

		<!-- Data Source Status -->
		<div class="mt-3 pt-3 border-t border-gray-700">
			<div class="text-xs text-gray-400 mb-2">Data Source:</div>
			<div class="flex items-center gap-2">
				<div class="w-2 h-2 rounded-full animate-pulse {$dataSource.connected ? 'bg-green-400' : 'bg-red-400'}"></div>
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
		<div class="mt-3 pt-3 border-t border-gray-700">
			<button
				onclick={() => learningMode.toggle()}
				class="w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors text-left {$learningMode ? 'bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700/50' : 'hover:bg-gray-800 border border-transparent'}"
				title="Toggle learning mode to show explanations for Kubernetes resources"
			>
				<GraduationCap size={16} class={$learningMode ? 'text-amber-400' : 'text-gray-400'} />
				<span class="text-xs {$learningMode ? 'text-amber-300' : 'text-gray-400'}">Learning Mode</span>
				<div class="ml-auto">
					<div class="w-8 h-4 rounded-full transition-colors {$learningMode ? 'bg-amber-500' : 'bg-gray-600'}">
						<div class="w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 {$learningMode ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}"></div>
					</div>
				</div>
			</button>
		</div>

		<!-- Dark Mode Toggle -->
		<div class="mt-3 pt-3 border-t border-gray-700">
			<button
				onclick={() => darkMode.toggle()}
				class="w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors text-left {$darkMode ? 'bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-700/50' : 'hover:bg-gray-800 border border-transparent'}"
				title="Toggle dark mode"
			>
				{#if $darkMode}
					<Moon size={16} class="text-indigo-400" />
				{:else}
					<Sun size={16} class="text-gray-400" />
				{/if}
				<span class="text-xs {$darkMode ? 'text-indigo-300' : 'text-gray-400'}">Dark Mode</span>
				<div class="ml-auto">
					<div class="w-8 h-4 rounded-full transition-colors {$darkMode ? 'bg-indigo-500' : 'bg-gray-600'}">
						<div class="w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 {$darkMode ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'}"></div>
					</div>
				</div>
			</button>
		</div>

		<!-- Version -->
		<div class="mt-3 pt-3 border-t border-gray-700 text-center">
			<span class="text-xs text-gray-500">v{__APP_VERSION__}</span>
		</div>
	</div>
</aside>

<!-- Cluster Management Modal -->
{#if showClusterModal}
	<div 
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
		role="dialog" 
		aria-modal="true" 
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && closeClusterModal()}
		onkeydown={(e) => e.key === 'Escape' && closeClusterModal()}
	>
		<div 
			class="bg-gray-800 text-gray-100 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 border border-gray-600"
		>
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold">
					{editingCluster ? 'Edit Cluster' : 'Add Cluster'}
				</h2>
				<button
					onclick={closeClusterModal}
					class="p-1 hover:bg-gray-700 rounded transition-colors"
					title="Close"
				>
					<X size={18} />
				</button>
			</div>
			
			{#if clusterModalError}
				<div class="mb-4 p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300 flex items-center gap-2">
					<AlertCircle size={14} />
					<span>{clusterModalError}</span>
				</div>
			{/if}
			
			<form onsubmit={(e) => { e.preventDefault(); saveCluster(); }} class="space-y-4">
				<div>
					<label for="cluster-server" class="block text-xs text-gray-400 mb-1">
						Server Address:
					</label>
					<input
						id="cluster-server"
						type="text"
						bind:value={clusterServer}
						placeholder="kubernetes.example.com or https://kubernetes.example.com:6443"
						disabled={clusterModalLoading}
						class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
						required
					/>
					<p class="text-xs text-gray-500 mt-1">
						Enter hostname/IP (defaults to port 6443) or paste full URL from kubeconfig
					</p>
				</div>
				
				<div>
					<label for="cluster-token" class="block text-xs text-gray-400 mb-1">
						Bearer Token:
					</label>
					<input
						id="cluster-token"
						type="password"
						bind:value={clusterToken}
						placeholder="Enter your Kubernetes bearer token"
						disabled={clusterModalLoading}
						class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-100 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
						required
					/>
				</div>
				
				<div class="flex items-center gap-2">
					<input
						id="cluster-skip-tls"
						type="checkbox"
						bind:checked={clusterSkipTLS}
						disabled={clusterModalLoading}
						class="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
					/>
					<label for="cluster-skip-tls" class="text-xs text-gray-400">
						Skip TLS certificate verification
					</label>
				</div>
				
				<div class="flex items-center gap-2 pt-2">
					<button
						type="submit"
						disabled={clusterModalLoading}
						class="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
						class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

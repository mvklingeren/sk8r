<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronRight, ChevronDown, Box, Database, Activity, GraduationCap, BookMarked, Sun, Moon, Server, RefreshCw, AlertCircle, Plus } from 'lucide-svelte';
	import { navigationConfig } from '$lib/config/navigationConfig';
	import type { NavigationSection } from '$lib/types/navigationConfig';
	import { getIcon } from '$lib/utils/iconMapping';
	import { navigation } from '$lib/stores/navigation';
	import { dataSource } from '$lib/stores/dataSource';
	import { learningMode } from '$lib/stores/learningMode';
	import { darkMode } from '$lib/stores/darkMode';
	import { clusterStore, type ClusterContext } from '$lib/stores/cluster';
	import { resourceCreator } from '$lib/stores/resourceCreator';
	import { version } from '$app/environment';

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

	// Create reactive state for expanded sections - properly initialize each section
	let sectionStates = $state(
		navigationConfig.sections.map(section => ({
			key: section.key,
			expanded: section.collapsed === undefined ? false : !section.collapsed
		}))
	);

	// Fetch cluster contexts on mount
	onMount(() => {
		clusterStore.fetchContexts().catch(err => {
			console.warn('Failed to fetch cluster contexts:', err);
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
		const newContext = select.value;
		
		if (newContext && newContext !== $clusterStore.currentContext) {
			clusterSwitching = true;
			try {
				await clusterStore.switchContext(newContext);
			} catch (err) {
				console.error('Failed to switch cluster:', err);
				// Reset the select to the current context
				select.value = $clusterStore.currentContext;
			} finally {
				clusterSwitching = false;
			}
		}
	}

	async function refreshClusters() {
		await clusterStore.fetchContexts();
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
				<button
					onclick={refreshClusters}
					class="p-1 hover:bg-gray-700 rounded transition-colors"
					title="Refresh cluster list"
					disabled={$clusterStore.loading}
				>
					<RefreshCw size={12} class="text-gray-500 hover:text-gray-300 {$clusterStore.loading ? 'animate-spin' : ''}" />
				</button>
			</div>
			
			{#if $clusterStore.error}
				<div class="flex items-center gap-1.5 text-xs text-red-400 mb-1">
					<AlertCircle size={12} />
					<span class="truncate">{$clusterStore.error}</span>
				</div>
			{/if}
			
			{#if $clusterStore.contexts.length > 0}
				<select 
					id="cluster-select"
					value={$clusterStore.currentContext}
					onchange={handleClusterChange}
					disabled={clusterSwitching || $clusterStore.loading}
					class="w-full text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#each $clusterStore.contexts as ctx (ctx.name)}
						<option value={ctx.name}>
							{ctx.name} ({ctx.server})
						</option>
					{/each}
				</select>
				{#if clusterSwitching}
					<div class="text-xs text-cyan-400 mt-1 flex items-center gap-1">
						<RefreshCw size={10} class="animate-spin" />
						Switching cluster...
					</div>
				{/if}
			{:else if $clusterStore.loading}
				<div class="text-xs text-gray-500 flex items-center gap-1.5 py-1">
					<RefreshCw size={12} class="animate-spin" />
					Loading clusters...
				</div>
			{:else}
				<div class="text-xs text-gray-500 py-1">
					No clusters found
				</div>
			{/if}
		</div>
		
		<!-- Namespace Selector -->
		<div class="mb-2">
			<label for="namespace-select" class="block text-xs text-gray-400 mb-1">Namespace:</label>
			<select 
				id="namespace-select"
				value={$navigation.namespace}
				onchange={(e) => navigation.setNamespace((e.target as HTMLSelectElement).value)}
				class="w-full text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
			>
				<option value="*">* All Namespaces</option>
				<option value="default">default</option>
				<option value="kube-system">kube-system</option>
				<option value="cert-manager">cert-manager</option>
				<option value="home-assistant">home-assistant</option>
				<option value="influxdb">influxdb</option>
				<option value="kubernetes-dashboard">kubernetes-dashboard</option>
				<option value="linstor-csi">linstor-csi</option>
				<option value="local-path-storage">local-path-storage</option>
				<option value="metallb-system">metallb-system</option>
				<option value="monitoring">monitoring</option>
				<option value="pihole">pihole</option>
				<option value="ring-doorbell">ring-doorbell</option>
				<option value="seafile">seafile</option>
				<option value="traefik">traefik</option>
				<option value="unifi">unifi</option>
				<option value="zigbee2mqtt">zigbee2mqtt</option>
			</select>
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
			<span class="text-xs text-gray-500">v{version}</span>
		</div>
	</div>
</aside>

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

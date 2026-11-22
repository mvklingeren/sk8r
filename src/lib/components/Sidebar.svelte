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
		RefreshCw,
		AlertCircle,
		Folder,
		Plus
	} from '@lucide/svelte';
	import { navigationConfig } from '#lib/config/navigationConfig.js';
	import { getIcon } from '#lib/utils/iconMapping.js';
	import { navigation } from '#lib/stores/navigation.js';
	import { dataSource } from '#lib/stores/dataSource.js';
	import { learningMode } from '#lib/stores/learningMode.js';
	import { darkMode } from '#lib/stores/darkMode.js';
	import { clusterStore } from '#lib/stores/cluster.js';
	import ClusterSelector from './ClusterSelector.svelte';
	import { namespaceStore } from '#lib/stores/namespaces.js';
	import { resourceCreator } from '#lib/stores/resourceCreator.js';

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

	async function refreshNamespaces() {
		await namespaceStore.fetchNamespaces();
	}
</script>

<aside class="flex h-full w-64 flex-col bg-neutral-900 text-neutral-100">
	<div class="border-b border-neutral-800 px-4 pt-4 pb-1">
		<a href="/" class="block" onclick={() => navigation.reset()}>
			<h1 class="flex items-center gap-2 text-xl font-bold">
				<Box class="h-6 w-6" />
				SK8R
			</h1>
			<p class="mt-1 text-sm text-neutral-400">Kubernetes Management</p>
		</a>

		<!-- Search hint -->
		<div class="mt-3 flex items-center gap-2 text-xs text-neutral-500">
			<kbd class="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-neutral-400">
				Ctrl
			</kbd>
			<kbd class="rounded border border-neutral-600 bg-neutral-800 px-2 py-1 text-neutral-400">
				K
			</kbd>
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
					class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-neutral-800"
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
								class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-neutral-800"
								class:bg-neutral-800={$navigation.selectedResource === item.resourceType}
								title={item.description || ''}
							>
								<ItemIcon size={14} />
								<span class="text-neutral-300">{item.label}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
		<!-- Design Patterns Section -->
		<div class="mt-4 mb-1 border-t border-neutral-800 pt-4">
			<button
				onclick={() => (patternsExpanded = !patternsExpanded)}
				class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-neutral-800"
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
							class="block flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-neutral-800"
							title={pattern.description}
						>
							<PatternIcon size={14} class="text-amber-400" />
							<span class="text-neutral-300">{pattern.label}</span>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</nav>

	<div class="border-t border-neutral-800 p-4">
		<!-- Cluster Selector -->
		<ClusterSelector />

		<!-- Namespace Selector -->
		<div class="mb-2">
			<div class="mb-1 flex items-center justify-between">
				<label for="namespace-select" class="flex items-center gap-1.5 text-xs text-neutral-400">
					<Folder size={12} class="text-purple-400" />
					Namespace:
				</label>
				<button
					onclick={refreshNamespaces}
					class="rounded p-1 transition-colors hover:bg-neutral-700"
					title="Refresh namespace list"
					disabled={$namespaceStore.loading}
				>
					<RefreshCw
						size={12}
						class="text-neutral-500 hover:text-neutral-300 {$namespaceStore.loading
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
					class="w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-300 focus:border-purple-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="*">* All Namespaces</option>
					{#each $namespaceStore.namespaces as ns (ns)}
						<option value={ns}>{ns}</option>
					{/each}
				</select>
			{:else if $namespaceStore.loading}
				<div class="flex items-center gap-1.5 py-1 text-xs text-neutral-500">
					<RefreshCw size={12} class="animate-spin" />
					Loading namespaces...
				</div>
			{:else}
				<select
					id="namespace-select"
					value={$navigation.namespace}
					onchange={(e) => navigation.setNamespace((e.target as HTMLSelectElement).value)}
					class="w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-300 focus:border-purple-500 focus:outline-none"
				>
					<option value="*">* All Namespaces</option>
					<option value="default">default</option>
				</select>
			{/if}
		</div>

		<!-- Data Source Status -->
		<div class="mt-3 border-t border-neutral-700 pt-3">
			<div class="mb-2 text-xs text-neutral-400">Data Source:</div>
			<div class="flex items-center gap-2">
				<div
					class="h-2 w-2 animate-pulse rounded-full {$dataSource.connected
						? 'bg-green-400'
						: 'bg-red-400'}"
				></div>
				{#if $dataSource.source === 'prometheus'}
					<Activity size={14} class="text-purple-400" />
					<span class="text-xs text-neutral-300">Prometheus</span>
				{:else}
					<Database size={14} class="text-blue-400" />
					<span class="text-xs text-neutral-300">Kubernetes API</span>
				{/if}
			</div>
		</div>

		<!-- Learning Mode Toggle -->
		<div class="mt-3 border-t border-neutral-700 pt-3">
			<button
				onclick={() => learningMode.toggle()}
				class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors {$learningMode
					? 'border border-amber-700/50 bg-amber-900/40 hover:bg-amber-900/60'
					: 'border border-transparent hover:bg-neutral-800'}"
				title="Toggle learning mode to show explanations for Kubernetes resources"
			>
				<GraduationCap size={16} class={$learningMode ? 'text-amber-400' : 'text-neutral-400'} />
				<span class="text-xs {$learningMode ? 'text-amber-300' : 'text-neutral-400'}">
					Learning Mode
				</span>
				<div class="ml-auto">
					<div
						class="h-4 w-8 rounded-full transition-colors {$learningMode
							? 'bg-amber-500'
							: 'bg-neutral-600'}"
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
		<div class="mt-3 border-t border-neutral-700 pt-3">
			<button
				onclick={() => darkMode.toggle()}
				class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors {$darkMode
					? 'border border-indigo-700/50 bg-indigo-900/40 hover:bg-indigo-900/60'
					: 'border border-transparent hover:bg-neutral-800'}"
				title="Toggle dark mode"
			>
				{#if $darkMode}
					<Moon size={16} class="text-indigo-400" />
				{:else}
					<Sun size={16} class="text-neutral-400" />
				{/if}
				<span class="text-xs {$darkMode ? 'text-indigo-300' : 'text-neutral-400'}">Dark Mode</span>
				<div class="ml-auto">
					<div
						class="h-4 w-8 rounded-full transition-colors {$darkMode
							? 'bg-indigo-500'
							: 'bg-neutral-600'}"
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
		<div class="mt-3 border-t border-neutral-700 pt-3 text-center">
			<span class="text-xs text-neutral-500">v{__APP_VERSION__}</span>
		</div>
	</div>
</aside>

<style>
	aside {
		scrollbar-width: thin;
		scrollbar-color: #525252 #262626;
	}

	aside::-webkit-scrollbar {
		width: 8px;
	}

	aside::-webkit-scrollbar-track {
		background: #262626;
	}

	aside::-webkit-scrollbar-thumb {
		background-color: #525252;
		border-radius: 4px;
	}
</style>

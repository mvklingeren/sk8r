<script lang="ts">
	import { ChevronRight, ChevronDown, Box } from 'lucide-svelte';
	import { navigationConfig } from '$lib/config/navigationConfig';
	import type { NavigationSection } from '$lib/types/navigationConfig';
	import { getIcon } from '$lib/utils/iconMapping';
	import { navigation } from '$lib/stores/navigation';

	// Create reactive state for expanded sections - properly initialize each section
	let sectionStates = $state(
		navigationConfig.sections.map(section => ({
			key: section.key,
			expanded: section.collapsed === undefined ? false : !section.collapsed
		}))
	);

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
</script>

<aside class="w-64 bg-gray-900 text-gray-100 h-full flex flex-col">
	<div class="p-4 border-b border-gray-800">
		<h1 class="text-xl font-bold flex items-center gap-2">
			<Box class="w-6 h-6" />
			SK8TES
		</h1>
		<p class="text-sm text-gray-400 mt-1">Kubernetes Management</p>
		
		<!-- Search hint -->
		<div class="mt-3 text-xs text-gray-500 flex items-center gap-2">
			<kbd class="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-400">Ctrl</kbd>
			<kbd class="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-400">K</kbd>
			<span>to search</span>
		</div>
	</div>

	<nav class="flex-1 overflow-y-auto p-2">
		{#each navigationConfig.sections as section (section.key)}
			{@const state = sectionStates.find((s) => s.key === section.key)}
			<div class="mb-1">
				<button
					onclick={() => toggleSection(section.key)}
					class="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-800 transition-colors text-left"
				>
					{#if section.items.length > 0}
						<svelte:component this={state?.expanded ? ChevronDown : ChevronRight} size={16} />
					{:else}
						<div class="w-4"></div>
					{/if}
					<svelte:component this={getIcon(section.icon)} size={18} />
					<span class="flex-1 text-sm">{section.label}</span>
				</button>

				{#if state?.expanded && section.items.length > 0}
					<div class="ml-6 mt-1">
						{#each section.items as item (item.label)}
							<button
								onclick={() => (item.resourceType ? selectResource(item.resourceType) : null)}
								class="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors text-left text-sm"
								class:bg-gray-800={$navigation.selectedResource === item.resourceType}
								title={item.description || ''}
							>
								<svelte:component this={getIcon(item.icon)} size={14} />
								<span class="text-gray-300">{item.label}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</nav>

	<div class="p-4 border-t border-gray-800">
		<div class="text-xs text-gray-400 mb-3">
			<div>Cluster: <span class="text-gray-300">default</span></div>
		</div>
		
		<div class="mb-2">
			<label for="namespace-select" class="block text-xs text-gray-400 mb-1">Namespace:</label>
			<select 
				id="namespace-select"
				value={$navigation.namespace}
				onchange={(e) => navigation.setNamespace(e.target.value)}
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
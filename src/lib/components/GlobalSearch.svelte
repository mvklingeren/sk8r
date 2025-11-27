<script lang="ts">
	import { onMount } from 'svelte';
	import { Search, Command, ArrowRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { navigation } from '$lib/stores/navigation';
	
	interface SearchResult {
		name: string;
		namespace: string;
		resourceType: string;
		kind: string;
	}

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();
	let searchQuery = $state('');
	let results = $state<SearchResult[]>([]);
	let loading = $state(false);
	let selectedIndex = $state(0);
	let searchInput: HTMLInputElement;

	// Resource types that we can search through
	const searchableResources = [
		'pods', 'deployments', 'statefulsets', 'daemonsets', 'replicasets',
		'services', 'ingresses', 'configmaps', 'secrets', 'jobs', 'cronjobs',
		'pvc', 'endpoints', 'serviceaccounts', 'roles', 'rolebindings'
	];

	$effect(() => {
		if (isOpen && searchInput) {
			searchInput.focus();
			// Clear previous search when reopening
			searchQuery = '';
			results = [];
			selectedIndex = 0;
		}
	});

	// Debounced search
	let searchTimeout: ReturnType<typeof setTimeout>;
	
	$effect(() => {
		clearTimeout(searchTimeout);
		
		if (searchQuery.length > 1) {
			searchTimeout = setTimeout(() => {
				performSearch();
			}, 300); // 300ms debounce
		} else {
			results = [];
		}
		
		return () => clearTimeout(searchTimeout);
	});

	async function performSearch() {
		if (searchQuery.length < 2) return;
		
		loading = true;
		selectedIndex = 0;
		
		try {
			// Search across all resource types
			const searchPromises = searchableResources.map(async (resourceType) => {
				try {
					const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${resourceType}&namespace=*`);
					if (response.ok) {
						const data = await response.json();
						return data.items.map((item: any) => ({
							name: item.metadata.name,
							namespace: item.metadata.namespace || 'N/A',
							resourceType,
							kind: item.kind
						}));
					}
				} catch (error) {
					console.warn(`Search failed for ${resourceType}:`, error);
				}
				return [];
			});

			const searchResults = await Promise.all(searchPromises);
			const flatResults = searchResults.flat();
			
			// Sort by relevance (exact matches first, then contains)
			results = flatResults.sort((a, b) => {
				const aExact = a.name.toLowerCase() === searchQuery.toLowerCase() ? 0 : 1;
				const bExact = b.name.toLowerCase() === searchQuery.toLowerCase() ? 0 : 1;
				return aExact - bExact || a.name.localeCompare(b.name);
			}).slice(0, 50); // Limit to 50 results
		} catch (error) {
			console.error('Search error:', error);
			results = [];
		} finally {
			loading = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Escape':
				onClose();
				break;
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				break;
			case 'Enter':
				event.preventDefault();
				if (results[selectedIndex]) {
					selectResult(results[selectedIndex]);
				}
				break;
		}
	}

	function selectResult(result: SearchResult) {
		// Navigate to the resource
		navigation.selectResource(result.resourceType);
		navigation.setNamespace(result.namespace === 'N/A' ? '*' : result.namespace);
		
		const params = new URLSearchParams();
		params.set('resource', result.resourceType);
		if (result.namespace !== 'N/A') {
			params.set('namespace', result.namespace);
		} else {
			params.set('namespace', '*');
		}
		
		goto(`/?${params.toString()}`);
		onClose();
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div class="fixed inset-0 z-50 backdrop-blur-sm" style="background-color: rgba(0, 0, 0, 0.2);" onclick={onClose}></div>
	
	<!-- Search Modal -->
	<div class="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-white rounded-lg shadow-2xl z-50 border border-gray-200">
		<div class="flex items-center px-4 py-3 border-b border-gray-200">
			<Search class="w-5 h-5 text-gray-400 mr-3" />
			<input
				bind:this={searchInput}
				bind:value={searchQuery}
				onkeydown={handleKeydown}
				placeholder="Search all resources..."
				class="flex-1 outline-none text-lg"
			/>
			<div class="flex items-center gap-1 text-xs text-gray-500 ml-3">
				<Command size={12} />
				<span>K to open</span>
			</div>
		</div>

		{#if loading}
			<div class="px-4 py-8 text-center">
				<div class="inline-flex items-center gap-2 text-gray-500">
					<div class="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
					Searching...
				</div>
			</div>
		{:else if results.length > 0}
			<div class="max-h-96 overflow-y-auto">
				{#each results as result, index}
					<button
						onclick={() => selectResult(result)}
						class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
						class:bg-blue-50={index === selectedIndex}
						class:border-blue-200={index === selectedIndex}
					>
						<div class="flex items-center gap-3">
							<div class="flex flex-col">
								<span class="font-medium text-gray-900">{result.name}</span>
								<div class="flex items-center gap-2 text-sm text-gray-500">
									<span class="capitalize">{result.resourceType}</span>
									<span>•</span>
									<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
										{result.namespace}
									</span>
								</div>
							</div>
						</div>
						<ArrowRight class="w-4 h-4 text-gray-400" />
					</button>
				{/each}
			</div>
		{:else if searchQuery.length > 1 && !loading}
			<div class="px-4 py-8 text-center text-gray-500">
				No resources found for "{searchQuery}"
			</div>
		{:else}
			<div class="px-4 py-8 text-center text-gray-500">
				Start typing to search resources across all namespaces...
			</div>
		{/if}

		<div class="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<span>↑↓ Navigate</span>
				<span>↵ Select</span>
				<span>ESC Close</span>
			</div>
			<div>
				{results.length > 0 ? `${results.length} result${results.length === 1 ? '' : 's'}` : ''}
			</div>
		</div>
	</div>
{/if}

<style>
	/* Smooth animations */
	.fixed {
		animation: fadeIn 0.15s ease-out;
	}
	
	@keyframes fadeIn {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
	}
</style>
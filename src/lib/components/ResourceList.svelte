<script lang="ts">
	import { onMount } from 'svelte';
	import { Trash2, Edit, RefreshCw, Search } from 'lucide-svelte';
	import type { K8sResource } from '$lib/types/k8s';
	import type { ColumnConfig } from '$lib/types/columnConfig';
	import { resourceColumnConfigs, defaultColumnConfig } from '$lib/config/resourceColumns';
	import { extractColumnValue, getAge } from '$lib/utils/columnFormatters';

	interface Props {
		resourceType: string;
		resources: K8sResource[];
		namespace?: string;
		onEdit?: (resource: K8sResource) => void;
		onDelete?: (resource: K8sResource) => void;
		onRefresh?: () => void;
	}

	let { resourceType, resources = [], namespace = 'default', onEdit, onDelete, onRefresh }: Props = $props();
	let searchQuery = $state('');
	
	// Get column configuration for this resource type
	let columns = $derived.by(() => {
		const config = resourceColumnConfigs[resourceType] || defaultColumnConfig;
		return config.columns;
	});
	
	let filteredResources = $derived.by(() => {
		if (!searchQuery) return resources;
		
		return resources.filter(resource => {
			const name = resource.metadata.name.toLowerCase();
			const namespace = resource.metadata.namespace?.toLowerCase() || '';
			const query = searchQuery.toLowerCase();
			
			return name.includes(query) || namespace.includes(query);
		});
	});

	// Function to get the display value for a column
	function getColumnValue(resource: K8sResource, column: ColumnConfig): string {
		if (column.type === 'age') {
			const timestamp = extractColumnValue(resource, column.path, column.formatter);
			return getAge(timestamp);
		}
		
		const value = extractColumnValue(resource, column.path, column.formatter);
		
		if (value === null || value === undefined) {
			return '';
		}
		
		return String(value);
	}

	// Function to get CSS classes for badge types
	function getBadgeClass(value: string, colorMap?: Record<string, string>): string {
		if (!colorMap) return 'bg-gray-100 text-gray-800';
		
		const color = colorMap[value];
		switch (color) {
			case 'green': return 'bg-green-100 text-green-800';
			case 'yellow': return 'bg-yellow-100 text-yellow-800';
			case 'red': return 'bg-red-100 text-red-800';
			case 'blue': return 'bg-blue-100 text-blue-800';
			case 'gray': return 'bg-gray-100 text-gray-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="bg-white rounded-lg shadow">
	<div class="px-6 py-4 border-b border-gray-200">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-800 capitalize">{resourceType}</h2>
			<div class="flex items-center gap-4">
				<div class="relative">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search resources..."
						class="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				{#if onRefresh}
					<button
						onclick={onRefresh}
						class="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
					>
						<RefreshCw size={16} />
						Refresh
					</button>
				{/if}
			</div>
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full">
			<thead class="bg-gray-50">
				<tr>
					{#each columns as column}
						<th 
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							style={column.flex ? `flex-grow: ${column.flex}` : ''}
						>
							{column.label}
						</th>
					{/each}
					{#if namespace === '*'}
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Namespace
						</th>
					{/if}
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
						Actions
					</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each filteredResources as resource}
					<tr class="hover:bg-gray-50 transition-colors">
						{#each columns as column}
							<td class="px-6 py-4 whitespace-nowrap text-sm">
								{#if column.type === 'link'}
									<a
										href="/{resourceType}/{resource.metadata.name}?namespace={resource.metadata.namespace || 'default'}"
										class="text-blue-600 hover:text-blue-800 hover:underline font-medium"
									>
										{getColumnValue(resource, column)}
									</a>
								{:else if column.type === 'badge'}
									<span class="inline-flex px-2 py-1 text-xs font-medium rounded-full {getBadgeClass(getColumnValue(resource, column), column.colorMap)}">
										{getColumnValue(resource, column)}
									</span>
								{:else if column.type === 'list'}
									<span class="text-gray-900">
										{getColumnValue(resource, column)}
									</span>
								{:else}
									<span class="text-gray-900">
										{getColumnValue(resource, column)}
									</span>
								{/if}
							</td>
						{/each}
						{#if namespace === '*'}
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								<span class="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
									{resource.metadata.namespace || 'N/A'}
								</span>
							</td>
						{/if}
						<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
							<div class="flex items-center justify-end gap-2">
								{#if onEdit}
									<button
										onclick={() => onEdit(resource)}
										class="text-blue-600 hover:text-blue-900 transition-colors"
										title="Edit"
									>
										<Edit size={16} />
									</button>
								{/if}
								{#if onDelete}
									<button
										onclick={() => onDelete(resource)}
										class="text-red-600 hover:text-red-900 transition-colors"
										title="Delete"
									>
										<Trash2 size={16} />
									</button>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if filteredResources.length === 0}
			<div class="text-center py-12 text-gray-500">
				{#if searchQuery}
					No resources found matching "{searchQuery}"
				{:else}
					No {resourceType} found
				{/if}
			</div>
		{/if}
	</div>
</div>
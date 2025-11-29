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
	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc'>('asc');
	
	// Get column configuration for this resource type
	let columns = $derived.by(() => {
		const config = resourceColumnConfigs[resourceType] || defaultColumnConfig;
		return config.columns;
	});
	
	let filteredResources = $derived.by(() => {
		let result = resources;
		
		// Apply search filter
		if (searchQuery) {
			result = result.filter(resource => {
				const name = resource.metadata.name.toLowerCase();
				const ns = resource.metadata.namespace?.toLowerCase() || '';
				const query = searchQuery.toLowerCase();
				
				return name.includes(query) || ns.includes(query);
			});
		}
		
		// Apply sorting
		if (sortColumn) {
			const column = columns.find(c => c.key === sortColumn);
			if (column) {
				result = [...result].sort((a, b) => {
					const aVal = getSortValue(a, column);
					const bVal = getSortValue(b, column);
					
					let comparison = 0;
					if (aVal < bVal) comparison = -1;
					else if (aVal > bVal) comparison = 1;
					
					return sortDirection === 'asc' ? comparison : -comparison;
				});
			} else if (sortColumn === '__namespace__') {
				// Sort by namespace
				result = [...result].sort((a, b) => {
					const aVal = a.metadata.namespace || '';
					const bVal = b.metadata.namespace || '';
					
					let comparison = aVal.localeCompare(bVal);
					return sortDirection === 'asc' ? comparison : -comparison;
				});
			}
		}
		
		return result;
	});
	
	// Get sortable value for comparison
	function getSortValue(resource: K8sResource, column: ColumnConfig): string | number {
		if (column.type === 'age') {
			// Sort by actual timestamp for age columns
			const timestamp = extractColumnValue(resource, column.path, column.formatter);
			return timestamp ? new Date(timestamp).getTime() : 0;
		}
		
		const value = extractColumnValue(resource, column.path, column.formatter);
		
		// Try to parse as number for numeric sorting
		if (typeof value === 'number') return value;
		if (typeof value === 'string') {
			const num = parseFloat(value);
			if (!isNaN(num) && value.match(/^[\d.]+$/)) return num;
		}
		
		return String(value ?? '').toLowerCase();
	}
	
	// Handle column header click for sorting
	function handleSort(columnKey: string) {
		if (sortColumn === columnKey) {
			// Toggle direction if same column
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			// New column, default to ascending
			sortColumn = columnKey;
			sortDirection = 'asc';
		}
	}

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

	// Function to get labels for a resource
	function getLabels(resource: K8sResource): Array<{ key: string; value: string }> {
		const labels = resource.metadata?.labels || {};
		return Object.entries(labels).map(([key, value]) => ({ key, value: value as string }));
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
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider {column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 select-none transition-colors' : ''}"
							style={column.flex ? `flex-grow: ${column.flex}` : ''}
							onclick={() => column.sortable !== false && handleSort(column.key)}
						>
							<span class="flex items-center justify-between gap-2">
								<span>{column.label}</span>
								{#if column.sortable !== false}
									<span class="text-gray-400 w-3 text-right">
										{#if sortColumn === column.key}
											{sortDirection === 'asc' ? '▲' : '▼'}
										{/if}
									</span>
								{/if}
							</span>
						</th>
					{/each}
					{#if namespace === '*'}
						<th 
							class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none transition-colors"
							onclick={() => handleSort('__namespace__')}
						>
							<span class="flex items-center justify-between gap-2">
								<span>Namespace</span>
								<span class="text-gray-400 w-3 text-right">
									{#if sortColumn === '__namespace__'}
										{sortDirection === 'asc' ? '▲' : '▼'}
									{/if}
								</span>
							</span>
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
								{:else if column.type === 'labels'}
									<div class="flex flex-wrap gap-1 max-w-md">
										{#each getLabels(resource) as label}
											<span class="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md" title="{label.key}={label.value}">
												{label.key.split('/').pop()}={label.value.length > 20 ? label.value.slice(0, 20) + '…' : label.value}
											</span>
										{/each}
										{#if getLabels(resource).length === 0}
											<span class="text-gray-400 text-xs">—</span>
										{/if}
									</div>
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
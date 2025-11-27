<script lang="ts">
	import { onMount } from 'svelte';
	import { Trash2, Edit, RefreshCw, Search } from 'lucide-svelte';
	import type { K8sResource } from '$lib/types/k8s';

	interface Props {
		resourceType: string;
		resources: K8sResource[];
		onEdit?: (resource: K8sResource) => void;
		onDelete?: (resource: K8sResource) => void;
		onRefresh?: () => void;
	}

	let { resourceType, resources = [], onEdit, onDelete, onRefresh }: Props = $props();
	let searchQuery = $state('');
	
	let filteredResources = $derived.by(() => {
		if (!searchQuery) return resources;
		
		return resources.filter(resource => {
			const name = resource.metadata.name.toLowerCase();
			const namespace = resource.metadata.namespace?.toLowerCase() || '';
			const query = searchQuery.toLowerCase();
			
			return name.includes(query) || namespace.includes(query);
		});
	});

	function getAge(timestamp: string | undefined): string {
		if (!timestamp) return 'Unknown';
		
		const created = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - created.getTime();
		
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		
		if (days > 0) return `${days}d${hours > 0 ? ` ${hours}h` : ''}`;
		if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
		return `${minutes}m`;
	}

	function getStatus(resource: K8sResource): string {
		if (resource.status?.phase) return resource.status.phase;
		if (resource.status?.conditions?.length > 0) {
			const ready = resource.status.conditions.find((c: any) => c.type === 'Ready');
			return ready?.status === 'True' ? 'Ready' : 'Not Ready';
		}
		return 'Unknown';
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
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Name
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Namespace
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Status
					</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Age
					</th>
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
						Actions
					</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each filteredResources as resource}
					<tr class="hover:bg-gray-50 transition-colors">
						<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
							{resource.metadata.name}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							{resource.metadata.namespace || 'N/A'}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span
								class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
								class:bg-green-100={getStatus(resource) === 'Running' || getStatus(resource) === 'Ready'}
								class:text-green-800={getStatus(resource) === 'Running' || getStatus(resource) === 'Ready'}
								class:bg-yellow-100={getStatus(resource) === 'Pending'}
								class:text-yellow-800={getStatus(resource) === 'Pending'}
								class:bg-red-100={getStatus(resource) === 'Failed' || getStatus(resource) === 'Not Ready'}
								class:text-red-800={getStatus(resource) === 'Failed' || getStatus(resource) === 'Not Ready'}
								class:bg-gray-100={!['Running', 'Ready', 'Pending', 'Failed', 'Not Ready'].includes(getStatus(resource))}
								class:text-gray-800={!['Running', 'Ready', 'Pending', 'Failed', 'Not Ready'].includes(getStatus(resource))}
							>
								{getStatus(resource)}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
							{getAge(resource.metadata.creationTimestamp)}
						</td>
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
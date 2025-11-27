<script lang="ts">
	import { onMount } from 'svelte';
	import { Trash2, Edit, RefreshCw, Search } from 'lucide-svelte';
	import type { K8sResource } from '$lib/types/k8s';

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
		const kind = resource.kind;
		const status = resource.status;

		if (!status) return 'Unknown';

		switch (kind) {
			case 'Pod':
				return status.phase || 'Unknown';

			case 'Deployment':
				if (status.readyReplicas === status.replicas && status.replicas > 0) {
					return 'Ready';
				}
				if (status.replicas === 0) {
					return 'Scaled Down';
				}
				if ((status.readyReplicas || 0) < (status.replicas || 0)) {
					return `${status.readyReplicas || 0}/${status.replicas || 0} Ready`;
				}
				return 'Progressing';

			case 'StatefulSet':
				if (status.readyReplicas === status.replicas && status.replicas > 0) {
					return 'Ready';
				}
				if ((status.readyReplicas || 0) < (status.replicas || 0)) {
					return `${status.readyReplicas || 0}/${status.replicas || 0} Ready`;
				}
				return 'Progressing';

			case 'DaemonSet':
				if (status.numberReady === status.desiredNumberScheduled) {
					return 'Ready';
				}
				return `${status.numberReady || 0}/${status.desiredNumberScheduled || 0} Ready`;

			case 'ReplicaSet':
				if (status.readyReplicas === status.replicas && status.replicas > 0) {
					return 'Ready';
				}
				if ((status.readyReplicas || 0) < (status.replicas || 0)) {
					return `${status.readyReplicas || 0}/${status.replicas || 0} Ready`;
				}
				return 'Available';

			case 'Service':
				// Services don't have a traditional "status"
				return 'Active';

			case 'Job':
				if (status.succeeded > 0) {
					return 'Complete';
				}
				if (status.failed > 0) {
					return 'Failed';
				}
				if (status.active > 0) {
					return 'Running';
				}
				return 'Pending';

			case 'CronJob':
				if (status.active?.length > 0) {
					return 'Active';
				}
				return 'Scheduled';

			case 'ConfigMap':
			case 'Secret':
			case 'PersistentVolumeClaim':
			case 'ServiceAccount':
				// These resources don't have meaningful status, they're just "Available"
				return 'Available';

			case 'Ingress':
				if (status.loadBalancer?.ingress?.length > 0) {
					return 'Ready';
				}
				return 'Pending';

			case 'IngressRoute':
				// Traefik IngressRoutes are usually active if they exist
				return 'Active';

			case 'Middleware':
			case 'TLSOption':
				// Traefik middleware and TLS options are configuration resources
				return 'Configured';

			case 'Certificate':
				if (status?.conditions) {
					const ready = status.conditions.find((c: any) => c.type === 'Ready');
					if (ready?.status === 'True') {
						return 'Ready';
					}
					const issuing = status.conditions.find((c: any) => c.type === 'Issuing');
					if (issuing?.status === 'True') {
						return 'Issuing';
					}
				}
				return 'Unknown';

			default:
				// Fallback to generic condition checking
				if (status.phase) {
					return status.phase;
				}
				if (status.conditions?.length > 0) {
					const ready = status.conditions.find((c: any) => c.type === 'Ready' || c.type === 'Available');
					if (ready) {
						return ready.status === 'True' ? 'Ready' : 'Not Ready';
					}
				}
				return 'Unknown';
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
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
						Name
					</th>
					{#if namespace === '*'}
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
							Namespace
						</th>
					{/if}
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
						{#if namespace === '*'}
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
								<span class="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
									{resource.metadata.namespace || 'N/A'}
								</span>
							</td>
						{/if}
						<td class="px-6 py-4 whitespace-nowrap">
							<span
								class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
								class:bg-green-100={['Running', 'Ready', 'Active', 'Available', 'Complete', 'Configured'].includes(getStatus(resource)) || getStatus(resource).includes('Ready')}
								class:text-green-800={['Running', 'Ready', 'Active', 'Available', 'Complete', 'Configured'].includes(getStatus(resource)) || getStatus(resource).includes('Ready')}
								class:bg-yellow-100={['Pending', 'Progressing', 'Scheduled', 'Issuing'].includes(getStatus(resource))}
								class:text-yellow-800={['Pending', 'Progressing', 'Scheduled', 'Issuing'].includes(getStatus(resource))}
								class:bg-red-100={['Failed', 'Not Ready', 'Error'].includes(getStatus(resource))}
								class:text-red-800={['Failed', 'Not Ready', 'Error'].includes(getStatus(resource))}
								class:bg-blue-100={getStatus(resource) === 'Scaled Down'}
								class:text-blue-800={getStatus(resource) === 'Scaled Down'}
								class:bg-gray-100={['Unknown'].includes(getStatus(resource))}
								class:text-gray-800={['Unknown'].includes(getStatus(resource))}
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
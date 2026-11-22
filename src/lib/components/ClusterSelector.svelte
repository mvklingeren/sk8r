<script lang="ts">
	import { Server, RefreshCw, AlertCircle, Plus, Edit2, X, Trash2 } from 'lucide-svelte';
	import { clusterStore, type CustomCluster } from '$lib/stores/cluster';
	import { authToken } from '$lib/stores/auth';
	import { normalizeServerUrl } from '$lib/utils/serverUrl';

	let clusterSwitching = $state(false);
	let showClusterModal = $state(false);
	let editingCluster: CustomCluster | null = $state(null);
	let clusterServer = $state('');
	let clusterToken = $state('');
	let clusterSkipTLS = $state(true);
	let clusterModalError = $state<string | null>(null);
	let clusterModalLoading = $state(false);

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
		} catch (err) {
			// Extract detailed error message from API response
			const response = (err as { response?: Response } | null)?.response;
			if (response) {
				const data = await response.json().catch(() => ({}));
				clusterModalError =
					data.message || data.error || (err as Error).message || 'Failed to save cluster';
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

<div class="mb-3">
	<div class="mb-1 flex items-center justify-between">
		<label for="cluster-select" class="flex items-center gap-1.5 text-xs text-neutral-400">
			<Server size={12} class="text-cyan-400" />
			Cluster:
		</label>
		<div class="flex items-center gap-1">
			<button
				onclick={refreshClusters}
				class="rounded p-1 transition-colors hover:bg-neutral-700"
				title="Refresh cluster list"
				disabled={$clusterStore.loading}
			>
				<RefreshCw
					size={12}
					class="text-neutral-500 hover:text-neutral-300 {$clusterStore.loading ? 'animate-spin' : ''}"
				/>
			</button>
			<button
				onclick={openAddClusterModal}
				class="rounded p-1 transition-colors hover:bg-neutral-700"
				title="Add cluster"
			>
				<Plus size={12} class="text-neutral-500 hover:text-neutral-300" />
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
				class="w-full rounded border border-neutral-600 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-300 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
							class="flex items-center overflow-hidden rounded border border-neutral-600 bg-neutral-800"
						>
							<button
								onclick={() => openEditClusterModal(customCluster)}
								class="flex items-center gap-1 px-2 py-0.5 text-xs transition-colors hover:bg-neutral-700"
								title="Edit {customCluster.name}"
							>
								<Edit2 size={10} />
								<span class="max-w-[80px] truncate">{customCluster.name}</span>
							</button>
							<button
								onclick={() => deleteCluster(customCluster)}
								class="border-l border-neutral-600 px-1.5 py-0.5 text-xs text-neutral-400 transition-colors hover:bg-red-900/50 hover:text-red-400"
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
		<div class="flex items-center gap-1.5 py-1 text-xs text-neutral-500">
			<RefreshCw size={12} class="animate-spin" />
			Loading clusters...
		</div>
	{:else}
		<div class="mb-1 py-1 text-xs text-neutral-500">No clusters found</div>
		<button
			onclick={openAddClusterModal}
			class="flex w-full items-center justify-center gap-1 rounded bg-cyan-600 px-2 py-1.5 text-xs text-white transition-colors hover:bg-cyan-700"
		>
			<Plus size={12} />
			Add Cluster
		</button>
	{/if}
</div>

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
			class="mx-4 w-full max-w-md rounded-lg border border-neutral-600 bg-neutral-800 p-6 text-neutral-100 shadow-xl"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">
					{editingCluster ? 'Edit Cluster' : 'Add Cluster'}
				</h2>
				<button
					onclick={closeClusterModal}
					class="rounded p-1 transition-colors hover:bg-neutral-700"
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
					<label for="cluster-server" class="mb-1 block text-xs text-neutral-400">
						Server Address:
					</label>
					<input
						id="cluster-server"
						type="text"
						bind:value={clusterServer}
						placeholder="kubernetes.example.com or https://kubernetes.example.com:6443"
						disabled={clusterModalLoading}
						class="w-full rounded border border-neutral-600 bg-neutral-700 px-3 py-2 text-sm text-neutral-100 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						required
					/>
					<p class="mt-1 text-xs text-neutral-500">
						Enter hostname/IP (defaults to port 6443) or paste full URL from kubeconfig
					</p>
				</div>

				<div>
					<label for="cluster-token" class="mb-1 block text-xs text-neutral-400">
						Bearer Token:
					</label>
					<input
						id="cluster-token"
						type="password"
						bind:value={clusterToken}
						placeholder="Enter your Kubernetes bearer token"
						disabled={clusterModalLoading}
						class="w-full rounded border border-neutral-600 bg-neutral-700 px-3 py-2 text-sm text-neutral-100 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						required
					/>
				</div>

				<div class="flex items-center gap-2">
					<input
						id="cluster-skip-tls"
						type="checkbox"
						bind:checked={clusterSkipTLS}
						disabled={clusterModalLoading}
						class="h-4 w-4 rounded border-neutral-600 bg-neutral-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
					/>
					<label for="cluster-skip-tls" class="text-xs text-neutral-400">
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
						class="rounded bg-neutral-700 px-4 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

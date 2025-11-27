<script lang="ts">
	import { ChevronRight, ChevronDown } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import {
		Package,
		Layers,
		Network,
		HardDrive,
		Shield,
		Puzzle,
		Home,
		Box,
		Calendar,
		Clock,
		Server,
		FileText,
		Lock,
		Share2,
		Globe,
		Database,
		Key,
		Users,
		UserCheck
	} from 'lucide-svelte';

	interface NavItem {
		label: string;
		icon: ComponentType;
		expanded?: boolean;
		children?: {
			label: string;
			resource: string;
			icon?: ComponentType;
		}[];
	}

	let navItems: NavItem[] = $state([
		{
			label: 'Overview',
			icon: Home,
			children: []
		},
		{
			label: 'Workloads',
			icon: Package,
			expanded: false,
			children: [
				{ label: 'Pods', resource: 'pods', icon: Box },
				{ label: 'Deployments', resource: 'deployments', icon: Layers },
				{ label: 'StatefulSets', resource: 'statefulsets', icon: Server },
				{ label: 'DaemonSets', resource: 'daemonsets', icon: Server },
				{ label: 'ReplicaSets', resource: 'replicasets', icon: Layers },
				{ label: 'Jobs', resource: 'jobs', icon: Calendar },
				{ label: 'CronJobs', resource: 'cronjobs', icon: Clock }
			]
		},
		{
			label: 'Configuration',
			icon: FileText,
			expanded: false,
			children: [
				{ label: 'ConfigMaps', resource: 'configmaps', icon: FileText },
				{ label: 'Secrets', resource: 'secrets', icon: Lock },
				{ label: 'ResourceQuotas', resource: 'resourcequotas', icon: Database },
				{ label: 'HorizontalPodAutoscalers', resource: 'hpa', icon: Layers },
				{ label: 'PodDisruptionBudgets', resource: 'pdb', icon: Shield },
				{ label: 'LimitRanges', resource: 'limitranges', icon: Database }
			]
		},
		{
			label: 'Network',
			icon: Network,
			expanded: false,
			children: [
				{ label: 'Services', resource: 'services', icon: Share2 },
				{ label: 'Ingresses', resource: 'ingresses', icon: Globe },
				{ label: 'NetworkPolicies', resource: 'networkpolicies', icon: Shield },
				{ label: 'Endpoints', resource: 'endpoints', icon: Network },
				{ label: 'EndpointSlices', resource: 'endpointslices', icon: Network }
			]
		},
		{
			label: 'Storage',
			icon: HardDrive,
			expanded: false,
			children: [
				{ label: 'PersistentVolumeClaims', resource: 'pvc', icon: HardDrive },
				{ label: 'PersistentVolumes', resource: 'pv', icon: Database },
				{ label: 'StorageClasses', resource: 'storageclasses', icon: Layers },
				{ label: 'VolumeSnapshots', resource: 'volumesnapshots', icon: HardDrive },
				{ label: 'VolumeSnapshotClasses', resource: 'volumesnapshotclasses', icon: Layers }
			]
		},
		{
			label: 'Access Control',
			icon: Shield,
			expanded: false,
			children: [
				{ label: 'ServiceAccounts', resource: 'serviceaccounts', icon: Key },
				{ label: 'ClusterRoles', resource: 'clusterroles', icon: Shield },
				{ label: 'ClusterRoleBindings', resource: 'clusterrolebindings', icon: UserCheck },
				{ label: 'Roles', resource: 'roles', icon: Users },
				{ label: 'RoleBindings', resource: 'rolebindings', icon: UserCheck }
			]
		},
		{
			label: 'Custom Resources',
			icon: Puzzle,
			expanded: false,
			children: []
		}
	]);

	import { navigation } from '$lib/stores/navigation';

	function toggleSection(index: number) {
		navItems[index].expanded = !navItems[index].expanded;
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
		{#each navItems as item, index}
			<div class="mb-1">
				<button
					onclick={() => item.children?.length ? toggleSection(index) : selectResource('overview')}
					class="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-800 transition-colors text-left"
					class:bg-gray-800={$navigation.selectedResource === 'overview' && item.label === 'Overview'}
				>
					{#if item.children?.length}
						<svelte:component
							this={item.expanded ? ChevronDown : ChevronRight}
							size={16}
						/>
					{:else}
						<div class="w-4"></div>
					{/if}
					<svelte:component this={item.icon} size={18} />
					<span class="flex-1 text-sm">{item.label}</span>
				</button>

				{#if item.expanded && item.children}
					<div class="ml-6 mt-1">
						{#each item.children as child}
							<button
								onclick={() => selectResource(child.resource)}
								class="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors text-left text-sm"
								class:bg-gray-800={$navigation.selectedResource === child.resource}
							>
								{#if child.icon}
									<svelte:component this={child.icon} size={14} />
								{:else}
									<div class="w-3.5"></div>
								{/if}
								<span class="text-gray-300">{child.label}</span>
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
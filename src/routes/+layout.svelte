<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import GlobalSearch from '$lib/components/GlobalSearch.svelte';
	import { onMount } from 'svelte';
	import { clusterStore } from '$lib/stores/cluster';
	import { darkMode } from '$lib/stores/darkMode';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	let { children } = $props();
	
	// Check if we're on a patterns page (no padding needed)
	let isPatternPage = $derived($page.url.pathname.startsWith('/patterns'));
	let searchOpen = $state(false);

	onMount(() => {
		// Initialize dark mode on mount
		darkMode.initialize();
		
		function handleKeydown(event: KeyboardEvent) {
			// Ctrl+K or Cmd+K to open search
			if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
				event.preventDefault();
				searchOpen = true;
			}
		}

		document.addEventListener('keydown', handleKeydown);

		// Check if any clusters exist, if not prompt for first cluster
		// All clusters are now stored client-side in localStorage (no kubeconfig dependency)
		if (browser) {
			// Wait a bit for clusterStore to initialize from localStorage
			setTimeout(async () => {
				const clusterState = get(clusterStore);
				const hasCustomClusters = clusterState.customClusters.length > 0;
				
				if (!hasCustomClusters) {
					// No clusters found, prompt for first cluster
					const serverInput = prompt('Please enter your Kubernetes server address:\n(hostname/IP or full URL like https://kubernetes.example.com:6443)');
					if (serverInput) {
						const token = prompt('Please enter your Kubernetes bearer token:');
						if (token) {
							try {
								// Normalize server URL (add https:// and :6443 if needed)
								let normalizedServer = serverInput.trim();
								if (!normalizedServer.startsWith('http://') && !normalizedServer.startsWith('https://')) {
									// Add https:// and default port
									const hasPort = /:\d+$/.test(normalizedServer);
									normalizedServer = hasPort ? `https://${normalizedServer}` : `https://${normalizedServer}:6443`;
								} else if (normalizedServer.startsWith('http://')) {
									normalizedServer = normalizedServer.replace('http://', 'https://');
								}
								// Remove trailing slash
								normalizedServer = normalizedServer.replace(/\/+$/, '');
								
								const newCluster = await clusterStore.addCluster(normalizedServer, token);
								// Auto-switch to the new cluster
								clusterStore.switchToCustomCluster(newCluster.id);
								// Reload to apply the new cluster
								window.location.reload();
							} catch (err) {
								console.error('Failed to add cluster:', err);
								alert(`Failed to add cluster: ${err instanceof Error ? err.message : 'Unknown error'}`);
							}
						}
					}
				}
			}, 100);
		}
		
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	function closeSearch() {
		searchOpen = false;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
	<Sidebar />
	<main class="flex-1 overflow-auto dark:text-slate-100">
		<div class={isPatternPage ? '' : 'p-6'}>
			{@render children()}
		</div>
	</main>
	
	<!-- Global Search -->
	<GlobalSearch isOpen={searchOpen} onClose={closeSearch} />
</div>

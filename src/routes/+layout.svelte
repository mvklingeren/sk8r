<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import GlobalSearch from '$lib/components/GlobalSearch.svelte';
	import { onMount } from 'svelte';
	import { authToken } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	let { children } = $props();
	
	// Check if we're on a patterns page (no padding needed)
	let isPatternPage = $derived($page.url.pathname.startsWith('/patterns'));
	let searchOpen = $state(false);

	onMount(() => {
		function handleKeydown(event: KeyboardEvent) {
			// Ctrl+K or Cmd+K to open search
			if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
				event.preventDefault();
				searchOpen = true;
			}
		}

		document.addEventListener('keydown', handleKeydown);

		// Prompt for token if not set, once on mount
		if (browser) {
			const tokenValue = get(authToken);
			if (!tokenValue) {
				const userToken = prompt('Please enter your Kubernetes bearer token:');
				if (userToken) {
					authToken.setToken(userToken);
				}
			}
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

<div class="flex h-screen bg-gray-50">
	<Sidebar />
	<main class="flex-1 overflow-auto">
		<div class={isPatternPage ? '' : 'p-6'}>
			{@render children()}
		</div>
	</main>
	
	<!-- Global Search -->
	<GlobalSearch isOpen={searchOpen} onClose={closeSearch} />
</div>

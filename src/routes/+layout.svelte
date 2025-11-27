<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-screen bg-gray-50">
	<Sidebar />
	<main class="flex-1 overflow-auto">
		<div class="p-6">
			{@render children()}
		</div>
	</main>
</div>

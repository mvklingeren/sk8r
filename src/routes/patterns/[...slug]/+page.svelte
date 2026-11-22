<script lang="ts">
	import { ArrowLeft, BookOpen } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(async () => {
		// Dynamically import mermaid to avoid SSR issues
		const mermaid = (await import('mermaid')).default;
		mermaid.initialize({
			startOnLoad: false,
			theme: 'dark',
			themeVariables: {
				primaryColor: '#3b82f6',
				primaryTextColor: '#fafafa',
				primaryBorderColor: '#60a5fa',
				lineColor: '#737373',
				secondaryColor: '#262626',
				tertiaryColor: '#171717',
				background: '#0a0a0a',
				mainBkg: '#262626',
				secondBkg: '#171717',
				nodeBorder: '#525252',
				clusterBkg: '#262626',
				clusterBorder: '#404040',
				titleColor: '#fafafa',
				edgeLabelBackground: '#262626'
			}
		});

		// Find all mermaid code blocks and render them
		const mermaidBlocks = document.querySelectorAll('pre code.language-mermaid');
		for (const block of mermaidBlocks) {
			const pre = block.parentElement;
			if (!pre) continue;

			const code = block.textContent || '';
			const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

			try {
				const { svg } = await mermaid.render(id, code);
				const wrapper = document.createElement('div');
				wrapper.className = 'mermaid-diagram';
				wrapper.innerHTML = svg;
				pre.replaceWith(wrapper);
			} catch (e) {
				console.error('Mermaid rendering error:', e);
			}
		}
	});
</script>

<svelte:head>
	<title>{data.title} | SK8R Patterns</title>
</svelte:head>

<div class="min-h-screen bg-neutral-950">
	<!-- Header -->
	<header class="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
		<div class="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
			<a href="/" class="flex items-center gap-2 text-neutral-400 transition-colors hover:text-white">
				<ArrowLeft size={20} />
				<span class="text-sm">Back to Dashboard</span>
			</a>
			<div class="flex-1"></div>
			<div class="flex items-center gap-2 text-amber-400">
				<BookOpen size={18} />
				<span class="text-sm font-medium">Design Pattern</span>
			</div>
		</div>
	</header>

	<!-- Content -->
	<main class="mx-auto max-w-4xl px-6 py-8">
		<article class="prose prose-invert prose-lg max-w-none">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- markdown rendered from repo-owned files only -->
			{@html data.html}
		</article>
	</main>
</div>

<style>
	/* Custom prose styling for dark theme */
	:global(.prose) {
		--tw-prose-body: #d4d4d4;
		--tw-prose-headings: #fafafa;
		--tw-prose-lead: #a3a3a3;
		--tw-prose-links: #60a5fa;
		--tw-prose-bold: #fafafa;
		--tw-prose-counters: #a3a3a3;
		--tw-prose-bullets: #737373;
		--tw-prose-hr: #404040;
		--tw-prose-quotes: #f5f5f5;
		--tw-prose-quote-borders: #525252;
		--tw-prose-captions: #a3a3a3;
		--tw-prose-code: #fafafa;
		--tw-prose-pre-code: #e5e5e5;
		--tw-prose-pre-bg: #262626;
		--tw-prose-th-borders: #525252;
		--tw-prose-td-borders: #404040;
	}

	:global(.prose h1) {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #404040;
		color: #fafafa;
	}

	:global(.prose h2) {
		font-size: 1.75rem;
		font-weight: 600;
		margin-top: 3rem;
		margin-bottom: 1rem;
		color: #fafafa;
	}

	:global(.prose h3) {
		font-size: 1.35rem;
		font-weight: 600;
		margin-top: 2rem;
		margin-bottom: 0.75rem;
		color: #e5e5e5;
	}

	:global(.prose p) {
		margin-bottom: 1.25rem;
		line-height: 1.75;
		color: #d4d4d4;
	}

	:global(.prose a) {
		color: #60a5fa;
		text-decoration: none;
		border-bottom: 1px solid transparent;
		transition: border-color 0.2s;
	}

	:global(.prose a:hover) {
		border-bottom-color: #60a5fa;
	}

	:global(.prose code) {
		background: #262626;
		padding: 0.2em 0.4em;
		border-radius: 0.25rem;
		font-size: 0.875em;
		color: #fbbf24;
	}

	:global(.prose pre) {
		background: #171717;
		border: 1px solid #404040;
		border-radius: 0.5rem;
		padding: 1.25rem;
		overflow-x: auto;
		margin: 1.5rem 0;
	}

	:global(.prose pre code) {
		background: transparent;
		padding: 0;
		color: #e5e5e5;
		font-size: 0.875rem;
		line-height: 1.7;
	}

	:global(.prose ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin-bottom: 1.25rem;
	}

	:global(.prose ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin-bottom: 1.25rem;
	}

	:global(.prose li) {
		margin-bottom: 0.5rem;
		color: #d4d4d4;
	}

	:global(.prose blockquote) {
		border-left: 4px solid #525252;
		padding-left: 1rem;
		margin: 1.5rem 0;
		color: #a3a3a3;
		font-style: italic;
	}

	:global(.prose hr) {
		border: none;
		border-top: 1px solid #404040;
		margin: 2.5rem 0;
	}

	:global(.prose table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.5rem 0;
	}

	:global(.prose th) {
		background: #262626;
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: 600;
		border-bottom: 2px solid #525252;
		color: #fafafa;
	}

	:global(.prose td) {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #404040;
		color: #d4d4d4;
	}

	:global(.prose tr:hover td) {
		background: #262626;
	}

	:global(.prose strong) {
		color: #fafafa;
		font-weight: 600;
	}

	:global(.prose em) {
		color: #e5e5e5;
	}

	/* Syntax highlighting hints for code blocks */
	:global(.prose pre code .comment) {
		color: #737373;
	}

	:global(.prose pre code .keyword) {
		color: #c084fc;
	}

	:global(.prose pre code .string) {
		color: #34d399;
	}

	/* Mermaid diagram styling */
	:global(.mermaid-diagram) {
		background: #171717;
		border: 1px solid #404040;
		border-radius: 0.5rem;
		padding: 1.5rem;
		margin: 1.5rem 0;
		overflow-x: auto;
	}

	:global(.mermaid-diagram svg) {
		max-width: 100%;
		height: auto;
		display: block;
		margin: 0 auto;
	}
</style>

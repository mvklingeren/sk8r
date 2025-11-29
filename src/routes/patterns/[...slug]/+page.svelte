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
				primaryTextColor: '#f9fafb',
				primaryBorderColor: '#60a5fa',
				lineColor: '#6b7280',
				secondaryColor: '#1f2937',
				tertiaryColor: '#111827',
				background: '#030712',
				mainBkg: '#1f2937',
				secondBkg: '#111827',
				nodeBorder: '#4b5563',
				clusterBkg: '#1f2937',
				clusterBorder: '#374151',
				titleColor: '#f9fafb',
				edgeLabelBackground: '#1f2937'
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

<div class="min-h-screen bg-gray-950">
	<!-- Header -->
	<header class="sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-800">
		<div class="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
			<a 
				href="/" 
				class="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
			>
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
	<main class="max-w-4xl mx-auto px-6 py-8">
		<article class="prose prose-invert prose-lg max-w-none">
			{@html data.html}
		</article>
	</main>
</div>

<style>
	/* Custom prose styling for dark theme */
	:global(.prose) {
		--tw-prose-body: #d1d5db;
		--tw-prose-headings: #f9fafb;
		--tw-prose-lead: #9ca3af;
		--tw-prose-links: #60a5fa;
		--tw-prose-bold: #f9fafb;
		--tw-prose-counters: #9ca3af;
		--tw-prose-bullets: #6b7280;
		--tw-prose-hr: #374151;
		--tw-prose-quotes: #f3f4f6;
		--tw-prose-quote-borders: #4b5563;
		--tw-prose-captions: #9ca3af;
		--tw-prose-code: #f9fafb;
		--tw-prose-pre-code: #e5e7eb;
		--tw-prose-pre-bg: #1f2937;
		--tw-prose-th-borders: #4b5563;
		--tw-prose-td-borders: #374151;
	}

	:global(.prose h1) {
		font-size: 2.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #374151;
		color: #f9fafb;
	}

	:global(.prose h2) {
		font-size: 1.75rem;
		font-weight: 600;
		margin-top: 3rem;
		margin-bottom: 1rem;
		color: #f9fafb;
	}

	:global(.prose h3) {
		font-size: 1.35rem;
		font-weight: 600;
		margin-top: 2rem;
		margin-bottom: 0.75rem;
		color: #e5e7eb;
	}

	:global(.prose p) {
		margin-bottom: 1.25rem;
		line-height: 1.75;
		color: #d1d5db;
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
		background: #1f2937;
		padding: 0.2em 0.4em;
		border-radius: 0.25rem;
		font-size: 0.875em;
		color: #fbbf24;
	}

	:global(.prose pre) {
		background: #111827;
		border: 1px solid #374151;
		border-radius: 0.5rem;
		padding: 1.25rem;
		overflow-x: auto;
		margin: 1.5rem 0;
	}

	:global(.prose pre code) {
		background: transparent;
		padding: 0;
		color: #e5e7eb;
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
		color: #d1d5db;
	}

	:global(.prose blockquote) {
		border-left: 4px solid #4b5563;
		padding-left: 1rem;
		margin: 1.5rem 0;
		color: #9ca3af;
		font-style: italic;
	}

	:global(.prose hr) {
		border: none;
		border-top: 1px solid #374151;
		margin: 2.5rem 0;
	}

	:global(.prose table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1.5rem 0;
	}

	:global(.prose th) {
		background: #1f2937;
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: 600;
		border-bottom: 2px solid #4b5563;
		color: #f9fafb;
	}

	:global(.prose td) {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #374151;
		color: #d1d5db;
	}

	:global(.prose tr:hover td) {
		background: #1f2937;
	}

	:global(.prose strong) {
		color: #f9fafb;
		font-weight: 600;
	}

	:global(.prose em) {
		color: #e5e7eb;
	}

	/* Syntax highlighting hints for code blocks */
	:global(.prose pre code .comment) {
		color: #6b7280;
	}

	:global(.prose pre code .keyword) {
		color: #c084fc;
	}

	:global(.prose pre code .string) {
		color: #34d399;
	}

	/* Mermaid diagram styling */
	:global(.mermaid-diagram) {
		background: #111827;
		border: 1px solid #374151;
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


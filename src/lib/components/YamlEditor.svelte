<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertCircle, Check, Copy, CheckCheck } from 'lucide-svelte';

	interface Props {
		value: string;
		readonly?: boolean;
		onChange?: (value: string) => void;
		height?: string;
	}

	let { value = '', readonly = false, onChange, height = '400px' }: Props = $props();

	let highlighter: any = $state(null);
	let yamlModule: any = $state(null);
	let highlightedHtml = $state('');
	let error = $state<{ message: string; line?: number } | null>(null);
	let textareaRef = $state<HTMLTextAreaElement | null>(null);
	let preRef = $state<HTMLPreElement | null>(null);
	let copied = $state(false);

	// Line numbers
	let lineCount = $derived(value.split('\n').length);
	let lineNumbers = $derived(Array.from({ length: lineCount }, (_, i) => i + 1));

	// Initialize Shiki highlighter and yaml module
	onMount(async () => {
		try {
			// Dynamically import shiki and js-yaml to avoid SSR issues
			const [shikiModule, yaml] = await Promise.all([
				import('shiki'),
				import('js-yaml')
			]);
			yamlModule = yaml;
			highlighter = await shikiModule.createHighlighter({
				themes: ['github-dark'],
				langs: ['yaml']
			});
			updateHighlight();
		} catch (err) {
			console.error('Failed to initialize Shiki:', err);
		}
	});

	// Update syntax highlighting when value changes
	$effect(() => {
		if (highlighter && value !== undefined) {
			updateHighlight();
		}
	});

	function updateHighlight() {
		if (!highlighter) return;

		try {
			highlightedHtml = highlighter.codeToHtml(value, {
				lang: 'yaml',
				theme: 'github-dark'
			});
			
			// Validate YAML
			validateYaml(value);
		} catch (err) {
			console.error('Highlight error:', err);
		}
	}

	function validateYaml(content: string) {
		if (!content.trim()) {
			error = null;
			return true;
		}

		if (!yamlModule) {
			// YAML module not loaded yet
			return true;
		}

		try {
			yamlModule.loadAll(content);
			error = null;
			return true;
		} catch (err: any) {
			if (err?.name === 'YAMLException') {
				error = {
					message: err.message,
					line: err.mark?.line ? err.mark.line + 1 : undefined
				};
			} else {
				error = {
					message: err instanceof Error ? err.message : 'Invalid YAML'
				};
			}
			return false;
		}
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		const newValue = target.value;
		
		if (onChange) {
			onChange(newValue);
		}
	}

	function handleScroll(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		if (preRef) {
			preRef.scrollTop = target.scrollTop;
			preRef.scrollLeft = target.scrollLeft;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		// Handle Tab key for indentation
		if (e.key === 'Tab') {
			e.preventDefault();
			const target = e.target as HTMLTextAreaElement;
			const start = target.selectionStart;
			const end = target.selectionEnd;
			
			const newValue = value.substring(0, start) + '  ' + value.substring(end);
			
			if (onChange) {
				onChange(newValue);
			}
			
			// Restore cursor position
			requestAnimationFrame(() => {
				target.selectionStart = target.selectionEnd = start + 2;
			});
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(value);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	export function getValue(): string {
		return value;
	}

	export function isValid(): boolean {
		return validateYaml(value);
	}

	export function getError(): { message: string; line?: number } | null {
		return error;
	}
</script>

<div class="yaml-editor rounded-lg overflow-hidden border border-gray-700 bg-gray-900" style="height: {height}">
	<!-- Toolbar -->
	<div class="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
		<div class="flex items-center gap-2">
			<span class="text-xs text-gray-400 font-mono">YAML</span>
			{#if error}
				<div class="flex items-center gap-1 text-xs text-red-400">
					<AlertCircle size={12} />
					<span>Line {error.line || '?'}: {error.message.split('\n')[0]}</span>
				</div>
			{:else if value.trim()}
				<div class="flex items-center gap-1 text-xs text-green-400">
					<Check size={12} />
					<span>Valid YAML</span>
				</div>
			{/if}
		</div>
		
		<button
			onclick={copyToClipboard}
			class="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-200"
			title="Copy to clipboard"
		>
			{#if copied}
				<CheckCheck size={14} class="text-green-400" />
			{:else}
				<Copy size={14} />
			{/if}
		</button>
	</div>

	<!-- Editor area -->
	<div class="editor-container relative flex" style="height: calc(100% - 40px)">
		<!-- Line numbers -->
		<div class="line-numbers flex-shrink-0 bg-gray-900 text-gray-600 text-right pr-3 pl-3 py-3 select-none overflow-hidden border-r border-gray-800">
			{#each lineNumbers as num}
				<div 
					class="leading-6 text-xs font-mono {error?.line === num ? 'text-red-400 bg-red-900/30' : ''}"
				>
					{num}
				</div>
			{/each}
		</div>

		<!-- Code area with overlay -->
		<div class="code-area flex-1 relative overflow-hidden">
			<!-- Syntax highlighted background -->
			<pre
				bind:this={preRef}
				class="highlighted-code absolute inset-0 m-0 p-3 overflow-auto pointer-events-none"
			>
				{#if highlightedHtml}
					{@html highlightedHtml}
				{:else}
					<code class="text-gray-300">{value}</code>
				{/if}
			</pre>

			<!-- Transparent textarea for editing -->
			{#if !readonly}
				<textarea
					bind:this={textareaRef}
					{value}
					oninput={handleInput}
					onscroll={handleScroll}
					onkeydown={handleKeyDown}
					class="absolute inset-0 w-full h-full p-3 bg-transparent text-transparent caret-white resize-none outline-none font-mono text-sm leading-6"
					spellcheck="false"
					autocomplete="off"
					autocorrect="off"
					autocapitalize="off"
				></textarea>
			{/if}
		</div>
	</div>
</div>

<style>
	.yaml-editor {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	}

	.line-numbers {
		min-width: 3rem;
	}

	.highlighted-code :global(pre) {
		margin: 0 !important;
		padding: 0 !important;
		background: transparent !important;
		font-size: 0.875rem;
		line-height: 1.5rem;
	}

	.highlighted-code :global(code) {
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
	}

	textarea {
		font-family: inherit;
		tab-size: 2;
	}

	/* Sync scrolling */
	.code-area {
		overflow: hidden;
	}

	.highlighted-code {
		overflow: auto;
	}

	textarea {
		overflow: auto;
	}

	/* Hide scrollbar on textarea but keep functionality */
	textarea::-webkit-scrollbar {
		width: 0;
		height: 0;
	}
</style>


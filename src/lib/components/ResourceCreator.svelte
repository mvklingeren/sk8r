<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { X, Plus, FileCode, Check, AlertCircle, Loader2, ChevronDown } from 'lucide-svelte';
	import YamlEditor from './YamlEditor.svelte';
	import { resourceTemplates, getEmptyTemplate, type ResourceTemplate } from '$lib/config/resourceTemplates';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSuccess?: () => void;
		initialYaml?: string;
		mode?: 'create' | 'edit';
	}

	let { isOpen, onClose, onSuccess, initialYaml, mode = 'create' }: Props = $props();

	let yamlContent = $state(initialYaml || getEmptyTemplate());
	let selectedTemplate = $state<string | null>(null);
	let isSubmitting = $state(false);
	let isDryRunning = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let showTemplates = $state(true);

	let editorRef: { getValue: () => string; isValid: () => boolean; getError: () => { message: string; line?: number } | null };

	// Group templates by category
	const templateGroups = [
		{
			name: 'Workloads',
			templates: resourceTemplates.filter(t => ['Pod', 'Deployment', 'StatefulSet', 'Job', 'CronJob'].includes(t.kind))
		},
		{
			name: 'Networking',
			templates: resourceTemplates.filter(t => ['Service', 'Ingress', 'NetworkPolicy'].includes(t.kind))
		},
		{
			name: 'Configuration',
			templates: resourceTemplates.filter(t => ['ConfigMap', 'Secret'].includes(t.kind))
		},
		{
			name: 'Storage',
			templates: resourceTemplates.filter(t => ['PersistentVolumeClaim'].includes(t.kind))
		},
		{
			name: 'RBAC',
			templates: resourceTemplates.filter(t => ['ServiceAccount', 'Role', 'RoleBinding', 'Namespace'].includes(t.kind))
		},
		{
			name: 'Autoscaling',
			templates: resourceTemplates.filter(t => ['HorizontalPodAutoscaler'].includes(t.kind))
		}
	];

	function selectTemplate(template: ResourceTemplate) {
		yamlContent = template.yaml;
		selectedTemplate = template.name;
		showTemplates = false;
		error = null;
		success = null;
	}

	function handleYamlChange(newValue: string) {
		yamlContent = newValue;
		error = null;
		success = null;
	}

	async function handleDryRun() {
		if (!editorRef?.isValid()) {
			const editorError = editorRef?.getError();
			error = editorError?.message || 'Invalid YAML';
			return;
		}

		isDryRunning = true;
		error = null;
		success = null;

		try {
			const response = await fetch('/api/resources', {
				method: mode === 'edit' ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ yaml: yamlContent, dryRun: true })
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Validation failed';
			} else {
				success = result.message || 'Validation successful';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Validation request failed';
		} finally {
			isDryRunning = false;
		}
	}

	async function handleSubmit() {
		if (!editorRef?.isValid()) {
			const editorError = editorRef?.getError();
			error = editorError?.message || 'Invalid YAML';
			return;
		}

		isSubmitting = true;
		error = null;
		success = null;

		try {
			const response = await fetch('/api/resources', {
				method: mode === 'edit' ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ yaml: yamlContent })
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || `Failed to ${mode} resource`;
				if (result.details) {
					error += ': ' + result.details.map((d: any) => `${d.kind}/${d.name}: ${d.error}`).join(', ');
				}
			} else {
				success = result.message || `Resource ${mode === 'edit' ? 'updated' : 'created'} successfully`;
				
				// Call success callback after a short delay
				setTimeout(() => {
					onSuccess?.();
					onClose();
				}, 1500);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : `Failed to ${mode} resource`;
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isSubmitting) {
			onClose();
		}
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
		// If editing, hide templates
		if (mode === 'edit' && initialYaml) {
			showTemplates = false;
		}
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeydown);
	});

	// Reset state when opened
	$effect(() => {
		if (isOpen) {
			if (initialYaml) {
				yamlContent = initialYaml;
				showTemplates = false;
			} else {
				yamlContent = getEmptyTemplate();
				showTemplates = true;
			}
			selectedTemplate = null;
			error = null;
			success = null;
		}
	});
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-black/50 z-40"
		onclick={() => !isSubmitting && onClose()}
		role="button"
		tabindex="-1"
		onkeydown={(e) => e.key === 'Enter' && !isSubmitting && onClose()}
	></div>

	<!-- Modal -->
	<div class="fixed inset-4 md:inset-8 lg:inset-16 bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
		<!-- Header -->
		<div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
					{#if mode === 'edit'}
						<FileCode size={20} class="text-blue-600 dark:text-blue-400" />
					{:else}
						<Plus size={20} class="text-blue-600 dark:text-blue-400" />
					{/if}
				</div>
				<div>
					<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
						{mode === 'edit' ? 'Edit Resource' : 'Create Resource'}
					</h2>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{mode === 'edit' ? 'Modify the YAML and apply changes' : 'Choose a template or write YAML from scratch'}
					</p>
				</div>
			</div>

			<button
				onclick={onClose}
				disabled={isSubmitting}
				class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
				title="Close (Esc)"
			>
				<X size={20} class="text-gray-500" />
			</button>
		</div>

		<!-- Content -->
		<div class="flex-1 flex overflow-hidden">
			<!-- Templates sidebar (only in create mode) -->
			{#if mode === 'create'}
				<div class="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
					<button
						onclick={() => showTemplates = !showTemplates}
						class="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
					>
						<span>Templates</span>
						<ChevronDown size={16} class="transform transition-transform {showTemplates ? 'rotate-180' : ''}" />
					</button>
					
					{#if showTemplates}
						<div class="flex-1 overflow-y-auto">
							{#each templateGroups as group}
								{#if group.templates.length > 0}
									<div class="px-3 py-2">
										<div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
											{group.name}
										</div>
										{#each group.templates as template}
											<button
												onclick={() => selectTemplate(template)}
												class="w-full text-left px-3 py-2 text-sm rounded-md transition-colors {selectedTemplate === template.name ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
											>
												<div class="font-medium">{template.name}</div>
												<div class="text-xs text-gray-500 dark:text-gray-400 truncate">{template.description}</div>
											</button>
										{/each}
									</div>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Editor -->
			<div class="flex-1 flex flex-col overflow-hidden p-4">
				<YamlEditor
					bind:this={editorRef}
					value={yamlContent}
					onChange={handleYamlChange}
					height="100%"
				/>
			</div>
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
			<div class="flex-1">
				{#if error}
					<div class="flex items-center gap-2 text-red-600 dark:text-red-400">
						<AlertCircle size={16} />
						<span class="text-sm">{error}</span>
					</div>
				{:else if success}
					<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
						<Check size={16} />
						<span class="text-sm">{success}</span>
					</div>
				{/if}
			</div>

			<div class="flex items-center gap-3">
				<button
					onclick={onClose}
					disabled={isSubmitting}
					class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
				>
					Cancel
				</button>
				
				<button
					onclick={handleDryRun}
					disabled={isSubmitting || isDryRunning}
					class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isDryRunning}
						<Loader2 size={14} class="animate-spin" />
					{/if}
					Validate
				</button>

				<button
					onclick={handleSubmit}
					disabled={isSubmitting}
					class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
				>
					{#if isSubmitting}
						<Loader2 size={14} class="animate-spin" />
					{/if}
					{mode === 'edit' ? 'Apply' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}


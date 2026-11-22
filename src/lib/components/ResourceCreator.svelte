<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { X, Plus, FileCode, Check, AlertCircle, Loader2, ChevronDown } from 'lucide-svelte';
	import YamlEditor from './YamlEditor.svelte';
	import {
		resourceTemplates,
		getEmptyTemplate,
		type ResourceTemplate
	} from '$lib/config/resourceTemplates';
	import { apiClient } from '$lib/utils/apiClient';

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

	let editorRef = $state<{
		getValue: () => string;
		isValid: () => boolean;
		getError: () => { message: string; line?: number } | null;
	} | null>(null);

	// Group templates by category
	const templateGroups = [
		{
			name: 'Workloads',
			templates: resourceTemplates.filter((t) =>
				['Pod', 'Deployment', 'StatefulSet', 'Job', 'CronJob'].includes(t.kind)
			)
		},
		{
			name: 'Networking',
			templates: resourceTemplates.filter((t) =>
				['Service', 'Ingress', 'NetworkPolicy'].includes(t.kind)
			)
		},
		{
			name: 'Configuration',
			templates: resourceTemplates.filter((t) => ['ConfigMap', 'Secret'].includes(t.kind))
		},
		{
			name: 'Storage',
			templates: resourceTemplates.filter((t) => ['PersistentVolumeClaim'].includes(t.kind))
		},
		{
			name: 'RBAC',
			templates: resourceTemplates.filter((t) =>
				['ServiceAccount', 'Role', 'RoleBinding', 'Namespace'].includes(t.kind)
			)
		},
		{
			name: 'Autoscaling',
			templates: resourceTemplates.filter((t) => ['HorizontalPodAutoscaler'].includes(t.kind))
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
			const response = await apiClient('/api/resources', {
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
			const response = await apiClient('/api/resources', {
				method: mode === 'edit' ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ yaml: yamlContent })
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || `Failed to ${mode} resource`;
				if (result.details) {
					error +=
						': ' +
						result.details
							.map(
								(d: { kind: string; name: string; error: string }) =>
									`${d.kind}/${d.name}: ${d.error}`
							)
							.join(', ');
				}
			} else {
				success =
					result.message || `Resource ${mode === 'edit' ? 'updated' : 'created'} successfully`;

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
		class="fixed inset-0 z-40 bg-black/50"
		onclick={() => !isSubmitting && onClose()}
		role="button"
		tabindex="-1"
		onkeydown={(e) => e.key === 'Enter' && !isSubmitting && onClose()}
	></div>

	<!-- Modal -->
	<div
		class="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl md:inset-8 lg:inset-16 dark:bg-neutral-900"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-neutral-700"
		>
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
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
					<p class="text-sm text-gray-500 dark:text-neutral-400">
						{mode === 'edit'
							? 'Modify the YAML and apply changes'
							: 'Choose a template or write YAML from scratch'}
					</p>
				</div>
			</div>

			<button
				onclick={onClose}
				disabled={isSubmitting}
				class="rounded-lg p-2 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-neutral-800"
				title="Close (Esc)"
			>
				<X size={20} class="text-gray-500" />
			</button>
		</div>

		<!-- Content -->
		<div class="flex flex-1 overflow-hidden">
			<!-- Templates sidebar (only in create mode) -->
			{#if mode === 'create'}
				<div
					class="flex w-64 flex-col border-r border-gray-200 bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800/50"
				>
					<button
						onclick={() => (showTemplates = !showTemplates)}
						class="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
					>
						<span>Templates</span>
						<ChevronDown
							size={16}
							class="transform transition-transform {showTemplates ? 'rotate-180' : ''}"
						/>
					</button>

					{#if showTemplates}
						<div class="flex-1 overflow-y-auto">
							{#each templateGroups as group (group.name)}
								{#if group.templates.length > 0}
									<div class="px-3 py-2">
										<div
											class="mb-1 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-neutral-400"
										>
											{group.name}
										</div>
										{#each group.templates as template (template.name)}
											<button
												onclick={() => selectTemplate(template)}
												class="w-full rounded-md px-3 py-2 text-left text-sm transition-colors {selectedTemplate ===
												template.name
													? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
													: 'text-gray-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-700'}"
											>
												<div class="font-medium">{template.name}</div>
												<div class="truncate text-xs text-gray-500 dark:text-neutral-400">
													{template.description}
												</div>
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
			<div class="flex flex-1 flex-col overflow-hidden p-4">
				<YamlEditor
					bind:this={editorRef}
					value={yamlContent}
					onChange={handleYamlChange}
					height="100%"
				/>
			</div>
		</div>

		<!-- Footer -->
		<div
			class="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-800/50"
		>
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
					class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-700"
				>
					Cancel
				</button>

				<button
					onclick={handleDryRun}
					disabled={isSubmitting || isDryRunning}
					class="flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
				>
					{#if isDryRunning}
						<Loader2 size={14} class="animate-spin" />
					{/if}
					Validate
				</button>

				<button
					onclick={handleSubmit}
					disabled={isSubmitting}
					class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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

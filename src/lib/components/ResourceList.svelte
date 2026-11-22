<script lang="ts">
	import {
		Trash2,
		Edit,
		RefreshCw,
		Search,
		HelpCircle,
		ExternalLink,
		X,
		ScrollText,
		Activity,
		Table,
		Terminal
	} from 'lucide-svelte';
	import type { K8sResource } from '$lib/types/k8s';
	import type { ColumnConfig } from '$lib/types/columnConfig';
	import { resourceColumnConfigs, defaultColumnConfig } from '$lib/config/resourceColumns';
	import { extractColumnValue, getAge } from '$lib/utils/columnFormatters';
	import { learningContent } from '$lib/config/navigationConfig';
	import { learningMode } from '$lib/stores/learningMode';
	import type { LearningContent } from '$lib/types/navigationConfig';

	interface Props {
		resourceType: string;
		resources: K8sResource[];
		namespace?: string;
		onEdit?: (resource: K8sResource) => void;
		onDelete?: (resource: K8sResource) => void;
		onRefresh?: () => void;
		onLogs?: (resource: K8sResource) => void;
		onExec?: (resource: K8sResource) => void;
		onEvents?: (resource: K8sResource) => void;
		hideTable?: boolean;
		onToggleEvents?: () => void;
	}

	let {
		resourceType,
		resources = [],
		namespace = 'default',
		onEdit,
		onDelete,
		onRefresh,
		onLogs,
		onExec,
		onEvents,
		hideTable = false,
		onToggleEvents
	}: Props = $props();
	let searchQuery = $state('');
	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let showLearningPanel = $state(false);
	let helpButtonRef = $state<HTMLButtonElement | null>(null);

	// Get learning content for this resource type
	let learning = $derived<LearningContent | undefined>(learningContent[resourceType]);

	// Build the full documentation URL
	const DOCS_BASE_URL = 'https://kubernetes.io/docs/concepts/';
	let docsUrl = $derived(learning ? `${DOCS_BASE_URL}${learning.docsPath}` : DOCS_BASE_URL);

	// Get column configuration for this resource type
	let columns = $derived.by(() => {
		const config = resourceColumnConfigs[resourceType] || defaultColumnConfig;
		return config.columns;
	});

	// Cluster-scoped kinds (Namespaces, Nodes, ...) have no namespace, so the column would be all "N/A"
	let showNamespaceColumn = $derived(
		namespace === '*' && resources.some((r) => r.metadata.namespace)
	);

	// Calculate proportional column widths based on flex values
	// Actions column gets flex: 1, namespace column (if shown) gets flex: 1.5 (names like cert-manager)
	const NAMESPACE_FLEX = 1.5;
	let columnWidths = $derived.by(() => {
		const extraColumns = (showNamespaceColumn ? NAMESPACE_FLEX : 0) + 1; // namespace + actions
		const totalFlex = columns.reduce((sum, col) => sum + (col.flex || 1), 0) + extraColumns;

		return {
			columns: columns.map((col) => ({
				...col,
				width: `${((col.flex || 1) / totalFlex) * 100}%`
			})),
			namespaceWidth: `${(NAMESPACE_FLEX / totalFlex) * 100}%`,
			actionsWidth: `${(1 / totalFlex) * 100}%`
		};
	});

	let filteredResources = $derived.by(() => {
		let result = resources;

		// Apply search filter
		if (searchQuery) {
			result = result.filter((resource) => {
				const name = resource.metadata.name.toLowerCase();
				const ns = resource.metadata.namespace?.toLowerCase() || '';
				const query = searchQuery.toLowerCase();

				return name.includes(query) || ns.includes(query);
			});
		}

		// Apply sorting
		if (sortColumn) {
			const column = columns.find((c) => c.key === sortColumn);
			if (column) {
				result = [...result].sort((a, b) => {
					const aVal = getSortValue(a, column);
					const bVal = getSortValue(b, column);

					let comparison = 0;
					if (aVal < bVal) comparison = -1;
					else if (aVal > bVal) comparison = 1;

					return sortDirection === 'asc' ? comparison : -comparison;
				});
			} else if (sortColumn === '__namespace__') {
				// Sort by namespace
				result = [...result].sort((a, b) => {
					const aVal = a.metadata.namespace || '';
					const bVal = b.metadata.namespace || '';

					let comparison = aVal.localeCompare(bVal);
					return sortDirection === 'asc' ? comparison : -comparison;
				});
			}
		}

		return result;
	});

	// Get sortable value for comparison
	function getSortValue(resource: K8sResource, column: ColumnConfig): string | number {
		if (column.type === 'age') {
			// Sort by actual timestamp for age columns
			const timestamp = extractColumnValue(resource, column.path, column.formatter);
			return timestamp ? new Date(timestamp).getTime() : 0;
		}

		const value = extractColumnValue(resource, column.path, column.formatter);

		// Try to parse as number for numeric sorting
		if (typeof value === 'number') return value;
		if (typeof value === 'string') {
			const num = parseFloat(value);
			if (!isNaN(num) && value.match(/^[\d.]+$/)) return num;
		}

		return String(value ?? '').toLowerCase();
	}

	// Handle column header click for sorting
	function handleSort(columnKey: string) {
		if (sortColumn === columnKey) {
			// Toggle direction if same column
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			// New column, default to ascending
			sortColumn = columnKey;
			sortDirection = 'asc';
		}
	}

	// Function to get the display value for a column
	function getColumnValue(resource: K8sResource, column: ColumnConfig): string {
		if (column.type === 'age') {
			const timestamp = extractColumnValue(resource, column.path, column.formatter);
			return getAge(timestamp);
		}

		const value = extractColumnValue(resource, column.path, column.formatter);

		if (value === null || value === undefined) {
			return '';
		}

		return String(value);
	}

	// Function to get labels for a resource
	function getLabels(resource: K8sResource): Array<{ key: string; value: string }> {
		const labels = resource.metadata?.labels || {};
		return Object.entries(labels).map(([key, value]) => ({ key, value: value as string }));
	}

	// Function to get CSS classes for badge types
	function getBadgeClass(value: string, colorMap?: Record<string, string>): string {
		if (!colorMap) return 'bg-gray-100 text-gray-800';

		const color = colorMap[value];
		switch (color) {
			case 'green':
				return 'bg-green-100 text-green-800';
			case 'yellow':
				return 'bg-yellow-100 text-yellow-800';
			case 'red':
				return 'bg-red-100 text-red-800';
			case 'blue':
				return 'bg-blue-100 text-blue-800';
			case 'gray':
				return 'bg-gray-100 text-gray-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="relative max-w-full overflow-hidden rounded-lg bg-white shadow dark:bg-slate-800">
	<!-- Learning Panel (Jumbo) -->
	{#if showLearningPanel && learning && $learningMode}
		<div
			class="learning-panel absolute z-50 w-[640px] rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-2xl"
			style="top: 60px; right: 24px;"
			role="dialog"
			aria-labelledby="learning-title"
		>
			<!-- Close button -->
			<button
				onclick={() => (showLearningPanel = false)}
				class="absolute top-3 right-3 rounded-full p-1 text-amber-600 transition-colors hover:bg-amber-200 hover:text-amber-800"
				aria-label="Close learning panel"
			>
				<X size={20} />
			</button>

			<!-- Header with icon -->
			<div class="mb-4 flex items-start gap-4">
				<div
					class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-400 shadow-md"
				>
					<HelpCircle size={28} class="text-white" />
				</div>
				<div>
					<h3 id="learning-title" class="text-xl font-bold text-amber-900">{learning.title}</h3>
					<p class="mt-1 text-sm font-medium text-amber-700">{learning.summary}</p>
				</div>
			</div>

			<!-- Detailed explanation -->
			<div class="mb-4 rounded-lg border border-amber-200 bg-white/60 p-4">
				<p class="text-sm leading-relaxed text-gray-700">{learning.details}</p>
			</div>

			<!-- CLI Commands -->
			{#if learning.cliCommands && learning.cliCommands.length > 0}
				<div class="mb-4 rounded-lg border border-gray-700 bg-gray-900 p-4">
					<h4
						class="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-400 uppercase"
					>
						<span class="inline-block h-2 w-2 rounded-full bg-green-400"></span>
						Common CLI Commands
					</h4>
					<div class="custom-scrollbar max-h-48 space-y-2 overflow-y-auto pr-2">
						{#each learning.cliCommands as cmd (cmd.command)}
							<div class="group">
								<div class="mb-0.5 text-xs text-gray-400"># {cmd.description}</div>
								<code
									class="block cursor-pointer rounded border border-gray-700 bg-gray-800 px-2 py-1.5 font-mono text-xs text-green-400 transition-colors select-all group-hover:border-green-600"
								>
									{cmd.command}
								</code>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Documentation link -->
			<a
				href={docsUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 font-medium text-white shadow-md transition-colors hover:bg-amber-600 hover:shadow-lg"
			>
				<ExternalLink size={16} />
				Docs
			</a>

			<!-- Decorative element -->
			<div
				class="pointer-events-none absolute -right-2 -bottom-2 h-24 w-24 rounded-full bg-amber-200/30 blur-2xl"
			></div>
		</div>
	{/if}

	<div class="relative border-b border-gray-200 px-4 py-3 dark:border-slate-700">
		<div class="flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-800 capitalize dark:text-slate-100">
				{resourceType}
			</h2>
			<div class="flex items-center gap-4">
				<div class="relative">
					<Search
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500"
					/>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search resources..."
						class="rounded-md border border-gray-300 py-2 pr-4 pl-9 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-400"
					/>
				</div>

				{#if $learningMode && learning}
					<button
						bind:this={helpButtonRef}
						onclick={() => (showLearningPanel = !showLearningPanel)}
						onmouseenter={() => (showLearningPanel = true)}
						class="flex h-10 w-10 items-center justify-center rounded-md transition-all duration-200 {showLearningPanel
							? 'scale-110 bg-amber-500 text-white shadow-lg'
							: 'bg-amber-100 text-amber-600 hover:scale-105 hover:bg-amber-200'}"
						title="Learn about {resourceType}"
						aria-label="Learn about {resourceType}"
						aria-expanded={showLearningPanel}
					>
						<HelpCircle size={20} />
					</button>
				{/if}
				{#if onRefresh}
					<button
						onclick={onRefresh}
						class="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500 text-white transition-colors hover:bg-blue-600"
					>
						<RefreshCw size={16} />
					</button>
				{/if}

				{#if onToggleEvents}
					<button
						onclick={onToggleEvents}
						class="flex h-10 w-10 items-center justify-center rounded-md transition-colors {hideTable
							? 'bg-purple-500 text-white hover:bg-purple-600'
							: 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-slate-600 dark:text-slate-300 dark:hover:bg-slate-500'}"
						title={hideTable ? 'Show Table' : 'Show Events Stream'}
					>
						{#if hideTable}
							<Table size={16} />
						{:else}
							<Activity size={16} />
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>

	{#if !hideTable}
		<div class="overflow-x-auto">
			<table class="w-full" style="table-layout: fixed;">
				<thead class="bg-gray-50 dark:bg-slate-700">
					<tr>
						{#each columnWidths.columns as column (column.key)}
							<th
								class="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-slate-400 {column.sortable !==
								false
									? 'cursor-pointer transition-colors select-none hover:bg-gray-100 dark:hover:bg-slate-600'
									: ''}"
								style="width: {column.width};"
								onclick={() => column.sortable !== false && handleSort(column.key)}
							>
								<span class="flex items-center justify-between gap-2">
									<span>{column.label}</span>
									{#if column.sortable !== false}
										<span class="w-3 text-right text-gray-400">
											{#if sortColumn === column.key}
												{sortDirection === 'asc' ? '▲' : '▼'}
											{/if}
										</span>
									{/if}
								</span>
							</th>
						{/each}
						{#if showNamespaceColumn}
							<th
								class="cursor-pointer px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase transition-colors select-none hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-600"
								style="width: {columnWidths.namespaceWidth};"
								onclick={() => handleSort('__namespace__')}
							>
								<span class="flex items-center justify-between gap-2">
									<span>Namespace</span>
									<span class="w-3 text-right text-gray-400">
										{#if sortColumn === '__namespace__'}
											{sortDirection === 'asc' ? '▲' : '▼'}
										{/if}
									</span>
								</span>
							</th>
						{/if}
						<th
							class="px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-slate-400"
							style="width: {columnWidths.actionsWidth};"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
					{#each filteredResources as resource (`${resource.metadata.namespace}/${resource.metadata.name}`)}
						<tr class="transition-colors hover:bg-gray-50 dark:hover:bg-slate-700">
							{#each columnWidths.columns as column (column.key)}
								<td
									class="overflow-hidden px-4 py-1.5 text-sm text-ellipsis whitespace-nowrap"
									title={column.type === 'labels'
										? getLabels(resource)
												.map((l) => `${l.key}=${l.value}`)
												.join('\n')
										: getColumnValue(resource, column)}
								>
									{#if column.type === 'link'}
										<a
											href="/{resourceType}/{resource.metadata.name}?namespace={resource.metadata
												.namespace || 'default'}"
											class="font-medium text-blue-600 hover:text-blue-800 hover:underline"
										>
											{getColumnValue(resource, column)}
										</a>
									{:else if column.type === 'badge'}
										<span
											class="inline-flex rounded-full px-1.5 text-[11px] leading-4 font-medium {getBadgeClass(
												getColumnValue(resource, column),
												column.colorMap
											)}"
										>
											{getColumnValue(resource, column)}
										</span>
									{:else if column.type === 'labels'}
										<div class="flex gap-1 overflow-hidden">
											{#each getLabels(resource) as label (label.key)}
												<span
													class="inline-flex rounded-md bg-gray-100 px-1.5 text-[11px] leading-4 font-medium text-gray-700 dark:bg-slate-600 dark:text-slate-200"
													title="{label.key}={label.value}"
												>
													{label.key.split('/').pop()}={label.value.length > 20
														? label.value.slice(0, 20) + '…'
														: label.value}
												</span>
											{/each}
											{#if getLabels(resource).length === 0}
												<span class="text-xs text-gray-400">—</span>
											{/if}
										</div>
									{:else if column.type === 'list'}
										<span class="text-gray-900 dark:text-slate-200">
											{getColumnValue(resource, column)}
										</span>
									{:else}
										<span class="text-gray-900 dark:text-slate-200">
											{getColumnValue(resource, column)}
										</span>
									{/if}
								</td>
							{/each}
							{#if showNamespaceColumn}
								<td
									class="overflow-hidden px-4 py-1.5 text-sm whitespace-nowrap text-gray-500 dark:text-slate-400"
								>
									<span
										class="inline-block max-w-full truncate rounded-full bg-blue-100 px-1.5 text-[11px] leading-4 font-medium text-blue-800"
										title={resource.metadata.namespace}
									>
										{resource.metadata.namespace || 'N/A'}
									</span>
								</td>
							{/if}
							<td class="px-4 py-1.5 text-right text-sm font-medium whitespace-nowrap">
								<div class="flex items-center justify-end gap-1.5">
									{#if onLogs}
										<button
											onclick={() => onLogs(resource)}
											class="text-cyan-600 transition-colors hover:text-cyan-900"
											title="View Logs"
										>
											<ScrollText size={14} />
										</button>
									{/if}
									{#if onExec}
										<button
											onclick={() => onExec(resource)}
											class="text-emerald-600 transition-colors hover:text-emerald-900"
											title="Open Terminal"
										>
											<Terminal size={14} />
										</button>
									{/if}
									{#if onEvents}
										<button
											onclick={() => onEvents(resource)}
											class="text-purple-600 transition-colors hover:text-purple-900"
											title="View Events"
										>
											<Activity size={14} />
										</button>
									{/if}
									{#if onEdit}
										<button
											onclick={() => onEdit(resource)}
											class="text-blue-600 transition-colors hover:text-blue-900"
											title="Edit"
										>
											<Edit size={14} />
										</button>
									{/if}
									{#if onDelete}
										<button
											onclick={() => onDelete(resource)}
											class="text-red-600 transition-colors hover:text-red-900"
											title="Delete"
										>
											<Trash2 size={14} />
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			{#if filteredResources.length === 0}
				<div class="py-12 text-center text-gray-500 dark:text-slate-400">
					{#if searchQuery}
						No resources found matching "{searchQuery}"
					{:else}
						No {resourceType} found
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: #1f2937;
		border-radius: 3px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #4b5563;
		border-radius: 3px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #6b7280;
	}
	.custom-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: #4b5563 #1f2937;
	}
</style>

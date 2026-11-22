<script module lang="ts">
	/** Relative range (start === null) or absolute range; end === null means "now". Unix seconds. */
	export interface TimeRange {
		minutes: number;
		start: number | null;
		end: number | null;
	}

	// 0 = custom
	const timeRangeOptions = [
		{ value: 5, label: '5m' },
		{ value: 15, label: '15m' },
		{ value: 30, label: '30m' },
		{ value: 60, label: '1h' },
		{ value: 180, label: '3h' },
		{ value: 360, label: '6h' },
		{ value: 720, label: '12h' },
		{ value: 1440, label: '24h' },
		{ value: 0, label: 'Custom' }
	];

	const TIME_RANGE_STORAGE_KEY = 'dashboard-time-range';
	const CUSTOM_RANGE_STORAGE_KEY = 'dashboard-custom-range';

	export function loadStoredRange(): TimeRange {
		const fallback = { minutes: 30, start: null, end: null };
		try {
			const minutes = parseInt(localStorage.getItem(TIME_RANGE_STORAGE_KEY) ?? '', 10);
			if (minutes === 0) {
				const custom = JSON.parse(localStorage.getItem(CUSTOM_RANGE_STORAGE_KEY) ?? 'null');
				if (custom?.start !== undefined) {
					return { minutes: 0, start: custom.start, end: custom.end ?? null };
				}
				return fallback;
			}
			if (timeRangeOptions.some((opt) => opt.value === minutes)) {
				return { minutes, start: null, end: null };
			}
		} catch {
			// storage unavailable or corrupt: use the default
		}
		return fallback;
	}
</script>

<script lang="ts">
	import { Clock, ChevronDown } from 'lucide-svelte';

	interface Props {
		range: TimeRange;
		onchange: () => void;
	}

	let { range = $bindable(), onchange }: Props = $props();

	let dropdownOpen = $state(false);
	let showCustomRangeModal = $state(false);
	let customStartDate = $state('');
	let customEndDate = $state('');
	let useCurrentEndTime = $state(true);

	const isCustom = $derived(range.start !== null);

	function saveRange(r: TimeRange) {
		try {
			localStorage.setItem(TIME_RANGE_STORAGE_KEY, String(r.minutes));
			if (r.start !== null) {
				localStorage.setItem(
					CUSTOM_RANGE_STORAGE_KEY,
					JSON.stringify({ start: r.start, end: r.end, useCurrentEndTime: r.end === null })
				);
			}
		} catch {
			// storage unavailable: the range still applies for this session
		}
	}

	// Format datetime-local input value
	function formatDateTimeLocal(date: Date): string {
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function formatShort(seconds: number): string {
		const d = new Date(seconds * 1000);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	const label = $derived(
		range.start !== null
			? `${formatShort(range.start)} - ${range.end === null ? 'Now' : formatShort(range.end)}`
			: (timeRangeOptions.find((opt) => opt.value === range.minutes)?.label ?? '30m')
	);

	function apply(r: TimeRange) {
		range = r;
		saveRange(r);
		onchange();
	}

	function selectTimeRange(value: number) {
		dropdownOpen = false;
		if (value === 0) {
			openCustomRangeModal();
			return;
		}
		apply({ minutes: value, start: null, end: null });
	}

	function openCustomRangeModal() {
		// Defaults: start = 1 hour ago, end = now (with "use current time" checked)
		const now = new Date();
		customEndDate = formatDateTimeLocal(now);
		customStartDate = formatDateTimeLocal(new Date(now.getTime() - 60 * 60 * 1000));
		useCurrentEndTime = true;
		showCustomRangeModal = true;
	}

	function applyCustomRange() {
		if (!customStartDate) return;
		const start = Math.floor(new Date(customStartDate).getTime() / 1000);
		let end = Math.floor(Date.now() / 1000);
		if (!useCurrentEndTime) {
			if (!customEndDate) return;
			end = Math.floor(new Date(customEndDate).getTime() / 1000);
		}
		if (start >= end) {
			alert('Start time must be before end time');
			return;
		}
		showCustomRangeModal = false;
		apply({ minutes: 0, start, end: useCurrentEndTime ? null : end });
	}

	function handleClickOutside(event: MouseEvent) {
		if (!(event.target as HTMLElement).closest('.time-range-dropdown')) {
			dropdownOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="time-range-dropdown relative">
	<button
		onclick={() => (dropdownOpen = !dropdownOpen)}
		class="flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-white transition-colors hover:bg-gray-800 dark:bg-neutral-600 dark:hover:bg-neutral-500"
	>
		<Clock size={16} />
		<span class="text-sm font-medium">{label}</span>
		<ChevronDown size={14} class="transition-transform {dropdownOpen ? 'rotate-180' : ''}" />
	</button>
	{#if dropdownOpen}
		<div
			class="absolute right-0 z-50 mt-1 w-32 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-neutral-600 dark:bg-neutral-800"
		>
			{#each timeRangeOptions as option (option.value)}
				{@const selected =
					option.value === 0 ? isCustom : !isCustom && range.minutes === option.value}
				<button
					onclick={() => selectTimeRange(option.value)}
					class="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-neutral-700 {selected
						? 'bg-gray-100 font-medium text-blue-600 dark:bg-neutral-700 dark:text-blue-400'
						: 'text-gray-700 dark:text-neutral-300'}"
				>
					{option.label}
				</button>
			{/each}
		</div>
	{/if}
</div>

{#if showCustomRangeModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-neutral-600 dark:bg-neutral-800"
		>
			<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-neutral-100">
				Custom Time Range
			</h2>

			<div class="space-y-4">
				<div>
					<label
						for="custom-start"
						class="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300"
					>
						Start Date & Time
					</label>
					<input
						id="custom-start"
						type="datetime-local"
						bind:value={customStartDate}
						class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
					/>
				</div>

				<div>
					<label
						for="custom-end"
						class="mb-1 block text-sm font-medium text-gray-700 dark:text-neutral-300"
					>
						End Date & Time
					</label>
					<input
						id="custom-end"
						type="datetime-local"
						bind:value={customEndDate}
						disabled={useCurrentEndTime}
						class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-colors outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:disabled:bg-neutral-800"
					/>
				</div>

				<div class="flex items-center gap-2">
					<input
						id="use-current-time"
						type="checkbox"
						bind:checked={useCurrentEndTime}
						class="h-4 w-4 cursor-pointer rounded border-gray-300 bg-white text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-700"
					/>
					<label
						for="use-current-time"
						class="cursor-pointer text-sm text-gray-700 select-none dark:text-neutral-300"
					>
						Use current date and time
					</label>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<button
					onclick={() => (showCustomRangeModal = false)}
					class="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
				>
					Cancel
				</button>
				<button
					onclick={applyCustomRange}
					class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
				>
					Apply
				</button>
			</div>
		</div>
	</div>
{/if}

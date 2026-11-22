<script module lang="ts">
	export interface CardValue {
		value: number;
		status?: number;
		loading: boolean;
		error?: string;
	}
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Server,
		Box,
		Rocket,
		Folder,
		Globe,
		HardDrive,
		Activity,
		TrendingUp,
		Minus,
		AlertTriangle,
		CheckCircle2,
		LoaderCircle
	} from 'lucide-svelte';
	import type { DashboardCardConfig } from '$lib/config/dashboardConfig';

	interface Props {
		card: DashboardCardConfig;
		data: CardValue;
	}

	let { card, data }: Props = $props();

	const iconMap: Record<string, typeof Server> = {
		server: Server,
		box: Box,
		rocket: Rocket,
		folder: Folder,
		globe: Globe,
		'hard-drive': HardDrive,
		activity: Activity
	};

	function formatValue(value: number, format: string): string {
		switch (format) {
			case 'percentage':
				return `${value.toFixed(1)}%`;
			case 'bytes': {
				const units = ['B', 'KB', 'MB', 'GB', 'TB'];
				let size = value;
				let unitIndex = 0;
				while (size >= 1024 && unitIndex < units.length - 1) {
					size /= 1024;
					unitIndex++;
				}
				return `${size.toFixed(1)} ${units[unitIndex]}`;
			}
			case 'duration': {
				const hours = Math.floor(value / 3600);
				const minutes = Math.floor((value % 3600) / 60);
				return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
			}
			default:
				return value.toLocaleString();
		}
	}

	function getStatusIndicator(card: DashboardCardConfig, data: { value: number; status?: number }) {
		if (data.status === undefined) return null;

		const healthy = data.status;
		const total = data.value;

		if (total === 0) return { icon: Minus, color: 'text-gray-400', text: 'No data' };

		const ratio = healthy / total;
		if (ratio >= 1)
			return { icon: CheckCircle2, color: 'text-green-500', text: `${healthy}/${total} healthy` };
		if (ratio >= 0.8)
			return { icon: TrendingUp, color: 'text-yellow-500', text: `${healthy}/${total} healthy` };
		return { icon: AlertTriangle, color: 'text-red-500', text: `${healthy}/${total} healthy` };
	}

	const Icon = $derived(iconMap[card.icon] || Box);
	const statusIndicator = $derived(getStatusIndicator(card, data));
</script>

<button
	onclick={() => card.link && goto(card.link)}
	class="dashboard-card group cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition-all hover:scale-105 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-900/30"
	data-color={card.color}
>
	<div class="flex items-start justify-between gap-3">
		<div class="flex min-w-0 flex-1 items-start gap-3">
			<div class="flex-shrink-0 rounded-md bg-white/60 p-1.5 dark:bg-neutral-800/60">
				<Icon size={16} class="group-hover-icon text-gray-500 dark:text-neutral-400" />
			</div>

			<div class="min-w-0 flex-1 space-y-0.5">
				<p
					class="truncate text-[10px] font-medium tracking-wide text-gray-500 uppercase dark:text-neutral-400"
				>
					{card.title}
				</p>
				{#if data.loading}
					<div class="h-6 w-16 animate-pulse rounded bg-gray-200 dark:bg-neutral-600"></div>
				{:else if data.error}
					<p class="h-6 text-xl leading-6 font-bold text-red-500">Error</p>
				{:else}
					<p
						class="group-hover-text h-6 truncate text-xl leading-6 font-bold text-gray-900 dark:text-neutral-100"
					>
						{formatValue(data.value, card.format)}
					</p>
				{/if}
				<p class="h-3 truncate text-[10px] text-gray-500 dark:text-neutral-400">
					{statusIndicator && !data.loading ? statusIndicator.text : ''}
				</p>
			</div>
		</div>

		<div class="flex-shrink-0">
			{#if data.loading}
				<LoaderCircle size={14} class="animate-spin text-gray-400 dark:text-neutral-500" />
			{:else if statusIndicator}
				{@const StatusIcon = statusIndicator.icon}
				<StatusIcon size={14} class={statusIndicator.color} />
			{/if}
		</div>
	</div>
</button>

<style>
	.dashboard-card {
		position: relative;
		overflow: hidden;
	}

	.dashboard-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: linear-gradient(90deg, transparent, currentColor, transparent);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.dashboard-card:hover::before {
		opacity: 0.3;
	}

	/* Hover color styles */
	:global(.dashboard-card[data-color='blue']:hover) {
		background-color: rgb(239 246 255);
		border-color: rgb(191 219 254);
	}

	:global(.dark .dashboard-card[data-color='blue']:hover) {
		background-color: rgb(30 58 138 / 0.3);
		border-color: rgb(29 78 216);
	}

	:global(.dashboard-card[data-color='blue']:hover .group-hover-icon) {
		color: rgb(59 130 246);
	}

	:global(.dark .dashboard-card[data-color='blue']:hover .group-hover-icon) {
		color: rgb(96 165 250);
	}

	:global(.dashboard-card[data-color='blue']:hover .group-hover-text) {
		color: rgb(30 64 175);
	}

	:global(.dark .dashboard-card[data-color='blue']:hover .group-hover-text) {
		color: rgb(219 234 254);
	}

	:global(.dashboard-card[data-color='green']:hover) {
		background-color: rgb(240 253 244);
		border-color: rgb(187 247 208);
	}

	:global(.dark .dashboard-card[data-color='green']:hover) {
		background-color: rgb(20 83 45 / 0.3);
		border-color: rgb(34 197 94);
	}

	:global(.dashboard-card[data-color='green']:hover .group-hover-icon) {
		color: rgb(34 197 94);
	}

	:global(.dark .dashboard-card[data-color='green']:hover .group-hover-icon) {
		color: rgb(74 222 128);
	}

	:global(.dashboard-card[data-color='green']:hover .group-hover-text) {
		color: rgb(20 83 45);
	}

	:global(.dark .dashboard-card[data-color='green']:hover .group-hover-text) {
		color: rgb(220 252 231);
	}

	:global(.dashboard-card[data-color='yellow']:hover) {
		background-color: rgb(254 252 232);
		border-color: rgb(254 240 138);
	}

	:global(.dark .dashboard-card[data-color='yellow']:hover) {
		background-color: rgb(113 63 18 / 0.3);
		border-color: rgb(202 138 4);
	}

	:global(.dashboard-card[data-color='yellow']:hover .group-hover-icon) {
		color: rgb(234 179 8);
	}

	:global(.dark .dashboard-card[data-color='yellow']:hover .group-hover-icon) {
		color: rgb(250 204 21);
	}

	:global(.dashboard-card[data-color='yellow']:hover .group-hover-text) {
		color: rgb(113 63 18);
	}

	:global(.dark .dashboard-card[data-color='yellow']:hover .group-hover-text) {
		color: rgb(254 249 195);
	}

	:global(.dashboard-card[data-color='red']:hover) {
		background-color: rgb(254 242 242);
		border-color: rgb(254 202 202);
	}

	:global(.dark .dashboard-card[data-color='red']:hover) {
		background-color: rgb(127 29 29 / 0.3);
		border-color: rgb(185 28 28);
	}

	:global(.dashboard-card[data-color='red']:hover .group-hover-icon) {
		color: rgb(239 68 68);
	}

	:global(.dark .dashboard-card[data-color='red']:hover .group-hover-icon) {
		color: rgb(248 113 113);
	}

	:global(.dashboard-card[data-color='red']:hover .group-hover-text) {
		color: rgb(127 29 29);
	}

	:global(.dark .dashboard-card[data-color='red']:hover .group-hover-text) {
		color: rgb(254 226 226);
	}

	:global(.dashboard-card[data-color='purple']:hover) {
		background-color: rgb(250 245 255);
		border-color: rgb(233 213 255);
	}

	:global(.dark .dashboard-card[data-color='purple']:hover) {
		background-color: rgb(88 28 135 / 0.3);
		border-color: rgb(147 51 234);
	}

	:global(.dashboard-card[data-color='purple']:hover .group-hover-icon) {
		color: rgb(168 85 247);
	}

	:global(.dark .dashboard-card[data-color='purple']:hover .group-hover-icon) {
		color: rgb(192 132 252);
	}

	:global(.dashboard-card[data-color='purple']:hover .group-hover-text) {
		color: rgb(88 28 135);
	}

	:global(.dark .dashboard-card[data-color='purple']:hover .group-hover-text) {
		color: rgb(243 232 255);
	}

	:global(.dashboard-card[data-color='cyan']:hover) {
		background-color: rgb(236 254 255);
		border-color: rgb(165 243 252);
	}

	:global(.dark .dashboard-card[data-color='cyan']:hover) {
		background-color: rgb(22 78 99 / 0.3);
		border-color: rgb(14 116 144);
	}

	:global(.dashboard-card[data-color='cyan']:hover .group-hover-icon) {
		color: rgb(6 182 212);
	}

	:global(.dark .dashboard-card[data-color='cyan']:hover .group-hover-icon) {
		color: rgb(34 211 238);
	}

	:global(.dashboard-card[data-color='cyan']:hover .group-hover-text) {
		color: rgb(22 78 99);
	}

	:global(.dark .dashboard-card[data-color='cyan']:hover .group-hover-text) {
		color: rgb(207 250 254);
	}

	:global(.dashboard-card[data-color='orange']:hover) {
		background-color: rgb(255 247 237);
		border-color: rgb(254 215 170);
	}

	:global(.dark .dashboard-card[data-color='orange']:hover) {
		background-color: rgb(154 52 18 / 0.3);
		border-color: rgb(194 65 12);
	}

	:global(.dashboard-card[data-color='orange']:hover .group-hover-icon) {
		color: rgb(249 115 22);
	}

	:global(.dark .dashboard-card[data-color='orange']:hover .group-hover-icon) {
		color: rgb(251 146 60);
	}

	:global(.dashboard-card[data-color='orange']:hover .group-hover-text) {
		color: rgb(154 52 18);
	}

	:global(.dark .dashboard-card[data-color='orange']:hover .group-hover-text) {
		color: rgb(255 237 213);
	}

	:global(.dashboard-card[data-color='gray']:hover) {
		background-color: rgb(249 250 251);
		border-color: rgb(229 231 235);
	}

	:global(.dark .dashboard-card[data-color='gray']:hover) {
		background-color: rgb(17 24 39 / 0.3);
		border-color: rgb(55 65 81);
	}

	:global(.dashboard-card[data-color='gray']:hover .group-hover-icon) {
		color: rgb(107 114 128);
	}

	:global(.dark .dashboard-card[data-color='gray']:hover .group-hover-icon) {
		color: rgb(156 163 175);
	}

	:global(.dashboard-card[data-color='gray']:hover .group-hover-text) {
		color: rgb(17 24 39);
	}

	:global(.dark .dashboard-card[data-color='gray']:hover .group-hover-text) {
		color: rgb(243 244 246);
	}
</style>

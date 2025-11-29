<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import 'chartjs-adapter-date-fns';
	import type { MetricChartConfig, MetricSeries } from '$lib/types/metricsTypes';

	interface Props {
		config: MetricChartConfig;
		data: MetricSeries[];
		class?: string;
	}

	let { config, data = $bindable(), class: className = '' }: Props = $props();

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	function formatValue(value: number, unit?: string): string {
		switch (unit) {
			case 'percentage':
				return `${value.toFixed(1)}%`;
			case 'bytes':
				// Convert to human-readable format
				const units = ['B', 'KB', 'MB', 'GB', 'TB'];
				let size = value;
				let unitIndex = 0;
				while (size >= 1024 && unitIndex < units.length - 1) {
					size /= 1024;
					unitIndex++;
				}
				return `${size.toFixed(2)} ${units[unitIndex]}`;
			case 'cores':
				return `${value.toFixed(2)} cores`;
			default:
				return value.toFixed(2);
		}
	}

	function createChart() {
		if (!canvas || !data || data.length === 0) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Destroy existing chart if any
		if (chart) {
			chart.destroy();
		}

		// Helper to convert color to rgba with opacity
		function colorToRgba(color: string, opacity: number): string {
			// Handle rgb() format - extract values and rebuild as rgba
			const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
			if (rgbMatch) {
				return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
			}
			// Handle rgba() format - replace existing opacity
			const rgbaMatch = color.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)$/);
			if (rgbaMatch) {
				return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${opacity})`;
			}
			// Handle hex format
			if (color.startsWith('#')) {
				const hex = color.slice(1);
				const r = parseInt(hex.slice(0, 2), 16);
				const g = parseInt(hex.slice(2, 4), 16);
				const b = parseInt(hex.slice(4, 6), 16);
				return `rgba(${r}, ${g}, ${b}, ${opacity})`;
			}
			// Handle hsl format
			const hslMatch = color.match(/^hsl\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)$/);
			if (hslMatch) {
				return `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${opacity})`;
			}
			// Fallback - return original color (Chart.js might handle it)
			return color;
		}

		// Prepare datasets
		const datasets = data.map((series, index) => {
			// Use series-specific color if provided, otherwise fall back to config color or generate one
			const seriesColor = series.color || config.color || `hsl(${index * 120}, 70%, 50%)`;
			const shouldFill = config.fill === true || config.type === 'area';
			return {
				label: series.label,
				data: series.data.map(point => ({
					x: point.timestamp,
					y: point.value
				})),
				borderColor: seriesColor,
				backgroundColor: shouldFill 
					? colorToRgba(seriesColor, 0.15) // 15% opacity for a subtle fill
					: seriesColor,
				borderWidth: 2,
				fill: shouldFill ? 'origin' : false, // Fill to the x-axis (origin)
				tension: 0.4,
				pointRadius: 0,
				pointHoverRadius: 4
			};
		});

		// Chart configuration
		chart = new Chart(ctx, {
			type: config.type === 'area' ? 'line' : config.type,
			data: { datasets },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				plugins: {
					title: {
						display: true,
						text: config.title,
						font: {
							size: 16,
							weight: 'normal'
						},
						padding: {
							bottom: 20
						}
					},
					legend: {
						display: false
					},
					tooltip: {
						callbacks: {
							label: (context) => {
								const value = formatValue(context.parsed.y, config.unit);
								return `${context.dataset.label}: ${value}`;
							}
						}
					}
				},
				scales: {
					x: {
						type: 'time',
						time: {
							displayFormats: {
								minute: 'HH:mm',
								hour: 'HH:mm'
							}
						},
						grid: {
							display: false
						}
					},
					y: {
						beginAtZero: true,
						...config.yAxis,
						ticks: {
							callback: (value) => {
								return formatValue(value as number, config.unit);
							}
						},
						grid: {
							color: 'rgba(0, 0, 0, 0.05)'
						}
					}
				}
			}
		});
	}

	onMount(() => {
		createChart();
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
	});

	// Reactive update when data changes
	$effect(() => {
		if (data && data.length > 0 && data[0].data.length > 0 && !chart) {
			// If we have data and the chart doesn't exist yet, create it.
			createChart();
		} else if (chart && data) {
			// If the chart exists, just update it.
			chart.data.datasets.forEach((dataset, index) => {
				if (data[index]) {
					dataset.data = data[index].data.map(point => ({
						x: point.timestamp,
						y: point.value
					}));
				}
			});
			chart.update('none'); // Update without animation for smooth real-time updates
		}
	});
</script>

<div class="chart-container {className}" style="height: {config.height || 300}px;">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-container {
		position: relative;
		width: 100%;
	}

	canvas {
		width: 100% !important;
		height: 100% !important;
	}
</style>
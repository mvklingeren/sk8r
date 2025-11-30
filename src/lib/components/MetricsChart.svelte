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
	let isDarkMode = $state(false);

	// Detect dark mode by checking for 'dark' class on document
	function checkDarkMode(): boolean {
		if (typeof document === 'undefined') return false;
		return document.documentElement.classList.contains('dark');
	}

	// Theme colors for Chart.js
	function getThemeColors() {
		return {
			text: isDarkMode ? 'rgb(226, 232, 240)' : 'rgb(107, 114, 128)', // slate-200 / gray-500
			gridLines: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
			tickColor: isDarkMode ? 'rgb(148, 163, 184)' : 'rgb(107, 114, 128)', // slate-400 / gray-500
		};
	}

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

		// Get theme-aware colors
		const themeColors = getThemeColors();

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
						color: themeColors.text,
						padding: {
							bottom: 20
						}
					},
					legend: {
						display: false
					},
					tooltip: {
						backgroundColor: isDarkMode ? 'rgb(30, 41, 59)' : 'rgba(0, 0, 0, 0.8)', // slate-800
						titleColor: isDarkMode ? 'rgb(226, 232, 240)' : 'rgb(255, 255, 255)', // slate-200
						bodyColor: isDarkMode ? 'rgb(203, 213, 225)' : 'rgb(255, 255, 255)', // slate-300
						borderColor: isDarkMode ? 'rgb(71, 85, 105)' : 'transparent', // slate-600
						borderWidth: isDarkMode ? 1 : 0,
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
								second: 'HH:mm',
								minute: 'HH:mm',
								hour: 'HH:mm'
							},
							tooltipFormat: 'HH:mm:ss'
						},
						ticks: {
							maxTicksLimit: 6,
							autoSkip: true,
							maxRotation: 0,
							color: themeColors.tickColor
						},
						grid: {
							display: false
						}
					},
					y: {
						beginAtZero: true,
						min: config.yAxis?.min,
						max: config.yAxis?.max,
						suggestedMax: config.yAxis?.suggestedMax,
						title: {
							display: !!config.yAxis?.label,
							text: config.yAxis?.label || '',
							font: {
								size: 12,
								weight: 'normal'
							},
							color: themeColors.text
						},
						ticks: {
							color: themeColors.tickColor,
							callback: (value) => {
								return formatValue(value as number, config.unit);
							}
						},
						grid: {
							color: themeColors.gridLines
						}
					}
				}
			}
		});
	}

	let themeObserver: MutationObserver | null = null;

	onMount(() => {
		// Initialize dark mode state
		isDarkMode = checkDarkMode();
		createChart();

		// Watch for theme changes on the document element
		themeObserver = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				if (mutation.attributeName === 'class') {
					const newDarkMode = checkDarkMode();
					if (newDarkMode !== isDarkMode) {
						isDarkMode = newDarkMode;
						// Recreate chart with new theme colors
						createChart();
					}
				}
			}
		});

		themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
		}
		if (themeObserver) {
			themeObserver.disconnect();
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
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import JsonTree from './JsonTree.svelte';

describe('JsonTree', () => {
	it('renders array items, not an empty []', async () => {
		render(JsonTree, { data: ['alpha', 'beta'] });
		await expect.element(page.getByText('"beta"')).toBeInTheDocument();
	});

	it('renders object keys and values', async () => {
		render(JsonTree, { data: { replicas: 3 } });
		await expect.element(page.getByText('replicas:')).toBeInTheDocument();
		await expect.element(page.getByText('3', { exact: true })).toBeInTheDocument();
	});
});

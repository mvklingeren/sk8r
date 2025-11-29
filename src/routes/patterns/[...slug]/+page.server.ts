import { error } from '@sveltejs/kit';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { marked } from 'marked';
import type { PageServerLoad } from './$types';

// Configure marked for better rendering
marked.setOptions({
	gfm: true,
	breaks: true
});

export const load: PageServerLoad = async ({ params }) => {
	const slug = params.slug;
	
	if (!slug) {
		throw error(404, 'Pattern not found');
	}

	// Sanitize the slug to prevent directory traversal
	const sanitizedSlug = slug.replace(/\.\./g, '').replace(/^\/+/, '');
	
	// Build the path to the markdown file
	const mdPath = join(process.cwd(), 'static', 'patterns', `${sanitizedSlug}.md`);

	try {
		const content = await readFile(mdPath, 'utf-8');
		
		// Extract title from first H1
		const titleMatch = content.match(/^#\s+(.+)$/m);
		const title = titleMatch ? titleMatch[1] : sanitizedSlug;
		
		// Parse markdown to HTML
		const html = await marked.parse(content);

		return {
			title,
			html,
			slug: sanitizedSlug
		};
	} catch (err) {
		console.error(`Failed to load pattern: ${mdPath}`, err);
		throw error(404, `Pattern "${sanitizedSlug}" not found`);
	}
};


import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import { getTemplateByKind, resourceTemplates } from './resourceTemplates';

describe('resourceTemplates', () => {
	it.each(resourceTemplates.map((t) => [t.kind, t] as const))(
		'%s template is valid YAML with matching kind',
		(kind, t) => {
			const docs = yaml.loadAll(t.yaml) as {
				apiVersion?: string;
				kind?: string;
				metadata?: { name?: string };
			}[];
			expect(docs.length).toBeGreaterThan(0);
			expect(docs[0].kind).toBe(kind);
			for (const d of docs) {
				expect(d.apiVersion).toBeTruthy();
				expect(d.metadata?.name).toBeTruthy();
			}
		}
	);

	it('looks templates up by kind', () => {
		expect(getTemplateByKind('Deployment')?.kind).toBe('Deployment');
		expect(getTemplateByKind('NoSuchKind')).toBeUndefined();
	});
});

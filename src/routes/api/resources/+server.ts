import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { KubernetesObjectApi } from '@kubernetes/client-node';
import yaml from 'js-yaml';
import { getK8sCredentials, unauthorizedResponse, createKubeConfig } from '$lib/server/k8sAuth';

interface K8sManifest {
	apiVersion: string;
	kind: string;
	metadata: {
		name: string;
		namespace?: string;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

function parseYamlManifests(yamlContent: string): K8sManifest[] {
	const documents = yaml.loadAll(yamlContent) as K8sManifest[];
	return documents.filter(doc => doc !== null && doc !== undefined);
}

function validateManifest(manifest: K8sManifest): { valid: boolean; error?: string } {
	if (!manifest.apiVersion) {
		return { valid: false, error: 'Missing required field: apiVersion' };
	}
	if (!manifest.kind) {
		return { valid: false, error: 'Missing required field: kind' };
	}
	if (!manifest.metadata?.name) {
		return { valid: false, error: 'Missing required field: metadata.name' };
	}
	return { valid: true };
}

// POST - Create new resource(s)
export const POST: RequestHandler = async ({ request }) => {
	const credentials = getK8sCredentials(request);
	if (!credentials) {
		return unauthorizedResponse();
	}

	try {
		const body = await request.json();
		const { yaml: yamlContent, dryRun } = body;

		if (!yamlContent || typeof yamlContent !== 'string') {
			return json({ error: 'YAML content is required' }, { status: 400 });
		}

		// Parse YAML
		let manifests: K8sManifest[];
		try {
			manifests = parseYamlManifests(yamlContent);
		} catch (err) {
			return json(
				{ error: `Invalid YAML: ${err instanceof Error ? err.message : 'Parse error'}` },
				{ status: 400 }
			);
		}

		if (manifests.length === 0) {
			return json({ error: 'No valid Kubernetes manifests found in YAML' }, { status: 400 });
		}

		// Validate all manifests
		for (const manifest of manifests) {
			const validation = validateManifest(manifest);
			if (!validation.valid) {
				return json(
					{ error: `Validation error in ${manifest.kind || 'resource'}: ${validation.error}` },
					{ status: 400 }
				);
			}
		}

		// If dry run, just return validation success
		if (dryRun) {
			return json({
				success: true,
				dryRun: true,
				message: `Validated ${manifests.length} resource(s)`,
				resources: manifests.map(m => ({
					kind: m.kind,
					name: m.metadata.name,
					namespace: m.metadata.namespace || 'default'
				}))
			});
		}

		// Create resources
		const kc = createKubeConfig(credentials.server, credentials.token);
		const client = KubernetesObjectApi.makeApiClient(kc);

		const results: Array<{ kind: string; name: string; namespace?: string; status: string }> = [];
		const errors: Array<{ kind: string; name: string; error: string }> = [];

		for (const manifest of manifests) {
			try {
				// Set default namespace if not specified for namespaced resources
				if (!manifest.metadata.namespace) {
					manifest.metadata.namespace = 'default';
				}

				await client.create(manifest as any);
				results.push({
					kind: manifest.kind,
					name: manifest.metadata.name,
					namespace: manifest.metadata.namespace,
					status: 'created'
				});
			} catch (err: any) {
				const errorMessage = err.body?.message || err.message || 'Unknown error';
				errors.push({
					kind: manifest.kind,
					name: manifest.metadata.name,
					error: errorMessage
				});
			}
		}

		if (errors.length > 0 && results.length === 0) {
			return json(
				{ 
					error: 'Failed to create resources', 
					details: errors 
				},
				{ status: 500 }
			);
		}

		return json({
			success: true,
			created: results,
			errors: errors.length > 0 ? errors : undefined
		});
	} catch (error) {
		console.error('Error creating resources:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
};

// PUT - Update existing resource
export const PUT: RequestHandler = async ({ request }) => {
	const credentials = getK8sCredentials(request);
	if (!credentials) {
		return unauthorizedResponse();
	}

	try {
		const body = await request.json();
		const { yaml: yamlContent, dryRun } = body;

		if (!yamlContent || typeof yamlContent !== 'string') {
			return json({ error: 'YAML content is required' }, { status: 400 });
		}

		// Parse YAML - for update, we expect a single resource
		let manifests: K8sManifest[];
		try {
			manifests = parseYamlManifests(yamlContent);
		} catch (err) {
			return json(
				{ error: `Invalid YAML: ${err instanceof Error ? err.message : 'Parse error'}` },
				{ status: 400 }
			);
		}

		if (manifests.length === 0) {
			return json({ error: 'No valid Kubernetes manifest found in YAML' }, { status: 400 });
		}

		if (manifests.length > 1) {
			return json({ error: 'Update only supports a single resource at a time' }, { status: 400 });
		}

		const manifest = manifests[0];

		// Validate manifest
		const validation = validateManifest(manifest);
		if (!validation.valid) {
			return json({ error: validation.error }, { status: 400 });
		}

		// If dry run, just return validation success
		if (dryRun) {
			return json({
				success: true,
				dryRun: true,
				message: 'Resource validated successfully',
				resource: {
					kind: manifest.kind,
					name: manifest.metadata.name,
					namespace: manifest.metadata.namespace || 'default'
				}
			});
		}

		// Update resource
		const kc = createKubeConfig(credentials.server, credentials.token);
		const client = KubernetesObjectApi.makeApiClient(kc);

		try {
			// Set default namespace if not specified
			if (!manifest.metadata.namespace) {
				manifest.metadata.namespace = 'default';
			}

			// First, read the current resource to get resourceVersion
			const current = await client.read(manifest as any) as any;
			
			// Preserve resourceVersion for optimistic concurrency
			if (current?.metadata?.resourceVersion) {
				manifest.metadata.resourceVersion = current.metadata.resourceVersion as string;
			}

			// Replace the resource
			await client.replace(manifest as any);

			return json({
				success: true,
				message: 'Resource updated successfully',
				resource: {
					kind: manifest.kind,
					name: manifest.metadata.name,
					namespace: manifest.metadata.namespace
				}
			});
		} catch (err: any) {
			const errorMessage = err.body?.message || err.message || 'Unknown error';
			return json(
				{ error: `Failed to update resource: ${errorMessage}` },
				{ status: err.statusCode || 500 }
			);
		}
	} catch (error) {
		console.error('Error updating resource:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
};

// DELETE - Delete resource
export const DELETE: RequestHandler = async ({ request }) => {
	const credentials = getK8sCredentials(request);
	if (!credentials) {
		return unauthorizedResponse();
	}

	try {
		const body = await request.json();
		const { kind, apiVersion, name, namespace = 'default' } = body;

		if (!kind || !apiVersion || !name) {
			return json(
				{ error: 'kind, apiVersion, and name are required' },
				{ status: 400 }
			);
		}

		const kc = createKubeConfig(credentials.server, credentials.token);
		const client = KubernetesObjectApi.makeApiClient(kc);

		try {
			await client.delete({
				apiVersion,
				kind,
				metadata: { name, namespace }
			} as any);

			return json({
				success: true,
				message: `${kind} "${name}" deleted successfully`
			});
		} catch (err: any) {
			const errorMessage = err.body?.message || err.message || 'Unknown error';
			return json(
				{ error: `Failed to delete resource: ${errorMessage}` },
				{ status: err.statusCode || 500 }
			);
		}
	} catch (error) {
		console.error('Error deleting resource:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
};

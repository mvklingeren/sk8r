import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { KubeConfig } from '@kubernetes/client-node';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { context } = await request.json();
		
		if (!context || typeof context !== 'string') {
			return json(
				{ error: 'Invalid context name provided' },
				{ status: 400 }
			);
		}
		
		// Load current kubeconfig
		const kc = new KubeConfig();
		kc.loadFromDefault();
		
		// Verify the context exists
		const contexts = kc.getContexts();
		const targetContext = contexts.find(ctx => ctx.name === context);
		
		if (!targetContext) {
			return json(
				{ error: `Context "${context}" not found in kubeconfig` },
				{ status: 404 }
			);
		}
		
		// Get kubeconfig path
		const kubeconfigPath = process.env.KUBECONFIG || path.join(os.homedir(), '.kube', 'config');
		
		// Read the kubeconfig file
		const kubeconfigContent = fs.readFileSync(kubeconfigPath, 'utf8');
		
		// Parse as YAML (simple approach - replace current-context line)
		// This is a safe operation as we're only changing the current-context field
		const updatedContent = kubeconfigContent.replace(
			/^current-context:\s*.+$/m,
			`current-context: ${context}`
		);
		
		// Write back to kubeconfig
		fs.writeFileSync(kubeconfigPath, updatedContent, 'utf8');
		
		// Verify the switch worked by reloading
		const verifyKc = new KubeConfig();
		verifyKc.loadFromDefault();
		
		if (verifyKc.getCurrentContext() !== context) {
			return json(
				{ error: 'Failed to verify context switch' },
				{ status: 500 }
			);
		}
		
		return json({
			success: true,
			previousContext: kc.getCurrentContext(),
			currentContext: context,
			message: `Switched to context "${context}"`
		});
	} catch (error) {
		console.error('Error switching context:', error);
		return json(
			{ 
				error: 'Failed to switch context',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};


import { exec } from 'child_process';
import { promisify } from 'util';
import type { K8sResource, K8sListResponse, ResourceFilter } from '$lib/types/k8s';

const execAsync = promisify(exec);

export class KubectlService {
	private async runKubectl(args: string[]): Promise<any> {
		try {
			const { stdout, stderr } = await execAsync(`kubectl ${args.join(' ')} -o json`);
			if (stderr) {
				console.warn('kubectl stderr:', stderr);
			}
			return JSON.parse(stdout);
		} catch (error) {
			console.error('kubectl error:', error);
			throw error;
		}
	}

	async listResources(resourceType: string, filter: ResourceFilter = {}): Promise<K8sListResponse> {
		const namespace = filter.namespace || 'default';
		const args = ['get', resourceType, '-n', namespace];
		
		if (filter.labelSelector) {
			args.push('-l', filter.labelSelector);
		}
		
		if (filter.fieldSelector) {
			args.push('--field-selector', filter.fieldSelector);
		}
		
		console.log(`Running kubectl with args:`, args);
		
		const result = await this.runKubectl(args);
		return result as K8sListResponse;
	}

	async deleteResource(resourceType: string, name: string, namespace: string = 'default'): Promise<void> {
		const args = ['delete', resourceType, name, '-n', namespace];
		await this.runKubectl(args);
	}

	async listNamespaces(): Promise<string[]> {
		const result = await this.runKubectl(['get', 'namespaces']);
		return result.items.map((ns: any) => ns.metadata.name);
	}
}
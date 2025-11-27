import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { KubeConfig, CoreV1Api } from '@kubernetes/client-node';

export const GET: RequestHandler = async () => {
	try {
		const kc = new KubeConfig();
		kc.loadFromDefault();
		
		const k8sApi = kc.makeApiClient(CoreV1Api);
		
		// Try to list namespaces first (no namespace parameter needed)
		const namespaces = await k8sApi.listNamespace();
		
		// Then try to list pods in default namespace
		const namespace = 'default';
		console.log('Testing listNamespacedPod with namespace:', namespace, 'type:', typeof namespace);
		
		// Try with all parameters explicitly
		const pods = await k8sApi.listNamespacedPod(
			'default',  // namespace
			undefined,  // pretty
			undefined,  // allowWatchBookmarks
			undefined,  // _continue
			undefined,  // fieldSelector
			undefined,  // labelSelector
			undefined,  // limit
			undefined,  // resourceVersion
			undefined,  // resourceVersionMatch
			undefined,  // timeoutSeconds
			undefined   // watch
		);
		
		return json({
			success: true,
			namespaces: namespaces.body.items.map(ns => ns.metadata?.name),
			pods: pods.body.items.map(pod => pod.metadata?.name),
			namespace: namespace,
			namespaceType: typeof namespace
		});
	} catch (error) {
		console.error('Test API error:', error);
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined
		}, { status: 500 });
	}
};
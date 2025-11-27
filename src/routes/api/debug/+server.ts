import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as k8s from '@kubernetes/client-node';

export const GET: RequestHandler = async () => {
	try {
		const kc = new k8s.KubeConfig();
		kc.loadFromDefault();
		
		const appsApi = kc.makeApiClient(k8s.AppsV1Api);
		
		// Check the function signature
		const funcString = appsApi.listNamespacedStatefulSet.toString();
		console.log('Function signature:', funcString);
		
		// Try to get parameter names
		const paramNames = funcString
			.match(/\(([^)]*)\)/)?.[1]
			.split(',')
			.map(p => p.trim());
		
		return json({
			success: true,
			functionSignature: funcString.substring(0, 200),
			parameterNames: paramNames
		});
	} catch (error) {
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
};
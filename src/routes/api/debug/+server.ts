import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as k8s from '@kubernetes/client-node';
import { getK8sCredentials, unauthorizedResponse } from '$lib/server/k8sAuth';

export const GET: RequestHandler = async ({ request }) => {
	const credentials = getK8sCredentials(request);
	if (!credentials) {
		return unauthorizedResponse();
	}

	try {
		const kc = new k8s.KubeConfig();
		kc.loadFromOptions({
			clusters: [{
				name: 'current-cluster',
				server: credentials.server,
				skipTLSVerify: true
			}],
			users: [{
				name: 'current-user',
				token: credentials.token
			}],
			contexts: [{
				name: 'current-context',
				cluster: 'current-cluster',
				user: 'current-user'
			}],
			currentContext: 'current-context'
		});
		
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

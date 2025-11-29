import type { NavigationConfig, LearningContent } from '$lib/types/navigationConfig';

// Learning content for each resource type
export const learningContent: Record<string, LearningContent> = {
	nodes: {
		title: 'Nodes',
		summary: 'A Node is a worker machine in Kubernetes — either a virtual or physical machine.',
		details: 'Nodes are the workhorses of your Kubernetes cluster. Each node contains the services necessary to run Pods and is managed by the control plane. The components on a node include the kubelet, a container runtime, and the kube-proxy. Nodes can be labeled and tainted to control Pod scheduling.',
		docsPath: 'architecture/nodes/',
		cliCommands: [
			{ description: 'List all nodes', command: 'kubectl get nodes' },
			{ description: 'Get node details', command: 'kubectl describe node <node-name>' },
			{ description: 'Show node resource usage', command: 'kubectl top node' },
			{ description: 'Add a label to a node', command: 'kubectl label node <node-name> key=value' },
			{ description: 'Cordon a node (mark unschedulable)', command: 'kubectl cordon <node-name>' },
			{ description: 'Drain a node for maintenance', command: 'kubectl drain <node-name> --ignore-daemonsets' }
		]
	},
	namespaces: {
		title: 'Namespaces',
		summary: 'Namespaces provide a mechanism for isolating groups of resources within a single cluster.',
		details: 'Namespaces are intended for use in environments with many users spread across multiple teams or projects. They provide a scope for names, allowing you to divide cluster resources between multiple users via resource quotas. Most Kubernetes resources (pods, services, etc.) are in a namespace, but some resources like nodes and persistent volumes are not.',
		docsPath: 'overview/working-with-objects/namespaces/',
		cliCommands: [
			{ description: 'List all namespaces', command: 'kubectl get namespaces' },
			{ description: 'Create a namespace', command: 'kubectl create namespace <name>' },
			{ description: 'Delete a namespace', command: 'kubectl delete namespace <name>' },
			{ description: 'Set default namespace', command: 'kubectl config set-context --current --namespace=<name>' },
			{ description: 'Get resources in all namespaces', command: 'kubectl get pods --all-namespaces' }
		]
	},
	events: {
		title: 'Events',
		summary: 'Events are records of important occurrences within the cluster.',
		details: 'Kubernetes Events report on lifecycle changes and errors in your cluster resources. They help you understand what is happening inside your cluster, such as scheduler decisions, why a pod was evicted, or why a container failed. Events are stored for a limited time (default 1 hour) and are essential for debugging and monitoring.',
		docsPath: 'reference/kubernetes-api/cluster-resources/event-v1/',
		cliCommands: [
			{ description: 'List all events', command: 'kubectl get events' },
			{ description: 'Sort events by time', command: 'kubectl get events --sort-by=.lastTimestamp' },
			{ description: 'Watch events in real-time', command: 'kubectl get events -w' },
			{ description: 'Get events for a specific resource', command: 'kubectl describe pod <pod-name>' }
		]
	},
	pods: {
		title: 'Pods',
		summary: 'Pods are the smallest deployable units of computing that you can create and manage in Kubernetes.',
		details: 'A Pod represents a single instance of a running process in your cluster. Pods contain one or more containers, such as Docker containers, with shared storage and network resources. Pods are ephemeral by nature — if a Pod fails, Kubernetes can automatically create a new replica. Pods support init containers, sidecar containers, and resource limits.',
		docsPath: 'workloads/pods/',
		cliCommands: [
			{ description: 'List all pods', command: 'kubectl get pods' },
			{ description: 'Get pod details', command: 'kubectl describe pod <pod-name>' },
			{ description: 'View pod logs', command: 'kubectl logs <pod-name>' },
			{ description: 'Follow pod logs', command: 'kubectl logs -f <pod-name>' },
			{ description: 'Execute command in pod', command: 'kubectl exec -it <pod-name> -- /bin/sh' },
			{ description: 'Delete a pod', command: 'kubectl delete pod <pod-name>' },
			{ description: 'Port forward to a pod', command: 'kubectl port-forward <pod-name> 8080:80' }
		]
	},
	deployments: {
		title: 'Deployments',
		summary: 'A Deployment provides declarative updates for Pods and ReplicaSets.',
		details: 'Deployments describe a desired state for your application, and the Deployment controller changes the actual state to match. Use Deployments to create new ReplicaSets, roll out updates, rollback to earlier versions, scale up/down, and pause/resume rollouts. Deployments support rolling updates and rollback strategies.',
		docsPath: 'workloads/controllers/deployment/',
		cliCommands: [
			{ description: 'List deployments', command: 'kubectl get deployments' },
			{ description: 'Create a deployment', command: 'kubectl create deployment <name> --image=<image>' },
			{ description: 'Scale a deployment', command: 'kubectl scale deployment <name> --replicas=3' },
			{ description: 'Update image', command: 'kubectl set image deployment/<name> <container>=<image>' },
			{ description: 'View rollout status', command: 'kubectl rollout status deployment/<name>' },
			{ description: 'Rollback deployment', command: 'kubectl rollout undo deployment/<name>' },
			{ description: 'View rollout history', command: 'kubectl rollout history deployment/<name>' }
		]
	},
	statefulsets: {
		title: 'StatefulSets',
		summary: 'StatefulSet manages stateful applications with persistent storage and stable network identities.',
		details: 'Unlike Deployments, StatefulSets maintain a sticky identity for each Pod. Pods are created from the same spec but are not interchangeable — each has a persistent identifier. StatefulSets are valuable for applications that require stable network identifiers, persistent storage, and ordered deployment/scaling (like databases).',
		docsPath: 'workloads/controllers/statefulset/',
		cliCommands: [
			{ description: 'List statefulsets', command: 'kubectl get statefulsets' },
			{ description: 'Get statefulset details', command: 'kubectl describe statefulset <name>' },
			{ description: 'Scale a statefulset', command: 'kubectl scale statefulset <name> --replicas=3' },
			{ description: 'Delete statefulset (keep pods)', command: 'kubectl delete statefulset <name> --cascade=orphan' },
			{ description: 'Restart statefulset', command: 'kubectl rollout restart statefulset/<name>' }
		]
	},
	daemonsets: {
		title: 'DaemonSets',
		summary: 'A DaemonSet ensures that all (or some) nodes run a copy of a Pod.',
		details: 'DaemonSets are perfect for cluster-wide services like log collectors, monitoring agents, or storage daemons. As nodes are added to the cluster, Pods are added to them. As nodes are removed, those Pods are garbage collected. Deleting a DaemonSet will clean up the Pods it created.',
		docsPath: 'workloads/controllers/daemonset/',
		cliCommands: [
			{ description: 'List daemonsets', command: 'kubectl get daemonsets' },
			{ description: 'Get daemonset details', command: 'kubectl describe daemonset <name>' },
			{ description: 'Update daemonset image', command: 'kubectl set image daemonset/<name> <container>=<image>' },
			{ description: 'Rollback daemonset', command: 'kubectl rollout undo daemonset/<name>' },
			{ description: 'Delete daemonset', command: 'kubectl delete daemonset <name>' }
		]
	},
	replicasets: {
		title: 'ReplicaSets',
		summary: 'A ReplicaSet maintains a stable set of replica Pods running at any given time.',
		details: 'ReplicaSets ensure that a specified number of pod replicas are running at any given time. While you can use ReplicaSets directly, Deployments are a higher-level concept that manages ReplicaSets and provides declarative updates. ReplicaSets use label selectors to identify the Pods they should manage.',
		docsPath: 'workloads/controllers/replicaset/',
		cliCommands: [
			{ description: 'List replicasets', command: 'kubectl get replicasets' },
			{ description: 'Get replicaset details', command: 'kubectl describe replicaset <name>' },
			{ description: 'Scale a replicaset', command: 'kubectl scale replicaset <name> --replicas=3' },
			{ description: 'Delete replicaset', command: 'kubectl delete replicaset <name>' }
		]
	},
	jobs: {
		title: 'Jobs',
		summary: 'A Job creates one or more Pods and ensures that a specified number of them successfully terminate.',
		details: 'Jobs are used for batch processing and one-time tasks. The Job tracks successful completions, and when a specified number of completions is reached, the Job is complete. Jobs can run multiple Pods in parallel and support different completion modes (non-parallel, parallel with fixed count, or parallel with work queue).',
		docsPath: 'workloads/controllers/job/',
		cliCommands: [
			{ description: 'List jobs', command: 'kubectl get jobs' },
			{ description: 'Create a job', command: 'kubectl create job <name> --image=<image>' },
			{ description: 'Get job details', command: 'kubectl describe job <name>' },
			{ description: 'View job logs', command: 'kubectl logs job/<name>' },
			{ description: 'Delete a job', command: 'kubectl delete job <name>' },
			{ description: 'Delete completed jobs', command: 'kubectl delete jobs --field-selector status.successful=1' }
		]
	},
	cronjobs: {
		title: 'CronJobs',
		summary: 'A CronJob creates Jobs on a repeating schedule.',
		details: 'CronJobs are useful for creating periodic and recurring tasks, like backups, report generation, or sending emails. CronJobs use the standard cron format for scheduling. They create Jobs according to the schedule, and the Jobs then create Pods to do the actual work.',
		docsPath: 'workloads/controllers/cron-jobs/',
		cliCommands: [
			{ description: 'List cronjobs', command: 'kubectl get cronjobs' },
			{ description: 'Create a cronjob', command: 'kubectl create cronjob <name> --image=<image> --schedule="*/5 * * * *"' },
			{ description: 'Get cronjob details', command: 'kubectl describe cronjob <name>' },
			{ description: 'Trigger job manually', command: 'kubectl create job <job-name> --from=cronjob/<cronjob-name>' },
			{ description: 'Suspend a cronjob', command: 'kubectl patch cronjob <name> -p \'{"spec":{"suspend":true}}\'' },
			{ description: 'Delete a cronjob', command: 'kubectl delete cronjob <name>' }
		]
	},
	services: {
		title: 'Services',
		summary: 'A Service is an abstract way to expose an application running on a set of Pods as a network service.',
		details: 'Services provide stable networking for Pods, which may be created and destroyed frequently. Kubernetes gives Pods their own IP addresses and a single DNS name for a set of Pods, and can load-balance across them. Service types include ClusterIP (internal), NodePort, LoadBalancer, and ExternalName.',
		docsPath: 'services-networking/service/',
		cliCommands: [
			{ description: 'List services', command: 'kubectl get services' },
			{ description: 'Create a service (expose deployment)', command: 'kubectl expose deployment <name> --port=80 --target-port=8080' },
			{ description: 'Get service details', command: 'kubectl describe service <name>' },
			{ description: 'Get service endpoints', command: 'kubectl get endpoints <name>' },
			{ description: 'Delete a service', command: 'kubectl delete service <name>' },
			{ description: 'Port forward to service', command: 'kubectl port-forward service/<name> 8080:80' }
		]
	},
	ingresses: {
		title: 'Ingresses',
		summary: 'Ingress exposes HTTP and HTTPS routes from outside the cluster to services within the cluster.',
		details: 'An Ingress may be configured to give Services externally-reachable URLs, load balance traffic, terminate SSL/TLS, and offer name-based virtual hosting. An Ingress controller is responsible for fulfilling the Ingress, usually with a load balancer. Common Ingress controllers include NGINX, Traefik, and HAProxy.',
		docsPath: 'services-networking/ingress/',
		cliCommands: [
			{ description: 'List ingresses', command: 'kubectl get ingress' },
			{ description: 'Create an ingress', command: 'kubectl create ingress <name> --rule="host/path=service:port"' },
			{ description: 'Get ingress details', command: 'kubectl describe ingress <name>' },
			{ description: 'Delete an ingress', command: 'kubectl delete ingress <name>' }
		]
	},
	endpoints: {
		title: 'Endpoints',
		summary: 'Endpoints track the IP addresses of Pods that a Service routes traffic to.',
		details: 'When you create a Service, Kubernetes creates an Endpoints object with the same name. This object tracks which Pods are members of the Service. The Endpoints controller updates the Endpoints object whenever the set of Pods changes. EndpointSlices are a more scalable alternative for large clusters.',
		docsPath: 'services-networking/service/#endpoints',
		cliCommands: [
			{ description: 'List endpoints', command: 'kubectl get endpoints' },
			{ description: 'Get endpoint details', command: 'kubectl describe endpoints <name>' },
			{ description: 'Get endpoints as YAML', command: 'kubectl get endpoints <name> -o yaml' }
		]
	},
	networkpolicies: {
		title: 'Network Policies',
		summary: 'NetworkPolicies control traffic flow at the IP address or port level for Pods.',
		details: 'By default, Pods are non-isolated and accept traffic from any source. NetworkPolicies allow you to specify how groups of Pods can communicate with each other and other network endpoints. They use label selectors to define ingress and egress rules. A network plugin that supports NetworkPolicy is required.',
		docsPath: 'services-networking/network-policies/',
		cliCommands: [
			{ description: 'List network policies', command: 'kubectl get networkpolicies' },
			{ description: 'Get policy details', command: 'kubectl describe networkpolicy <name>' },
			{ description: 'Delete a network policy', command: 'kubectl delete networkpolicy <name>' },
			{ description: 'Apply policy from file', command: 'kubectl apply -f networkpolicy.yaml' }
		]
	},
	configmaps: {
		title: 'ConfigMaps',
		summary: 'A ConfigMap is an API object used to store non-confidential data in key-value pairs.',
		details: 'ConfigMaps allow you to decouple environment-specific configuration from your container images, making your applications portable. Pods can consume ConfigMaps as environment variables, command-line arguments, or as configuration files in a volume. ConfigMaps are not encrypted and should not contain sensitive data.',
		docsPath: 'configuration/configmap/',
		cliCommands: [
			{ description: 'List configmaps', command: 'kubectl get configmaps' },
			{ description: 'Create from literal', command: 'kubectl create configmap <name> --from-literal=key=value' },
			{ description: 'Create from file', command: 'kubectl create configmap <name> --from-file=<path>' },
			{ description: 'Get configmap data', command: 'kubectl get configmap <name> -o yaml' },
			{ description: 'Edit configmap', command: 'kubectl edit configmap <name>' },
			{ description: 'Delete configmap', command: 'kubectl delete configmap <name>' }
		]
	},
	secrets: {
		title: 'Secrets',
		summary: 'A Secret is an object that contains a small amount of sensitive data such as passwords, tokens, or keys.',
		details: 'Secrets let you store and manage sensitive information separately from Pod definitions and container images. Kubernetes Secrets are, by default, stored unencrypted in etcd. Anyone with API access can retrieve or modify a Secret. Consider enabling encryption at rest and using RBAC to limit access.',
		docsPath: 'configuration/secret/',
		cliCommands: [
			{ description: 'List secrets', command: 'kubectl get secrets' },
			{ description: 'Create generic secret', command: 'kubectl create secret generic <name> --from-literal=key=value' },
			{ description: 'Create TLS secret', command: 'kubectl create secret tls <name> --cert=cert.pem --key=key.pem' },
			{ description: 'Decode secret value', command: 'kubectl get secret <name> -o jsonpath="{.data.<key>}" | base64 -d' },
			{ description: 'Delete secret', command: 'kubectl delete secret <name>' }
		]
	},
	persistentvolumes: {
		title: 'Persistent Volumes',
		summary: 'A PersistentVolume (PV) is a piece of storage in the cluster provisioned by an administrator or dynamically.',
		details: 'PersistentVolumes are cluster resources that exist independently of any individual Pod. They capture the details of storage implementation (NFS, iSCSI, cloud-provider-specific storage). PVs have a lifecycle independent of Pods and can be retained, recycled, or deleted when released.',
		docsPath: 'storage/persistent-volumes/',
		cliCommands: [
			{ description: 'List persistent volumes', command: 'kubectl get pv' },
			{ description: 'Get PV details', command: 'kubectl describe pv <name>' },
			{ description: 'Delete persistent volume', command: 'kubectl delete pv <name>' },
			{ description: 'Patch PV reclaim policy', command: 'kubectl patch pv <name> -p \'{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}\'' }
		]
	},
	persistentvolumeclaims: {
		title: 'Persistent Volume Claims',
		summary: 'A PersistentVolumeClaim (PVC) is a request for storage by a user.',
		details: 'PVCs allow users to consume abstract storage resources. A PVC specifies size and access modes (ReadWriteOnce, ReadOnlyMany, ReadWriteMany). The cluster finds a matching PV or dynamically provisions one. PVCs are bound to PVs in a one-to-one mapping.',
		docsPath: 'storage/persistent-volumes/#persistentvolumeclaims',
		cliCommands: [
			{ description: 'List PVCs', command: 'kubectl get pvc' },
			{ description: 'Get PVC details', command: 'kubectl describe pvc <name>' },
			{ description: 'Delete PVC', command: 'kubectl delete pvc <name>' },
			{ description: 'Expand PVC size', command: 'kubectl patch pvc <name> -p \'{"spec":{"resources":{"requests":{"storage":"10Gi"}}}}\'' }
		]
	},
	storageclasses: {
		title: 'Storage Classes',
		summary: 'A StorageClass provides a way for administrators to describe the "classes" of storage they offer.',
		details: 'Different classes might map to quality-of-service levels, backup policies, or arbitrary policies. StorageClasses enable dynamic provisioning of PersistentVolumes. Each StorageClass has a provisioner, parameters, and reclaimPolicy. A default StorageClass can be set for PVCs that don\'t specify one.',
		docsPath: 'storage/storage-classes/',
		cliCommands: [
			{ description: 'List storage classes', command: 'kubectl get storageclasses' },
			{ description: 'Get storageclass details', command: 'kubectl describe storageclass <name>' },
			{ description: 'Set default storageclass', command: 'kubectl patch storageclass <name> -p \'{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}\'' },
			{ description: 'Delete storageclass', command: 'kubectl delete storageclass <name>' }
		]
	},
	serviceaccounts: {
		title: 'Service Accounts',
		summary: 'A ServiceAccount provides an identity for processes that run in a Pod.',
		details: 'When you create a Pod, if you don\'t specify a ServiceAccount, it is automatically assigned the default ServiceAccount in the namespace. ServiceAccounts are namespaced and can be granted permissions via RBAC. Pods use ServiceAccount tokens to authenticate to the API server.',
		docsPath: 'security/service-accounts/',
		cliCommands: [
			{ description: 'List service accounts', command: 'kubectl get serviceaccounts' },
			{ description: 'Create service account', command: 'kubectl create serviceaccount <name>' },
			{ description: 'Get SA details', command: 'kubectl describe serviceaccount <name>' },
			{ description: 'Create token for SA', command: 'kubectl create token <name>' },
			{ description: 'Delete service account', command: 'kubectl delete serviceaccount <name>' }
		]
	},
	roles: {
		title: 'Roles',
		summary: 'A Role contains rules that represent a set of permissions within a namespace.',
		details: 'Roles define what actions (verbs) can be performed on which resources within a specific namespace. Common verbs include get, list, watch, create, update, patch, and delete. Roles are used with RoleBindings to grant permissions to users, groups, or ServiceAccounts.',
		docsPath: 'security/rbac/#role-and-clusterrole',
		cliCommands: [
			{ description: 'List roles', command: 'kubectl get roles' },
			{ description: 'Create a role', command: 'kubectl create role <name> --verb=get,list --resource=pods' },
			{ description: 'Get role details', command: 'kubectl describe role <name>' },
			{ description: 'Delete role', command: 'kubectl delete role <name>' }
		]
	},
	clusterroles: {
		title: 'Cluster Roles',
		summary: 'A ClusterRole contains rules that represent a set of permissions cluster-wide.',
		details: 'ClusterRoles are similar to Roles but are cluster-scoped. They can grant access to cluster-scoped resources (like nodes), non-resource endpoints, or namespaced resources across all namespaces. ClusterRoles can be bound with ClusterRoleBindings or RoleBindings.',
		docsPath: 'security/rbac/#role-and-clusterrole',
		cliCommands: [
			{ description: 'List cluster roles', command: 'kubectl get clusterroles' },
			{ description: 'Create a cluster role', command: 'kubectl create clusterrole <name> --verb=get,list --resource=nodes' },
			{ description: 'Get clusterrole details', command: 'kubectl describe clusterrole <name>' },
			{ description: 'Delete cluster role', command: 'kubectl delete clusterrole <name>' }
		]
	},
	rolebindings: {
		title: 'Role Bindings',
		summary: 'A RoleBinding grants permissions defined in a Role to a user or set of users within a namespace.',
		details: 'RoleBindings bind a Role to subjects (users, groups, or ServiceAccounts) within a specific namespace. A RoleBinding can reference a Role in the same namespace or a ClusterRole (to grant cluster-level permissions within the namespace).',
		docsPath: 'security/rbac/#rolebinding-and-clusterrolebinding',
		cliCommands: [
			{ description: 'List role bindings', command: 'kubectl get rolebindings' },
			{ description: 'Create rolebinding', command: 'kubectl create rolebinding <name> --role=<role> --serviceaccount=<ns>:<sa>' },
			{ description: 'Get rolebinding details', command: 'kubectl describe rolebinding <name>' },
			{ description: 'Delete rolebinding', command: 'kubectl delete rolebinding <name>' }
		]
	},
	clusterrolebindings: {
		title: 'Cluster Role Bindings',
		summary: 'A ClusterRoleBinding grants permissions cluster-wide.',
		details: 'ClusterRoleBindings bind a ClusterRole to subjects across the entire cluster. They grant permissions in all namespaces. Be careful with ClusterRoleBindings as they can grant very broad access. Use them for cluster administrators or cluster-wide services.',
		docsPath: 'security/rbac/#rolebinding-and-clusterrolebinding',
		cliCommands: [
			{ description: 'List cluster role bindings', command: 'kubectl get clusterrolebindings' },
			{ description: 'Create clusterrolebinding', command: 'kubectl create clusterrolebinding <name> --clusterrole=<role> --serviceaccount=<ns>:<sa>' },
			{ description: 'Get binding details', command: 'kubectl describe clusterrolebinding <name>' },
			{ description: 'Delete binding', command: 'kubectl delete clusterrolebinding <name>' }
		]
	},
	ingressroutes: {
		title: 'Ingress Routes (Traefik)',
		summary: 'IngressRoute is a Traefik CRD that provides advanced routing capabilities.',
		details: 'IngressRoutes are Traefik-specific custom resources that offer more features than standard Kubernetes Ingress. They support advanced routing rules, middlewares, TLS configuration, and traffic management. IngressRoutes work with Traefik\'s dynamic configuration system.',
		docsPath: 'services-networking/ingress/',
		cliCommands: [
			{ description: 'List ingressroutes', command: 'kubectl get ingressroutes' },
			{ description: 'Get ingressroute details', command: 'kubectl describe ingressroute <name>' },
			{ description: 'Delete ingressroute', command: 'kubectl delete ingressroute <name>' },
			{ description: 'Apply from file', command: 'kubectl apply -f ingressroute.yaml' }
		]
	},
	middlewares: {
		title: 'Middlewares (Traefik)',
		summary: 'Middlewares are Traefik components that modify requests and responses.',
		details: 'Traefik Middlewares can add headers, handle authentication, rate limiting, redirects, path manipulation, and more. They are attached to IngressRoutes and can be chained together. Common middlewares include BasicAuth, Headers, RateLimit, and StripPrefix.',
		docsPath: 'services-networking/ingress/',
		cliCommands: [
			{ description: 'List middlewares', command: 'kubectl get middlewares' },
			{ description: 'Get middleware details', command: 'kubectl describe middleware <name>' },
			{ description: 'Delete middleware', command: 'kubectl delete middleware <name>' },
			{ description: 'Apply from file', command: 'kubectl apply -f middleware.yaml' }
		]
	},
	tlsoptions: {
		title: 'TLS Options (Traefik)',
		summary: 'TLSOptions configure TLS connection parameters for Traefik.',
		details: 'TLSOptions allow you to configure TLS versions, cipher suites, client authentication, and certificate settings. They can be referenced by IngressRoutes to apply consistent TLS policies across multiple routes.',
		docsPath: 'services-networking/ingress/',
		cliCommands: [
			{ description: 'List TLS options', command: 'kubectl get tlsoptions' },
			{ description: 'Get tlsoption details', command: 'kubectl describe tlsoption <name>' },
			{ description: 'Delete tlsoption', command: 'kubectl delete tlsoption <name>' },
			{ description: 'Apply from file', command: 'kubectl apply -f tlsoption.yaml' }
		]
	},
	certificates: {
		title: 'Certificates (cert-manager)',
		summary: 'Certificate resources represent X.509 certificates managed by cert-manager.',
		details: 'cert-manager Certificates define the desired state of a TLS certificate. They specify the DNS names, issuer reference, and secret name where the certificate will be stored. cert-manager automatically handles certificate issuance, renewal, and storage.',
		docsPath: 'security/certificates/',
		cliCommands: [
			{ description: 'List certificates', command: 'kubectl get certificates' },
			{ description: 'Get certificate details', command: 'kubectl describe certificate <name>' },
			{ description: 'Check certificate status', command: 'kubectl get certificate <name> -o jsonpath="{.status.conditions}"' },
			{ description: 'Force renewal', command: 'kubectl cert-manager renew <name>' },
			{ description: 'Delete certificate', command: 'kubectl delete certificate <name>' }
		]
	},
	certificaterequests: {
		title: 'Certificate Requests (cert-manager)',
		summary: 'CertificateRequests are used by cert-manager to request certificates from issuers.',
		details: 'CertificateRequests represent a single request for a certificate. They contain the encoded certificate signing request (CSR) and reference an issuer. cert-manager creates these automatically when processing Certificate resources.',
		docsPath: 'security/certificates/',
		cliCommands: [
			{ description: 'List certificate requests', command: 'kubectl get certificaterequests' },
			{ description: 'Get request details', command: 'kubectl describe certificaterequest <name>' },
			{ description: 'Check request status', command: 'kubectl get certificaterequest <name> -o jsonpath="{.status.conditions}"' },
			{ description: 'Delete request', command: 'kubectl delete certificaterequest <name>' }
		]
	},
	issuers: {
		title: 'Issuers (cert-manager)',
		summary: 'Issuers represent certificate authorities that can generate signed certificates.',
		details: 'cert-manager Issuers are namespaced resources that represent a certificate authority. They can be configured for various providers like Let\'s Encrypt (ACME), HashiCorp Vault, Venafi, or self-signed certificates. Issuers process CertificateRequests within their namespace.',
		docsPath: 'security/certificates/',
		cliCommands: [
			{ description: 'List issuers', command: 'kubectl get issuers' },
			{ description: 'Get issuer details', command: 'kubectl describe issuer <name>' },
			{ description: 'Check issuer status', command: 'kubectl get issuer <name> -o jsonpath="{.status.conditions}"' },
			{ description: 'Delete issuer', command: 'kubectl delete issuer <name>' }
		]
	},
	clusterissuers: {
		title: 'Cluster Issuers (cert-manager)',
		summary: 'ClusterIssuers are cluster-scoped certificate authorities.',
		details: 'ClusterIssuers are similar to Issuers but are cluster-scoped, meaning they can issue certificates for any namespace. They are useful when you want to share a certificate authority across the entire cluster, such as a single Let\'s Encrypt account.',
		docsPath: 'security/certificates/',
		cliCommands: [
			{ description: 'List cluster issuers', command: 'kubectl get clusterissuers' },
			{ description: 'Get clusterissuer details', command: 'kubectl describe clusterissuer <name>' },
			{ description: 'Check issuer status', command: 'kubectl get clusterissuer <name> -o jsonpath="{.status.conditions}"' },
			{ description: 'Delete cluster issuer', command: 'kubectl delete clusterissuer <name>' }
		]
	}
};

export const navigationConfig: NavigationConfig = {
	sections: [
		{
			key: 'cluster',
			label: 'Cluster',
			icon: 'server',
			items: [
				{
					key: 'nodes',
					label: 'Nodes',
					resourceType: 'nodes',
					icon: 'server',
					color: 'blue',
					description: 'Kubernetes worker and master nodes',
					learning: learningContent.nodes
				},
				{
					key: 'namespaces',
					label: 'Namespaces',
					resourceType: 'namespaces',
					icon: 'folder',
					color: 'purple',
					description: 'Virtual clusters for resource isolation',
					learning: learningContent.namespaces
				},
				{
					key: 'events',
					label: 'Events',
					resourceType: 'events',
					icon: 'activity',
					color: 'yellow',
					description: 'Cluster events and activity logs',
					learning: learningContent.events
				}
			]
		},
		{
			key: 'workloads',
			label: 'Workloads',
			icon: 'cpu',
			items: [
				{
					key: 'pods',
					label: 'Pods',
					resourceType: 'pods',
					icon: 'box',
					color: 'green',
					description: 'Running instances of your applications',
					learning: learningContent.pods
				},
				{
					key: 'deployments',
					label: 'Deployments',
					resourceType: 'deployments',
					icon: 'rocket',
					color: 'blue',
					description: 'Declarative updates for Pods and ReplicaSets',
					learning: learningContent.deployments
				},
				{
					key: 'statefulsets',
					label: 'StatefulSets',
					resourceType: 'statefulsets',
					icon: 'database',
					color: 'indigo',
					description: 'Manages stateful applications',
					learning: learningContent.statefulsets
				},
				{
					key: 'daemonsets',
					label: 'DaemonSets',
					resourceType: 'daemonsets',
					icon: 'layers',
					color: 'orange',
					description: 'Ensures all nodes run a copy of a Pod',
					learning: learningContent.daemonsets
				},
				{
					key: 'replicasets',
					label: 'ReplicaSets',
					resourceType: 'replicasets',
					icon: 'copy',
					color: 'gray',
					description: 'Maintains a stable set of replica Pods',
					learning: learningContent.replicasets
				},
				{
					key: 'jobs',
					label: 'Jobs',
					resourceType: 'jobs',
					icon: 'play',
					color: 'yellow',
					description: 'Creates one or more Pods to run a task',
					learning: learningContent.jobs
				},
				{
					key: 'cronjobs',
					label: 'CronJobs',
					resourceType: 'cronjobs',
					icon: 'clock',
					color: 'pink',
					description: 'Creates Jobs on a repeating schedule',
					learning: learningContent.cronjobs
				}
			]
		},
		{
			key: 'services',
			label: 'Services & Networking',
			icon: 'network',
			items: [
				{
					key: 'services',
					label: 'Services',
					resourceType: 'services',
					icon: 'globe',
					color: 'cyan',
					description: 'Exposes a set of Pods as a network service',
					learning: learningContent.services
				},
				{
					key: 'ingresses',
					label: 'Ingresses',
					resourceType: 'ingresses',
					icon: 'arrow-right',
					color: 'teal',
					description: 'Manages external access to services',
					learning: learningContent.ingresses
				},
				{
					key: 'endpoints',
					label: 'Endpoints',
					resourceType: 'endpoints',
					icon: 'target',
					color: 'gray',
					description: 'Lists the endpoints for a service',
					learning: learningContent.endpoints
				},
				{
					key: 'networkpolicies',
					label: 'Network Policies',
					resourceType: 'networkpolicies',
					icon: 'shield',
					color: 'red',
					description: 'Controls traffic flow between Pods',
					learning: learningContent.networkpolicies
				}
			]
		},
		{
			key: 'configuration',
			label: 'Configuration',
			icon: 'settings',
			items: [
				{
					key: 'configmaps',
					label: 'ConfigMaps',
					resourceType: 'configmaps',
					icon: 'file-text',
					color: 'green',
					description: 'Stores configuration data in key-value pairs',
					learning: learningContent.configmaps
				},
				{
					key: 'secrets',
					label: 'Secrets',
					resourceType: 'secrets',
					icon: 'key',
					color: 'red',
					description: 'Stores sensitive data securely',
					learning: learningContent.secrets
				}
			]
		},
		{
			key: 'storage',
			label: 'Storage',
			icon: 'hard-drive',
			items: [
				{
					key: 'persistentvolumes',
					label: 'Persistent Volumes',
					resourceType: 'persistentvolumes',
					icon: 'hard-drive',
					color: 'blue',
					description: 'Cluster-wide storage resources',
					learning: learningContent.persistentvolumes
				},
				{
					key: 'persistentvolumeclaims',
					label: 'Persistent Volume Claims',
					resourceType: 'persistentvolumeclaims',
					icon: 'hard-drive',
					color: 'purple',
					description: 'Requests for storage by users',
					learning: learningContent.persistentvolumeclaims
				},
				{
					key: 'storageclasses',
					label: 'Storage Classes',
					resourceType: 'storageclasses',
					icon: 'database',
					color: 'indigo',
					description: 'Defines classes of storage',
					learning: learningContent.storageclasses
				}
			]
		},
		{
			key: 'access',
			label: 'Access Control',
			icon: 'shield-check',
			items: [
				{
					key: 'serviceaccounts',
					label: 'Service Accounts',
					resourceType: 'serviceaccounts',
					icon: 'user',
					color: 'blue',
					description: 'Provides an identity for processes in a Pod',
					learning: learningContent.serviceaccounts
				},
				{
					key: 'roles',
					label: 'Roles',
					resourceType: 'roles',
					icon: 'user-check',
					color: 'green',
					description: 'Defines permissions within a namespace',
					learning: learningContent.roles
				},
				{
					key: 'clusterroles',
					label: 'Cluster Roles',
					resourceType: 'clusterroles',
					icon: 'users',
					color: 'orange',
					description: 'Defines permissions cluster-wide',
					learning: learningContent.clusterroles
				},
				{
					key: 'rolebindings',
					label: 'Role Bindings',
					resourceType: 'rolebindings',
					icon: 'link',
					color: 'yellow',
					description: 'Grants permissions to users or groups',
					learning: learningContent.rolebindings
				},
				{
					key: 'clusterrolebindings',
					label: 'Cluster Role Bindings',
					resourceType: 'clusterrolebindings',
					icon: 'link-2',
					color: 'red',
					description: 'Grants cluster-wide permissions',
					learning: learningContent.clusterrolebindings
				}
			]
		},
		{
			key: 'custom',
			label: 'Custom Resources',
			icon: 'puzzle',
			items: [
				{
					key: 'ingressroutes',
					label: 'Ingress Routes',
					resourceType: 'ingressroutes',
					icon: 'route',
					color: 'blue',
					description: 'Traefik ingress routing rules',
					learning: learningContent.ingressroutes
				},
				{
					key: 'middlewares',
					label: 'Middlewares',
					resourceType: 'middlewares',
					icon: 'filter',
					color: 'purple',
					description: 'Traefik HTTP middlewares',
					learning: learningContent.middlewares
				},
				{
					key: 'tlsoptions',
					label: 'TLS Options',
					resourceType: 'tlsoptions',
					icon: 'lock',
					color: 'green',
					description: 'Traefik TLS configuration',
					learning: learningContent.tlsoptions
				},
				{
					key: 'certificates',
					label: 'Certificates',
					resourceType: 'certificates',
					icon: 'certificate',
					color: 'yellow',
					description: 'cert-manager SSL certificates',
					learning: learningContent.certificates
				},
				{
					key: 'certificaterequests',
					label: 'Certificate Requests',
					resourceType: 'certificaterequests',
					icon: 'file-plus',
					color: 'orange',
					description: 'cert-manager certificate requests',
					learning: learningContent.certificaterequests
				},
				{
					key: 'issuers',
					label: 'Issuers',
					resourceType: 'issuers',
					icon: 'award',
					color: 'cyan',
					description: 'cert-manager certificate issuers',
					learning: learningContent.issuers
				},
				{
					key: 'clusterissuers',
					label: 'Cluster Issuers',
					resourceType: 'clusterissuers',
					icon: 'award',
					color: 'teal',
					description: 'cert-manager cluster-wide issuers',
					learning: learningContent.clusterissuers
				}
			]
		}
	]
};
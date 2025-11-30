export interface ResourceTemplate {
	name: string;
	kind: string;
	description: string;
	yaml: string;
}

export const resourceTemplates: ResourceTemplate[] = [
	{
		name: 'Pod',
		kind: 'Pod',
		description: 'A single pod running a container',
		yaml: `apiVersion: v1
kind: Pod
metadata:
  name: my-pod
  namespace: default
  labels:
    app: my-app
spec:
  containers:
    - name: main
      image: nginx:latest
      ports:
        - containerPort: 80
      resources:
        requests:
          memory: "64Mi"
          cpu: "100m"
        limits:
          memory: "128Mi"
          cpu: "200m"
`
	},
	{
		name: 'Deployment',
		kind: 'Deployment',
		description: 'A deployment with replicas and rolling updates',
		yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
  namespace: default
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: main
          image: nginx:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              memory: "64Mi"
              cpu: "100m"
            limits:
              memory: "128Mi"
              cpu: "200m"
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
`
	},
	{
		name: 'Service (ClusterIP)',
		kind: 'Service',
		description: 'Internal service accessible within the cluster',
		yaml: `apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
    - name: http
      port: 80
      targetPort: 80
      protocol: TCP
`
	},
	{
		name: 'Service (LoadBalancer)',
		kind: 'Service',
		description: 'External service with cloud load balancer',
		yaml: `apiVersion: v1
kind: Service
metadata:
  name: my-loadbalancer
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - name: http
      port: 80
      targetPort: 80
      protocol: TCP
`
	},
	{
		name: 'ConfigMap',
		kind: 'ConfigMap',
		description: 'Configuration data as key-value pairs',
		yaml: `apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  namespace: default
data:
  # Simple key-value pairs
  DATABASE_HOST: "localhost"
  DATABASE_PORT: "5432"
  
  # Multi-line configuration file
  config.yaml: |
    server:
      port: 8080
      host: 0.0.0.0
    logging:
      level: info
`
	},
	{
		name: 'Secret',
		kind: 'Secret',
		description: 'Sensitive data like passwords and tokens',
		yaml: `apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
stringData:
  # Use stringData for plain text (will be base64 encoded)
  username: admin
  password: changeme
  
  # Or use 'data' with base64-encoded values
  # data:
  #   username: YWRtaW4=
  #   password: Y2hhbmdlbWU=
`
	},
	{
		name: 'Ingress',
		kind: 'Ingress',
		description: 'HTTP/HTTPS routing to services',
		yaml: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  namespace: default
  annotations:
    # Uncomment for cert-manager TLS
    # cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
  # Uncomment for TLS
  # tls:
  #   - hosts:
  #       - app.example.com
  #     secretName: app-tls
`
	},
	{
		name: 'PersistentVolumeClaim',
		kind: 'PersistentVolumeClaim',
		description: 'Request for persistent storage',
		yaml: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  # Uncomment to specify a storage class
  # storageClassName: standard
`
	},
	{
		name: 'StatefulSet',
		kind: 'StatefulSet',
		description: 'Stateful application with stable network identity',
		yaml: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: my-statefulset
  namespace: default
spec:
  serviceName: my-statefulset
  replicas: 3
  selector:
    matchLabels:
      app: my-statefulset
  template:
    metadata:
      labels:
        app: my-statefulset
    spec:
      containers:
        - name: main
          image: postgres:15
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
`
	},
	{
		name: 'CronJob',
		kind: 'CronJob',
		description: 'Scheduled job running on a cron schedule',
		yaml: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: my-cronjob
  namespace: default
spec:
  schedule: "0 * * * *"  # Every hour
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: job
              image: busybox:latest
              command:
                - /bin/sh
                - -c
                - echo "Running scheduled job at $(date)"
          restartPolicy: OnFailure
`
	},
	{
		name: 'Job',
		kind: 'Job',
		description: 'One-time batch job',
		yaml: `apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
  namespace: default
spec:
  ttlSecondsAfterFinished: 3600  # Clean up after 1 hour
  template:
    spec:
      containers:
        - name: job
          image: busybox:latest
          command:
            - /bin/sh
            - -c
            - echo "Running one-time job" && sleep 10
      restartPolicy: Never
  backoffLimit: 3
`
	},
	{
		name: 'Namespace',
		kind: 'Namespace',
		description: 'Isolated environment within the cluster',
		yaml: `apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
  labels:
    environment: development
    team: my-team
`
	},
	{
		name: 'ServiceAccount',
		kind: 'ServiceAccount',
		description: 'Identity for pods to access the API',
		yaml: `apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-account
  namespace: default
# Uncomment to disable auto-mounting of API token
# automountServiceAccountToken: false
`
	},
	{
		name: 'Role',
		kind: 'Role',
		description: 'Namespace-scoped permissions',
		yaml: `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-role
  namespace: default
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
`
	},
	{
		name: 'RoleBinding',
		kind: 'RoleBinding',
		description: 'Bind a role to users or service accounts',
		yaml: `apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-rolebinding
  namespace: default
subjects:
  - kind: ServiceAccount
    name: my-service-account
    namespace: default
roleRef:
  kind: Role
  name: my-role
  apiGroup: rbac.authorization.k8s.io
`
	},
	{
		name: 'NetworkPolicy',
		kind: 'NetworkPolicy',
		description: 'Control pod network traffic',
		yaml: `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: my-network-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: frontend
      ports:
        - protocol: TCP
          port: 80
  egress:
    - to:
        - podSelector:
            matchLabels:
              role: database
      ports:
        - protocol: TCP
          port: 5432
`
	},
	{
		name: 'HorizontalPodAutoscaler',
		kind: 'HorizontalPodAutoscaler',
		description: 'Auto-scale pods based on metrics',
		yaml: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
`
	}
];

export function getTemplateByKind(kind: string): ResourceTemplate | undefined {
	return resourceTemplates.find(t => t.kind === kind);
}

export function getEmptyTemplate(): string {
	return `apiVersion: v1
kind: 
metadata:
  name: 
  namespace: default
spec:
`;
}


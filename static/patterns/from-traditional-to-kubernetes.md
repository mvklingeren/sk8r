# From traditional hosting to Kubernetes mastery

A progressive guide to evolving your application deployment from simple hosting to a fully production-ready Kubernetes setup.

---

## Level 0: Where are you now?

### Traditional hosting

Most developers start here. You have:

- A **React frontend** deployed on Vercel, Netlify, or served by nginx
- A **Rust/Node/Go backend** running on a VPS with Docker
- Maybe a `docker-compose.yml` tying it together
- Manual deployments via SSH or git hooks
- A single server doing everything

```yaml
# Your typical docker-compose.yml
version: '3'
services:
  frontend:
    image: my-react-app
    ports:
      - "80:80"
  
  backend:
    image: my-rust-api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/myapp
  
  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

**The problems:**
- Single point of failure
- Manual scaling (spin up another VPS?)
- Deployments cause downtime
- Config is scattered or hardcoded
- No self-healing when things crash

---

## Level 1: Your First Kubernetes Deployment

### Translating Docker Compose to Kubernetes

The mental shift: Instead of "run this container", you declare "I want this container running".

**Your React Frontend:**

```yaml
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: my-react-app:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
```

**A quick note on image tags:** Notice the `image` field ends with `:latest`. While convenient for a first try, this is a bad practice in production. It makes deployments unpredictable and rollbacks difficult. For real applications, you should always use a unique, immutable tag like a version number (`my-react-app:1.2.3`) or a git commit SHA (`my-react-app:b2a34c1`).

**Your Rust Backend:**

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: my-rust-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          value: "postgres://user:pass@db:5432/myapp"  # Still hardcoded!
---
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
  - port: 3000
    targetPort: 3000
```

### The Missing Database

What about the `db` service from our `docker-compose.yml`? A naive translation might look like this:

```yaml
# postgres-deployment-WRONG.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          value: "somepassword" # This should be a secret!
```

**This is wrong because:** if the `postgres` pod crashes or gets rescheduled, all your data is **gone**. The pod's internal storage is ephemeral. This is a critical mistake for any stateful application.

**What you've gained:**
- Kubernetes restarts crashed containers automatically
- Declarative state (what you want, not how to get there)
- Foundation for everything else

**What's still wrong:**
- Credentials hardcoded in YAML
- Database will lose all data on restart (no persistent storage)
- No external access (Ingress)
- No scaling

---

## Level 2: Configuration Done Right

### ConfigMaps: Externalizing Configuration

Stop rebuilding images just to change a config value. Note that we have removed the `/api` proxy from the Nginx config; we will let our Ingress controller handle that routing in a later step, which is a cleaner and more scalable pattern.

```yaml
# frontend-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
data:
  nginx.conf: |
    server {
      listen 80;
      location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
      }
    }
  
  config.json: |
    {
      "apiUrl": "/api",
      "appName": "My Awesome App",
      "features": {
        "darkMode": true,
        "analytics": false
      }
    }
```

Mount it in your deployment:

```yaml
spec:
  containers:
  - name: frontend
    image: my-react-app:latest
    volumeMounts:
    - name: config
      mountPath: /etc/nginx/conf.d/default.conf
      subPath: nginx.conf
    - name: config
      mountPath: /usr/share/nginx/html/config.json
      subPath: config.json
  volumes:
  - name: config
    configMap:
      name: frontend-config
```

### Secrets: Managing Sensitive Data

Never commit credentials to git again.

```yaml
# backend-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
type: Opaque
stringData:  # Use stringData for plain text, data for base64
  DATABASE_URL: "postgres://user:actualpassword@postgres:5432/myapp"
  JWT_SECRET: "super-secret-key-here"
  API_KEY: "third-party-api-key"
```

Reference them in your deployment by updating the `env` section to use `envFrom` to load all key-value pairs from the Secret.

```yaml
spec:
  containers:
  - name: backend
    image: my-rust-api:latest
    envFrom:
    - secretRef:
        name: backend-secrets
```

**What you've gained:**
- Config changes without rebuilding images
- Secrets separated from code
- Different configs per environment (dev/staging/prod)

---

## Level 3: Persistent Data

### Your Database Needs Storage That Survives

Pods are ephemeral. As we saw in Level 1, a database deployed as a simple `Deployment` will lose all its data on a restart. To fix this, we need storage that exists independently of the pod.

We also need to ensure our database has a stable identity (for network and storage). A `Deployment` is not designed for this. This is where `StatefulSets` come in.

### StatefulSet for Databases

Deployments are for stateless apps. StatefulSets give databases what they need:
- Stable network identity (e.g., `postgres-0`, `postgres-1`)
- Ordered startup and shutdown
- A unique, persistent storage volume for each replica

First, let's create the secret for our database password.

```yaml
# postgres-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
stringData:
  # Note: In production, this password should be generated and injected by a tool like Vault or External Secrets.
  password: "really-strong-password" 
```

Now, we define the `StatefulSet`. It uses `volumeClaimTemplates` to automatically create a `PersistentVolumeClaim` (a request for storage) for each pod replica.

```yaml
# postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: POSTGRES_DB
          value: myapp
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: local-path # This is important! See note below.
      resources:
        requests:
          storage: 10Gi
```

**A note on `storageClassName`**: The example uses `storageClassName: local-path`. This is great for local testing (like Minikube/K3s) but has a major limitation: it ties the storage to a specific physical node. If that node goes down, the pod cannot be rescheduled elsewhere. For production, you must use a network-based `storageClassName` provided by your cloud (e.g., `gp2-csi` on AWS, `premium-rwo` on Azure, `standard-rwo` on GKE) to allow for true node-failure resilience.

**What you've gained:**
- Data persists across pod restarts
- With proper network storage, data can survive node failures
- Stable DNS for your database pods: `postgres-0.postgres.namespace.svc.cluster.local`

---

## Level 4: Exposing to the World

### From NodePort Hacks to Proper Ingress

**The wrong way** (but we've all done it for a quick test):
```yaml
spec:
  type: NodePort
  ports:
  - port: 80
    nodePort: 30080  # Access via http://<any-node-ip>:30080
```

**The right way - Ingress:** An Ingress is an API object that manages external access to services in a cluster, typically HTTP. It can provide load balancing, SSL termination, and name-based virtual hosting.

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls # cert-manager will create/populate this
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### Automatic TLS with cert-manager

Manually managing SSL certificates is tedious and error-prone. `cert-manager` automates it. After installing `cert-manager` in your cluster, you create an `Issuer` or `ClusterIssuer` that defines how certificates should be obtained.

```yaml
# cluster-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: you@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx  # or traefik, etc. Must match your Ingress controller.
```

**What you've gained:**
- A single entry point for your app with a proper domain name.
- Automatic HTTPS certificates from Let's Encrypt.
- Clean, path-based routing to separate frontend and backend services.
- Native load balancing across replicas.

---

## Level 5: Production Ready

### Health Checks

Tell Kubernetes how to know if your app is healthy, so it can make smart decisions about restarts and traffic routing.

```yaml
spec:
  containers:
  - name: backend
    image: my-rust-api:latest
    livenessProbe:      # Is the container alive? If not, restart it.
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 10
    readinessProbe:     # Is it ready to receive traffic? If not, remove from Service.
      httpGet:
        path: /ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
    startupProbe:       # For slow-starting containers. Delays other probes.
      httpGet:
        path: /health
        port: 3000
      failureThreshold: 30
      periodSeconds: 10
```

### Resource Limits

Don't let one runaway app starve other applications in the cluster.

```yaml
spec:
  containers:
  - name: backend
    resources:
      requests:         # Guaranteed resources (for scheduling)
        memory: "256Mi"
        cpu: "250m" # 0.25 of a CPU core
      limits:           # Maximum allowed (enforced by cgroups)
        memory: "512Mi"
        cpu: "500m" # 0.5 of a CPU core
```

### Scaling

Handle traffic spikes by automatically scaling your stateless services.

```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```
With `minReplicas: 2`, you are ensuring high availability. To protect your application during voluntary disruptions (like node upgrades), you should also create a `PodDisruptionBudget` (PDB) to ensure a minimum number of pods are always running.

**What you've gained:**
- Automatic restarts of unhealthy containers.
- Zero-downtime deployments (traffic only goes to ready pods).
- Protection against resource exhaustion and "noisy neighbors".
- Automatic scaling based on real-time load.

---

## Level 6: The Complete Picture

### Full Microservices Architecture

Now let's put it all together. Our final architecture doesn't just include our frontend and backend. As an application grows, it's common to add other components for performance and reliability. Our picture includes:

-   **A Cache (Redis):** A fast, in-memory store to reduce database load and speed up responses. We'll run this as a `StatefulSet`.
-   **A Background Worker:** A separate deployment for handling long-running or asynchronous jobs (e.g., sending emails, processing data) without blocking the API. It communicates with the API via a job queue, often backed by Redis.

This diagram shows how all the pieces we've discussed (and these new ones) fit together in a production-grade setup.

```mermaid
flowchart TB
%% External Actors
User[["User / Browser"]]
DNS(("DNS / CDN"))

%% Kubernetes Cluster Boundary
subgraph Cluster["Kubernetes Cluster (Production)"]
    
    %% Ingress Layer
    subgraph IngressLayer["Ingress & Routing"]
        LB["Cloud Load Balancer"]
        IngressCtrl["Ingress Controller<br/>(Nginx/Traefik)"]
        CertManager["Cert Manager<br/>(Let's Encrypt)"]
    end

    %% Frontend Namespace/Layer
    subgraph FELayer["Frontend Namespace"]
        style FELayer fill:#e1f5fe,stroke:#01579b
        
        subgraph FE_Pod["Frontend Pod (Deployment)"]
            NginxFE["Nginx Container<br/>(Serves Static Build)"]
        end
        SVC_FE["Service: Frontend<br/>(ClusterIP)"]
    end

    %% Backend Namespace/Layer
    subgraph APILayer["API Namespace"]
        style APILayer fill:#fff3e0,stroke:#e65100
        
        subgraph API_Pod["API Pod (Deployment)"]
            RustAPI["Rust API Container"]
            EnvVars["ConfigMap / Secrets"]
        end
        
        SVC_API["Service: API<br/>(ClusterIP)"]
        HPA["HPA<br/>(Auto-scaler)"]
    end

    %% Data Namespace/Layer
    subgraph DataLayer["Data Persistence"]
        style DataLayer fill:#e8f5e9,stroke:#1b5e20
        
        subgraph Redis_Set["Redis (StatefulSet)"]
            Redis["Redis Master/Replica"]
        end
        
        subgraph DB_Set["Postgres (StatefulSet)"]
            Postgres["Postgres Primary"]
            PVC[("Persistent Vol<br/>Claim (PVC)")]
        end
        
        Worker["Worker Deployment<br/>(Background Jobs)"]
    end
end

%% Flow Connections
User -->|"https://app.com"| DNS
DNS -->|"Traffic"| LB
LB --> IngressCtrl

%% Ingress Routing Rules
IngressCtrl -.->|"Host: app.com<br/>Path: / (Default)"| SVC_FE
IngressCtrl -.->|"Host: app.com<br/>Path: /api"| SVC_API
CertManager -.->|"Manage TLS"| IngressCtrl

%% Internal Cluster Routing
SVC_FE --> NginxFE
SVC_API --> RustAPI
HPA -.->|"Scales"| API_Pod
RustAPI -.->|"Reads"| EnvVars

%% Data Flow
RustAPI -->|"Write Job"| Redis
Redis -->|"Pop Job"| Worker
Worker -->|"Process"| Postgres
RustAPI -->|"CRUD"| Postgres
Postgres --- PVC
```

Each component:
- Has its own Deployment/StatefulSet
- Has its own Service for internal communication
- Uses ConfigMaps for configuration
- Uses Secrets for credentials
- Has health checks and resource limits
- Can scale independently

---

## Summary: Your Transformation

| Aspect | Traditional | Kubernetes |
|--------|-------------|------------|
| Deployment | SSH + git pull | `kubectl apply -f` |
| Scaling | Buy bigger server | `kubectl scale` / HPA |
| Config | .env files, hardcoded | ConfigMaps, Secrets |
| Storage | Local disk | PersistentVolumes |
| Networking | nginx reverse proxy | Ingress + Services |
| SSL | Certbot + cron | cert-manager |
| Recovery | Manual restart | Automatic |
| Updates | Downtime | Rolling updates |

---

## Next Steps

Now that you understand the journey, explore these resources in your cluster:

- **[Deployments](/deployments)** - Manage your application workloads
- **[ConfigMaps](/configmaps)** - Externalize your configuration
- **[Secrets](/secrets)** - Manage sensitive data
- **[PersistentVolumeClaims](/persistentvolumeclaims)** - Request storage
- **[Ingresses](/ingresses)** - Expose your services
- **[Certificates](/certificates)** - Manage TLS certificates
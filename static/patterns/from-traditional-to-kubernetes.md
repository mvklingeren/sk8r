# From Traditional Hosting to Kubernetes Mastery

A progressive guide to evolving your application deployment from simple hosting to a fully production-ready Kubernetes setup.

---

## Level 0: Where You Are Now

### Traditional Hosting

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

**What you've gained:**
- Kubernetes restarts crashed containers automatically
- Declarative state (what you want, not how to get there)
- Foundation for everything else

**What's still wrong:**
- Credentials hardcoded in YAML
- No persistent storage for database
- No external access (Ingress)
- No scaling

---

## Level 2: Configuration Done Right

### ConfigMaps: Externalizing Configuration

Stop rebuilding images just to change a config value.

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
      location /api {
        proxy_pass http://backend:3000;
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

Reference in your deployment:

```yaml
spec:
  containers:
  - name: backend
    image: my-rust-api:latest
    envFrom:
    - secretRef:
        name: backend-secrets
    # Or individual values:
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: backend-secrets
          key: DATABASE_URL
```

**What you've gained:**
- Config changes without rebuilding images
- Secrets separated from code
- Different configs per environment (dev/staging/prod)

---

## Level 3: Persistent Data

### Your Database Needs Storage That Survives

Pods are ephemeral. Your PostgreSQL data shouldn't be.

```yaml
# postgres-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: local-path  # Or your cluster's storage class
```

### StatefulSet for Databases

Deployments are for stateless apps. StatefulSets give you:
- Stable network identity (postgres-0, postgres-1)
- Ordered startup/shutdown
- Persistent storage per replica

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
      resources:
        requests:
          storage: 10Gi
```

**What you've gained:**
- Data persists across pod restarts
- Data survives node failures (with proper storage)
- Stable DNS: `postgres-0.postgres.namespace.svc.cluster.local`

---

## Level 4: Exposing to the World

### From NodePort Hacks to Proper Ingress

**The wrong way** (but we've all done it):
```yaml
spec:
  type: NodePort
  ports:
  - port: 80
    nodePort: 30080  # Access via http://node-ip:30080
```

**The right way - Ingress:**

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
    - api.myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
  - host: api.myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3000
```

### Automatic TLS with cert-manager

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
          class: traefik  # or nginx
```

**What you've gained:**
- Proper domain names
- Automatic HTTPS certificates
- Path-based and host-based routing
- Load balancing across replicas

---

## Level 5: Production Ready

### Health Checks

Tell Kubernetes how to know if your app is healthy:

```yaml
spec:
  containers:
  - name: backend
    image: my-rust-api:latest
    livenessProbe:      # Is the container alive?
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 10
    readinessProbe:     # Is it ready to receive traffic?
      httpGet:
        path: /ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
    startupProbe:       # For slow-starting containers
      httpGet:
        path: /health
        port: 3000
      failureThreshold: 30
      periodSeconds: 10
```

### Resource Limits

Don't let one app starve others:

```yaml
spec:
  containers:
  - name: backend
    resources:
      requests:         # Guaranteed resources
        memory: "256Mi"
        cpu: "250m"
      limits:           # Maximum allowed
        memory: "512Mi"
        cpu: "500m"
```

### Scaling

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

**What you've gained:**
- Automatic restarts of unhealthy containers
- Traffic only goes to ready pods
- Protection against resource exhaustion
- Automatic scaling based on load

---

## Level 6: The Complete Picture

### Full Microservices Architecture

```mermaid
flowchart TB
    subgraph External["External Traffic"]
        Users["👤 Users"]
        CDN["🌐 CDN / Static Hosting"]
    end

    subgraph Frontend["Frontend Layer"]
        ReactApp["Frontend (React)"]
        AdminApp["Admin (React)"]
    end

    subgraph Cluster["Kubernetes Cluster"]
        Ingress["Ingress<br/>(TLS termination)"]
        
        subgraph Services["API Layer"]
            API["API Gateway<br/>(Rust)"]
            Auth["Auth Service"]
        end
        
        subgraph Data["Data Layer"]
            Cache["Cache<br/>(Redis)"]
            Queue["Queue<br/>(Redis)"]
            Workers["Workers<br/>(Background)"]
            DB["Database<br/>(Postgres)"]
        end
    end

    Users --> CDN
    CDN --> ReactApp
    CDN --> AdminApp
    ReactApp --> Ingress
    AdminApp --> Ingress
    Ingress --> API
    API --> Auth
    API --> Cache
    API --> Queue
    Queue --> Workers
    Workers --> DB
    API --> DB
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
| Scaling | Buy bigger server | Add replicas |
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


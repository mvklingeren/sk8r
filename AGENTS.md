# Agent notes for sk8r

## Demo cluster for screenshots and demos

Never take README screenshots or demo sk8r against a real cluster. Node names, IPs, workloads and labels leak. Use a throwaway k3s cluster in Docker with Prometheus and the fake workloads in [docs/demo/demo-workloads.yaml](docs/demo/demo-workloads.yaml), then delete it.

Needs Docker (about 8 GB of memory is enough), `kubectl` and `helm`. No kind or k3d binary is required: k3s runs straight from the `rancher/k3s` image.

Keep everything in a scratch directory (`$DEMO` below) so the user's `~/.kube/config` and helm repos are never touched.

### 1. Start a 3-node k3s cluster

```bash
DEMO=$(mktemp -d)
docker network create sk8r-demo
docker run -d --name sk8r-demo-cp --hostname demo-control-plane --network sk8r-demo --privileged \
  -e K3S_TOKEN=sk8r-demo-token -p 127.0.0.1:16443:6443 \
  rancher/k3s:v1.33.5-k3s1 server --node-name demo-control-plane \
  --tls-san localhost --tls-san 127.0.0.1 --write-kubeconfig-mode 644
for i in 1 2; do
  docker run -d --name sk8r-demo-w$i --hostname demo-worker-$i --network sk8r-demo --privileged \
    -e K3S_URL=https://sk8r-demo-cp:6443 -e K3S_TOKEN=sk8r-demo-token \
    rancher/k3s:v1.33.5-k3s1 agent --node-name demo-worker-$i
done
# node-exporter needs a shared root mount, which Docker containers don't have by default
for n in sk8r-demo-cp sk8r-demo-w1 sk8r-demo-w2; do docker exec $n mount --make-rshared /; done

until docker exec sk8r-demo-cp test -f /etc/rancher/k3s/k3s.yaml; do sleep 2; done
docker exec sk8r-demo-cp cat /etc/rancher/k3s/k3s.yaml \
  | sed 's#https://127.0.0.1:6443#https://127.0.0.1:16443#' > $DEMO/kubeconfig
export KUBECONFIG=$DEMO/kubeconfig
until [ "$(kubectl get nodes --no-headers 2>/dev/null | grep -c ' Ready')" = 3 ]; do sleep 3; done
```

k3s ships with Traefik (its CRDs feed the Custom Resources views), metrics-server and a local-path storage class.

### 2. Install Prometheus

The release name and namespace must match the default `PROMETHEUS_URL` (`kube-prometheus-stack-prometheus.monitoring:9090`). Alertmanager and Grafana aren't needed, and k3s doesn't expose etcd, scheduler, controller-manager or kube-proxy metrics.

```bash
export HELM_CACHE_HOME=$DEMO/helm/cache HELM_CONFIG_HOME=$DEMO/helm/config HELM_DATA_HOME=$DEMO/helm/data
helm install kube-prometheus-stack kube-prometheus-stack \
  --repo https://prometheus-community.github.io/helm-charts \
  -n monitoring --create-namespace --wait --timeout 10m \
  --set alertmanager.enabled=false --set grafana.enabled=false \
  --set kubeEtcd.enabled=false --set kubeControllerManager.enabled=false \
  --set kubeScheduler.enabled=false --set kubeProxy.enabled=false \
  --set prometheus.prometheusSpec.scrapeInterval=15s
```

If node-exporter pods sit in `CreateContainerError` ("path / is mounted on / but it is not a shared or slave mount"), the `--make-rshared` step was skipped. Run it, then delete the node-exporter pods.

### 3. Deploy the fake workloads

```bash
kubectl apply -f docs/demo/demo-workloads.yaml
```

This creates `shop`, `payments` and `data` namespaces with a storefront, APIs, a Postgres StatefulSet with a PVC, a Job, a CronJob, an Ingress, a Traefik IngressRoute and Middleware, and a NetworkPolicy. It also creates a few deliberate effects:

- `traffic-generator` makes requests between the services, so the logs view has something to show and Network I/O moves.
- `image-resizer` burns CPU in bursts, so the CPU charts aren't flat.
- `recommendations` exits on purpose, so the events stream shows `BackOff` warnings.
- `sk8r/sk8r-demo` is a ServiceAccount with cluster-admin. That's fine on the demo cluster only.

k3s enforces NetworkPolicies. Any new client of the `tier=backend` services needs `tier: frontend` on its pod template.

The pods pull `nginxinc/nginx-unprivileged:1.28-alpine`, `caddy:2.10.2` and `postgres:17-alpine` from Docker Hub. To skip the download when the images are already in the local Docker cache, import them into each node with `docker save <image> | docker exec -i <node> ctr -n k8s.io images import -`.

### 4. Run sk8r against it

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 19090:9090 &
PROMETHEUS_URL=http://127.0.0.1:19090 npm run dev -- --port 5173 --strictPort
kubectl create token sk8r-demo -n sk8r --duration=24h   # bearer token for the UI
```

In the UI, choose **Add Cluster** and enter server `https://demo.localhost:16443`, the token, and **Skip TLS verification**. Use `demo.localhost` rather than `127.0.0.1`: the cluster picker shows the hostname, and `*.localhost` resolves to loopback without editing `/etc/hosts`.

Let Prometheus collect for 10 minutes or more before taking screenshots, or the charts look empty.

### 5. Capture the README screenshots

[docs/demo/screenshots.mjs](docs/demo/screenshots.mjs) drives headless Chromium through Playwright, a devDependency. It seeds the cluster into localStorage, so the UI step above isn't needed for it.

```bash
SK8R_DEMO_TOKEN=$(kubectl create token sk8r-demo -n sk8r) node docs/demo/screenshots.mjs docs/images
# or only some: ... node docs/demo/screenshots.mjs docs/images dashboard,logs
```

Shots are 1440×900 at 2× scale. `dashboard.png` stays at full size as the README hero. Downscale the gallery shots to keep the repo small (macOS):

```bash
for f in nodes events logs terminal search learning create light; do sips -Z 1440 docs/images/$f.png; done
```

Look through every image before committing. Check that nothing outside the demo cluster appears.

### 6. Tear down

```bash
pkill -f 'port-forward -n monitoring svc/kube-prometheus-stack-prometheus'
docker rm -f sk8r-demo-cp sk8r-demo-w1 sk8r-demo-w2 && docker network rm sk8r-demo
rm -rf "$DEMO"
```

# Agent notes for sk8r

## Demo cluster

Never take README screenshots or demo sk8r against a real cluster. Node names, IPs, workloads and labels leak. Use the throwaway demo cluster instead: 3 k3s nodes in Docker, kube-prometheus-stack, and the fake workloads in [docs/demo/demo-workloads.yaml](docs/demo/demo-workloads.yaml).

Needs Docker (about 8 GB of memory is enough), `kubectl` and `helm`. No kind or k3d binary is required: k3s runs straight from the `rancher/k3s` image.

```bash
scripts/demo-cluster.sh up      # create or resume it; Prometheus is port-forwarded to 127.0.0.1:19090
eval "$(scripts/demo-cluster.sh env)"   # KUBECONFIG, SK8R_DEMO_SERVER, SK8R_DEMO_TOKEN, PROMETHEUS_URL
scripts/demo-cluster.sh down    # delete it
```

`up` is idempotent and takes a few minutes the first time (helm install). Its state (kubeconfig, helm cache, port-forward pid) lives in `$SK8R_DEMO_DIR`, default `$TMPDIR/sk8r-demo`, so the user's `~/.kube/config` and helm repos are never touched. The API is at `https://demo.localhost:16443`.

What's in it:

- k3s ships Traefik (its CRDs feed the Custom Resources views), metrics-server and a local-path storage class. cert-manager is not installed, so those views are empty.
- `shop`, `payments` and `data` namespaces with a storefront, APIs, a Postgres StatefulSet with a PVC, a Job, a CronJob, an Ingress, a Traefik IngressRoute and Middleware, and a NetworkPolicy.
- `traffic-generator` makes requests between the services, so logs have content and Network I/O moves.
- `image-resizer` burns CPU in bursts, so the CPU charts aren't flat.
- `recommendations` exits on purpose, so the events stream shows `BackOff` warnings.
- `sk8r/sk8r-demo` is a ServiceAccount with cluster-admin. That's fine on the demo cluster only.

Gotchas:

- node-exporter fails with "path / is mounted on / but it is not a shared or slave mount" unless each node container runs `mount --make-rshared /`. The script does this, including after a `docker start`.
- k3s enforces NetworkPolicies. Any new client of the `tier=backend` services needs `tier: frontend` on its pod template.
- The release name and namespace `kube-prometheus-stack` / `monitoring` match the default `PROMETHEUS_URL` in `k8s/deployment.yaml`.

## Integration tests

```bash
npm run test:integration
```

This brings up the demo cluster, builds sk8r, runs the production server (`node server.js` on port 4173, override with `SK8R_TEST_PORT`) and runs [tests/integration](tests/integration) with `vitest.integration.config.ts`. The cluster stays up for fast reruns. Remove it with `scripts/demo-cluster.sh down`.

The tests exercise the real API, so failures usually mean a regression against Kubernetes or Prometheus:

- cluster connect, bad token, and missing-credential handling
- listing every resource type in the sidebar, plus get, search, and a ConfigMap create/update/delete round trip
- pod logs, the exec WebSocket, and the events stream
- every dashboard PromQL query returns data. This catches metric names that drift between kube-prometheus-stack releases. A fresh cluster gets up to 3 minutes to collect samples.
- a headless browser check that the dashboard and a resource list render without page errors

`npm test` (unit tests, CI) does not run them.

## Demo in the browser

```bash
scripts/demo-cluster.sh up && eval "$(scripts/demo-cluster.sh env)"
npm run dev -- --port 5173 --strictPort   # picks up PROMETHEUS_URL from the env
echo $SK8R_DEMO_TOKEN                     # bearer token for the UI
```

In the UI, choose **Add Cluster** and enter server `https://demo.localhost:16443`, the token, and **Skip TLS verification**. Use `demo.localhost` rather than `127.0.0.1`: the cluster picker shows the hostname, and `*.localhost` resolves to loopback without editing `/etc/hosts`.

Let Prometheus collect for 10 minutes or more before taking screenshots, or the charts look empty.

## README screenshots

[docs/demo/screenshots.mjs](docs/demo/screenshots.mjs) drives headless Chromium through Playwright, a devDependency. It seeds the cluster into localStorage, so the UI step above isn't needed. Run it with the dev server from the previous section running:

```bash
node docs/demo/screenshots.mjs docs/images                  # all shots
node docs/demo/screenshots.mjs docs/images dashboard,logs   # only some
```

Shots are 1440×900 at 2× scale. `dashboard.png` stays at full size as the README hero. Downscale the gallery shots to keep the repo small (macOS):

```bash
for f in nodes events logs terminal search learning create light; do sips -Z 1440 docs/images/$f.png; done
```

Look through every image before committing. Check that nothing outside the demo cluster appears.

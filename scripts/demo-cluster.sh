#!/usr/bin/env bash
# Throwaway 3-node k3s cluster in Docker with Prometheus and fake workloads (see AGENTS.md).
#
#   scripts/demo-cluster.sh up      create or resume the cluster, port-forward Prometheus to :19090
#   scripts/demo-cluster.sh env     print exports (KUBECONFIG, SK8R_DEMO_SERVER, SK8R_DEMO_TOKEN)
#   scripts/demo-cluster.sh down    delete everything
#
# State lives in $SK8R_DEMO_DIR so ~/.kube/config and the user's helm repos are never touched.
set -euo pipefail

K3S_IMAGE=rancher/k3s:v1.33.5-k3s1
NET=sk8r-demo
NODES=(sk8r-demo-cp sk8r-demo-w1 sk8r-demo-w2)
API_PORT=16443
PROM_PORT=19090
DIR=${SK8R_DEMO_DIR:-${TMPDIR:-/tmp}/sk8r-demo}
ROOT=$(cd "$(dirname "$0")/.." && pwd)

export KUBECONFIG=$DIR/kubeconfig
export HELM_CACHE_HOME=$DIR/helm/cache HELM_CONFIG_HOME=$DIR/helm/config HELM_DATA_HOME=$DIR/helm/data

log() { echo "[demo-cluster] $*" >&2; }
running() { [ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null)" = true ]; }

start_node() { # name hostname args...
	local name=$1 host=$2
	shift 2
	if running "$name"; then return; fi
	if docker inspect "$name" >/dev/null 2>&1; then
		docker start "$name" >/dev/null
	else
		docker run -d --name "$name" --hostname "$host" --network $NET --privileged \
			-e K3S_TOKEN=sk8r-demo-token "$@" >/dev/null
	fi
	# node-exporter needs a shared root mount, which Docker containers don't have by default
	docker exec "$name" mount --make-rshared /
}

up() {
	mkdir -p "$DIR"
	docker network inspect $NET >/dev/null 2>&1 || docker network create $NET >/dev/null

	log "starting k3s nodes"
	start_node sk8r-demo-cp demo-control-plane -p 127.0.0.1:$API_PORT:6443 $K3S_IMAGE \
		server --node-name demo-control-plane --tls-san localhost --tls-san 127.0.0.1 \
		--write-kubeconfig-mode 644
	for i in 1 2; do
		start_node sk8r-demo-w$i demo-worker-$i -e K3S_URL=https://sk8r-demo-cp:6443 $K3S_IMAGE \
			agent --node-name demo-worker-$i
	done

	until docker exec sk8r-demo-cp test -f /etc/rancher/k3s/k3s.yaml; do sleep 2; done
	docker exec sk8r-demo-cp cat /etc/rancher/k3s/k3s.yaml |
		sed "s#https://127.0.0.1:6443#https://127.0.0.1:$API_PORT#" >"$KUBECONFIG"
	log "waiting for 3 ready nodes"
	until [ "$(kubectl get nodes --no-headers 2>/dev/null | grep -c ' Ready')" = 3 ]; do sleep 3; done

	if ! helm status kube-prometheus-stack -n monitoring >/dev/null 2>&1; then
		log "installing kube-prometheus-stack (takes a few minutes)"
		helm install kube-prometheus-stack kube-prometheus-stack \
			--repo https://prometheus-community.github.io/helm-charts \
			-n monitoring --create-namespace --wait --timeout 10m \
			--set alertmanager.enabled=false --set grafana.enabled=false \
			--set kubeEtcd.enabled=false --set kubeControllerManager.enabled=false \
			--set kubeScheduler.enabled=false --set kubeProxy.enabled=false \
			--set prometheus.prometheusSpec.scrapeInterval=15s >/dev/null
	fi

	log "applying demo workloads"
	kubectl apply -f "$ROOT/docs/demo/demo-workloads.yaml" >/dev/null
	kubectl -n monitoring rollout status statefulset/prometheus-kube-prometheus-stack-prometheus --timeout=5m >/dev/null

	port_forward
	log "ready: API https://demo.localhost:$API_PORT, Prometheus http://127.0.0.1:$PROM_PORT"
}

port_forward() {
	if curl -sf "http://127.0.0.1:$PROM_PORT/-/ready" >/dev/null; then return; fi
	[ -f "$DIR/port-forward.pid" ] && kill "$(cat "$DIR/port-forward.pid")" 2>/dev/null || true
	nohup kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus $PROM_PORT:9090 \
		>"$DIR/port-forward.log" 2>&1 &
	echo $! >"$DIR/port-forward.pid"
	for _ in $(seq 30); do
		curl -sf "http://127.0.0.1:$PROM_PORT/-/ready" >/dev/null && return
		sleep 1
	done
	log "Prometheus port-forward did not come up; see $DIR/port-forward.log"
	exit 1
}

env_exports() {
	echo "export KUBECONFIG=$KUBECONFIG"
	echo "export SK8R_DEMO_SERVER=https://demo.localhost:$API_PORT"
	echo "export SK8R_DEMO_TOKEN=$(kubectl create token sk8r-demo -n sk8r --duration=24h)"
	echo "export PROMETHEUS_URL=http://127.0.0.1:$PROM_PORT"
}

down() {
	[ -f "$DIR/port-forward.pid" ] && kill "$(cat "$DIR/port-forward.pid")" 2>/dev/null || true
	docker rm -f "${NODES[@]}" >/dev/null 2>&1 || true
	docker network rm $NET >/dev/null 2>&1 || true
	rm -rf "$DIR"
	log "removed"
}

case ${1:-} in
up) up ;;
env) env_exports ;;
down) down ;;
*)
	echo "usage: $0 up|env|down" >&2
	exit 2
	;;
esac

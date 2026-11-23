#!/usr/bin/env bash
# Builds sk8r, runs the production server against the demo cluster, and runs tests/integration.
# The cluster is left running for fast reruns; remove it with `scripts/demo-cluster.sh down`.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=${SK8R_TEST_PORT:-4173}

scripts/demo-cluster.sh up
eval "$(scripts/demo-cluster.sh env)"

npm run build >/dev/null

PORT=$PORT PROMETHEUS_URL=$PROMETHEUS_URL node server.js >"${TMPDIR:-/tmp}/sk8r-integration-server.log" 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
for _ in $(seq 30); do
	curl -sf "http://127.0.0.1:$PORT/" >/dev/null && break
	sleep 1
done

SK8R_TEST_URL=http://127.0.0.1:$PORT npx vitest run --config vitest.integration.config.ts "$@"

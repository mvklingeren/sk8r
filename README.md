# sk8r - A Kubernetes Dashboard clone

sk8r is a modern, open-source dashboard for your Kubernetes cluster. It provides a user-friendly interface to visualize and manage your cluster resources, view logs, and monitor metrics.

## Features

-   **Resource Management:** View, create, and manage Kubernetes resources like Pods, Deployments, Services, etc.
-   **Real-time Logs:** Stream logs from your pods directly in the UI.
-   **Metrics:** Visualize cluster and application metrics with Prometheus integration.
-   **Interactive Pod Shell:** Access a terminal inside your running pods.

## Prerequisites

Before you begin, ensure you have the following:

-   A running Kubernetes cluster.
-   `kubectl` installed and configured to connect to your cluster.
-   `docker` installed and running to build the container image.
-   A container registry (like Docker Hub) to push your image to.
-   **Prometheus:** The dashboard requires Prometheus for metrics. The default configuration expects Prometheus to be available at `http://kube-prometheus-stack-prometheus.monitoring:9090`. We recommend installing the [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) Helm chart, which provides this endpoint out of the box.

## Installation

The sk8r dashboard is distributed as a Docker image `mvkdev/sk8r-app:latest`.

1.  **Build and push the Docker image (if you are a maintainer or contributing):**
    ```sh
    docker buildx build --platform linux/amd64,linux/arm64 -t mvkdev/sk8r-app:latest --push .
    ```

2.  **Apply the Kubernetes manifests:**
    ```sh
    kubectl apply -f k8s/
    ```

## Accessing the Dashboard

The application is exposed via a `LoadBalancer` service. To find the external IP address to access the dashboard, run:

```sh
kubectl get service sk8r-app-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

Open your browser and navigate to the IP address returned by the command.

## Development

To run the application locally for development:

1.  **Install dependencies:**
    ```sh
    npm install
    ```

2.  **Start the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

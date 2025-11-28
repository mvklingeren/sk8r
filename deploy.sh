#!/bin/bash

# This script automates the build, push, and deployment of the sk8tes-app.

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
# Your Docker Hub username
DOCKERHUB_USERNAME="mvkdev"
# The name of the application's image
IMAGE_NAME="sk8tes-app"
# The tag for the image
TAG="latest"
# --- End of Configuration ---

# 1. Build and push the multi-platform Docker image
echo "--- Building and pushing multi-platform Docker image to $DOCKERHUB_USERNAME/$IMAGE_NAME:$TAG ---"
docker buildx build --platform linux/amd64,linux/arm64 -t "$DOCKERHUB_USERNAME/$IMAGE_NAME:$TAG" --push .
echo "Image push complete."

# 2. Apply all Kubernetes manifests from the k8s directory
echo "--- Applying Kubernetes manifests ---"
kubectl apply -f k8s/
echo "Deployment to Kubernetes complete!"

# 3. You can check the status of the rollout with:
# kubectl rollout status deployment/sk8tes-app

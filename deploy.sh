#!/bin/bash

# Check if IMAGE_URI is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <IMAGE_URI>"
    echo "Example: $0 058264503680.dkr.ecr.ap-south-1.amazonaws.com/mern-app:latest"
    exit 1
fi

IMAGE_URI=$1

# Replace placeholder with actual image URI
sed "s|IMAGE_PLACEHOLDER|$IMAGE_URI|g" k8s/app-deployment.yaml > k8s/app-deployment-temp.yaml

# Apply the deployment
kubectl apply -f k8s/app-deployment-temp.yaml

# Clean up temp file
rm k8s/app-deployment-temp.yaml

# Check rollout status
kubectl -n mern rollout status deployment/mern-app

echo "Deployment updated with image: $IMAGE_URI"
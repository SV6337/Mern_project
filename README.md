# MERN-2 (Node + React + MongoDB)

Production-ready MERN app with Docker, Kubernetes manifests, and Jenkins pipeline support.

## Project Structure

- `server.js` - backend entry point
- `frontend/` - React app
- `Models/`, `Routes/`, `views/` - backend modules
- `k8s/` - Kubernetes manifests (namespace, app, mongo, pvc, services)
- `Jenkinsfile` - CI/CD pipeline

## Prerequisites

- Docker
- `kubectl`
- AWS CLI (for EKS/ECR deployments)
- Access to your EKS cluster and ECR repository

## Local Run (Docker)

```bash
docker build -t mern-app:latest .
docker run -p 5000:5000 mern-app:latest
```

Health endpoint:

```bash
curl http://localhost:5000/api/health
```

## Kubernetes Deploy (EKS)

From repo root:

```bash
kubectl apply -k k8s
```

Set app image (required: use a real image tag):

```bash
export IMAGE_URI=058264503680.dkr.ecr.ap-south-1.amazonaws.com/mern-app:latest
kubectl -n mern set image deployment/mern-app mern-app="$IMAGE_URI"
kubectl -n mern rollout status deployment/mern-app --timeout=300s
```

Verify:

```bash
kubectl -n mern get pods -o wide
kubectl -n mern get svc
kubectl -n mern logs deployment/mern-app --tail=50
```

## Accessing the App on EKS

Current service type is `NodePort`:

- Service port mapping: `5000:30050/TCP`
- URL format: `http://<worker-node-public-ip>:30050`
- Health check: `http://<worker-node-public-ip>:30050/api/health`

Get worker public IPs:

```bash
kubectl get nodes -o wide
```

## Common Issues & Fixes

### 1) `spec.template.spec.containers[0].image: Required value`
Cause: `IMAGE_URI` is empty.

Fix:

```bash
export IMAGE_URI=<your-ecr-uri>:<tag>
echo "$IMAGE_URI"
kubectl -n mern set image deployment/mern-app mern-app="$IMAGE_URI"
```

Do **not** use `<tag>` literally in bash.

### 2) `error: no context exists with the name ...`
Cause: EKS context not added to kubeconfig.

Fix:

```bash
aws eks update-kubeconfig --region ap-south-1 --name mern-cluster-2
kubectl config get-contexts
```

### 3) Node IP URL times out
Cause: Security group does not allow NodePort traffic.

Fix (example for port `30050`):

```bash
aws ec2 authorize-security-group-ingress \
  --region ap-south-1 \
  --group-id <worker-node-sg-id> \
  --protocol tcp \
  --port 30050 \
  --cidr 0.0.0.0/0
```

Then test:

```bash
curl http://<worker-node-public-ip>:30050/api/health
```

## Recommended for Stable Public URL

Node public IPs can change. For stable access, change `mern-app` service to `LoadBalancer` (or use Ingress + domain).

## Jenkins

Pipeline file is available in `Jenkinsfile`.

Existing docs:

- `SETUP_COMPLETE.md`
- `JENKINS.md`
- `k8s/README.md`

## Cleanup

```bash
kubectl delete -k k8s
```

# Kubernetes setup (MERN + MongoDB)

## 1) Build app image
From project root:

```bash
docker build -t mern-app:latest .
```

If you use Minikube, build inside Minikube Docker daemon first:

```bash
minikube docker-env --shell powershell | Invoke-Expression
docker build -t mern-app:latest .
```

## 2) Deploy all manifests

```bash
kubectl apply -k k8s
```

## 3) Verify

```bash
kubectl get pods -n mern
kubectl get svc -n mern
kubectl logs -n mern deploy/mern-app
```

## 4) Access app
- NodePort service exposes app on port `30050`.
- On Docker Desktop Kubernetes: http://localhost:30050
- On Minikube:

```bash
minikube service mern-app -n mern --url
```

## 5) Cleanup

```bash
kubectl delete -k k8s
```

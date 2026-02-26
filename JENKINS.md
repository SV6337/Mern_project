# Jenkins setup for this project

## 1) Jenkins prerequisites
Install Jenkins with these tools available on the Jenkins agent:
- Node.js (compatible with project)
- npm
- Docker CLI + running Docker daemon
- kubectl configured to your cluster context (for deploy stage)

Recommended Jenkins plugins:
- Pipeline
- Git
- Workspace Cleanup
- Timestamper

## 2) Create Jenkins Pipeline job
1. In Jenkins, create a new item -> **Pipeline**.
2. In **Pipeline** section, choose **Pipeline script from SCM**.
3. Select your Git repository.
4. Set **Script Path** to `Jenkinsfile`.

## 3) Pipeline behavior
The pipeline stages are:
1. Checkout
2. Install backend dependencies (`npm ci`)
3. Install frontend dependencies (`frontend/npm ci`)
4. Build frontend (`frontend/npm run build`)
5. Build Docker image (`docker build -t <image>:<tag> .`)
6. Deploy to Kubernetes (optional):
   - `kubectl apply -k k8s`
   - `kubectl set image deployment/mern-app ...`
   - rollout status check

## 4) Pipeline parameters
- `DEPLOY_TO_K8S` (default `true`): toggle Kubernetes deploy stage
- `K8S_NAMESPACE` (default `mern`)
- `IMAGE_NAME` (default `mern-app`)
- `IMAGE_TAG` (default uses Jenkins `BUILD_NUMBER`)

## 5) First run
- Run one build with `DEPLOY_TO_K8S=false` to validate CI.
- Run next build with `DEPLOY_TO_K8S=true` to deploy.

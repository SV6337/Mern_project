# Jenkins setup for this project (Render deployment)

## 1) Jenkins prerequisites

Install Jenkins with these tools available on the Jenkins agent:

- Node.js (compatible with project)
- npm
- Docker CLI + running Docker daemon

Recommended Jenkins plugins:

- Pipeline
- Git
- Workspace Cleanup
- Timestamper

## 2) Run Jenkins in Docker (recommended for this repo)

From project root:

```powershell
docker rm -f jenkins
docker compose -f jenkins/docker-compose.jenkins.yml up -d --build
```

Open Jenkins at:

- http://localhost:8081

Get initial admin password:

```powershell
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## 3) Create Jenkins Pipeline job

1. In Jenkins, create a new item -> **Pipeline**.
2. In **Pipeline** section, choose **Pipeline script from SCM**.
3. Select your Git repository.
4. Set **Script Path** to `Jenkinsfile`.

## 4) Pipeline behavior

The pipeline stages are:

1. Checkout
2. Install backend dependencies (`npm ci`)
3. Install frontend dependencies (`frontend/npm ci`)
4. Build frontend (`frontend/npm run build`)
5. Build Docker image (`docker build -t mern-app:<build-number> .`)
6. Trigger Render deploy hook (optional)

## 5) Pipeline parameters

- `DEPLOY_TO_RENDER` (default `false`): toggle Render deploy hook stage
- `RENDER_DEPLOY_HOOK_URL` (default empty): required if deploy stage is enabled

## 6) First run

- Run one build with `DEPLOY_TO_RENDER=false` to validate CI.
- Add your Render deploy hook URL and run with `DEPLOY_TO_RENDER=true`.

Render deploy hook path in dashboard:

- Your service -> **Settings** -> **Deploy Hook**

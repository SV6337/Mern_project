# Complete Jenkins + Render + Atlas Setup Guide

## Status

- Jenkins local CI: ready
- App deployment target: Render Web Service
- Database: MongoDB Atlas (external)

## 1. Access Jenkins

- URL: http://localhost:8081

If this is your first launch, get the initial admin password:

```powershell
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## 2. Create Pipeline Job

1. Click **New Item**
2. Job name: **MERN-Pipeline**
3. Type: **Pipeline**
4. In Pipeline config:
   - **Pipeline script from SCM**
   - SCM: Git
   - Repository URL: your repo URL
   - Script Path: `Jenkinsfile`

## 3. Configure Render

1. Create a Render Web Service from this repo (or use `render.yaml` Blueprint).
2. Set env var:
   - `MONGODB_URI` = MongoDB Atlas URI
3. Copy Deploy Hook URL from:
   - Service -> **Settings** -> **Deploy Hook**

## 4. Run Pipeline

1. Click **Build with Parameters**
2. CI-only run:
   - `DEPLOY_TO_RENDER = false`
3. CI + deploy run:
   - `DEPLOY_TO_RENDER = true`
   - `RENDER_DEPLOY_HOOK_URL = <your-render-deploy-hook-url>`

Pipeline does:

- Install backend/frontend dependencies
- Build frontend
- Build Docker image for CI validation
- Trigger Render deploy hook (optional)

## 5. Access App

- Local Jenkins: http://localhost:8081
- Live app: your Render service URL (from Render dashboard)

## 6. Cleanup (Local CI)

```powershell
docker compose -f jenkins/docker-compose.jenkins.yml down
docker compose down
```

# Complete Docker + Kubernetes + Jenkins Setup Guide

## Status: ✅ All systems running

### 1. Access Jenkins
- **URL:** http://localhost:8081
- **Initial Admin Password:** `b392995b9ba14a31a86274c270252322`

Steps:
1. Open http://localhost:8081 in browser
2. Paste the password above to unlock Jenkins
3. Click "Install suggested plugins"
4. Create admin user (user/password of your choice)
5. Click "Start using Jenkins"

### 2. Create Pipeline Job
1. Click **New Item** (top left)
2. Enter Job Name: **MERN-Pipeline**
3. Select **Pipeline**
4. Click **OK**

In the **Pipeline** section:
- Select **Pipeline script from SCM**
- **SCM:** Git
- **Repository URL:** (your git repo URL, e.g., https://github.com/your-user/MERN-2.git)
- **Script Path:** `Jenkinsfile`
- Click **Save**

### 3. Run Pipeline
1. Click **Build with Parameters**
2. Choose:
   - First run: `DEPLOY_TO_K8S = false` (CI validation only)
   - Second run: `DEPLOY_TO_K8S = true` (includes Kubernetes deploy)
3. Click **Build**

The pipeline will:
- Install dependencies
- Build frontend
- Build Docker image (`mern-app:${BUILD_NUMBER}`)
- Deploy to Kubernetes (if enabled)

### 4. Monitor Build
- Click the build number in **Build History**
- View **Console Output** for live logs

### 5. Access Your App
- Kubernetes deployed app running at: http://localhost:30050
- View pod status: `kubectl get pods -n mern`
- View logs: `kubectl logs -n mern deploy/mern-app`

### 6. Cleanup
Stop all services:
```powershell
docker compose -f jenkins/docker-compose.jenkins.yml down
kubectl delete -k k8s
docker compose down
```

# MERN-2 (Node + React + MongoDB Atlas)

MERN app with a Node/Express backend, React frontend, Jenkins CI pipeline, and Render deployment support.

## Project Structure

- `server.js` - backend entry point
- `frontend/` - React app
- `Models/`, `Routes/`, `views/` - backend modules
- `Jenkinsfile` - CI + optional Render deploy hook
- `render.yaml` - Render Blueprint configuration

## Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas connection string

## Local Run

Create a `.env` file in project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<db>?retryWrites=true&w=majority
PORT=5000
```

Install dependencies and run:

```bash
npm ci
npm --prefix frontend ci
npm run build
npm start
```

App URL:

- `http://localhost:5000`

Health endpoint:

- `http://localhost:5000/api/health`

## Docker Compose (Atlas)

Set `MONGODB_URI` in `.env`, then:

```bash
docker compose up -d --build
```

## Deploy Backend to Render (Docker)

### Option A: Render Blueprint (recommended)

1. Push this repo to GitHub.
2. In Render, create **New +** -> **Blueprint**.
3. Select this repo.
4. Render reads `render.yaml` and creates Docker web service `mern-2-api`.
5. Set environment variable:
   - `MONGODB_URI` = your Atlas URI
   - `SERVE_FRONTEND=false`
6. Deploy.

### Option B: Manual Web Service

- Environment: `Docker`
- Dockerfile path: `./Dockerfile`
- Docker context: `.`
- Environment variables:
   - `MONGODB_URI`
   - `SERVE_FRONTEND=false`

## Deploy Frontend to Vercel

1. In Vercel, import the same GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Framework preset: `Create React App`.
4. Add environment variable:
    - `REACT_APP_API_BASE_URL=https://<your-render-service>.onrender.com`
5. Deploy.

Frontend routes are handled by `frontend/vercel.json`.

## Jenkins + Render

Pipeline stages:

1. Checkout
2. Install backend dependencies
3. Install frontend dependencies
4. Build frontend
5. Build Docker image (CI validation)
6. Trigger Render deploy hook (optional)

Pipeline parameters:

- `DEPLOY_TO_RENDER` (default `false`)
- `RENDER_DEPLOY_HOOK_URL` (required if deploy is enabled)

Get your deploy hook from Render:

- Render Dashboard -> your service -> Settings -> Deploy Hook

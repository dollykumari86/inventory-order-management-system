# Nexus Inventory & Order Management System

A full-stack inventory and order management system featuring a FastAPI backend with PostgreSQL, business rules validation (unique SKUs, unique emails, transaction-based stock deduction), and a premium glassmorphic React frontend.

---

## 🚀 Local Quickstart

### 1. Backend & Database (via Docker Compose)
To start the database and backend in a unified Docker network:
```bash
docker-compose up --build
```
The FastAPI backend will spin up and auto-initialize the PostgreSQL tables, listening on `http://localhost:8000`. You can visit `http://localhost:8000/docs` to view the interactive Swagger API documentation.

### 2. Frontend React Application
Ensure you have Node.js installed, then run:
```bash
cd frontend
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`.
> **Note:** There is a **Backend API Connection** input at the top of the frontend page. You can dynamically switch it between `http://localhost:8000` (for local dev) and your hosted production URL!

---

## 🐙 Deployment & Submission Guide

Use the following step-by-step instructions to upload your code, push images, and host the applications.

### 1. Upload Code to GitHub
Initialize git in the root folder `inventory-order-management-system/`, create a repository, and push:
```bash
git init
git add .
git commit -m "feat: initial commit of inventory order management system"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

### 2. Build & Push Backend Docker Image
Make sure you are logged into Docker Hub, then build, tag, and push:
```bash
# Log in to your Docker Hub account
docker login

# Build & tag the image
docker build -t <YOUR_DOCKER_HUB_USERNAME>/inventory-order-backend:latest ./backend

# Push the image
docker push <YOUR_DOCKER_HUB_USERNAME>/inventory-order-backend:latest
```

### 3. Deploy Backend (Render / Railway)
1. Go to [Render](https://render.com) and create a new **PostgreSQL Database**. Copy the internal/external Database URL.
2. Create a new **Web Service**, connect it to your GitHub Repository, and set:
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add Environment Variable:
   - `DATABASE_URL` = `<YOUR_DATABASE_URL>`
4. Copy the generated Web Service URL (e.g., `https://inventory-order-backend.onrender.com`).

*(Alternative: You can also deploy using your Docker Hub image directly on Render as a Web Service by choosing the "Existing Image" source and specifying your image ID).*

### 4. Deploy Frontend (Vercel)
1. Install the Vercel CLI (`npm install -g vercel`) or go to the [Vercel Dashboard](https://vercel.com).
2. Connect Vercel to your GitHub Repository or run in the `frontend` folder:
   ```bash
   cd frontend
   vercel
   ```
3. Set the build settings (Vercel auto-detects Vite):
   - **Framework Preset**: `Vite`
   - **Output Directory**: `dist`
4. Deploy the project and get your hosted URL (e.g., `https://inventory-order-management.vercel.app`).
5. Open your live frontend site and paste your backend API hosted URL into the configuration bar to connect them!

---

## 📝 Submission Form Details

Copy this template, fill in your links, and submit:

```markdown
### Inventory & Order Management System Submission

- **GitHub Repository Link:** <YOUR_GITHUB_REPO_URL>
- **Docker Hub Image Link:** docker.io/<YOUR_DOCKER_HUB_USERNAME>/inventory-order-backend:latest
- **Frontend Hosted URL:** <YOUR_VERCEL_FRONTEND_URL>
- **Backend API Hosted URL:** <YOUR_RENDER_BACKEND_URL>
```

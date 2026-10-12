# AI-Powered Smart Internship & Placement Management System

Three roles (Admin, Placement Officer, Student). There is no public sign-up: the admin creates accounts.

| Part | Folder | Tech |
|---|---|---|
| Website | `frontend/` | React, Vite, Tailwind |
| API | `backend/` | Express, Supabase |
| Resume AI | `ai-service/` | FastAPI, PyMuPDF, scikit-learn |
| Data | Supabase | Postgres, Auth, Storage |

## What each role can do
- **Admin**: users, skills, questions and assessments, companies, dashboard.
- **Placement officer**: companies and jobs, applications with resume, assessment scores, eligibility and an AI match breakdown, status updates (the student is notified).
- **Student**: profile, open jobs with eligibility and AI job matches, apply, resume upload, assessments with timer and scoring, skill scores, results, notifications.

## Run locally
1. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`, then fill in the Supabase values. Never commit a file with real keys.
2. In the Supabase SQL editor run, in order: `backend/sql/001a_columns.sql`, `001b_functions.sql`, `002_restore_open_access_for_team_code.sql`, `003_ai_breakdown.sql`. Check with `node backend/scripts/check-supabase.js`.
3. Backend: `cd backend && npm install && npm start` (port 5000).
4. AI service: `cd ai-service && python -m venv .venv && .venv/Scripts/activate && pip install -r requirements.txt && uvicorn app.main:app --port 8000`. Set `AI_SERVICE_URL=http://localhost:8000` in `backend/.env`.
5. Frontend: `cd frontend && npm install && npm run dev`.

## Deploy
- **Backend and AI service (Render)**: New > Blueprint > this repo (`render.yaml`). Fill the asked values: the three Supabase keys, `FRONTEND_URL` (your Vercel address) and `AI_SERVICE_URL` (the AI service address Render shows).
- **Frontend (Vercel)**: import the repo, set the root directory to `frontend`, and add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_API_BASE_URL` (the Render API address plus `/api`).
- In Supabase Auth settings add the Vercel address to the allowed redirect URLs (needed for password reset).

## Tests
`cd backend && npm test` and `cd ai-service && pip install -r requirements-dev.txt && pytest`.

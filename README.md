# TaskFlow

A task manager with AI planning. Add tasks with a priority, deadline and time estimate, then let Gemini summarize your workload, recommend an order, and build a **Focus Plan** that fits the time you have today.

**Live demo:** [https://YOUR-FRONTEND.onrender.com](https://taskflow-pn3x.onrender.com/)
*(Hosted on a free tier: the first load may take up to a minute while the backend wakes up.)*

## Features

- **Task dashboard:** add, edit, complete and delete tasks, each with a priority, deadline and time estimate. Filter by all, pending or completed.
- **AI workload analysis:** Gemini summarizes your pending work, recommends an order and explains what to do next.
- **Focus Plan:** choose how much time you have; TaskFlow returns a prioritized plan that fits it.

<img width="1915" height="970" alt="image" src="https://github.com/user-attachments/assets/3a883e6a-dc8b-459f-b3c7-74e7eff17bb6" />


## Tech stack

| Part | Technology |
|---|---|
| Frontend | React + Vite, plain CSS |
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas |
| AI | Google Gemini (`gemini-3.5-flash-lite`) via the `google-genai` SDK |
| Hosting | Render |

## How the AI is kept reliable

AI output is treated as untrusted input:

1. **Structured output:** Gemini is given a JSON schema and returns only that shape.
2. **Schema validation:** the backend re-validates the reply with Pydantic.
3. **Semantic checks:** every task id in the response must exist and appear only once. On failure, the request is retried once, then returns a clear error.
4. **Ids only:** the model returns task ids. Titles and details come from the database, so the AI cannot invent or alter tasks.
5. **Server-side time budget:** the backend recomputes the Focus Plan total from real estimates and drops tasks that don't fit, rather than trusting the model's arithmetic.
6. **Prompt-injection hygiene:** task text is passed as data with instructions not to obey it, and any stray ids in prose are replaced with titles.
7. **Key safety:** the Gemini API key stays on the server and never reaches the browser.

## Project structure

```
taskflow/
  frontend/
    src/
      App.jsx        task dashboard
      AIPanel.jsx    AI summary and Focus Plan UI
      api.js         shared fetch helper
      App.css        styling
      main.jsx       React entry point
  backend/
    main.py          API endpoints and validation models
    database.py      MongoDB connection
    ai.py            Gemini integration and response checks
    requirements.txt
    .env.example
```

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check the server and database connection |
| GET | `/api/tasks` | List tasks, newest first |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/{id}` | Update any fields of a task |
| DELETE | `/api/tasks/{id}` | Delete a task |
| POST | `/api/ai/summary` | AI workload summary and recommended order |
| POST | `/api/ai/focus-plan` | Focus Plan for `{ "minutes": 120 }` |

Interactive docs are available at `/docs` when the backend is running.

## Run locally

**Requirements:** Node 20.19+ (or 22+), Python 3.10+, a MongoDB Atlas cluster, and a Gemini API key.

**Backend**

```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1        # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # then fill in your values
uvicorn main:app --reload
```

**Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Environment variables

Backend (`backend/.env`):

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `DB_NAME` | Database name (`taskflow`) |
| `GEMINI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | Model name (`gemini-3.5-flash-lite`) |
| `FRONTEND_ORIGINS` | Comma-separated allowed origins for CORS |

Frontend (set at build time): `VITE_API_URL`, the backend's base URL.

## Deployment

Deployed on Render as two services: a Python web service (`backend`, started with `uvicorn main:app --host 0.0.0.0 --port $PORT`) and a static site (`frontend`, built with `npm run build`, published from `dist`).

## Known limitations and next steps

- No user accounts: tasks are shared by anyone using the deployment. Next step is authentication with per-user tasks.
- AI endpoints have no rate limiting. A production version would add per-user limits to protect API quota.
- Automated tests for the validation logic and endpoints.

# Socra — a Socratic tutor for General Paper

Socra is an AI tutoring app for the Singapore A-Level **General Paper (GP)**. A
student submits a GP essay question and is guided through a structured Socratic
dialogue that makes their thinking visible and pushes against it. It never hands
over a model answer — instead it builds an **Essay Blueprint** alongside the
conversation and tracks the reasoning moves the student demonstrates.

> Status: personal project, shared as a reference / portfolio piece. Not
> affiliated with Cambridge Assessment or SEAB.

## How it works

The dialogue moves through phases (`current_phase` in the per-turn metadata):

| Phase | Name | Focus |
|------:|------|-------|
| 1 | Question Autopsy & Thesis Lock | Command word, loaded terms, the two positions, iterating to a precise thesis |
| 2 | Argument Sketch | Skeleton-first — lock every topic sentence and the counter-argument claim before any paragraph development |
| 3 | Deep Dives | Student-selected: develop each paragraph, the counter-argument, and the conclusion independently |
| 6 | Complete | Session finished |

While the student works, the backend maintains a live **blueprint** (key terms,
thesis, paragraphs, counter-argument, conclusion) and a cross-session
**memory** profile (which of five thinking moves the student has mastered,
recurring strengths and weaknesses, score history).

## Tech stack

- **Frontend:** React 18 + Vite + Tailwind CSS v3
- **Backend:** Python 3.13+ + FastAPI + Uvicorn, `uv` for packaging
- **AI:** Anthropic Claude (`claude-3-7-sonnet-20250219` by default; override with `ANTHROPIC_MODEL`)
- **Data / auth:** Supabase (Postgres + Auth, Row Level Security)
- **Article search:** Exa AI (cached in Supabase, 7-day TTL)

## Prerequisites

- Node.js 18+
- Python 3.13+ and [`uv`](https://docs.astral.sh/uv/)
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [Anthropic API key](https://console.anthropic.com)
- An [Exa API key](https://exa.ai) — only needed for the article-search / "Learn" features

## Setup

### 1. Clone

```bash
git clone https://github.com/<you>/socra.git
cd socra
```

### 2. Supabase

Create a project, then apply the schema:

- **Dashboard:** SQL Editor → paste [`backend/schema.sql`](backend/schema.sql) → Run
- **or CLI:** `supabase db execute --file backend/schema.sql`

This creates all tables with Row Level Security policies. Email/password auth is
on by default in Supabase; no extra config needed.

To give an account access to the developer-only endpoints (eval viewer, session
reset), set its metadata in **Authentication → Users → (user) → Raw app
metadata**:

```json
{ "role": "developer" }
```

### 3. Backend

```bash
cd backend
cp .env.example .env      # then fill in the values (see below)
uv sync                   # creates .venv and installs dependencies
uv run uvicorn main:app --reload --port 8000
```

The API starts on `http://localhost:8000` (`GET /health` to check).

### 4. Frontend

```bash
cd frontend
cp .env.example .env      # then fill in the values (see below)
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment variables

### `backend/.env`

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | All AI calls |
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_ANON_KEY` | yes | Anon/public key — the backend builds a per-request client from the caller's JWT so RLS applies |
| `EXA_API_KEY` | for Learn mode | Article search + cache seeding |
| `ANTHROPIC_MODEL` | no | Model override; defaults to `claude-3-7-sonnet-20250219` |
| `FRONTEND_URL` | prod only | Added to the CORS allow-list; required when `RENDER` is set |
| `DEV_ACCOUNT_EMAIL` | no | Bypasses the session rate limit for this one account |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Only used by the standalone maintenance scripts (`query_db.py`, `fix_turn_db.py`, …), not the app. Some scripts read it as `SUPABASE_KEY` |

### `frontend/.env`

| Variable | Required | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Same project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | Same anon key |
| `VITE_API_URL` | no | Backend base URL; defaults to `http://localhost:8000` |
| `VITE_PUBLIC_POSTHOG_TOKEN` | no | Analytics; analytics is skipped if unset |
| `VITE_PUBLIC_POSTHOG_HOST` | no | Defaults to `https://us.i.posthog.com` |

## Project structure

```
backend/
  main.py              FastAPI app — session lifecycle, streaming chat, nudges
  ai.py                SocraAI — system prompt, SSE streaming, blueprint extraction
  memory.py            Cross-session student memory
  plato.py             "Plato" — greeting, insight notes, session reflection
  learn_routes.py      Article search via Exa, cached in Supabase
  bank_routes.py       Saved/archived blueprints (knowledge bank)
  blueprint_routes.py  Live blueprint CRUD (deep-merge PATCH)
  article_cache.py     Supabase-backed Exa cache
  schema.sql           Supabase schema + RLS policies
  data/fixtures/       Scripted conversations for the eval framework
  run_evals.py         Replay-based evaluation harness

frontend/src/
  App.jsx              Routes + session re-hydration
  components/          Screens (chat, blueprint, bank, profile, …)
  context/             Auth + session providers
  lib/supabase.js      fetchWithAuth — injects the Supabase bearer token
```

## Tests & evaluations

```bash
# Backend — replay fixtures through SocraAI and check SSE / metadata shape
cd backend && uv run python run_evals.py     # needs ANTHROPIC_API_KEY

# Frontend — Playwright
cd frontend && npm test
```

## Deployment

The repo includes a [`backend/render.yaml`](backend/render.yaml) (Render web
service) and a [`frontend/vercel.json`](frontend/vercel.json) (Vercel). Set the
backend's `FRONTEND_URL` to the deployed frontend origin so CORS allows it, and
point the frontend's `VITE_API_URL` at the deployed backend.

## License

[MIT](LICENSE)

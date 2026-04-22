# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (run from `backend/`)
```bash
# Start dev server
uvicorn main:app --reload --port 8000
# or without activating venv:
uv run uvicorn main:app --reload --port 8000

# Run evaluations (requires ANTHROPIC_API_KEY)
python run_evals.py

# Test streaming manually
python test_chat.py

# Article cache management
python seed_cache.py           # seed all GP questions
python seed_cache.py --dry-run
python seed_cache.py --force   # re-fetch all
python refresh_cache.py
python refresh_cache.py --stats
```

### Frontend (run from `frontend/`)
```bash
npm install
npm run dev      # starts at http://localhost:5173
npm run build
npm run lint
```

## Environment Variables

**Backend** — copy `backend/.env.example` to `backend/.env`:
- `ANTHROPIC_API_KEY` — required for all AI calls
- `EXA_API_KEY` — required for article search (`learn_routes.py`)
- `SUPABASE_URL` + `SUPABASE_JWT_SECRET` — database + auth
- `ANTHROPIC_MODEL` — defaults to `claude-3-7-sonnet-20250219`
- `DEV_ACCOUNT_EMAIL` — bypasses session rate limits for this account

**Frontend** — copy `frontend/.env.example` to `frontend/.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Architecture

Socra is a Socratic tutoring app for Singapore A-Level General Paper (GP). A student submits a GP essay question and is guided through a 6-phase dialogue by SocraAI, which simultaneously builds an "Essay Blueprint" in the background.

### Backend (`backend/`)

FastAPI app with four route modules registered in `main.py`:

| Module | Prefix | Purpose |
|---|---|---|
| `main.py` | `/api/session/*` | Session lifecycle, streaming chat, nudges |
| `learn_routes.py` | `/api/learn` | Article search via Exa AI, cached in Supabase |
| `bank_routes.py` | `/api/bank` | Saved/archived blueprints (knowledge bank) |
| `blueprint_routes.py` | `/api/blueprint` | Live blueprint CRUD with deep-merge PATCH |

**`ai.py` — `SocraAI` class**

Uses `AsyncAnthropic` with prompt caching (ephemeral `cache_control`) on the system prompt. The system prompt encodes the full 6-phase Socratic framework.

Key methods:
- `stream_chat_response()` — streams SSE, strips `<thinking>` and `<metadata>` XML tags from visible output, then re-emits metadata as a separate structured SSE event
- `extract_blueprint_patch()` — non-streaming call after each turn; returns a JSON diff of newly established blueprint fields
- `generate_nudge()` — 2-sentence hint without revealing the answer
- `get_initial_chat_response()` — non-streaming call for the session-start message

**Streaming format (SSE):**
- `event: message\ndata: "<chunk>"` — visible text (JSON-encoded string)
- `event: metadata\ndata: {...}` — structured per-turn metadata
- `event: done\ndata: [DONE]` — stream terminator

**Per-turn metadata shape:**
```json
{
  "current_phase": 1–6,
  "question_score": 0–30,
  "insight_unlocked": "string or null",
  "student_strengths": ["..."],
  "challenge_patterns": ["..."],
  "moves_practiced": [1, 2, ...]
}
```

**Blueprint lifecycle in `main.py`:**
After each streaming chat turn, `run_blueprint_extraction()` runs as a background `asyncio.create_task`. It calls `extract_blueprint_patch()` then `patch_blueprint()` and updates `session_quality` flags (e.g. `question_autopsy_complete`, `both_sides_argued`, `thesis_refined`).

**Auth:** Supabase JWT via `HTTPBearer` in `dependencies.py`. Developer role is checked via `app_metadata.role == "developer"` (server-side only). Non-developer users are limited to 2 active sessions (HTTP 402 triggers the premium modal).

**Supabase tables:**
- `chat_sessions` — messages (full history), turn count, question
- `active_blueprints` — live blueprint JSON per session
- `saved_blueprints` — archived blueprints (knowledge bank)
- `cached_readings` / `cached_conflict_readings` — article cache (7-day TTL)

**`blueprint_routes.py` deep-merge rules:**
- `key_terms` — upsert by `term` string
- `paragraphs` — merge by index; null entries are skipped
- `counter_argument` — dict merge
- `session_quality` — dict merge
- All other scalar fields — overwrite if non-null

### Frontend (`frontend/src/`)

React 18 + Vite + Tailwind CSS v3. All routes are in `App.jsx`.

**Context providers (wrap the whole app):**
- `AuthContext` — Supabase auth state, `isDeveloper` flag
- `SessionContext` — cross-route session/reaction state

**Route structure:**
- `/` — `LandingScreen`
- `/login` — `LoginScreen`
- `/app` — `ThemeSelection` (GP theme picker)
- `/conflicts/:themeId` — `ConflictSelection`
- `/conflict/:conflictId/read` — `ConflictReading` (article canvas)
- `/mode` — `ModeChoice`
- `/learn` — `LearnMode` (article search)
- `/test/init` — `TestModeInit` (checks for existing session, then starts or resumes)
- `/test/:id` — `SessionRouteHandler` → `ChatInterface` (main Socratic chat)
- `/bank` — `SavedBlueprints`
- `/profile` — `ProfileScreen`

**Session re-hydration:** Navigating directly to `/test/:id` triggers `handleRehydrateSession` in `App.jsx`, which fetches the full session from `GET /api/session/:id` and restores `resumeHistory`, `initialTurn`, and `initialScore`. The `ChatInterface` is keyed by session ID to force remount when switching sessions.

**API calls:** All authenticated requests use `fetchWithAuth` from `frontend/src/lib/supabase.js`, which injects the Supabase Bearer token. The backend base URL is hardcoded to `http://localhost:8000` — update both `App.jsx` and `lib/supabase.js` when deploying.

**UI theme:** "Refined Dark Academia" — `tailwind.config.js` defines custom colors (`background`, `textDefault`, `textMuted`, `amber`, `borderDark`). Typography uses Google Fonts: `Playfair Display` (serif headings), `Lora` (body), `DM Mono` (code/labels).

### Evaluation framework (`backend/run_evals.py`)

Replay-based. Fixtures in `backend/data/fixtures/` (`lazy_student.json`, `strong_student.json`). Each fixture is a pre-scripted conversation; the eval replays it through `SocraAI` and checks:
1. Metadata block shape (all required keys present, correct types)
2. No metadata/thinking tags leaking into visible text
3. SSE streaming format correctness

Logs written to `backend/data/eval_logs/`.

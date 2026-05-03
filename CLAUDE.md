# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (run from `backend/`)
Run all python scripts after activating the .venv virtual environment.

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
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_KEY` — database + auth (tokens are verified via Supabase API, no JWT secret needed locally)
- `ANTHROPIC_MODEL` — defaults to `claude-3-7-sonnet-20250219`
- `DEV_ACCOUNT_EMAIL` — bypasses session rate limits for this account

**Frontend** — copy `frontend/.env.example` to `frontend/.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Architecture

Socra is a Socratic tutoring app for Singapore A-Level General Paper (GP). A student submits a GP essay question and is guided through a 3-phase Socratic dialogue by SocraAI (Phase 1: Question Autopsy → Phase 2: Argument Skeleton → Phase 3: Deep Dives), which simultaneously builds an "Essay Blueprint" in the background. Phase 6 is the session-complete state.

### Backend (`backend/`)

FastAPI app with five route modules registered in `main.py`:

| Module | Prefix | Purpose |
|---|---|---|
| `main.py` | `/api/session/*` | Session lifecycle, streaming chat, nudges |
| `learn_routes.py` | `/api/learn` | Article search via Exa AI, cached in Supabase |
| `bank_routes.py` | `/api/bank` | Saved/archived blueprints (knowledge bank) |
| `blueprint_routes.py` | `/api/blueprint` | Live blueprint CRUD with deep-merge PATCH |
| `plato_routes.py` | `/api/plato` | Plato AI — memory-aware greeting, insight notes, session reflection |

**`ai.py` — `SocraAI` class**

Uses `AsyncAnthropic` with prompt caching (ephemeral `cache_control`) on the system prompt. The system prompt encodes a 3-phase Socratic framework:
- **Phase 1** — Question Autopsy & Thesis Lock (command word, loaded terms, two positions, thesis iteration)
- **Phase 2** — Argument Sketching: skeleton-first. Locks all topic sentences + CA claim before any PEEL. When complete, emits `skeleton_complete: true` so the frontend can show the deep-dive selector.
- **Phase 3** — Deep Dives: student-selected. Each paragraph, the counter-argument, and the conclusion can be developed independently.
- **Phase 6** — Session complete.

**Five Move Tracking Layer:** Socra silently tracks which of 5 thinking moves the student has demonstrated themselves (not just explained by Socra). Emitted cumulatively in `moves_practiced`. The five moves: 1 = Interrogating question terms, 2 = Topic sentences that directly answer the question, 3 = Analytical links to the question's claim, 4 = Engaging opposing view at its strongest, 5 = Evaluating continuously rather than only in the conclusion.

**Scoring (`question_score`, 0–30):** Evaluated against CAIE A-Level GP Content Band Descriptors. Hard caps by phase: Phase 1 max 6, Phase 2 max 15, Phase 3 (early) max 24; 25–30 only after a paragraph deep dive AND conclusion deep dive are both complete.

Key methods:
- `stream_chat_response()` — streams SSE, strips `<thinking>` and `<metadata>` XML tags from visible output, then re-emits metadata as a separate structured SSE event
- `extract_blueprint_patch()` — non-streaming call after each turn; returns a JSON diff of newly established blueprint fields using tool calling for structured JSON output
- `generate_nudge()` — 2-sentence hint without revealing the answer
- `get_initial_chat_response()` — non-streaming call for the session-start message
- `merge_semantic_list()` — AI-powered deduplication for growing lists (insights, strengths, challenges) using tool calling; prevents synonym bloat across sessions
- `summarize_history()` — condenses middle conversation turns when message count exceeds 12 to manage token budget

**Streaming format (SSE):**
- `event: message\ndata: "<chunk>"` — visible text (JSON-encoded string)
- `event: metadata\ndata: {...}` — structured per-turn metadata
- `event: done\ndata: [DONE]` — stream terminator

**Per-turn metadata shape:**
```json
{
  "current_phase": 1, 2, 3, or 6,
  "question_score": 0–30,
  "insight_unlocked": "string or null",
  "skeleton_complete": true | false,
  "student_strengths": ["..."],
  "challenge_patterns": ["..."],
  "moves_practiced": [1, 2, ...]
}
```
`skeleton_complete` is `true` only on the exact turn all topic sentences and the CA claim are locked — this is the frontend signal to show the deep-dive selector.

**Blueprint lifecycle in `main.py`:**
After each streaming chat turn, `run_blueprint_extraction()` runs as a background `asyncio.create_task`. It calls `extract_blueprint_patch()` then `patch_blueprint()` and updates `session_quality` flags:
- `question_autopsy_complete` — all key terms have definitions
- `both_sides_argued` — counter-argument `their_claim` is set
- `argument_sketch_complete` — CA claim locked + ≥2 topic sentences locked (fires when skeleton is done)
- `thesis_refined` — thesis was updated at least once after initial set
- `analytical_links_count` — running count of paragraphs with a `link` field set

The chat endpoint also uses an optimistic `is_generating` row-lock (with a 60 s stale-lock timeout) on `chat_sessions` to prevent concurrent generation for the same session.

**Auth:** Supabase JWT via `HTTPBearer` in `dependencies.py`. Developer role is checked via `app_metadata.role == "developer"` (server-side only). Non-developer users are limited to 2 active sessions (HTTP 402 triggers the premium modal).

**Supabase tables:**
- `chat_sessions` — messages (full history), turn count, question, `is_generating` lock fields
- `active_blueprints` — live blueprint JSON per session
- `saved_blueprints` — archived blueprints (knowledge bank)
- `cached_readings` / `cached_conflict_readings` — article cache (7-day TTL)
- `user_memory` — cross-session student profile: moves mastery, persistent strengths, recurring challenges, score history, session summaries (managed by `memory.py`)

**`memory.py` — cross-session memory:**
`update_user_memory()` is called after each turn where Phase 1 is complete. It aggregates moves mastery (5 named moves: `problem_deconstruction`, `perspective_taking`, `nuance_positionality`, `analytical_depth`, `cogent_insight`), persistent strengths/challenges (via `merge_semantic_list`), all unlocked insights, and score history. Mastery is considered achieved at count ≥ 3. `get_user_memory()` returns a default empty profile if no record exists.

**Blueprint schema (in `extract_blueprint_patch` tool):**
```json
{
  "key_terms": [{"term": "...", "definition": "..."}],
  "thesis": "...",
  "paragraphs": [{"title": "...", "topic_sentence": "...", "point": "...", "explanation": "...", "example": "...", "link": "..."}],
  "counter_argument": {"their_claim": "...", "its_merit": "...", "student_response": "..."},
  "conclusion": {"synthesis": "...", "qualification": "...", "lasting_impression": "..."}
}
```

**Session endpoints in `main.py`:**
- `POST /api/session/start` — creates session + initial blueprint, returns first AI message
- `POST /api/session/chat` — SSE streaming chat with optimistic lock
- `POST /api/session/nudge` — returns 2-sentence hint
- `GET /api/sessions` — list all user sessions with lightweight blueprint snapshots
- `GET /api/session/:id` — full session for re-hydration (filters dummy first user message)
- `DELETE /api/session/:id` — deletes session + blueprint

**Dev-only endpoints** (403 for non-developer accounts): `GET /api/dev/evals`, `GET /api/dev/evals/:run_id`, `DELETE /api/dev/reset-sessions`.

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

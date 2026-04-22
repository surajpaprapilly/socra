# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
uv sync
# or
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload

# Run evaluations
python run_evals.py

# Manual streaming test
python test_chat.py

# Seed article cache for all GP questions
python seed_cache.py
python seed_cache.py --dry-run    # preview
python seed_cache.py --force      # re-fetch all

# Refresh stale cache entries
python refresh_cache.py
python refresh_cache.py --stats
```

## Environment

Copy `.env.example` to `.env`. Required variables:
- `ANTHROPIC_API_KEY` — Claude API access
- `EXA_API_KEY` — article search
- `SUPABASE_URL` + `SUPABASE_JWT_SECRET` — database + auth

Optional:
- `ANTHROPIC_MODEL` — defaults to `claude-sonnet-4-6`
- `DEV_ACCOUNT_EMAIL` — bypasses session rate limits for this account

## Architecture

This is a FastAPI backend for a Socratic tutoring system targeting A-Level General Paper (GP) students. The core loop: a student submits a GP essay question → SocraAI guides them through 6 phases via Socratic dialogue → a structured essay blueprint is built incrementally in the background.


### Key modules

**`ai.py` — SocraAI class**
The AI engine. Uses `AsyncAnthropic` with prompt caching on the system prompt (ephemeral cache control). The system prompt encodes the full 6-phase Socratic framework. Key methods:
- `stream_chat_response()` — streams SSE chunks, strips `<thinking>` and `<metadata>` tags before sending to client, emits metadata as a separate SSE event
- `extract_blueprint_patch()` — non-streaming call that extracts a JSON diff of the student's essay blueprint from the conversation so far
- `generate_nudge()` — brief hint without revealing the answer

Metadata emitted per response:
```json
{
  "current_phase": 1–6,
  "question_score": 0–30,
  "insight_unlocked": "string or null",
  "student_strengths": ["..."],
  "challenge_patterns": ["..."]
}
```

**`main.py` — session management**
Core session endpoints: `POST /api/session/start`, `POST /api/session/chat` (SSE streaming), `POST /api/session/nudge`. After each chat turn, a background task calls `extract_blueprint_patch()` and merges the result into the active blueprint. Non-developer users are limited to 2 active sessions.

**`learn_routes.py` — article search**
Uses Exa AI to search curated sources (BBC, Economist, FT, Singapore press). Two endpoints: general question readings and two-sided conflict readings. Results are cached in Supabase for 7 days (`article_cache.py`). Claude adds a one-sentence "why relevant" explanation per article.

**`blueprint_routes.py` — blueprint state**
Tracks the student's evolving essay: key terms, thesis, paragraphs, counter-argument, insights. `PATCH` endpoint does intelligent deep-merge for list fields (append, not overwrite).

**`database.py` + `dependencies.py`**
Thin async wrappers over the Supabase client. Auth via Supabase JWT (HTTPBearer). Row-level security is enforced at the DB level. Developer role is stored in `app_metadata.role`.

### Supabase tables
- `chat_sessions` — conversation history, turn count, question
- `active_blueprints` — live blueprint JSON per session
- `saved_blueprints` — knowledge bank (user-archived essays)
- `cached_readings` / `cached_conflict_readings` — article cache

### Streaming format
Responses use SSE (`text/event-stream`). The stream sends text chunks as `data: <chunk>`, then a final `data: [METADATA] {...}` event. `<thinking>` and `<metadata>` XML tags are filtered before chunks reach the client; metadata is parsed and re-emitted as the structured event.

### Evaluation framework (`run_evals.py`)
Replay-based evals using conversation fixtures in `data/fixtures/` (`lazy_student.json`, `strong_student.json`). Checks metadata shape, no metadata leaking into visible text, and streaming format correctness. Logs to `data/eval_logs/`.

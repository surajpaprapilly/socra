# Socra Launch Plan

## Is It Worth Shipping?

**Yes — the core is genuinely good.** The 6-phase Socratic framework, real-time blueprint visualization, and per-student memory are rare and well-built. The UI is clean and consistent. Scoring against CAIE Band Descriptors is a real differentiator for the GP market.

**Three things will kill it at launch if not fixed:**
1. The 402 paywall hits after 2 sessions with zero upgrade path (Stripe is stubbed with a toast).
2. No onboarding — users land cold with no explanation of how the app works.
3. 7 frontend files hardcode `http://localhost:8000` — the whole app breaks in production.

---

## Phase 1: Critical Blockers (Must fix before deploying)

### 1.1 — Fix all hardcoded `localhost:8000` URLs in frontend ✅ DONE

All 7 frontend files now import and use `BASE_URL` from `lib/supabase.js`. `NudgeButton.jsx` was deleted; nudge logic lives in `ChatInterface.jsx` and also uses `BASE_URL`. The only remaining `localhost:8000` reference is the fallback default in `supabase.js:6` — intentional and correct.

### 1.2 — Fix CORS in backend

`backend/main.py:61-72` only allows `localhost:5173/5174`. Add the production Vercel domain:

```python
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    os.environ.get("FRONTEND_URL", ""),  # e.g. https://socra.vercel.app or custom domain
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Add `FRONTEND_URL` to Render environment variables.

### 1.3 — Fix backend startup command

The dev command uses `--reload` (watches for file changes — never use in production). Render start command must be:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```
Without `--host 0.0.0.0` the app binds to 127.0.0.1 and is unreachable externally. Render injects `$PORT`.

### 1.4 — Remove file writes, fix logging ❌ NOT DONE

Three issues still present in `backend/main.py`:
- **Line 40**: `logging.FileHandler(...)` for `memory_debug.log` — Render's filesystem is ephemeral. Replace the `_mfh` FileHandler with `logging.StreamHandler()`.
- **Line 165–166**: `open("error_log.txt", "w")` in the `start_session` exception handler — writes to disk and leaks full tracebacks. Replace with `logger.exception(e)` and remove the file write.
- **Line 34**: `logger.setLevel(logging.DEBUG)` hardcoded — will log sensitive data in prod. Set via env var:
  ```python
  log_level = os.environ.get("LOG_LEVEL", "INFO")
  logger.setLevel(getattr(logging, log_level))
  ```

---

## Phase 2: Deployment Setup

### 2.1 — Create `backend/render.yaml`

```yaml
services:
  - type: web
    name: socra-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: EXA_API_KEY
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_KEY
        sync: false
      - key: SUPABASE_JWT_SECRET
        sync: false
      - key: FRONTEND_URL
        sync: false
      - key: ANTHROPIC_MODEL
        value: claude-sonnet-4-6
      - key: LOG_LEVEL
        value: INFO
```

### 2.2 — Sync `requirements.txt` with `pyproject.toml` ❌ NOT DONE

`supabase` and `python-dotenv` are in `pyproject.toml` but missing from `requirements.txt`. Inside the venv:
```bash
pip install -e .
pip freeze > requirements.txt
```

### 2.3 — Create `frontend/vercel.json`

Without this, direct navigation to `/app`, `/test/:id`, etc. returns a 404 on Vercel (Vercel doesn't know to serve `index.html` for SPA routes):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 2.4 — Configure Vercel environment variables

Set these in the Vercel project dashboard under Settings > Environment Variables:
- `VITE_API_URL` → Render backend URL (e.g. `https://socra-backend.onrender.com`)
- `VITE_SUPABASE_URL` → Supabase project URL
- `VITE_SUPABASE_ANON_KEY` → Supabase anon key

### 2.5 — Configure Supabase auth redirect URLs

In Supabase > Authentication > URL Configuration, add:
- `https://<your-vercel-domain>.vercel.app/app`
- `https://<your-custom-domain>/app` (after DNS setup)

The frontend already uses `window.location.origin` for OAuth redirects (`LoginScreen.jsx:42`) so no code changes needed.

### 2.6 — Domain purchase and DNS

Simplest path: buy the domain directly inside Vercel (they handle DNS automatically). Otherwise Namecheap/Cloudflare → add CNAME records pointing to Vercel.
- Root domain → Vercel (frontend)
- Optionally `api.<domain>` → Render custom domain (add in Render dashboard)
- After DNS is live, update `FRONTEND_URL` env var in Render to the custom domain

---

## Phase 3: Paywall Fix ✅ DONE (Option A)

Free session limit raised to 10 (`main.py:95`). Stripe stub remains in `PremiumModal.jsx` — implement post-launch once you have users willing to pay.

---

## Phase 4: Product Polish (Pre-launch, high impact)

### 4.1 — Minimal onboarding (3–4 hours) ❌ NOT DONE

New users land at `/app` with zero context. Add a one-time modal that:
- Explains the 6-phase flow in 3 bullets (Autopsy → Skeleton → Deep Dives → Blueprint)
- Shows what a score of 25+ means vs 15
- Only shows once (store flag in `localStorage`)

### 4.2 — Expand landing page value prop ✅ DONE

`LandingScreen.jsx` now composes Hero, PainSection, HowItWorks, and ClosingCTA sections — well beyond the original 36-line stub.

### 4.3 — Feedback widget ✅ BONUS (not in original plan)

`FeedbackWidget.jsx` + `backend/feedback_routes.py` added. Gives users a way to submit in-app feedback during beta.

---

## Deployment Execution Order

1. ~~Fix hardcoded localhost in 7 frontend files~~ ✅
2. Fix CORS in `backend/main.py` (Phase 1.2) ← **next**
3. Fix logging — remove file writes, switch to stdout (Phase 1.4) ← **next**
4. ~~Raise free-tier session limit to 10~~ ✅
5. Create `backend/render.yaml` (Phase 2.1) ← **next**
6. Create `frontend/vercel.json` (Phase 2.3) ← **next**
7. Sync `requirements.txt` (Phase 2.2) ← **next**
8. Deploy backend to Render — connect GitHub repo, set all env vars
9. Deploy frontend to Vercel — connect GitHub repo, set env vars
10. Buy domain — configure DNS to Vercel; add custom domain to Render
11. Update Supabase redirect URLs (Phase 2.5)
12. Update `FRONTEND_URL` in Render to the custom domain
13. Smoke test end-to-end

---

## Post-Launch (Nice to Have)

- Stripe integration (after validating willingness to pay)
- Help modal explaining scoring bands (what Band 3 vs 4 means)
- Mobile testing on real devices (tab switcher in `ChatInterface.jsx:360` exists, untested)
- Learn Mode UX clarification (currently buried — promote it or mark as beta)
- Conflict reading feature polish

---

## Smoke Test Checklist

- [x] All 7 frontend files use `BASE_URL` — no `localhost:8000` in built JS
- [ ] Navigating directly to `/app` on Vercel doesn't 404
- [ ] Navigating directly to `/test/:id` re-hydrates the session correctly
- [ ] New user Google OAuth redirects back to the app (not localhost)
- [ ] Chat streams work (SSE from Render through the custom domain)
- [ ] Blueprint saves after a full session
- [ ] Profile screen loads with data
- [x] Session limit is 10 (not 2)
- [ ] Dev endpoints (`/api/dev/*`) return 403 for non-developer accounts
- [ ] No secrets visible in browser network tab
- [ ] Render logs show INFO-level output (not DEBUG)
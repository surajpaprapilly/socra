---
name: deployability-enforcer
description: >
  Proactive deployment guardrail for a Python/FastAPI + React/Vite project
  targeting Railway, Render, or Fly.io. Intercepts code being written or
  modified and flags any patterns that would break deployment, then suggests
  an inline fix. Trigger this skill whenever Claude is about to write or edit:
  FastAPI route files, Uvicorn start commands, Vite config, environment variable
  handling, CORS configuration, Dockerfile or platform config files
  (railway.toml, render.yaml, fly.toml), any file that reads secrets or config,
  or any fetch/axios/HTTP client code in the frontend. Also trigger when the
  user says "write me a FastAPI app", "add a new route", "set up CORS",
  "configure my environment", "write a Dockerfile", or any task that touches
  deployment-critical code. The goal is to catch issues at write-time, not at
  deploy-time.
---

# Deployability Enforcer

Before finalising any code you're about to write or edit, check it against
the rules below. If a violation is found: **flag it, explain why it breaks
deployment, and emit the fix inline** — do not just write the broken version.

Read `references/rules.md` for the full rule set before writing code.

---

## Workflow

1. **Identify the file type** being written (FastAPI route, config, Vite
   frontend, Dockerfile, platform config, etc.)
2. **Select the relevant rules** from `references/rules.md` for that file type
3. **Write the code** — applying fixes proactively rather than writing broken
   code first
4. **Append a `⚠️ Deploy note` block** at the end of your response for any
   rules that required a fix, using this format:

```
---
⚠️ Deploy notes

| Rule | Issue found | Fix applied |
|------|-------------|-------------|
| Backend binds to 0.0.0.0 | uvicorn was using default host 127.0.0.1 | Added `--host 0.0.0.0 --port $PORT` |
| No reload in production | `--reload` flag present | Removed |
```

If no issues were found, omit the deploy notes block entirely — don't add
unnecessary noise.

---

## Severity levels

- 🔴 **Critical** — Will definitely break the deployment (e.g. wrong host
  binding, hardcoded localhost in frontend, missing build command). Always fix
  and always surface.
- 🟡 **Warning** — Will likely cause problems or create a security risk
  (e.g. `allow_origins=["*"]`, unpinned dependencies, no health endpoint).
  Fix and surface.
- 🔵 **Advisory** — Best practice gap that won't break deploy but will cause
  pain later (e.g. no `.env.example`, logging to file only). Apply fix if it's
  a small addition; otherwise note it.

Only emit the deploy notes table for 🔴 and 🟡 items. 🔵 items can be
mentioned inline in the code as a comment if applicable.

---

## Quick-reference: most common violations

These are the patterns most likely to appear — the full rule set is in
`references/rules.md`.

| Pattern to catch | Why it breaks | Auto-fix |
|------------------|---------------|----------|
| `uvicorn main:app` with no `--host` | Binds to 127.0.0.1, unreachable in container | Add `--host 0.0.0.0 --port ${PORT:-8000}` |
| `uvicorn ... --reload` | Dev-only flag, causes issues in prod | Remove `--reload` |
| `http://localhost:8000` in fetch/axios | Points to dev machine, not prod backend | Replace with `import.meta.env.VITE_API_URL` |
| `allow_origins=["*"]` in CORSMiddleware | Overly permissive, security risk | Replace with `os.getenv("ALLOWED_ORIGINS", "*").split(",")` |
| `os.getenv("SECRET_KEY", "changeme")` | Default secret in source | Remove default; document in `.env.example` |
| `DATABASE_URL = "postgresql://user:pass@..."` hardcoded | Leaks credentials | Replace with `os.getenv("DATABASE_URL")` |
| `logging.FileHandler("app.log")` only | Log files lost on container restart | Add `StreamHandler` to stdout |
| No `GET /health` route | Platform can't verify app is alive | Add minimal health route |
| `"build": "vite build"` missing from package.json | Platform can't build frontend | Add build script |
| Python version not specified | Nondeterministic builds | Add `.python-version` or `runtime.txt` |

---

## Behaviour guidelines

- **Don't be preachy.** One deploy note per issue, concise. Don't lecture.
- **Fix first, explain second.** Emit the correct code, then note what you
  changed. Never emit broken code "as an example of what not to do".
- **Don't over-flag.** `allow_origins=["*"]` in a local dev file is fine;
  only flag it if it's clearly destined for a production config.
- **Preserve intent.** If fixing a binding issue in a Dockerfile CMD, don't
  change the framework or structure — minimal surgical fix only.
- **When uncertain**, add a `# TODO(deploy): verify this is set in Railway/Render dashboard`
  comment rather than guessing.
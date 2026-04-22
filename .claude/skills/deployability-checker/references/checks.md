# Deployability Checks Reference

Checks for a **Python/FastAPI backend + React/Vite frontend** targeting
**Railway, Render, or Fly.io**.

---

## 1. Environment Config (20 pts, 4 checks × 5 pts each)

### 1a. `.env.example` exists in both `backend/` and `frontend/`
- ✅ Both present
- ⚠️ One present
- ❌ Neither present
- **Why**: Platform deploys need to know which env vars to set. Without this,
  operators must guess.

### 1b. No `.env` committed to git (check `.gitignore`)
- ✅ `.env` in `.gitignore` and not tracked
- ⚠️ `.gitignore` present but `.env` not listed
- ❌ `.env` file exists with real values and no `.gitignore` entry
- **Why**: Committing secrets is a critical security failure.

### 1c. FastAPI reads config from environment, not hardcoded
- Look for `os.getenv`, `pydantic BaseSettings`, or `python-dotenv` usage
- ✅ Uses `BaseSettings` or `os.getenv` consistently
- ⚠️ Mix of hardcoded and env-based config
- ❌ DB URLs, API keys, or ports hardcoded in source
- **Why**: Hardcoded config breaks on any environment other than the
  developer's machine.

### 1d. Vite frontend uses `VITE_` prefixed env vars for any API URLs
- ✅ API base URL comes from `import.meta.env.VITE_API_URL` (or similar)
- ⚠️ API URL is in a config constant (not env, but not hardcoded to localhost)
- ❌ `localhost` or `127.0.0.1` hardcoded in fetch/axios calls
- **Why**: A frontend pointing to localhost will silently fail in production.

---

## 2. Process Management (20 pts, 4 checks × 5 pts each)

### 2a. Backend has a production start command (not `uvicorn --reload`)
- ✅ Start command uses `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  (or gunicorn equivalent); no `--reload` flag
- ⚠️ Start command present but missing `--host 0.0.0.0` or `$PORT`
- ❌ No start command found, or `--reload` present
- **Why**: `--reload` is a dev-only flag; `0.0.0.0` is required for containers;
  `$PORT` is required by Railway/Render/Fly.

### 2b. Start command defined in platform config or Dockerfile
- ✅ Defined in `railway.toml`, `render.yaml`, `fly.toml`, or `Dockerfile CMD`
- ⚠️ Only in a README or comment
- ❌ Not found anywhere
- **Why**: Platform must know how to start the app.

### 2c. Frontend has a build command and output directory configured
- ✅ `package.json` has `"build": "vite build"` and output dir is `dist/`
- ⚠️ Build command present but output dir not confirmed
- ❌ No build command
- **Why**: Static hosting platforms need to know what to build and where to
  find the output.

### 2d. Frontend's `vite.config` does not hardcode a port that conflicts
- ✅ No `server.port` in `vite.config`, or it's clearly dev-only
- ⚠️ Port hardcoded but in `server` block (dev only, acceptable)
- ❌ Port hardcoded in `preview` block (affects production preview)

---

## 3. Build Pipeline (20 pts, 4 checks × 5 pts each)

### 3a. `requirements.txt` or `pyproject.toml` is present and pinned
- ✅ Present with pinned versions (`fastapi==0.111.0`)
- ⚠️ Present but unpinned (`fastapi>=0.100`)
- ❌ Missing entirely
- **Why**: Unpinned deps cause non-deterministic builds that break over time.

### 3b. Python version is specified
- ✅ `runtime.txt`, `.python-version`, or `pyproject.toml [tool.poetry.dependencies]`
  specifies a version
- ⚠️ Version implied by Docker base image only
- ❌ No Python version specified
- **Why**: Railway/Render default Python versions change; pinning avoids
  surprise breakage.

### 3c. Node version is specified for frontend
- ✅ `.nvmrc`, `.node-version`, or `"engines": {"node": "..."}` in
  `package.json`
- ⚠️ Not specified but `package-lock.json` implies a version
- ❌ Not specified at all
- **Why**: Same reason as Python version.

### 3d. `package-lock.json` or `yarn.lock` committed
- ✅ Lockfile present
- ❌ Missing
- **Why**: Without a lockfile, `npm install` may resolve different versions on
  each deploy.

---

## 4. Health & Observability (20 pts, 4 checks × 5 pts each)

### 4a. FastAPI has a health check endpoint
- ✅ `GET /health` or `GET /` returns 200 with minimal logic
- ⚠️ A route exists but it has heavy logic (DB query, external call)
- ❌ No health endpoint
- **Why**: Railway/Render/Fly use health checks to determine when a deploy
  succeeded. Without one, deploys may time out or route to unhealthy instances.

### 4b. Health endpoint is registered before app startup events
- ✅ `/health` defined at module level, not inside a startup handler
- ⚠️ Can't determine
- ❌ Defined inside a conditional or startup block

### 4c. Application logs to stdout (not only to file)
- ✅ Uses `print()`, `logging` with a StreamHandler, or a logger that writes
  to stdout
- ⚠️ Logs to both file and stdout
- ❌ Logs only to a file (files are ephemeral on these platforms)
- **Why**: Railway/Render/Fly capture stdout for their log dashboards. File
  logs are lost on restart.

### 4d. Unhandled errors return structured JSON responses (not stack traces)
- ✅ FastAPI exception handler or middleware catches 500s and returns JSON
- ⚠️ Default FastAPI error handling in place (returns JSON for validation
  errors but not arbitrary exceptions)
- ❌ Raw Python tracebacks can leak to clients

---

## 5. Secrets Hygiene (20 pts, 4 checks × 5 pts each)

### 5a. No API keys or passwords in source files
- Grep for patterns: `sk-`, `Bearer `, `password =`, `secret =`, `api_key =`
  in `.py` and `.ts/.tsx/.js` files
- ✅ None found
- ⚠️ Found in a test/mock file with an obvious placeholder
- ❌ Found with what appears to be a real value
- **Why**: Source-committed secrets are a critical breach risk.

### 5b. `SECRET_KEY` / `JWT_SECRET` comes from environment
- ✅ Loaded from env var, no default value in source
- ⚠️ Has a default value in source (`os.getenv("SECRET_KEY", "changeme")`)
- ❌ Hardcoded
- **Why**: A hardcoded or defaulted secret key means all instances share the
  same key, defeating its purpose.

### 5c. Database connection string comes from environment
- ✅ `DATABASE_URL` from env
- ⚠️ Host/port from env but user/password hardcoded
- ❌ Full connection string hardcoded
- N/A — no database in this project

### 5d. `.env` file is in `.gitignore`
- Same as check 1b but counted here for secrets score weighting
- See 1b result.

---

## 6. CORS & Networking (20 pts, 4 checks × 5 pts each)

### 6a. FastAPI CORS middleware is configured
- ✅ `CORSMiddleware` added with explicit `allow_origins`
- ⚠️ `allow_origins=["*"]` (works but insecure for production)
- ❌ No CORS middleware (frontend requests will be blocked by browser)
- **Why**: Without CORS headers, the browser will reject all cross-origin
  requests from the Vite frontend to the FastAPI backend.

### 6b. `allow_origins` does not hardcode `localhost` for production
- ✅ Origins loaded from env var (`ALLOWED_ORIGINS`) or uses `["*"]` with
  awareness
- ⚠️ `localhost:5173` is in the list alongside a real domain
- ❌ Only `localhost` in the list, no real domain

### 6c. Backend binds to `0.0.0.0`, not `127.0.0.1`
- ✅ Start command or uvicorn config uses `--host 0.0.0.0`
- ❌ Binds to `127.0.0.1` or `localhost` (container networking will block
  all external traffic)
- **Why**: Containers route external traffic to `0.0.0.0`; binding to
  localhost means nothing outside the container can reach the server.

### 6d. Frontend API base URL is not hardcoded to localhost
- Same as check 1d, counted here for networking score weighting.
- See 1d result.
# Deployability Enforcer — Full Rule Set

Rules for **Python/FastAPI backend + React/Vite frontend** on
**Railway / Render / Fly.io**.

---

## BACKEND RULES (FastAPI / Python)

### B1 🔴 Uvicorn must bind to 0.0.0.0 and use $PORT

**Trigger**: Any start command or uvicorn invocation.

```python
# ❌ Wrong
uvicorn main:app
uvicorn main:app --host 127.0.0.1

# ✅ Correct
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Fix: Always emit `--host 0.0.0.0 --port ${PORT:-8000}`. The `:-8000`
fallback lets local dev work without setting PORT.

---

### B2 🔴 No `--reload` in production start commands

**Trigger**: Any uvicorn invocation.

```python
# ❌ Wrong
uvicorn main:app --host 0.0.0.0 --reload

# ✅ Correct
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

`--reload` is a watchdog that triggers file-system watches. On most PaaS
containers the filesystem is read-only or ephemeral; the flag also slows cold
starts.

---

### B3 🔴 All config must come from environment variables

**Trigger**: Any file that sets `DATABASE_URL`, `SECRET_KEY`, `API_KEY`,
`REDIS_URL`, `SMTP_PASSWORD`, or similar.

```python
# ❌ Wrong
DATABASE_URL = "postgresql://postgres:password@localhost/mydb"
SECRET_KEY = "super-secret-key"

# ✅ Correct — with pydantic-settings
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    allowed_origins: str = "*"

    class Config:
        env_file = ".env"

settings = Settings()
```

Or minimal approach:
```python
# ✅ Correct — with os.getenv, no defaults for secrets
import os
DATABASE_URL = os.environ["DATABASE_URL"]  # raises KeyError if missing — intentional
SECRET_KEY = os.environ["SECRET_KEY"]
```

Never use `os.getenv("SECRET_KEY", "changeme")` — a default secret defeats
the purpose.

---

### B4 🟡 CORS middleware must be configured; origins from env in production

**Trigger**: Any file with `CORSMiddleware` or a new FastAPI app.

```python
# ❌ Wrong — no CORS (browser will block all requests)
app = FastAPI()

# ⚠️ Acceptable for MVP but flag it
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

# ✅ Correct
import os
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

When writing a new FastAPI app, always include CORS middleware. Add
`ALLOWED_ORIGINS=https://yourapp.com` to `.env.example`.

---

### B5 🟡 Health check endpoint required

**Trigger**: Any new FastAPI app or `main.py`.

Always add this near the top of the route definitions:

```python
@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

Railway/Render/Fly use HTTP health checks to know when a deploy is live.
Without this, deploys may time out waiting for a healthy response.

---

### B6 🟡 Logging must write to stdout

**Trigger**: Any logging setup.

```python
# ❌ Wrong — file logs are lost on container restart
logging.basicConfig(filename="app.log")

# ✅ Correct
import logging, sys
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s"
)
```

If the user wants file + stdout, that's fine — just ensure stdout is included.

---

### B7 🔵 Python version should be pinned

**Trigger**: New project setup, requirements.txt, or Dockerfile creation.

Add a `.python-version` file:
```
3.12.3
```

Or `runtime.txt` for Render:
```
python-3.12.3
```

---

### B8 🟡 Dependencies should be pinned in requirements.txt

**Trigger**: Whenever writing or modifying `requirements.txt`.

```
# ⚠️ Unpinned — can break future deploys
fastapi
uvicorn

# ✅ Pinned
fastapi==0.111.0
uvicorn[standard]==0.29.0
```

Advisory note: use `pip freeze > requirements.txt` after local testing to
capture exact versions.

---

### B9 🔵 Unhandled exceptions should return JSON, not stack traces

**Trigger**: New FastAPI app.

Add an exception handler:
```python
from fastapi.responses import JSONResponse
from fastapi import Request

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
```

---

## FRONTEND RULES (React / Vite)

### F1 🔴 No hardcoded localhost URLs in fetch/axios/HTTP client code

**Trigger**: Any `fetch(`, `axios.`, `createClient(`, or HTTP call.

```typescript
// ❌ Wrong
const res = await fetch("http://localhost:8000/api/users")

// ✅ Correct
const API_URL = import.meta.env.VITE_API_URL
const res = await fetch(`${API_URL}/api/users`)
```

And in `.env.example`:
```
VITE_API_URL=https://your-backend.railway.app
```

---

### F2 🔴 Build script must exist in package.json

**Trigger**: Any `package.json` creation or edit.

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",      // ← required
    "preview": "vite preview"
  }
}
```

---

### F3 🟡 VITE_ prefix required for all env vars accessed in browser code

**Trigger**: Any `import.meta.env.*` usage.

```typescript
// ❌ Wrong — will be undefined at runtime
import.meta.env.API_URL

// ✅ Correct
import.meta.env.VITE_API_URL
```

Vite strips any env var not prefixed with `VITE_` from the client bundle.

---

### F4 🔵 Node version should be pinned

**Trigger**: New project or `package.json` creation.

Add to `package.json`:
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

Or add `.nvmrc`:
```
20
```

---

### F5 🔵 Lockfile must be committed

**Trigger**: Any project setup.

`package-lock.json` or `yarn.lock` must exist and be tracked by git.
If missing, note: "Commit your lockfile (`package-lock.json`) to ensure
deterministic builds on Railway/Render."

---

## PLATFORM CONFIG RULES

### P1 🟡 railway.toml / render.yaml / fly.toml should define start command

**Trigger**: Creating or editing platform config files.

`railway.toml` example:
```toml
[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 30
```

`render.yaml` example:
```yaml
services:
  - type: web
    name: backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /health
```

`fly.toml` example:
```toml
[http_service]
  internal_port = 8000
  force_https = true

[[http_service.checks]]
  path = "/health"
  interval = "15s"
  timeout = "5s"
```

---

### P2 🟡 Dockerfile CMD must not use --reload and must use $PORT

**Trigger**: Dockerfile creation or edit.

```dockerfile
# ❌ Wrong
CMD ["uvicorn", "app.main:app", "--reload"]

# ✅ Correct
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

Use `sh -c` form so shell variable expansion works for `$PORT`.

---

## SECRETS RULES

### S1 🔴 No secrets in source files

Scan for these patterns and never emit them in code:
- Strings matching `sk-[a-zA-Z0-9]{20,}`
- `password` = `"..."` with a non-placeholder value
- `api_key` = `"..."` with a non-placeholder value
- Any connection string with `user:password@` hardcoded

Always replace with `os.environ["VAR_NAME"]` and document in `.env.example`.

### S2 🔵 Always generate a matching .env.example entry

When writing code that reads a new env var, add a comment:
```
# TODO: Add to .env.example: VAR_NAME=<description>
```

Or if creating the file fresh, emit `.env.example` content alongside the code.
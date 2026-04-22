---
name: deployability-checker
description: >
  Audits a Python/FastAPI + React/Vite project for deployment readiness on
  Railway, Render, or Fly.io. Produces a scored report with pass/fail checks
  across six categories: environment config, process management, build pipeline,
  health & observability, secrets hygiene, and CORS/networking. Use this skill
  whenever the user asks "is my code deployable?", "check my deploy readiness",
  "audit my project for deployment", "give me a deployment score", or any
  variant of wanting to know whether their project will successfully deploy.
  Also trigger proactively if the user mentions they are about to deploy and
  haven't run a check yet.
---

# Deployability Checker

Audit the project and produce a structured deployability report with an
overall score and per-category breakdown.

---

## Step 1 — Discover the project layout

Run these commands to understand the repo before making any judgements:

```bash
# Top-level layout
ls -1

# Backend signals
ls backend/ 2>/dev/null
cat backend/requirements.txt 2>/dev/null || cat backend/pyproject.toml 2>/dev/null
cat backend/Dockerfile 2>/dev/null
cat backend/.env.example 2>/dev/null || cat backend/.env 2>/dev/null
cat backend/main.py 2>/dev/null || cat backend/app/main.py 2>/dev/null

# Frontend signals
ls frontend/ 2>/dev/null
cat frontend/package.json 2>/dev/null
cat frontend/Dockerfile 2>/dev/null
cat frontend/.env.example 2>/dev/null || cat frontend/.env 2>/dev/null
cat frontend/vite.config.ts 2>/dev/null || cat frontend/vite.config.js 2>/dev/null

# Platform config
cat railway.toml 2>/dev/null
cat render.yaml 2>/dev/null
cat fly.toml 2>/dev/null
cat docker-compose.yml 2>/dev/null
```

Read `references/checks.md` for the full checklist before scoring.

---

## Step 2 — Score each category

Each category is worth **20 points** (6 categories = 120 points max, normalised
to 100). Within each category, each check is worth equal weight. Mark each
check as ✅ PASS, ⚠️ WARN, or ❌ FAIL.

See `references/checks.md` for the exact checks per category.

---

## Step 3 — Output the report

Use this exact structure:

```
## 🚀 Deployability Report

**Overall Score: XX/100** — [Grade]

| Category                  | Score  | Status |
|---------------------------|--------|--------|
| Environment Config        | XX/20  | 🟢/🟡/🔴 |
| Process Management        | XX/20  | 🟢/🟡/🔴 |
| Build Pipeline            | XX/20  | 🟢/🟡/🔴 |
| Health & Observability    | XX/20  | 🟢/🟡/🔴 |
| Secrets Hygiene           | XX/20  | 🟢/🟡/🔴 |
| CORS & Networking         | XX/20  | 🟢/🟡/🔴 |

---

### Environment Config — XX/20
[List each check with ✅/⚠️/❌ and a one-line explanation]

### Process Management — XX/20
...

[repeat for all 6 categories]

---

### 🔧 Top Fixes (ordered by impact)
1. [Most impactful fix]
2. ...

### ✅ What's already solid
[Brief callouts of things done well]
```

**Grading scale:**
- 90–100: 🟢 Deploy-ready
- 70–89:  🟡 Nearly there — fix warnings first
- 50–69:  🟠 Significant gaps — address before deploying
- <50:    🔴 Not ready — critical issues present

---

## Notes

- If `.env` exists with real values (not placeholders), flag as a secrets risk
  even if it's not committed — advise adding to `.gitignore`.
- If the user only has one of `backend/` or `frontend/`, score only the
  relevant categories and note which were skipped.
- If no platform config file is found (no `railway.toml`, `render.yaml`,
  `fly.toml`), penalise Process Management but note that start commands can
  also be configured in the platform dashboard.
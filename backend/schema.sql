-- ============================================================================
-- Socra — Supabase schema
-- ============================================================================
-- Run this once against a fresh Supabase project:
--   Supabase Dashboard -> SQL Editor -> paste -> Run
-- or with the CLI:
--   supabase db execute --file backend/schema.sql
--
-- Auth is Supabase Auth (email/password + magic link). Every per-user table is
-- protected by Row Level Security keyed on `auth.uid() = user_id`, so the
-- backend can safely use a per-request client built from the caller's JWT
-- (see backend/dependencies.py). The two `cached_*` tables hold no user data
-- and are world-readable/writable by any authenticated or anon client.
--
-- The "developer" role used by the dev-only endpoints is NOT stored here. Set
-- it per user in the Supabase dashboard:
--   Authentication -> Users -> (user) -> Raw app metadata -> {"role":"developer"}
-- It lives in app_metadata (server-writable only) and is read from the JWT.
-- ============================================================================

-- Needed for gen_random_uuid() on older projects (no-op if already present).
create extension if not exists "pgcrypto";


-- ----------------------------------------------------------------------------
-- chat_sessions — one Socratic dialogue. Holds the full message history.
-- ----------------------------------------------------------------------------
create table if not exists public.chat_sessions (
    id                     uuid primary key default gen_random_uuid(),
    user_id                uuid not null references auth.users (id) on delete cascade,
    question               text not null,
    messages               jsonb not null default '[]'::jsonb,  -- [{role, content, metadata?}]
    turn                   integer not null default 1,          -- current phase: 1,2,3,6
    is_generating          boolean not null default false,      -- optimistic row-lock
    generation_lock_id     uuid,
    generation_started_at  timestamptz,
    created_at             timestamptz not null default now()
);

create index if not exists chat_sessions_user_id_idx on public.chat_sessions (user_id);

alter table public.chat_sessions enable row level security;

create policy "chat_sessions: owner full access"
    on public.chat_sessions
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- active_blueprints — the live Essay Blueprint for a session (1:1 with a
-- chat_sessions row). `data` is the BlueprintModel JSON from backend/models.py.
-- ----------------------------------------------------------------------------
create table if not exists public.active_blueprints (
    session_id  uuid primary key references public.chat_sessions (id) on delete cascade,
    user_id     uuid not null references auth.users (id) on delete cascade,
    data        jsonb not null default '{}'::jsonb,
    updated_at  timestamptz not null default now(),
    created_at  timestamptz not null default now()
);

create index if not exists active_blueprints_user_id_idx on public.active_blueprints (user_id);

alter table public.active_blueprints enable row level security;

create policy "active_blueprints: owner full access"
    on public.active_blueprints
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- saved_blueprints — archived blueprints in the student's knowledge bank.
-- ----------------------------------------------------------------------------
create table if not exists public.saved_blueprints (
    id                  uuid primary key default gen_random_uuid(),
    user_id             uuid not null references auth.users (id) on delete cascade,
    gp_question         text not null,
    insight_tags        jsonb not null default '[]'::jsonb,  -- [text]
    summary             text not null default '',
    follow_up_response  text not null default '',
    readings            jsonb not null default '[]'::jsonb,  -- [{title, url, source}]
    word_count          integer not null default 0,
    canvas_data         jsonb,
    created_at          timestamptz not null default now()
);

create index if not exists saved_blueprints_user_id_idx on public.saved_blueprints (user_id);

alter table public.saved_blueprints enable row level security;

create policy "saved_blueprints: owner full access"
    on public.saved_blueprints
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- user_memory — cross-session student profile (one row per user). Managed by
-- backend/memory.py; upserted as a whole object, so every column must exist.
-- ----------------------------------------------------------------------------
create table if not exists public.user_memory (
    user_id                          uuid primary key references auth.users (id) on delete cascade,
    moves_mastery                    jsonb not null default '{}'::jsonb,
    persistent_strengths             jsonb not null default '[]'::jsonb,
    recurring_challenges             jsonb not null default '[]'::jsonb,
    all_insights                     jsonb not null default '[]'::jsonb,
    score_history                    jsonb not null default '[]'::jsonb,
    session_summaries                jsonb not null default '[]'::jsonb,
    total_sessions                   integer not null default 0,
    student_profile_summary          text,
    key_growth_areas                 jsonb not null default '[]'::jsonb,
    plato_observation                text,
    plato_observation_session_count  integer not null default -1,
    updated_at                       timestamptz not null default now()
);

alter table public.user_memory enable row level security;

create policy "user_memory: owner full access"
    on public.user_memory
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- feedback — free-text product feedback.
-- ----------------------------------------------------------------------------
create table if not exists public.feedback (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users (id) on delete cascade,
    user_email    text,
    message       text not null,
    current_page  text,
    created_at    timestamptz not null default now()
);

create index if not exists feedback_user_id_idx on public.feedback (user_id);

alter table public.feedback enable row level security;

-- Users may submit and read back their own feedback, but not edit/delete it.
create policy "feedback: owner can insert"
    on public.feedback
    for insert
    with check (auth.uid() = user_id);

create policy "feedback: owner can read"
    on public.feedback
    for select
    using (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- waitlist_signups — early-access waitlist (one row per user).
-- ----------------------------------------------------------------------------
create table if not exists public.waitlist_signups (
    user_id     uuid primary key references auth.users (id) on delete cascade,
    email       text not null,
    created_at  timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

create policy "waitlist_signups: owner can upsert"
    on public.waitlist_signups
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);


-- ============================================================================
-- Shared article cache (no user data). Populated by backend/article_cache.py
-- via an anon client, and by backend/seed_cache.py / refresh_cache.py.
-- 7-day TTL is enforced in application code, not here.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- cached_readings — Exa search results keyed by GP question text.
-- ----------------------------------------------------------------------------
create table if not exists public.cached_readings (
    question        text primary key,
    articles        jsonb not null default '[]'::jsonb,
    last_refreshed  text not null,                       -- ISO8601, e.g. 2026-01-01T00:00:00Z
    created_at      timestamptz not null default now()
);

alter table public.cached_readings enable row level security;

create policy "cached_readings: public read"
    on public.cached_readings for select using (true);

create policy "cached_readings: public write"
    on public.cached_readings for insert with check (true);

create policy "cached_readings: public update"
    on public.cached_readings for update using (true) with check (true);


-- ----------------------------------------------------------------------------
-- cached_conflict_readings — Exa results for a "conflict" (three article sets),
-- keyed by conflict_id.
-- ----------------------------------------------------------------------------
create table if not exists public.cached_conflict_readings (
    conflict_id         text primary key,
    side_a_articles     jsonb not null default '[]'::jsonb,
    side_b_articles     jsonb not null default '[]'::jsonb,
    singapore_articles  jsonb not null default '[]'::jsonb,
    last_refreshed      text not null,
    created_at          timestamptz not null default now()
);

alter table public.cached_conflict_readings enable row level security;

create policy "cached_conflict_readings: public read"
    on public.cached_conflict_readings for select using (true);

create policy "cached_conflict_readings: public write"
    on public.cached_conflict_readings for insert with check (true);

create policy "cached_conflict_readings: public update"
    on public.cached_conflict_readings for update using (true) with check (true);

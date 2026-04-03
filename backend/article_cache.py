"""
article_cache.py
----------------
Cache layer for Exa search results, now powered by Supabase.

DEVELOPER CONFIG
----------------
Change CACHE_TTL_DAYS to control how long cached articles stay fresh before
refresh_cache.py considers them stale and re-fetches them.
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
logger = logging.getLogger(__name__)

CACHE_TTL_DAYS: int = 7

# Initialize Supabase (Global Anon Client for generic cache fetching)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_ANON_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
else:
    logger.warning("article_cache: Missing SUPABASE_URL or ANON_KEY. Caching is disabled.")

def _is_fresh(last_refreshed_ts: str) -> bool:
    """Return True if the timestamp is within CACHE_TTL_DAYS."""
    if not last_refreshed_ts:
        return False
    try:
        refreshed_at = datetime.fromisoformat(last_refreshed_ts.rstrip("Z")).replace(tzinfo=timezone.utc)
        age = datetime.now(tz=timezone.utc) - refreshed_at
        return age < timedelta(days=CACHE_TTL_DAYS)
    except Exception:
        return False

def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# ─── /readings cache ──────────────────────────────────────────────────────────

def get_cached_readings(question: str) -> Optional[list]:
    if not supabase: return None
    try:
        res = supabase.table("cached_readings").select("*").eq("question", question).execute()
        if not res.data:
            logger.info("Cache MISS (readings): %s", question[:80])
            return None
        
        entry = res.data[0]
        if not _is_fresh(entry.get("last_refreshed")):
            logger.info("Cache STALE (readings): %s", question[:80])
            return None
            
        logger.info("Cache HIT (readings): %s", question[:80])
        return entry.get("articles", [])
    except Exception as e:
        logger.error(f"Error fetching cache readings: {e}")
        return None

def set_cached_readings(question: str, articles: list) -> None:
    if not supabase: return
    try:
        supabase.table("cached_readings").upsert({
            "question": question,
            "last_refreshed": _now_iso(),
            "articles": articles
        }).execute()
        logger.info("Cache SET (readings): %s — %d articles", question[:80], len(articles))
    except Exception as e:
        logger.error(f"Error setting cache readings: {e}")


# ─── /conflict-readings cache ─────────────────────────────────────────────────

def get_cached_conflict_readings(conflict_id: str) -> Optional[dict]:
    if not supabase: return None
    try:
        res = supabase.table("cached_conflict_readings").select("*").eq("conflict_id", conflict_id).execute()
        if not res.data:
            logger.info("Cache MISS (conflict): %s", conflict_id)
            return None
            
        entry = res.data[0]
        if not _is_fresh(entry.get("last_refreshed")):
            logger.info("Cache STALE (conflict): %s", conflict_id)
            return None
            
        logger.info("Cache HIT (conflict): %s", conflict_id)
        return {
            "side_a_articles": entry.get("side_a_articles", []),
            "side_b_articles": entry.get("side_b_articles", []),
            "singapore_articles": entry.get("singapore_articles", [])
        }
    except Exception as e:
        logger.error(f"Error fetching conflict cache: {e}")
        return None

def set_cached_conflict_readings(
    conflict_id: str,
    side_a_articles: list,
    side_b_articles: list,
    singapore_articles: list
) -> None:
    if not supabase: return
    try:
        supabase.table("cached_conflict_readings").upsert({
            "conflict_id": conflict_id,
            "last_refreshed": _now_iso(),
            "side_a_articles": side_a_articles,
            "side_b_articles": side_b_articles,
            "singapore_articles": singapore_articles
        }).execute()
        logger.info("Cache SET (conflict): %s — a=%d b=%d sg=%d", conflict_id, len(side_a_articles), len(side_b_articles), len(singapore_articles))
    except Exception as e:
        logger.error(f"Error setting conflict cache: {e}")

# ─── Refresh utilities (simplified) ──────────────────────────────────────────

def get_all_stale_readings() -> list[tuple[str, dict]]:
    if not supabase: return []
    try:
        res = supabase.table("cached_readings").select("*").execute()
        stale = []
        for entry in res.data:
            if not _is_fresh(entry.get("last_refreshed")):
                stale.append((entry["question"], entry))
        return stale
    except Exception:
        return []

def get_all_stale_conflict_readings() -> list[tuple[str, dict]]:
    if not supabase: return []
    try:
        res = supabase.table("cached_conflict_readings").select("*").execute()
        stale = []
        for entry in res.data:
            if not _is_fresh(entry.get("last_refreshed")):
                stale.append((entry["conflict_id"], entry))
        return stale
    except Exception:
        return []

def cache_stats() -> dict:
    if not supabase: return {}
    try:
        r_res = supabase.table("cached_readings").select("question,last_refreshed").execute()
        c_res = supabase.table("cached_conflict_readings").select("conflict_id,last_refreshed").execute()
        
        fresh_r = sum(1 for e in r_res.data if _is_fresh(e.get("last_refreshed")))
        fresh_c = sum(1 for e in c_res.data if _is_fresh(e.get("last_refreshed")))
        
        return {
            "readings_total": len(r_res.data),
            "readings_fresh": fresh_r,
            "readings_stale": len(r_res.data) - fresh_r,
            "conflict_readings_total": len(c_res.data),
            "conflict_readings_fresh": fresh_c,
            "conflict_readings_stale": len(c_res.data) - fresh_c,
            "ttl_days": CACHE_TTL_DAYS,
            "engine": "supabase"
        }
    except Exception:
        return {"error": "Failed to fetch stats from Supabase"}

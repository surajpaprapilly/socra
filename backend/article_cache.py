"""
article_cache.py
----------------
Cache layer for Exa search results.

DEVELOPER CONFIG
----------------
Change CACHE_TTL_DAYS to control how long cached articles stay fresh before
refresh_cache.py considers them stale and re-fetches them.

  7   → weekly refresh   (recommended default)
  1   → daily refresh
  30  → monthly refresh
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# ─── DEVELOPER CONFIG ──────────────────────────────────────────────────────────
CACHE_TTL_DAYS: int = 7
# ──────────────────────────────────────────────────────────────────────────────

CACHE_PATH = os.path.join(os.path.dirname(__file__), "data", "article_cache.json")

_EMPTY_CACHE = {
    "readings": {},
    "conflict_readings": {}
}


def _load() -> dict:
    """Load the cache file from disk. Returns empty structure if missing."""
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    if not os.path.exists(CACHE_PATH):
        return dict(_EMPTY_CACHE)
    try:
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Ensure both top-level keys exist (forward-compat)
        data.setdefault("readings", {})
        data.setdefault("conflict_readings", {})
        return data
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("article_cache: failed to load cache file: %s", e)
        return dict(_EMPTY_CACHE)


def _save(data: dict) -> None:
    """Write the cache dict to disk atomically."""
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    tmp_path = CACHE_PATH + ".tmp"
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, CACHE_PATH)
    except OSError as e:
        logger.error("article_cache: failed to save cache: %s", e)


def _is_fresh(entry: dict) -> bool:
    """Return True if the entry was refreshed within CACHE_TTL_DAYS."""
    ts_str = entry.get("last_refreshed")
    if not ts_str:
        return False
    try:
        refreshed_at = datetime.fromisoformat(ts_str.rstrip("Z")).replace(tzinfo=timezone.utc)
        age = datetime.now(tz=timezone.utc) - refreshed_at
        return age < timedelta(days=CACHE_TTL_DAYS)
    except ValueError:
        return False


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ─── /readings cache ──────────────────────────────────────────────────────────

def get_cached_readings(question: str) -> Optional[list]:
    """
    Return cached articles for a question, or None if not found / stale.
    """
    cache = _load()
    entry = cache["readings"].get(question)
    if not entry:
        logger.info("Cache MISS (readings): %s", question[:80])
        return None
    if not _is_fresh(entry):
        logger.info("Cache STALE (readings): %s", question[:80])
        return None
    logger.info("Cache HIT (readings): %s", question[:80])
    return entry["articles"]


def set_cached_readings(question: str, articles: list) -> None:
    """
    Persist a list of ReadingResult dicts for a question.
    """
    cache = _load()
    cache["readings"][question] = {
        "last_refreshed": _now_iso(),
        "articles": articles
    }
    _save(cache)
    logger.info("Cache SET (readings): %s — %d articles", question[:80], len(articles))


# ─── /conflict-readings cache ─────────────────────────────────────────────────

def get_cached_conflict_readings(conflict_id: str) -> Optional[dict]:
    """
    Return cached conflict readings dict (side_a, side_b, singapore),
    or None if not found / stale.
    """
    cache = _load()
    entry = cache["conflict_readings"].get(conflict_id)
    if not entry:
        logger.info("Cache MISS (conflict): %s", conflict_id)
        return None
    if not _is_fresh(entry):
        logger.info("Cache STALE (conflict): %s", conflict_id)
        return None
    logger.info("Cache HIT (conflict): %s", conflict_id)
    return {
        "side_a_articles": entry["side_a_articles"],
        "side_b_articles": entry["side_b_articles"],
        "singapore_articles": entry["singapore_articles"]
    }


def set_cached_conflict_readings(
    conflict_id: str,
    side_a_articles: list,
    side_b_articles: list,
    singapore_articles: list
) -> None:
    """
    Persist conflict readings (three lists) for a conflict_id.
    """
    cache = _load()
    cache["conflict_readings"][conflict_id] = {
        "last_refreshed": _now_iso(),
        "side_a_articles": side_a_articles,
        "side_b_articles": side_b_articles,
        "singapore_articles": singapore_articles
    }
    _save(cache)
    logger.info(
        "Cache SET (conflict): %s — a=%d b=%d sg=%d",
        conflict_id,
        len(side_a_articles),
        len(side_b_articles),
        len(singapore_articles)
    )


# ─── Refresh utilities ────────────────────────────────────────────────────────

def get_all_stale_readings() -> list[tuple[str, dict]]:
    """
    Return a list of (question, entry) tuples for all stale /readings entries.
    Used by refresh_cache.py.
    """
    cache = _load()
    stale = []
    for question, entry in cache["readings"].items():
        if not _is_fresh(entry):
            stale.append((question, entry))
    return stale


def get_all_stale_conflict_readings() -> list[tuple[str, dict]]:
    """
    Return a list of (conflict_id, entry) tuples for all stale /conflict-readings entries.
    Used by refresh_cache.py.
    """
    cache = _load()
    stale = []
    for conflict_id, entry in cache["conflict_readings"].items():
        if not _is_fresh(entry):
            stale.append((conflict_id, entry))
    return stale


def cache_stats() -> dict:
    """Return a summary of the current cache state. Useful for debugging."""
    cache = _load()
    readings = cache["readings"]
    conflicts = cache["conflict_readings"]

    fresh_r = sum(1 for e in readings.values() if _is_fresh(e))
    fresh_c = sum(1 for e in conflicts.values() if _is_fresh(e))

    return {
        "readings_total": len(readings),
        "readings_fresh": fresh_r,
        "readings_stale": len(readings) - fresh_r,
        "conflict_readings_total": len(conflicts),
        "conflict_readings_fresh": fresh_c,
        "conflict_readings_stale": len(conflicts) - fresh_c,
        "ttl_days": CACHE_TTL_DAYS,
        "cache_path": CACHE_PATH
    }

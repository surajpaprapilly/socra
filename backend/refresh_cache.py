"""
refresh_cache.py
----------------
Refreshes only STALE entries in the article cache (older than CACHE_TTL_DAYS).

This is a lightweight companion to seed_cache.py. Run it on a schedule
(e.g. weekly cron job) to keep the cache fresh without re-fetching everything.

Usage:
    cd backend
    source .venv/bin/activate
    python refresh_cache.py

    python refresh_cache.py --dry-run    # show stale entries without re-fetching
    python refresh_cache.py --stats      # print cache stats and exit

Cron example (every Sunday at 3am):
    0 3 * * 0 cd /path/to/Socra/backend && .venv/bin/python refresh_cache.py

Compared to seed_cache.py:
    seed_cache.py   — run ONCE to warm the cache (skips fresh, can --force all)
    refresh_cache.py — run on SCHEDULE to keep cache fresh (only touches stale)
"""

import os
import sys
import asyncio
import argparse
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("refresh_cache")


def _build_exa():
    try:
        from exa_py import Exa
        key = os.environ.get("EXA_API_KEY")
        if not key:
            logger.error("EXA_API_KEY not set.")
            sys.exit(1)
        return Exa(api_key=key)
    except ImportError:
        logger.error("exa_py not installed. Run: pip install exa-py")
        sys.exit(1)


async def main():
    parser = argparse.ArgumentParser(description="Refresh stale Socra article cache entries.")
    parser.add_argument("--dry-run", action="store_true", help="Show stale entries without re-fetching.")
    parser.add_argument("--stats", action="store_true", help="Print cache stats and exit.")
    args = parser.parse_args()

    from article_cache import (
        get_all_stale_readings,
        get_all_stale_conflict_readings,
        set_cached_readings,
        set_cached_conflict_readings,
        cache_stats,
        CACHE_TTL_DAYS,
    )

    if args.stats:
        stats = cache_stats()
        logger.info("Cache stats:")
        for k, v in stats.items():
            logger.info("  %-35s %s", k, v)
        return

    stale_readings = get_all_stale_readings()
    stale_conflicts = get_all_stale_conflict_readings()

    logger.info("=" * 60)
    logger.info("Stale readings  : %d", len(stale_readings))
    logger.info("Stale conflicts : %d", len(stale_conflicts))
    logger.info("TTL             : %d days", CACHE_TTL_DAYS)
    logger.info("=" * 60)

    if not stale_readings and not stale_conflicts:
        logger.info("All cache entries are fresh. Nothing to do.")
        return

    if args.dry_run:
        logger.info("DRY RUN — no fetches will be made.")
        for q, _ in stale_readings:
            logger.info("  [readings]  %s", q[:80])
        for cid, _ in stale_conflicts:
            logger.info("  [conflict]  %s", cid)
        return

    # ── import fetch helpers from seed_cache ──────────────────────────────────
    from seed_cache import (
        seed_readings,
        seed_conflicts,
        CONFLICTS,
    )

    exa = _build_exa()

    stale_question_strings = [q for q, _ in stale_readings]
    stale_conflict_ids = {cid for cid, _ in stale_conflicts}
    stale_conflict_dicts = [c for c in CONFLICTS if c["id"] in stale_conflict_ids]

    r_fetched = r_skipped = 0
    c_fetched = c_skipped = 0

    if stale_question_strings:
        logger.info("Refreshing %d stale readings...", len(stale_question_strings))
        r_fetched, r_skipped = await seed_readings(
            stale_question_strings, exa, force=True, dry_run=False
        )

    if stale_conflict_dicts:
        logger.info("Refreshing %d stale conflicts...", len(stale_conflict_dicts))
        c_fetched, c_skipped = await seed_conflicts(
            stale_conflict_dicts, exa, force=True, dry_run=False
        )

    logger.info("=" * 60)
    logger.info("DONE")
    logger.info("  readings  refreshed=%d", r_fetched)
    logger.info("  conflicts refreshed=%d", c_fetched)

    stats = cache_stats()
    logger.info("Cache stats after refresh:")
    for k, v in stats.items():
        logger.info("  %-35s %s", k, v)
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

"""
seed_cache.py
-------------
Pre-seeds the article cache for:
  1. All 2024 and 2025 GP essay questions  (/api/learn/readings)
  2. All conflict topics                   (/api/learn/conflict-readings)

100% Exa-only — no Anthropic/Claude calls. The article's own Exa highlight
snippet is used directly as the `why_relevant` field.

Each /readings entry is guaranteed to include at least 1 Singapore article
(from straitstimes.com, channelnewsasia.com, todayonline.com, mothership.sg,
or ips.nus.edu.sg) when one is available.

Run this once to warm the cache before students use the app:

    cd backend
    source .venv/bin/activate
    python seed_cache.py

Usage:
    python seed_cache.py           # skip already-fresh entries
    python seed_cache.py --force   # re-fetch all entries regardless
    python seed_cache.py --dry-run # preview what would be fetched, don't fetch
"""

import os
import sys
import asyncio
import argparse
import logging
from dotenv import load_dotenv

load_dotenv()

# ── logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("seed_cache")

# ── 2024 + 2025 GP questions (mirrors pastYearQuestions.js) ──────────────────
QUESTIONS_2025 = [
    "No country should sacrifice its economic development in favour of preserving the environment. Discuss.",
    "Assess the view that only well-known works of art can be considered great.",
    "'The most important aim of a scientist is to satisfy human curiosity about the world.' Evaluate this view.",
    "How far do you agree that media coverage of celebrities has a positive influence on young people in your society?",
    "'Democracy is the perfect form of government.' Discuss.",
    "Examine the claim that it is the responsibility of wealthier countries to assist in dealing with natural disasters.",
    "'Learning facts is no longer necessary because information can be instantly accessed online.' Evaluate this statement.",
    "To what extent do you agree that enough is done in your society to encourage a healthy lifestyle?"
]

QUESTIONS_2024 = [
    "To what extent are science and technology able to solve the problem of waste disposal?",
    "'The most important responsibility of parents is to teach their children values.' Discuss.",
    "How desirable is it for a country to provide free healthcare for all its citizens?",
    "Evaluate the measures taken in your society to deter crime and punish criminals.",
    "'Education today should involve more than the study of academic subjects.' How far do you agree?",
    "Assess the view that it is always right to challenge injustice.",
    "'The problem with social media is that everyone talks but no one listens.' Evaluate this claim.",
    "'Online advertisements use increasingly sophisticated methods to target consumers.' To what extent does this bring more harm than good?",
    "To what extent are autobiographies a reliable way of learning about well-known historical figures?",
    "'Humour is essential for an individual's well-being.' Discuss.",
    "Consider the view that profitability should be the highest priority of a business.",
    "'There is a lack of appreciation for the value of music.' How far is this true in your society?"
]

# ── conflict topics (mirrors conflicts.js) ────────────────────────────────────
CONFLICTS = [
    # Technology & Humanity
    {"id": "human-capability-vs-ai", "side_a": "Human Capability", "side_b": "AI Replacement",
     "theme": "Technology & Humanity", "search_query": "artificial intelligence replacing human workers future of work automation"},
    {"id": "technology-solutions-vs-behaviour", "side_a": "Technological Solutions", "side_b": "Behaviour Change",
     "theme": "Technology & Humanity", "search_query": "technology solve climate change human behaviour individual action"},
    {"id": "privacy-vs-convenience", "side_a": "Privacy", "side_b": "Convenience",
     "theme": "Technology & Humanity", "search_query": "digital privacy surveillance data collection tech companies consumer"},
    {"id": "digital-connection-vs-isolation", "side_a": "Digital Connection", "side_b": "Human Isolation",
     "theme": "Technology & Humanity", "search_query": "social media loneliness digital connection isolation mental health"},
    # Media & Information
    {"id": "free-expression-vs-harm", "side_a": "Free Expression", "side_b": "Harm Prevention",
     "theme": "Media & Information", "search_query": "freedom of speech limits hate speech censorship press freedom"},
    {"id": "social-media-voice-vs-echo", "side_a": "Democratic Voice", "side_b": "Echo Chamber",
     "theme": "Media & Information", "search_query": "social media echo chambers filter bubbles democracy polarisation"},
    {"id": "celebrity-inspiration-vs-distortion", "side_a": "Inspiration", "side_b": "Distortion",
     "theme": "Media & Information", "search_query": "celebrity influence young people media role models fame culture"},
    {"id": "information-access-vs-reliability", "side_a": "Information Access", "side_b": "Reliable Knowledge",
     "theme": "Media & Information", "search_query": "misinformation fake news information reliability media literacy"},
    # Justice & Power
    {"id": "punishment-vs-rehabilitation", "side_a": "Punishment", "side_b": "Rehabilitation",
     "theme": "Justice & Power", "search_query": "prison rehabilitation punishment criminal justice reform recidivism"},
    {"id": "democracy-ideal-vs-reality", "side_a": "Democratic Ideal", "side_b": "Democratic Reality",
     "theme": "Justice & Power", "search_query": "democracy limitations populism democratic backsliding political systems"},
    {"id": "national-interest-vs-global-responsibility", "side_a": "National Interest", "side_b": "Global Responsibility",
     "theme": "Justice & Power", "search_query": "national interest global responsibility foreign aid international obligation"},
    {"id": "challenging-injustice-vs-stability", "side_a": "Challenging Injustice", "side_b": "Maintaining Stability",
     "theme": "Justice & Power", "search_query": "civil disobedience protest justice social change activism stability"},
    # Environment & Progress
    {"id": "economic-development-vs-environment", "side_a": "Economic Development", "side_b": "Environmental Protection",
     "theme": "Environment & Progress", "search_query": "economic development environmental cost green growth sustainability trade-off"},
    {"id": "individual-action-vs-systemic-change", "side_a": "Individual Action", "side_b": "Systemic Change",
     "theme": "Environment & Progress", "search_query": "individual environmental action government regulation climate policy systemic change"},
    {"id": "human-intervention-vs-natural-processes", "side_a": "Human Intervention", "side_b": "Natural Processes",
     "theme": "Environment & Progress", "search_query": "conservation species extinction human intervention natural processes rewilding"},
    {"id": "present-needs-vs-future-generations", "side_a": "Present Needs", "side_b": "Future Generations",
     "theme": "Environment & Progress", "search_query": "intergenerational justice future generations climate debt sustainability"},
    # Science & Ethics
    {"id": "scientific-freedom-vs-ethical-limits", "side_a": "Scientific Freedom", "side_b": "Ethical Limits",
     "theme": "Science & Ethics", "search_query": "scientific freedom ethics research limits dual use dangerous knowledge"},
    {"id": "progress-vs-unintended-consequences", "side_a": "Scientific Progress", "side_b": "Unintended Consequences",
     "theme": "Science & Ethics", "search_query": "scientific progress unintended consequences technology risks unforeseen"},
    {"id": "human-need-vs-commercial-profit", "side_a": "Human Need", "side_b": "Commercial Profit",
     "theme": "Science & Ethics", "search_query": "pharmaceutical profit research funding commercial science public good"},
    {"id": "genetic-engineering-vs-human-dignity", "side_a": "Genetic Engineering", "side_b": "Human Dignity",
     "theme": "Science & Ethics", "search_query": "genetic engineering CRISPR ethics human dignity designer babies bioethics"},
    # Globalisation & Society
    {"id": "globalisation-opportunity-vs-inequality", "side_a": "Global Opportunity", "side_b": "Deepening Inequality",
     "theme": "Globalisation & Society", "search_query": "globalisation inequality developing nations winners losers trade poverty"},
    {"id": "meritocracy-vs-structural-inequality", "side_a": "Meritocracy", "side_b": "Structural Inequality",
     "theme": "Globalisation & Society", "search_query": "meritocracy inequality social mobility structural barriers privilege Singapore"},
    {"id": "national-identity-vs-cultural-homogenisation", "side_a": "National Identity", "side_b": "Cultural Homogenisation",
     "theme": "Globalisation & Society", "search_query": "cultural identity globalisation homogenisation national culture local traditions"},
    {"id": "wealth-redistribution-vs-national-priority", "side_a": "Wealth Redistribution", "side_b": "National Priority",
     "theme": "Globalisation & Society", "search_query": "foreign aid wealth redistribution global inequality rich countries obligation"},
]

# ── domain config ─────────────────────────────────────────────────────────────
QUALITY_DOMAINS = [
    "economist.com", "theguardian.com", "bbc.com", "channelnewsasia.com",
    "straitstimes.com", "todayonline.com", "technologyreview.com",
    "foreignaffairs.com", "brookings.edu", "pewresearch.org",
    "theatlantic.com", "nytimes.com", "ft.com", "mothership.sg", "ips.nus.edu.sg"
]

SINGAPORE_DOMAINS = [
    "straitstimes.com", "channelnewsasia.com", "todayonline.com",
    "mothership.sg", "ips.nus.edu.sg"
]

DOMAIN_NAMES = {
    "economist.com": "The Economist", "theguardian.com": "The Guardian",
    "bbc.com": "BBC", "channelnewsasia.com": "Channel NewsAsia",
    "straitstimes.com": "The Straits Times", "todayonline.com": "TODAY",
    "technologyreview.com": "MIT Technology Review",
    "foreignaffairs.com": "Foreign Affairs", "brookings.edu": "Brookings Institution",
    "pewresearch.org": "Pew Research Center", "theatlantic.com": "The Atlantic",
    "nytimes.com": "The New York Times", "ft.com": "Financial Times",
    "mothership.sg": "Mothership", "ips.nus.edu.sg": "IPS NUS"
}


# ── helpers ───────────────────────────────────────────────────────────────────

def _build_exa():
    try:
        from exa_py import Exa
        key = os.environ.get("EXA_API_KEY")
        if not key:
            logger.error("EXA_API_KEY not set. Cannot seed cache.")
            sys.exit(1)
        return Exa(api_key=key)
    except ImportError:
        logger.error("exa_py not installed. Run: pip install exa-py")
        sys.exit(1)


def _do_exa_search(exa, query, domains, num):
    return exa.search_and_contents(
        query,
        type="auto",
        num_results=num,
        include_domains=domains,
        highlights={"max_characters": 2000}
    )


def _is_singapore(url: str) -> bool:
    return any(d in url for d in SINGAPORE_DOMAINS)


def _item_to_article(item, is_sg_slot: bool = False) -> dict:
    """Convert an Exa result item into a cache-ready article dict.

    Uses the Exa highlight/snippet directly as `why_relevant` — no LLM call.
    For Singapore-slot articles, the source label includes a [SG] tag so the
    frontend can surface it appropriately.
    """
    all_domains = QUALITY_DOMAINS  # superset, covers both SG and general
    domain_key = next((d for d in all_domains if d in item.url), None)
    source = DOMAIN_NAMES.get(domain_key, "Web Source")

    # Build snippet from Exa highlights (preferred) or full text
    snippet = ""
    if hasattr(item, "highlights") and item.highlights:
        snippet = " ".join(item.highlights).strip()
    elif hasattr(item, "text") and item.text:
        snippet = item.text[:500].strip()

    # Trim to a reasonable sentence for display
    why_relevant = snippet[:300] if snippet else "Relevant article on this topic."
    # Ensure it ends cleanly at a sentence boundary if possible
    if len(why_relevant) == 300 and "." in why_relevant:
        why_relevant = why_relevant[: why_relevant.rfind(".") + 1]

    return {
        "title": item.title or "Untitled Article",
        "url": item.url,
        "source": source,
        "why_relevant": why_relevant,
        "estimated_minutes": "5-10 min",
        "is_singapore": _is_singapore(item.url),   # stored for debugging; not exposed to UI
    }


# ── /readings seeder ──────────────────────────────────────────────────────────

async def seed_readings(questions: list[str], exa, force: bool, dry_run: bool) -> tuple[int, int]:
    from article_cache import get_cached_readings, set_cached_readings

    skipped = 0
    fetched = 0

    for question in questions:
        if not force and get_cached_readings(question) is not None:
            logger.info("  SKIP (fresh)  readings: %s", question[:70])
            skipped += 1
            continue

        if dry_run:
            logger.info("  DRY-RUN       readings: %s", question[:70])
            fetched += 1
            continue

        logger.info("  FETCH         readings: %s", question[:70])
        try:
            general_query = f"{question} analysis opinion long-form"
            singapore_query = f"{question} Singapore"

            # Run both searches in parallel
            gen_task = asyncio.to_thread(_do_exa_search, exa, general_query, QUALITY_DOMAINS, 6)
            sg_task  = asyncio.to_thread(_do_exa_search, exa, singapore_query, SINGAPORE_DOMAINS, 2)
            general_results, singapore_results = await asyncio.gather(gen_task, sg_task)

            sg_list  = getattr(singapore_results, "results", [])
            gen_list = getattr(general_results, "results", [])

            seen_urls: set[str] = set()
            articles: list[dict] = []

            # ── Guarantee at least 1 Singapore article ────────────────────────
            sg_added = 0
            for item in sg_list:
                if item.url not in seen_urls and sg_added < 1:
                    articles.append(_item_to_article(item, is_sg_slot=True))
                    seen_urls.add(item.url)
                    sg_added += 1

            # ── Fill remaining slots from general results (up to 4 more) ──────
            for item in gen_list:
                if item.url not in seen_urls and len(articles) < 5:
                    articles.append(_item_to_article(item))
                    seen_urls.add(item.url)

            # ── Backfill with extra SG articles if still under 5 ──────────────
            for item in sg_list[1:]:
                if item.url not in seen_urls and len(articles) < 5:
                    articles.append(_item_to_article(item, is_sg_slot=True))
                    seen_urls.add(item.url)

            sg_count = sum(1 for a in articles if a.get("is_singapore"))

            if len(articles) >= 3:
                set_cached_readings(question, articles)
                logger.info(
                    "    → cached %d articles  (SG: %d)",
                    len(articles), sg_count
                )
                fetched += 1
            else:
                logger.warning(
                    "    → only %d articles found — skipping cache write (need ≥3)",
                    len(articles)
                )

        except Exception as e:
            logger.error("    → FAILED: %s", e)

    return fetched, skipped


# ── /conflict-readings seeder ─────────────────────────────────────────────────

async def seed_conflicts(conflicts: list[dict], exa, force: bool, dry_run: bool) -> tuple[int, int]:
    from article_cache import get_cached_conflict_readings, set_cached_conflict_readings

    skipped = 0
    fetched = 0

    for conflict in conflicts:
        conflict_id  = conflict["id"]
        side_a       = conflict["side_a"]
        side_b       = conflict["side_b"]
        theme        = conflict["theme"]
        search_query = conflict["search_query"]

        if not force and get_cached_conflict_readings(conflict_id) is not None:
            logger.info("  SKIP (fresh)  conflict: %s", conflict_id)
            skipped += 1
            continue

        if dry_run:
            logger.info("  DRY-RUN       conflict: %s", conflict_id)
            fetched += 1
            continue

        logger.info("  FETCH         conflict: %s  (%s vs %s)", conflict_id, side_a, side_b)
        try:
            side_a_query = f"{side_a} {search_query} analysis arguments"
            side_b_query = f"{side_b} {search_query} analysis arguments"
            sg_query     = f"{search_query} Singapore"

            side_a_task = asyncio.to_thread(_do_exa_search, exa, side_a_query, QUALITY_DOMAINS, 3)
            side_b_task = asyncio.to_thread(_do_exa_search, exa, side_b_query, QUALITY_DOMAINS, 3)
            sg_task     = asyncio.to_thread(_do_exa_search, exa, sg_query, SINGAPORE_DOMAINS, 2)

            side_a_res, side_b_res, sg_res = await asyncio.gather(side_a_task, side_b_task, sg_task)

            # Deduplicate across all three lists
            seen_urls: set[str] = set()

            def _process_side(results, limit: int) -> list[dict]:
                items = getattr(results, "results", [])
                out = []
                for item in items:
                    if item.url in seen_urls or len(out) >= limit:
                        continue
                    seen_urls.add(item.url)
                    out.append(_item_to_article(item))
                return out

            def _process_sg(results, limit: int) -> list[dict]:
                items = getattr(results, "results", [])
                out = []
                for item in items:
                    if item.url in seen_urls or len(out) >= limit:
                        continue
                    seen_urls.add(item.url)
                    out.append(_item_to_article(item, is_sg_slot=True))
                return out

            side_a_processed = _process_side(side_a_res, 3)
            side_b_processed = _process_side(side_b_res, 3)
            sg_processed     = _process_sg(sg_res, 2)

            set_cached_conflict_readings(
                conflict_id=conflict_id,
                side_a_articles=side_a_processed,
                side_b_articles=side_b_processed,
                singapore_articles=sg_processed
            )
            logger.info(
                "    → cached  a=%d  b=%d  sg=%d",
                len(side_a_processed), len(side_b_processed), len(sg_processed)
            )
            fetched += 1

        except Exception as e:
            logger.error("    → FAILED: %s", e)

    return fetched, skipped


# ── main ──────────────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(description="Pre-seed the Socra article cache (Exa-only, no Claude).")
    parser.add_argument("--force",   action="store_true", help="Re-fetch all entries, even fresh ones.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be fetched without fetching.")
    args = parser.parse_args()

    if args.dry_run:
        logger.info("=== DRY RUN MODE — no cache will be written ===")

    exa = _build_exa()  # only dependency: EXA_API_KEY

    all_questions = QUESTIONS_2025 + QUESTIONS_2024

    logger.info("=" * 60)
    logger.info("Seeding /readings for %d questions (2024 + 2025)...", len(all_questions))
    logger.info("=" * 60)
    r_fetched, r_skipped = await seed_readings(all_questions, exa, args.force, args.dry_run)

    logger.info("=" * 60)
    logger.info("Seeding /conflict-readings for %d conflicts...", len(CONFLICTS))
    logger.info("=" * 60)
    c_fetched, c_skipped = await seed_conflicts(CONFLICTS, exa, args.force, args.dry_run)

    logger.info("=" * 60)
    logger.info("DONE")
    logger.info("  /readings      fetched=%d  skipped=%d", r_fetched, r_skipped)
    logger.info("  /conflict      fetched=%d  skipped=%d", c_fetched, c_skipped)

    if not args.dry_run:
        from article_cache import cache_stats
        stats = cache_stats()
        logger.info("Cache stats: %s", stats)
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
test_memory_gate.py

Exercises the exact gate logic in _run_blueprint_extraction_inner that decides
whether update_user_memory() is called, without requiring a full AI conversation.

It simulates two scenarios:
  1. Spine just completed  (argument_sketch_complete flips False → True)
  2. Paragraph deep-dive  (a new analytical link is added)

Uses the real Supabase client so the user_memory write hits the actual DB.

Requirements (backend/.env):
  SUPABASE_URL   — project URL
  SUPABASE_KEY   — service-role key (bypasses RLS)
  ANTHROPIC_API_KEY — only needed without --no-ai

Usage:
  python test_memory_gate.py               # both scenarios, AI dedup on
  python test_memory_gate.py --no-ai       # skip AI merge calls
  python test_memory_gate.py --scenario spine
  python test_memory_gate.py --scenario deepdive
  python test_memory_gate.py --clean       # remove synthetic entries after
  python test_memory_gate.py --user-id UUID
"""

import asyncio
import argparse
import sys
import os
import copy
import uuid
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit(
        "ERROR: SUPABASE_URL and SUPABASE_KEY must be set in backend/.env\n"
        "  SUPABASE_KEY should be the service-role key, not the anon key."
    )

# ---------------------------------------------------------------------------
# Shared blueprint base — Phase 2, skeleton NOT yet complete
# (CA claim present, only 1 topic sentence locked → gate should stay closed)
# ---------------------------------------------------------------------------
BASE_BLUEPRINT = {
    "question": "Governments should prioritise economic growth over environmental protection. Discuss.",
    "thesis": "While growth matters, long-term environmental protection must take precedence.",
    "key_terms": [
        {"term": "economic growth", "definition": "Sustained increase in productive capacity."},
        {"term": "environmental protection", "definition": "Policies that conserve ecosystems and reduce pollution."},
        {"term": "prioritise", "definition": "To treat one goal as more urgent when allocating resources."},
    ],
    "paragraphs": [
        {
            "title": "Growth funds green infrastructure",
            "topic_sentence": "Economic growth equips governments with the fiscal resources to invest in green infrastructure.",
            "point": "Wealthier economies can afford clean technology.",
            "explanation": "Singapore's NEWater investment was only viable after decades of growth.",
            "example": "NEWater programme.",
            "link": None,  # no analytical link yet
        }
    ],
    "counter_argument": {
        "their_claim": "Developing nations cannot afford green transitions and must grow first.",
        "its_merit": "Upfront capital for clean energy is genuinely scarce in low-income countries.",
        "student_response": "International climate finance and falling renewables costs weaken this objection.",
    },
    "conclusion": None,
    "unlocked_insights": ["Growth and protection can be complementary, not opposed."],
    "student_strengths": ["Uses specific evidence to ground abstract arguments."],
    "challenge_patterns": ["Initial thesis too binary — needed prompting to qualify."],
    "final_score": 14,
    "session_quality": {
        "question_autopsy_complete": True,
        "both_sides_argued": True,
        "argument_sketch_complete": False,  # spine NOT done yet
        "thesis_refined": True,
        "analytical_links_count": 0,
    },
}


def _spine_complete_blueprint() -> dict:
    """Returns a blueprint where the spine just completed (2 topic sentences + CA claim)."""
    bp = copy.deepcopy(BASE_BLUEPRINT)
    bp["paragraphs"].append({
        "title": "Ecological collapse destroys long-run growth",
        "topic_sentence": "Prioritising growth at the expense of environment is self-defeating because ecological collapse destroys natural capital.",
        "point": "Natural capital depletion has compounding economic costs.",
        "explanation": "World Bank: natural-capital depletion costs low-income countries up to 9% of GNI.",
        "example": "China's cancer villages.",
        "link": None,
    })
    bp["session_quality"]["argument_sketch_complete"] = True
    return bp


def _deepdive_blueprint() -> dict:
    """Returns a blueprint identical to spine-complete but with a new analytical link added."""
    bp = _spine_complete_blueprint()
    bp["session_quality"]["argument_sketch_complete"] = True  # already done
    bp["paragraphs"][0]["link"] = (
        "This answers the question by showing growth and protection are complementary, "
        "making a binary trade-off misleading."
    )
    bp["session_quality"]["analytical_links_count"] = 1
    return bp


# ---------------------------------------------------------------------------
# Gate logic — copied verbatim from _run_blueprint_extraction_inner
# so we're testing the exact same code path
# ---------------------------------------------------------------------------
def _run_gate(old_blueprint: dict, updated_bp: dict) -> tuple[bool, bool]:
    old_argument_sketch_complete = old_blueprint.get("session_quality", {}).get("argument_sketch_complete", False)
    old_links = sum(1 for p in old_blueprint.get("paragraphs", []) if p.get("link"))
    new_links = sum(1 for p in updated_bp.get("paragraphs", []) if p.get("link"))

    sq_final = updated_bp.get("session_quality", {})
    argument_sketch_just_completed = bool(sq_final.get("argument_sketch_complete")) and not old_argument_sketch_complete
    paragraph_deep_dive_occurred = new_links > old_links

    return argument_sketch_just_completed, paragraph_deep_dive_occurred


async def run_scenario(
    label: str,
    supa,
    user_id: str,
    old_bp: dict,
    new_bp: dict,
    socra_ai,
    clean_session_ids: list,
) -> None:
    from memory import update_user_memory, get_user_memory

    session_id = f"test-gate-{uuid.uuid4()}"
    clean_session_ids.append(session_id)

    print(f"\n{'─'*66}")
    print(f"  SCENARIO: {label}")
    print(f"  session_id : {session_id}")
    print(f"{'─'*66}")

    argument_sketch_just_completed, paragraph_deep_dive_occurred = _run_gate(old_bp, new_bp)

    print(f"  Gate check:")
    print(f"    argument_sketch_just_completed = {argument_sketch_just_completed}")
    print(f"    paragraph_deep_dive_occurred   = {paragraph_deep_dive_occurred}")

    if not argument_sketch_just_completed and not paragraph_deep_dive_occurred:
        print("  RESULT: Gate CLOSED ✗  — update_user_memory would NOT be called")
        print("  (This means the bug is in the gate condition, not in memory.py)")
        return

    print("  RESULT: Gate OPEN ✓  — calling update_user_memory...")

    before = await get_user_memory(supa, user_id)
    before_total = before.get("total_sessions", 0)
    before_summaries = {s["session_id"] for s in before.get("session_summaries", [])}

    start = datetime.utcnow()
    try:
        updated = await update_user_memory(
            supa, user_id, session_id, new_bp, socra_ai,
            is_spine_complete=argument_sketch_just_completed,
        )
        elapsed = (datetime.utcnow() - start).total_seconds()
        print(f"  update_user_memory completed in {elapsed:.2f}s")
    except Exception as e:
        import traceback
        print(f"  ERROR: update_user_memory raised: {e}")
        traceback.print_exc()
        return

    # Verify DB directly
    res = await asyncio.to_thread(
        lambda: supa.table("user_memory").select("*").eq("user_id", user_id).execute()
    )
    if not res.data:
        print("  DB VERIFY: ✗  No row found in user_memory after upsert!")
        return

    db = res.data[0]
    new_summaries = {s["session_id"] for s in db.get("session_summaries", [])}
    session_written = session_id in new_summaries
    total_delta = db.get("total_sessions", 0) - before_total

    print(f"  DB VERIFY:")
    print(f"    session entry written  : {'✓' if session_written else '✗'}")
    print(f"    total_sessions delta   : +{total_delta}")
    print(f"    updated_at             : {db.get('updated_at', 'N/A')}")
    moves = db.get("moves_mastery", {})
    if moves:
        print(f"    moves tracked          : {list(moves.keys())}")
    if argument_sketch_just_completed and db.get("student_profile_summary"):
        print(f"    student_profile_summary: ✓ written ({len(db['student_profile_summary'])} chars)")


async def run(user_id: str, scenarios: list[str], use_ai: bool, clean: bool) -> None:
    supa = create_client(SUPABASE_URL, SUPABASE_KEY)

    socra_ai = None
    if use_ai:
        print("Initialising SocraAI…")
        from ai import SocraAI
        socra_ai = SocraAI()
        print("SocraAI ready.")

    clean_session_ids: list[str] = []

    if "spine" in scenarios:
        await run_scenario(
            label="Spine just completed (argument_sketch_complete: False → True)",
            supa=supa,
            user_id=user_id,
            old_bp=BASE_BLUEPRINT,
            new_bp=_spine_complete_blueprint(),
            socra_ai=socra_ai,
            clean_session_ids=clean_session_ids,
        )

    if "deepdive" in scenarios:
        # Old state: spine already complete, no links yet
        old_bp = _spine_complete_blueprint()
        await run_scenario(
            label="Paragraph deep-dive (new analytical link added)",
            supa=supa,
            user_id=user_id,
            old_bp=old_bp,
            new_bp=_deepdive_blueprint(),
            socra_ai=socra_ai,
            clean_session_ids=clean_session_ids,
        )

    if clean and clean_session_ids:
        print(f"\n── CLEANUP ───────────────────────────────────────────────────────")
        from memory import get_user_memory
        from database import db_upsert
        mem = await get_user_memory(supa, user_id)
        ids = set(clean_session_ids)
        mem["session_summaries"] = [s for s in mem.get("session_summaries", []) if s.get("session_id") not in ids]
        mem["score_history"] = [s for s in mem.get("score_history", []) if s.get("session_id") not in ids]
        removed = len(clean_session_ids)
        mem["total_sessions"] = max(0, mem["total_sessions"] - removed)
        await db_upsert(supa, "user_memory", mem)
        print(f"  Removed {removed} synthetic session(s) from memory.")

    print("\nDone.\n")


def _resolve_user_id(override: str | None) -> str:
    if override:
        return override
    supa = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = supa.table("chat_sessions").select("user_id").limit(1).execute()
    if res.data:
        uid = res.data[0]["user_id"]
        print(f"Auto-detected user_id from chat_sessions: {uid}")
        return uid
    res2 = supa.table("user_memory").select("user_id").limit(1).execute()
    if res2.data:
        uid = res2.data[0]["user_id"]
        print(f"Auto-detected user_id from user_memory: {uid}")
        return uid
    sys.exit("Could not auto-detect user_id. Pass --user-id <UUID>.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test memory gate logic")
    parser.add_argument("--user-id", help="Supabase user UUID (auto-detected if omitted)")
    parser.add_argument("--no-ai", action="store_true", help="Skip SocraAI semantic deduplication")
    parser.add_argument("--scenario", choices=["spine", "deepdive"], help="Run only one scenario")
    parser.add_argument("--clean", action="store_true", help="Remove synthetic entries from memory after")
    args = parser.parse_args()

    scenarios = [args.scenario] if args.scenario else ["spine", "deepdive"]
    user_id = _resolve_user_id(args.user_id)
    asyncio.run(run(user_id, scenarios, use_ai=not args.no_ai, clean=args.clean))

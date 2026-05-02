#!/usr/bin/env python3
"""
test_memory_update.py

Directly exercises update_user_memory() with a realistic Phase-3 blueprint,
writing to the real user_memory table in Supabase. Mirrors exactly what the
production run_blueprint_extraction() task does after a paragraph deep-dive.

Requirements (in backend/.env):
  SUPABASE_URL          — your Supabase project URL
  SUPABASE_KEY          — service-role key (bypasses RLS so the write succeeds)
  ANTHROPIC_API_KEY     — only needed if --no-ai is not passed

Usage:
    python test_memory_update.py               # full run with AI deduplication
    python test_memory_update.py --no-ai       # skip AI merge_semantic_list calls
    python test_memory_update.py --clean       # delete the synthetic session from memory after
    python test_memory_update.py --user-id UUID  # override auto-detected user_id
"""

import asyncio
import argparse
import json
import uuid
import sys
import os
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")  # service-role key

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit(
        "ERROR: SUPABASE_URL and SUPABASE_KEY must be set in backend/.env\n"
        "  SUPABASE_KEY should be your project's service-role key (not the anon key)."
    )

# ---------------------------------------------------------------------------
# Realistic Phase-3 blueprint — every quality flag triggered
# This mirrors what a student would have after completing the argument skeleton
# AND doing at least one paragraph deep-dive (the two conditions that fire
# update_user_memory in production).
# ---------------------------------------------------------------------------
SYNTHETIC_SESSION_ID = f"test-{uuid.uuid4()}"
TEST_QUESTION = (
    "Governments should prioritise economic growth over environmental protection. "
    "Discuss."
)

REALISTIC_BLUEPRINT = {
    "question": TEST_QUESTION,
    "thesis": (
        "While economic growth is important for raising living standards, governments "
        "must ultimately prioritise long-term environmental protection because the "
        "ecological crises it prevents are irreversible and will undermine growth itself."
    ),
    "key_terms": [
        {
            "term": "economic growth",
            "definition": (
                "A sustained increase in the productive capacity of an economy, "
                "typically measured by GDP, enabling higher incomes and consumption."
            ),
        },
        {
            "term": "environmental protection",
            "definition": (
                "Policies and actions that conserve natural ecosystems, reduce "
                "pollution, and prevent irreversible ecological damage such as "
                "biodiversity loss and climate change."
            ),
        },
        {
            "term": "prioritise",
            "definition": (
                "To treat one goal as more urgent or important than another when "
                "allocating public resources, legislation, and political capital."
            ),
        },
    ],
    "paragraphs": [
        {
            "title": "Economic growth enables the funding of environmental solutions",
            "topic_sentence": (
                "Economic growth equips governments with the fiscal resources needed "
                "to invest in green infrastructure and enforce environmental standards."
            ),
            "point": "Wealthier economies can afford clean technology and regulation.",
            "explanation": (
                "The Environmental Kuznets Curve hypothesis suggests that pollution "
                "rises with early industrialisation but falls once a country reaches "
                "sufficient income. Singapore's investment in NEWater and waste-to-energy "
                "plants was only viable after decades of GDP-driven growth."
            ),
            "example": "Singapore's NEWater programme and Semakau Landfill.",
            "link": (
                "This directly answers the question by showing growth and protection "
                "need not be mutually exclusive — affluence creates the very capacity "
                "to protect the environment, making a binary trade-off misleading."
            ),
        },
        {
            "title": "Environmental degradation undermines long-run growth",
            "topic_sentence": (
                "Prioritising growth at the expense of the environment is self-defeating "
                "because ecological collapse destroys the natural capital on which "
                "economic productivity depends."
            ),
            "point": "Natural capital degradation has compounding economic costs.",
            "explanation": (
                "The World Bank estimates that natural-capital depletion costs low-income "
                "countries up to 9 % of GNI annually through reduced agricultural yields, "
                "fisheries collapse, and rising healthcare costs from pollution. "
                "These are losses that no growth dividend can offset indefinitely."
            ),
            "example": (
                "China's 'cancer villages' near industrial zones, where groundwater "
                "pollution cost more to remediate than the GDP gains from the factories."
            ),
            "link": (
                "This undermines the premise of the question: if growth destroys "
                "the environmental base it depends on, the trade-off dissolves — "
                "protecting the environment IS protecting long-run growth."
            ),
        },
        {
            "title": "Developing nations face an asymmetric burden",
            "topic_sentence": (
                "The growth-vs-environment dilemma is sharpest for developing nations, "
                "which bear the highest costs of climate change yet contributed least "
                "to it — revealing that the question is partly a justice issue, not "
                "only a policy one."
            ),
            "point": "Climate injustice complicates a purely utilitarian calculus.",
            "explanation": (
                "Sub-Saharan Africa contributes under 4 % of global CO₂ yet faces "
                "the most severe agricultural disruption from warming. "
                "Asking these governments to forgo growth for environmental ends "
                "demands a sacrifice the historically industrialised world never made."
            ),
            "example": (
                "Bangladesh's adaptation costs from cyclone intensification, estimated "
                "at 2–3 % of GDP annually despite negligible historic emissions."
            ),
            "link": (
                "This nuances the question's framing: 'which to prioritise' depends "
                "heavily on a country's development stage and historic responsibility, "
                "meaning no single universal answer holds — a qualification that "
                "strengthens rather than weakens a sophisticated thesis."
            ),
        },
    ],
    "counter_argument": {
        "their_claim": (
            "Developing nations cannot afford green transitions and must prioritise "
            "growth first; imposing environmental costs on poor countries is a "
            "form of neo-colonial paternalism that entrenches global inequality."
        ),
        "its_merit": (
            "This concern is well-founded: clean energy infrastructure requires "
            "upfront capital that low-income governments genuinely lack, and "
            "premature de-carbonisation can lock in energy poverty."
        ),
        "student_response": (
            "The counter-argument is strongest as a critique of unilateral domestic "
            "action, but it is weakened by the availability of international climate "
            "finance (Green Climate Fund, $100 bn/yr pledges) and the fact that "
            "renewable energy costs have fallen 89 % since 2010, making leapfrogging "
            "fossil fuels increasingly viable even for low-income states."
        ),
    },
    "conclusion": {
        "synthesis": (
            "Governments should not choose between growth and environment as if they "
            "are permanent rivals; the goal is a managed transition where growth "
            "funds the green infrastructure that, in turn, makes growth sustainable."
        ),
        "qualification": (
            "The appropriate balance shifts with a country's income level, historic "
            "emissions, and access to climate finance — a truth that renders blanket "
            "prescriptions unhelpful."
        ),
        "lasting_impression": (
            "The real question is not growth or environment, but how quickly "
            "governments can redesign growth so the two converge — and whether "
            "international cooperation will fund the transition for those who can "
            "least afford it alone."
        ),
    },
    "unlocked_insights": [
        "The Environmental Kuznets Curve shows growth and protection can be complementary, not opposed.",
        "Climate justice reframes the question as one of equity, not just efficiency.",
    ],
    "student_strengths": [
        "Grounds abstract arguments with specific quantified evidence.",
        "Acknowledges counter-arguments at their strongest before rebutting.",
    ],
    "challenge_patterns": [
        "Initial thesis was too binary — needed prompting to add qualification.",
    ],
    "final_score": 22,
    "session_quality": {
        "question_autopsy_complete": True,   # all key_terms have definitions
        "both_sides_argued": True,            # counter_argument.their_claim is set
        "argument_sketch_complete": True,     # 3 topic sentences + CA claim locked
        "thesis_refined": True,               # thesis was iterated at least once
        "analytical_links_count": 3,          # 3 paragraphs with link fields
    },
}


def _fmt(obj) -> str:
    return json.dumps(obj, indent=2, ensure_ascii=False)


def _diff_summary(before: dict, after: dict) -> None:
    print("\n── DIFF ──────────────────────────────────────────────────────────")

    before_moves = before.get("moves_mastery", {})
    after_moves = after.get("moves_mastery", {})
    new_moves = set(after_moves) - set(before_moves)
    updated_counts = {
        m: (before_moves.get(m, {}).get("count", 0), after_moves[m]["count"])
        for m in after_moves
        if after_moves[m].get("count", 0) != before_moves.get(m, {}).get("count", 0)
    }
    if new_moves:
        print(f"  New moves tracked    : {', '.join(sorted(new_moves))}")
    if updated_counts:
        for m, (old_c, new_c) in updated_counts.items():
            print(f"  Move count updated   : {m}  {old_c} → {new_c}")

    before_insights = set(before.get("all_insights", []))
    after_insights = set(after.get("all_insights", []))
    added_insights = after_insights - before_insights
    if added_insights:
        for i in added_insights:
            print(f"  New insight          : {i[:80]}…" if len(i) > 80 else f"  New insight          : {i}")

    before_strengths = set(before.get("persistent_strengths", []))
    after_strengths = set(after.get("persistent_strengths", []))
    added_strengths = after_strengths - before_strengths
    if added_strengths:
        for s in added_strengths:
            print(f"  New persistent strength : {s}")

    delta_sessions = after.get("total_sessions", 0) - before.get("total_sessions", 0)
    if delta_sessions:
        print(f"  total_sessions       : {before.get('total_sessions', 0)} → {after.get('total_sessions', 0)}")

    before_score_ids = {s["session_id"] for s in before.get("score_history", [])}
    after_score_ids = {s["session_id"] for s in after.get("score_history", [])}
    new_score_entries = after_score_ids - before_score_ids
    if new_score_entries:
        for entry in after.get("score_history", []):
            if entry["session_id"] in new_score_entries:
                print(f"  Score entry added    : session={entry['session_id'][:8]}… score={entry['score']}")

    print("──────────────────────────────────────────────────────────────────")


async def run(user_id: str, use_ai: bool, clean: bool) -> None:
    supa = create_client(SUPABASE_URL, SUPABASE_KEY)

    print(f"\n{'='*66}")
    print(f"  MEMORY UPDATE TEST")
    print(f"  user_id        : {user_id}")
    print(f"  session_id     : {SYNTHETIC_SESSION_ID}")
    print(f"  AI dedup       : {'yes (real SocraAI calls)' if use_ai else 'no (--no-ai)'}")
    print(f"  question       : {TEST_QUESTION[:60]}…")
    print(f"{'='*66}\n")

    # Import here so we can use the already-loaded env
    from memory import update_user_memory, get_user_memory

    socra_ai = None
    if use_ai:
        print("Initialising SocraAI… (requires ANTHROPIC_API_KEY)")
        from ai import SocraAI
        socra_ai = SocraAI()
        print("SocraAI ready.\n")

    print("── BEFORE ────────────────────────────────────────────────────────")
    before = await get_user_memory(supa, user_id)
    if before.get("total_sessions", 0) == 0 and not before.get("moves_mastery"):
        print("  (no existing record — this will create a fresh entry)")
    else:
        print(f"  total_sessions      : {before.get('total_sessions', 0)}")
        print(f"  moves tracked       : {list(before.get('moves_mastery', {}).keys())}")
        print(f"  all_insights count  : {len(before.get('all_insights', []))}")
        print(f"  score_history count : {len(before.get('score_history', []))}")
    print()

    print("── RUNNING update_user_memory() ──────────────────────────────────")
    start = datetime.utcnow()
    updated = await update_user_memory(supa, user_id, SYNTHETIC_SESSION_ID, REALISTIC_BLUEPRINT, socra_ai)
    elapsed = (datetime.utcnow() - start).total_seconds()
    print(f"  Done in {elapsed:.2f}s\n")

    print("── AFTER ─────────────────────────────────────────────────────────")
    print(f"  total_sessions      : {updated.get('total_sessions', 0)}")
    print(f"  moves_mastery       :")
    for move, data in updated.get("moves_mastery", {}).items():
        mastered = " ✓ MASTERED" if data.get("count", 0) >= 3 else ""
        print(f"    {move:<30} count={data['count']}{mastered}")
    print(f"  all_insights        : {updated.get('all_insights', [])}")
    print(f"  persistent_strengths: {updated.get('persistent_strengths', [])}")
    print(f"  recurring_challenges: {updated.get('recurring_challenges', [])}")
    print(f"  score_history       : {[{'session': s['session_id'][:8]+'…', 'score': s['score']} for s in updated.get('score_history', [])]}")
    print(f"  session_summaries   : {len(updated.get('session_summaries', []))} entry/entries")

    _diff_summary(before, updated)

    print("\n── SUPABASE VERIFICATION ─────────────────────────────────────────")
    res = await asyncio.to_thread(
        lambda: supa.table("user_memory").select("*").eq("user_id", user_id).execute()
    )
    if res.data:
        db_record = res.data[0]
        print(f"  Row found in user_memory table ✓")
        print(f"  updated_at          : {db_record.get('updated_at', 'N/A')}")
        print(f"  total_sessions in DB: {db_record.get('total_sessions', 'N/A')}")
        moves_in_db = db_record.get("moves_mastery", {})
        print(f"  moves in DB         : {list(moves_in_db.keys())}")
    else:
        print("  ERROR: No row found in user_memory table after upsert!")

    if clean:
        print("\n── CLEANUP ───────────────────────────────────────────────────────")
        fresh = await get_user_memory(supa, user_id)
        fresh["session_summaries"] = [
            s for s in fresh.get("session_summaries", [])
            if s.get("session_id") != SYNTHETIC_SESSION_ID
        ]
        fresh["score_history"] = [
            s for s in fresh.get("score_history", [])
            if s.get("session_id") != SYNTHETIC_SESSION_ID
        ]
        if fresh["total_sessions"] > 0:
            fresh["total_sessions"] -= 1
        from database import db_upsert
        await db_upsert(supa, "user_memory", fresh)
        print(f"  Removed synthetic session {SYNTHETIC_SESSION_ID[:20]}… from memory.")
        print("  Note: moves_mastery and insights from this run are NOT reversed")
        print("  (they represent demonstrated skills, not session counts).")

    print("\nTest complete.\n")


def _resolve_user_id(override: str | None) -> str:
    if override:
        return override

    supa = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Try to find any existing user_id from chat_sessions
    res = supa.table("chat_sessions").select("user_id").limit(1).execute()
    if res.data:
        uid = res.data[0]["user_id"]
        print(f"Auto-detected user_id from chat_sessions: {uid}")
        return uid

    # Fall back: look in user_memory
    res2 = supa.table("user_memory").select("user_id").limit(1).execute()
    if res2.data:
        uid = res2.data[0]["user_id"]
        print(f"Auto-detected user_id from user_memory: {uid}")
        return uid

    sys.exit(
        "Could not auto-detect user_id.\n"
        "Pass it explicitly with:  python test_memory_update.py --user-id <UUID>"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test user_memory update pipeline")
    parser.add_argument("--user-id", help="Supabase user UUID (auto-detected if omitted)")
    parser.add_argument("--no-ai", action="store_true", help="Skip SocraAI for semantic deduplication")
    parser.add_argument("--clean", action="store_true", help="Remove the synthetic session entry from memory after the test")
    args = parser.parse_args()

    user_id = _resolve_user_id(args.user_id)
    asyncio.run(run(user_id, use_ai=not args.no_ai, clean=args.clean))

from datetime import datetime
from database import db_select, db_upsert

CORE_MOVES = {
    "problem_deconstruction": "Problem Deconstruction",
    "perspective_taking": "Perspective-Taking",
    "nuance_positionality": "Nuance & Positionality",
    "analytical_depth": "Analytical Depth",
    "cogent_insight": "Cogent Insight"
}

def extract_demonstrated_moves(blueprint: dict) -> list[str]:
    moves = []
    sq = blueprint.get("session_quality", {})
    
    if sq.get("question_autopsy_complete"):
        moves.append("problem_deconstruction")
    if sq.get("both_sides_argued"):
        moves.append("perspective_taking")
    if sq.get("thesis_refined"):
        moves.append("nuance_positionality")
    if sq.get("analytical_links_count", 0) >= 2:
        moves.append("analytical_depth")
    if len(blueprint.get("unlocked_insights", [])) >= 1:
        moves.append("cogent_insight")
        
    return moves

async def get_user_memory(supabase_client, user_id: str) -> dict:
    res = await db_select(supabase_client, "user_memory", {"user_id": user_id})
    if not res:
        return {
            "user_id": user_id,
            "moves_mastery": {},
            "persistent_strengths": [],
            "recurring_challenges": [],
            "all_insights": [],
            "score_history": [],
            "session_summaries": [],
            "total_sessions": 0,
            "updated_at": datetime.utcnow().isoformat()
        }
    return res[0]

def _update_strengths_challenges(current_list: list, new_items: list, summaries: list, key: str) -> list:
    """
    Very simple logic: if a new item is broadly similar to something in a past summary's key,
    or if it appears 2+ times across sessions, it becomes persistent. 
    For MVP, we will just add anything that appears > 1 time across all sessions to the persistent list.
    """
    all_past_items = []
    for s in summaries:
        all_past_items.extend(s.get(key, []))
        
    persistent = set(current_list)
    for item in new_items:
        # Check if item exists in past items (exact match or simple substring match)
        match_count = 0
        item_lower = item.lower()
        for past_item in all_past_items:
            if item_lower in past_item.lower() or past_item.lower() in item_lower:
                match_count += 1
                
        if match_count >= 1: # Appeared in at least one past session (so now it's 2+)
            persistent.add(item)
            
    return list(persistent)

async def update_user_memory(supabase_client, user_id: str, session_id: str, blueprint: dict):
    mem = await get_user_memory(supabase_client, user_id)
    
    now_iso = datetime.utcnow().isoformat()
    
    # 1. Update session count
    mem["total_sessions"] += 1
    
    # 2. Update moves mastery
    demonstrated_moves = extract_demonstrated_moves(blueprint)
    moves_mastery = mem.get("moves_mastery", {})
    for move in demonstrated_moves:
        if move not in moves_mastery:
            moves_mastery[move] = {"count": 1, "first_session_id": session_id, "last_seen": now_iso}
        else:
            # Only increment if this is a new session
            if moves_mastery[move].get("last_seen_session_id") != session_id:
                moves_mastery[move]["count"] += 1
            moves_mastery[move]["last_seen"] = now_iso
        moves_mastery[move]["last_seen_session_id"] = session_id
    mem["moves_mastery"] = moves_mastery
    
    # 3. Aggregate insights
    all_insights = set(mem.get("all_insights", []))
    for insight in blueprint.get("unlocked_insights", []):
        all_insights.add(insight)
    mem["all_insights"] = list(all_insights)
    
    # 4. Persistence of Strengths & Challenges
    new_strengths = blueprint.get("student_strengths", [])
    new_challenges = blueprint.get("challenge_patterns", [])
    
    mem["persistent_strengths"] = _update_strengths_challenges(
        mem.get("persistent_strengths", []), 
        new_strengths, 
        mem.get("session_summaries", []), 
        "strengths"
    )
    
    mem["recurring_challenges"] = _update_strengths_challenges(
        mem.get("recurring_challenges", []), 
        new_challenges, 
        mem.get("session_summaries", []), 
        "challenges"
    )
    
    # 5. Score History
    score = blueprint.get("final_score", 0)
    question_snippet = blueprint.get("question", "")[:50] + "..." if len(blueprint.get("question", "")) > 50 else blueprint.get("question", "")
    score_entry = {
        "session_id": session_id,
        "score": score,
        "date": now_iso,
        "question_snippet": question_snippet
    }
    mem["score_history"].append(score_entry)
    
    # 6. Session Summary
    summary_entry = {
        "session_id": session_id,
        "date": now_iso,
        "question_snippet": question_snippet,
        "moves": demonstrated_moves,
        "strengths": new_strengths,
        "challenges": new_challenges
    }
    mem["session_summaries"].append(summary_entry)
    mem["updated_at"] = now_iso
    
    # Upsert
    await db_upsert(supabase_client, "user_memory", mem)
    return mem

async def compute_memory_diff(old_mem: dict, new_mem: dict) -> dict:
    diff = {
        "new_mastered_moves": [],
        "score_delta": 0,
        "broken_challenges": []
    }
    
    # Check for new mastery (count reached 3)
    for move, data in new_mem.get("moves_mastery", {}).items():
        if data.get("count", 0) == 3:
            old_count = old_mem.get("moves_mastery", {}).get(move, {}).get("count", 0)
            if old_count < 3:
                diff["new_mastered_moves"].append(CORE_MOVES.get(move, move))
                
    # Check score delta
    scores = new_mem.get("score_history", [])
    if len(scores) >= 2:
        diff["score_delta"] = scores[-1]["score"] - scores[-2]["score"]
        
    return diff

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from dependencies import get_current_user
from database import db_select
from memory import get_user_memory, compute_memory_diff
from plato import plato_handler

router = APIRouter()

@router.get("/greeting")
async def get_plato_greeting(session_id: str, current_user: dict = Depends(get_current_user)):
    user_memory = await get_user_memory(current_user["supabase"], current_user["id"])
    
    s_data = await db_select(current_user["supabase"], "chat_sessions", {"id": session_id})
    if not s_data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    question = s_data[0].get("question", "")
    
    greeting = await plato_handler.generate_greeting(user_memory, question)
    return {"message": greeting}

@router.get("/insight-note")
async def get_insight_note(insight: str, session_id: str, current_user: dict = Depends(get_current_user)):
    user_memory = await get_user_memory(current_user["supabase"], current_user["id"])
    
    # Only generate note if insight is in all_insights (i.e. unlocked before this session)
    if insight in user_memory.get("all_insights", []):
        note = await plato_handler.generate_insight_note(user_memory, insight)
        return {"message": note}
    return {"message": None}

@router.get("/reflect")
async def get_session_reflection(session_id: str, current_user: dict = Depends(get_current_user)):
    user_memory = await get_user_memory(current_user["supabase"], current_user["id"])
    
    bp_data = await db_select(current_user["supabase"], "active_blueprints", {"session_id": session_id})
    if not bp_data:
        raise HTTPException(status_code=404, detail="Blueprint not found")
        
    current_blueprint = bp_data[0].get("data", {})
    
    # We need old memory to compute diff. Since memory is already updated at the end of the session,
    # diffing might be tricky unless we stored the previous memory. 
    # For now, we will simulate a diff based on the most recent updates.
    # Actually, we can compute diff based on `total_sessions` > 1 by looking at `session_summaries`.
    # Let's just pass empty memory diff for MVP, or we can fetch the old score from score_history.
    
    diff = {"score_delta": 0, "new_mastered_moves": []}
    scores = user_memory.get("score_history", [])
    if len(scores) >= 2:
        diff["score_delta"] = scores[-1]["score"] - scores[-2]["score"]
        
    # Assume recently updated mastery moves
    for move, data in user_memory.get("moves_mastery", {}).items():
        if data.get("count", 0) == 3 and data.get("last_seen_session_id") == session_id:
            from memory import CORE_MOVES
            diff["new_mastered_moves"].append(CORE_MOVES.get(move, move))

    reflection = await plato_handler.generate_session_reflection(user_memory, current_blueprint, diff)
    return {"message": reflection}

@router.get("/observation")
async def get_profile_observation(current_user: dict = Depends(get_current_user)):
    user_memory = await get_user_memory(current_user["supabase"], current_user["id"])
    observation = await plato_handler.generate_profile_observation(user_memory)
    return {"message": observation}

@router.get("/memory")
async def get_memory(current_user: dict = Depends(get_current_user)):
    user_memory = await get_user_memory(current_user["supabase"], current_user["id"])
    return user_memory

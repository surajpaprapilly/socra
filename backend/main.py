import os
import json
import uuid
import anthropic
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables early so route imports can use them
load_dotenv()

from ai import SocraAI
from models import StartSessionRequest, StartSessionResponse, ChatMessageRequest, SessionTranscriptResponse, NudgeRequest, NudgeResponse, BlueprintModel
from learn_routes import router as learn_router
from bank_routes import router as bank_router
from blueprint_routes import router as blueprint_router, patch_blueprint
from dependencies import get_current_user
from fastapi import Depends
from database import db_select, db_insert, db_update

app = FastAPI(title="Socra API")

# ---------------------------------------------------------------------------
# Developer role helper
# Reads app_metadata (server-side only — users CANNOT set this themselves)
# ---------------------------------------------------------------------------
def is_developer(user: dict) -> bool:
    """Returns True if the authenticated user has the developer role in app_metadata."""
    return user.get("app_metadata", {}).get("role") == "developer"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(learn_router, prefix="/api/learn")
app.include_router(bank_router, prefix="/api/bank")
app.include_router(blueprint_router, prefix="/api/blueprint")

# Initialize AI handler
# Will fail if ANTHROPIC_API_KEY is not set
ai_handler = SocraAI()

@app.post("/api/session/start", response_model=StartSessionResponse)
async def start_session(request: StartSessionRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Rate Limiting Check
        existing_sessions = await db_select(
            current_user["supabase"],
            "chat_sessions",
            {"user_id": current_user["id"]}
        )
        if not is_developer(current_user) and len(existing_sessions) >= 2:
            raise HTTPException(
                status_code=402,
                detail="You have reached the free blueprint limit. Upgrade to Premium."
            )

        session_id = str(uuid.uuid4())
        
        # Store initial state 
        dummy_user_msg = f"The General Paper question is: '{request.question}'. Begin your conversation with the student. Give a short welcome and get to unpacking the first word."
        
        messages = [{"role": "user", "content": dummy_user_msg}]
        
        # Execute DB Insert for chat session
        await db_insert(
            current_user["supabase"],
            "chat_sessions",
            {
                "id": session_id,
                "user_id": current_user["id"],
                "question": request.question,
                "messages": messages,
                "turn": 1
            }
        )
    
        # Execute DB Insert for active blueprint
        await db_insert(
            current_user["supabase"], 
            "active_blueprints", 
            {
                "session_id": session_id,
                "user_id": current_user["id"],
                "data": BlueprintModel(question=request.question).model_dump()
            }
        )
        
        # Get initial message from AI synchronously
        initial_ai_response = await ai_handler.get_initial_chat_response(request.question, messages)
        
        # Store AI response in history
        messages.append({"role": "assistant", "content": initial_ai_response})
        
        await db_update(
            current_user["supabase"],
            "chat_sessions",
            {"messages": messages},
            {"id": session_id}
        )
        
        return StartSessionResponse(
            session_id=session_id,
            first_message=initial_ai_response
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        with open("error_log.txt", "w") as f:
            f.write(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

async def run_blueprint_extraction(session_id: str, current_user: dict):
    # Fetch from DB
    s_data = await db_select(current_user["supabase"], "chat_sessions", {"id": session_id})
    bp_data = await db_select(current_user["supabase"], "active_blueprints", {"session_id": session_id})
    
    if not s_data or not bp_data:
        return
        
    session = s_data[0]
    messages = session["messages"]
    current_blueprint = bp_data[0]["data"]
    
    # Extract patch
    print("Running blueprint extraction...")
    patch_data = await ai_handler.extract_blueprint_patch(messages, current_blueprint)
    print(f"Extracted patch data: {patch_data}")
    if not patch_data:
        print("No patch data extracted.")
        return
        
    old_thesis = current_blueprint.get("thesis")
    old_links = sum(1 for p in current_blueprint.get("paragraphs", []) if p.get("link"))
    
    try:
        updated_model = await patch_blueprint(session_id, patch_data, current_user)
        updated_bp = updated_model.model_dump()
    except Exception as e:
        print(f"Failed to apply expected patch data: {patch_data}\nError: {e}")
        return
    
    sq = updated_bp["session_quality"]
    needs_update = False
    
    # Flags logic
    terms = updated_bp.get("key_terms", [])
    if terms and all(t.get("definition") for t in terms):
        if not sq["question_autopsy_complete"]:
            sq["question_autopsy_complete"] = True
            needs_update = True
            
    ca = updated_bp.get("counter_argument")
    if ca and ca.get("their_claim"):
        if not sq["both_sides_argued"]:
            sq["both_sides_argued"] = True
            needs_update = True
            
    if patch_data.get("thesis") and patch_data["thesis"] != old_thesis and old_thesis is not None:
        if not sq["thesis_refined"]:
            sq["thesis_refined"] = True
            needs_update = True
            
    new_links = sum(1 for p in updated_bp.get("paragraphs", []) if p.get("link"))
    if new_links > old_links:
        sq["analytical_links_count"] += (new_links - old_links)
        needs_update = True
        
    if needs_update:
        print(f"Updating session_quality constraints... {sq}")
        await patch_blueprint(session_id, {"session_quality": sq}, current_user)

@app.post("/api/session/chat")
async def chat_session(request: ChatMessageRequest, current_user: dict = Depends(get_current_user)):
    s_data = await db_select(current_user["supabase"], "chat_sessions", {"id": request.session_id})
    if not s_data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = s_data[0]
    
    messages = session["messages"]
    # If the message is empty, we are just continuing the generation (e.g. initial streaming response)
    if request.message.strip():
        messages.append({"role": "user", "content": request.message})
    
    # Create the generator for streaming
    generator = ai_handler.stream_chat_response(session["question"], messages)
    
    async def chat_wrapper():
        full_response = ""
        current_turn = session["turn"]
        new_insights_unlocked = []
        new_strengths = []
        new_challenges = []
        latest_score = None
        async for chunk in generator:
            yield chunk
            
            if chunk.startswith("event: message\ndata: "):
                try:
                    data_str = chunk.split("data: ", 1)[1].strip()
                    if data_str.startswith('"') and data_str.endswith('"'):
                        full_response += json.loads(data_str)
                    else:
                        full_response += data_str
                except Exception as e:
                    print(f"History parse error: {e}")
            
            if chunk.startswith("event: metadata\ndata: "):
                try:
                    data_str = chunk.split("data: ", 1)[1].strip()
                    if data_str and data_str != "{}" and data_str != '{"error": "failed to parse"}':
                        meta = json.loads(data_str)
                        if "current_phase" in meta and meta["current_phase"] > current_turn and meta["current_phase"] <= 6:
                            current_turn = meta["current_phase"]
                        if "insight_unlocked" in meta and meta["insight_unlocked"]:
                            insight = meta["insight_unlocked"]
                            if insight not in new_insights_unlocked:
                                new_insights_unlocked.append(insight)
                        if "question_score" in meta:
                            latest_score = meta["question_score"]
                        if "student_strengths" in meta and isinstance(meta["student_strengths"], list):
                            for s in meta["student_strengths"]:
                                if s and s not in new_strengths:
                                    new_strengths.append(s)
                        if "challenge_patterns" in meta and isinstance(meta["challenge_patterns"], list):
                            for c in meta["challenge_patterns"]:
                                if c and c not in new_challenges:
                                    new_challenges.append(c)
                except Exception as e:
                    print(f"Metadata parse error: {e}")
                    pass
            
        # After streaming is fully complete, save the gathered AI response to DB
        if full_response:
            messages.append({"role": "assistant", "content": full_response})
            await db_update(
                current_user["supabase"],
                "chat_sessions",
                {
                    "messages": messages,
                    "turn": current_turn
                },
                {"id": request.session_id}
            )
            
            if new_insights_unlocked or new_strengths or new_challenges or latest_score is not None:
                try:
                    bp_data = await db_select(current_user["supabase"], "active_blueprints", {"session_id": request.session_id})
                    if bp_data:
                        current_blueprint = bp_data[0]["data"]
                        patch = {}
                        
                        existing_insights = current_blueprint.get("unlocked_insights", [])
                        updated_insights = list(existing_insights)
                        for insight in new_insights_unlocked:
                            if insight not in updated_insights:
                                updated_insights.append(insight)
                        
                        if len(updated_insights) > len(existing_insights):
                            patch["unlocked_insights"] = updated_insights
                            
                        existing_strengths = current_blueprint.get("student_strengths", [])
                        updated_strengths = list(existing_strengths)
                        for strength in new_strengths:
                            if strength not in updated_strengths:
                                updated_strengths.append(strength)
                        if len(updated_strengths) > len(existing_strengths):
                            patch["student_strengths"] = updated_strengths
                            
                        existing_challenges = current_blueprint.get("challenge_patterns", [])
                        updated_challenges = list(existing_challenges)
                        for challenge in new_challenges:
                            if challenge not in updated_challenges:
                                updated_challenges.append(challenge)
                        if len(updated_challenges) > len(existing_challenges):
                            patch["challenge_patterns"] = updated_challenges
                            
                        if latest_score is not None and latest_score != current_blueprint.get("final_score"):
                            patch["final_score"] = latest_score
                            
                        if patch:
                            await patch_blueprint(request.session_id, patch, current_user)
                except Exception as e:
                    print(f"Failed to update metadata tracking: {e}")

            # Run extraction in the background
            asyncio.create_task(run_blueprint_extraction(request.session_id, current_user))

    return StreamingResponse(
        chat_wrapper(),
        media_type="text/event-stream"
    )

@app.post("/api/session/nudge", response_model=NudgeResponse)
async def get_nudge(request: NudgeRequest, current_user: dict = Depends(get_current_user)):
    s_data = await db_select(current_user["supabase"], "chat_sessions", {"id": request.session_id})
    if not s_data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = s_data[0]
    
    nudge_text = await ai_handler.generate_nudge(session["question"], session["messages"])
    return NudgeResponse(nudge=nudge_text)

@app.get("/api/sessions")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    """Returns all chat sessions for the current user with lightweight blueprint snapshots."""
    sessions = await db_select(current_user["supabase"], "chat_sessions", {"user_id": current_user["id"]})
    blueprints = await db_select(current_user["supabase"], "active_blueprints", {"user_id": current_user["id"]})

    # Index blueprints by session_id for fast lookup
    bp_map = {bp["session_id"]: bp["data"] for bp in blueprints}

    # Deduplicate by session_id (guard against any duplicate DB rows)
    seen_ids = set()
    deduped = []
    for s in sessions:
        sid = s["id"]
        if sid in seen_ids:
            continue
        seen_ids.add(sid)
        bp = bp_map.get(sid, {})
        sq = bp.get("session_quality", {})
        paragraphs = bp.get("paragraphs", [])
        turn = s["turn"]
        # Auto-heal legacy sessions by inspecting physical blueprint progress
        valid_paras = len([p for p in paragraphs if p.get("topic_sentence")])
        if turn < 6:
            if bp.get("thesis") and valid_paras >= 2:
                turn = 6
            elif valid_paras >= 2:
                turn = 4
            elif valid_paras >= 1:
                turn = 3
            elif bp.get("key_terms"):
                turn = 2

        deduped.append({
            "session_id": sid,
            "question": s["question"],
            "turn": turn,
            "created_at": s["created_at"],
            "is_complete": turn > 5,
            "blueprint_snapshot": {
                "thesis": bp.get("thesis"),
                "paragraph_count": len([p for p in paragraphs if p.get("topic_sentence")]),
                "session_quality": sq,
                "student_strengths": bp.get("student_strengths", []),
                "challenge_patterns": bp.get("challenge_patterns", [])
            }
        })

    # Sort newest first
    deduped.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"sessions": deduped}


@app.get("/api/session/{session_id}")
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Returns full session data including live blueprint for re-hydration."""
    s_data = await db_select(current_user["supabase"], "chat_sessions", {"id": session_id})
    if not s_data:
        raise HTTPException(status_code=404, detail="Session not found")

    session = s_data[0]

    # Also fetch the live blueprint for re-hydration
    bp_data = await db_select(current_user["supabase"], "active_blueprints", {"session_id": session_id})
    blueprint = bp_data[0]["data"] if bp_data else None

    # Filter out the dummy first user message so it doesn't render in the chat
    messages = session["messages"]
    if messages and messages[0]["role"] == "user":
        messages = messages[1:]

    turn = session["turn"]
    if turn < 6 and blueprint:
        valid_paras = len([p for p in blueprint.get("paragraphs", []) if p.get("topic_sentence")])
        if blueprint.get("thesis") and valid_paras >= 2:
            turn = 6
        elif valid_paras >= 2:
            turn = 4
        elif valid_paras >= 1:
            turn = 3
        elif blueprint.get("key_terms"):
            turn = 2

    return {
        "session_id": session_id,
        "question": session["question"],
        "messages": messages,
        "turn": turn,
        "is_complete": turn > 5,
        "blueprint": blueprint,
    }

@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Deletes a session and its associated active blueprint."""
    supa = current_user["supabase"]
    user_id = current_user["id"]

    # Verify ownership before deletion
    s_data = await db_select(supa, "chat_sessions", {"id": session_id, "user_id": user_id})
    if not s_data:
        raise HTTPException(status_code=404, detail="Session not found or not owned by user")

    await asyncio.to_thread(
        lambda: supa.table("active_blueprints").delete().eq("session_id", session_id).eq("user_id", user_id).execute()
    )
    await asyncio.to_thread(
        lambda: supa.table("chat_sessions").delete().eq("id", session_id).eq("user_id", user_id).execute()
    )

    return {"status": "ok", "message": "Session deleted"}

# ---------------------------------------------------------------------------
# Developer-only utility endpoints
# Blocked at 403 for any non-developer account — safe to ship to production
# ---------------------------------------------------------------------------
@app.delete("/api/dev/reset-sessions")
async def dev_reset_sessions(current_user: dict = Depends(get_current_user)):
    """Wipes all chat sessions and blueprints for the dev account.
    Only accessible by accounts with app_metadata.role == 'developer'.
    """
    if not is_developer(current_user):
        raise HTTPException(status_code=403, detail="Developer access only.")

    supa = current_user["supabase"]
    user_id = current_user["id"]

    async def _delete(table: str):
        await asyncio.to_thread(
            lambda: supa.table(table).delete().eq("user_id", user_id).execute()
        )

    await _delete("active_blueprints")
    await _delete("chat_sessions")

    return {"status": "ok", "message": "All sessions and blueprints reset for dev account."}

import os
import json
import uuid
import logging
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
from plato_routes import router as plato_router
from feedback_routes import router as feedback_router
from dependencies import get_current_user
from fastapi import Depends
from pydantic import BaseModel
from database import db_select, db_insert, db_update, db_upsert
from memory import update_user_memory, get_user_memory

app = FastAPI(title="Socra API")

# Configure logging — level controlled via LOG_LEVEL env var (default INFO)
_log_level = getattr(logging, os.environ.get("LOG_LEVEL", "INFO").upper(), logging.INFO)
logging.basicConfig(level=_log_level)
logger = logging.getLogger(__name__)
logger.setLevel(_log_level)

# Memory debug logger — stdout only (Render filesystem is ephemeral)
_memory_log = logging.getLogger("memory_debug")
_memory_log.setLevel(_log_level)
_memory_log.propagate = True

# ---------------------------------------------------------------------------
# Developer role helper
# Reads app_metadata (server-side only — users CANNOT set this themselves)
# ---------------------------------------------------------------------------
def is_developer(user: dict) -> bool:
    """Returns True if the authenticated user has the developer role in app_metadata."""
    return user.get("app_metadata", {}).get("role") == "developer"

def _build_student_context(user_memory: dict) -> str | None:
    summary = user_memory.get("student_profile_summary")
    if not summary:
        return None
    areas = user_memory.get("key_growth_areas", [])
    lines = [f"Student prior-session profile:\n{summary}"]
    if areas:
        lines.append("Key growth areas to watch and address this session:")
        lines.extend(f"- {a}" for a in areas)
    return "\n".join(lines)

_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    os.environ.get("FRONTEND_URL", ""),  # e.g. https://socra.vercel.app or custom domain
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in _ALLOWED_ORIGINS if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(learn_router, prefix="/api/learn")
app.include_router(bank_router, prefix="/api/bank")
app.include_router(blueprint_router, prefix="/api/blueprint")
app.include_router(plato_router, prefix="/api/plato")
app.include_router(feedback_router, prefix="/api/feedback")

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
        if not is_developer(current_user) and len(existing_sessions) >= 10:
            raise HTTPException(
                status_code=402,
                detail="You have reached the free session limit. Join the waitlist for early access."
            )

        if request.validate:
            is_valid, reason = await ai_handler.validate_gp_question(request.question)
            if not is_valid:
                raise HTTPException(
                    status_code=422,
                    detail=reason or "That doesn't look like a GP Paper 1 essay question. Please enter a discursive question about a real-world issue."
                )

        session_id = str(uuid.uuid4())
        
        # Store initial state 
        dummy_user_msg = f"I'd like to work through this question."
        
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
        
        # Fetch user memory to personalize the opening message
        user_memory = await get_user_memory(current_user["supabase"], current_user["id"])
        student_context = _build_student_context(user_memory)

        # Get initial message from AI synchronously
        initial_ai_response = await ai_handler.get_initial_chat_response(request.question, messages, student_context)
        
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
        logger.exception("start_session failed: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")

async def run_blueprint_extraction(session_id: str, current_user: dict, skeleton_complete: bool = False):
    try:
        await _run_blueprint_extraction_inner(session_id, current_user, skeleton_complete=skeleton_complete)
    except Exception as e:
        logger.error("run_blueprint_extraction unhandled error for session %s: %s", session_id, e, exc_info=True)

async def _run_blueprint_extraction_inner(session_id: str, current_user: dict, skeleton_complete: bool = False):
    # Fetch from DB
    s_data = await db_select(current_user["supabase"], "chat_sessions", {"id": session_id})
    bp_data = await db_select(current_user["supabase"], "active_blueprints", {"session_id": session_id})

    # Log the fetched data professionally using the logger
    logger.debug("Running extraction for session_id: %s", session_id)
    logger.debug("s_data: %s", s_data)
    logger.debug("bp_data: %s", bp_data)

    if not s_data or not bp_data:
        return
        
    session = s_data[0]
    messages = session["messages"]
    current_blueprint = bp_data[0]["data"]
    
    # Extract patch
    logger.info("Running blueprint extraction...")
    patch_data = await ai_handler.extract_blueprint_patch(messages, current_blueprint)
    logger.info("Extracted patch data: %s", patch_data)

    old_thesis = current_blueprint.get("thesis")
    old_links = sum(1 for p in current_blueprint.get("paragraphs", []) if p.get("link"))
    old_argument_sketch_complete = current_blueprint.get("session_quality", {}).get("argument_sketch_complete", False)

    if not patch_data:
        # Nothing new to extract — still run flag checks against current DB state
        # so flags like argument_sketch_complete can be set when the data is already there
        logger.info("No new blueprint data; running flag check on current DB state.")
        updated_bp = current_blueprint
    else:
        try:
            updated_model = await patch_blueprint(session_id, patch_data, current_user)
            updated_bp = updated_model.model_dump()
        except Exception as e:
            logger.error("Failed to apply expected patch data: %s\nError: %s", patch_data, e)
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
        # argument_sketch_complete: CA claim locked + at least 2 topic sentences locked
        topic_sentences_locked = len([p for p in updated_bp.get("paragraphs", []) if p.get("topic_sentence")])
        if topic_sentences_locked >= 2 and not sq.get("argument_sketch_complete"):
            sq["argument_sketch_complete"] = True
            needs_update = True

    # AI declared skeleton complete — set the flag even if blueprint data hasn't caught up yet
    if skeleton_complete and not sq.get("argument_sketch_complete"):
        sq["argument_sketch_complete"] = True
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
        logger.info("Updating session_quality constraints... %s", sq)
        await patch_blueprint(session_id, {"session_quality": sq}, current_user)
        
    sq_final = updated_bp.get("session_quality", {})
    argument_sketch_just_completed = (
        skeleton_complete  # authoritative AI signal
        or (bool(sq_final.get("argument_sketch_complete")) and not old_argument_sketch_complete)
    )
    paragraph_deep_dive_occurred = new_links > old_links

    _memory_log.info(
        "Memory gate — session=%s  argument_sketch_just_completed=%s "
        "(sq_final.argument_sketch_complete=%s, old_argument_sketch_complete=%s)  "
        "paragraph_deep_dive_occurred=%s (new_links=%s, old_links=%s)",
        session_id, argument_sketch_just_completed,
        sq_final.get("argument_sketch_complete"), old_argument_sketch_complete,
        paragraph_deep_dive_occurred, new_links, old_links,
    )

    if argument_sketch_just_completed or paragraph_deep_dive_occurred:
        _memory_log.info("Memory checkpoint OPEN — skeleton_done=%s new_links=%s — calling update_user_memory", argument_sketch_just_completed, paragraph_deep_dive_occurred)
        try:
            await update_user_memory(
                current_user["supabase"], current_user["id"], session_id, updated_bp, ai_handler,
                is_spine_complete=argument_sketch_just_completed
            )
            _memory_log.info("update_user_memory DONE — session=%s user=%s", session_id, current_user["id"])
        except Exception as e:
            _memory_log.error("update_user_memory FAILED — session=%s: %s", session_id, e, exc_info=True)
    else:
        _memory_log.info("Memory gate CLOSED — no update for session=%s", session_id)

@app.post("/api/session/chat")
async def chat_session(request: ChatMessageRequest, current_user: dict = Depends(get_current_user)):
    import asyncio
    s_data = await db_select(current_user["supabase"], "chat_sessions", {"id": request.session_id})
    if not s_data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = s_data[0]
    
    # Stale lock: treat locks older than 60 s as expired
    LOCK_TIMEOUT_SECONDS = 60
    if session.get("is_generating") is True:
        started_at = session.get("generation_started_at")
        if started_at:
            from datetime import datetime, timezone, timedelta
            try:
                lock_age = datetime.now(timezone.utc) - datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                if lock_age < timedelta(seconds=LOCK_TIMEOUT_SECONDS):
                    raise HTTPException(status_code=409, detail="A message is already being generated for this session. Please wait.")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=409, detail="A message is already being generated for this session. Please wait.")
        else:
            raise HTTPException(status_code=409, detail="A message is already being generated for this session. Please wait.")

    lock_id = str(uuid.uuid4())
    lock_acquired = False
    try:
        from datetime import datetime, timezone
        def _lock_run():
            return (
                current_user["supabase"].table("chat_sessions")
                .update({
                    "is_generating": True,
                    "generation_lock_id": lock_id,
                    "generation_started_at": datetime.now(timezone.utc).isoformat(),
                })
                .eq("id", request.session_id)
                .eq("is_generating", False)
                .execute()
            )
        res = await asyncio.to_thread(_lock_run)
        if not res.data:
            raise HTTPException(status_code=409, detail="A message is already being generated for this session. Please wait.")
        lock_acquired = len(res.data or []) == 1
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.warning(f"Could not use is_generating lock (column missing?): {e}")
    
    
    async def _release_lock():
        if not lock_acquired:
            return
        try:
            def _unlock():
                return (
                    current_user["supabase"].table("chat_sessions")
                    .update({"is_generating": False, "generation_lock_id": None, "generation_started_at": None})
                    .eq("id", request.session_id)
                    .eq("generation_lock_id", lock_id)
                    .execute()
                )
            await asyncio.to_thread(_unlock)
        except Exception as e:
            logger.warning(f"Failed to release lock: {e}")

    # Re-read messages after acquiring the lock so we always build on the latest turn,
    # not on the snapshot taken before a concurrent request may have written.
    # NOTE: Do NOT use asyncio.gather here. Both calls share the same supabase client,
    # and concurrent asyncio.to_thread calls on the same httpx HTTP/2 client corrupt
    # its internal connection-pool deques (RuntimeError: deque mutated during iteration).
    try:
        fresh_data = await db_select(current_user["supabase"], "chat_sessions", {"id": request.session_id})
        user_memory = await get_user_memory(current_user["supabase"], current_user["id"])
    except Exception:
        await _release_lock()
        raise

    messages = fresh_data[0]["messages"] if fresh_data else session["messages"]
    student_context = _build_student_context(user_memory)

    # If the message is empty, we are just continuing the generation (e.g. initial streaming response)
    if request.message.strip():
        messages.append({"role": "user", "content": request.message})

    # Create the generator for streaming
    generator = ai_handler.stream_chat_response(session["question"], messages, student_context)
    
    async def chat_wrapper():
        full_response = ""
        captured_metadata = None
        current_turn = session.get("turn", 1)
        new_insights_unlocked = []
        new_strengths = []
        new_challenges = []
        latest_score = None
        
        try:
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
                            captured_metadata = meta
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
                msg_to_append = {"role": "assistant", "content": full_response}
                if captured_metadata is not None:
                    msg_to_append["metadata"] = captured_metadata
                messages.append(msg_to_append)
                await db_update(
                    current_user["supabase"],
                    "chat_sessions",
                    {
                        "messages": messages,
                        "turn": current_turn
                    },
                    {"id": request.session_id}
                )
        finally:
            await _release_lock()
            
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
            skeleton_just_completed = bool(captured_metadata and captured_metadata.get("skeleton_complete"))
            asyncio.create_task(run_blueprint_extraction(request.session_id, current_user, skeleton_complete=skeleton_just_completed))

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
        # Auto-heal legacy sessions by inspecting physical blueprint progress.
        # Only reach turn=6 (complete) when ALL quality flags are met — not just
        # when there are 2 paragraphs, which fires too early mid-session.
        valid_paras = len([p for p in paragraphs if p.get("topic_sentence")])
        if turn < 6:
            all_quality_met = (
                sq.get("question_autopsy_complete") and
                sq.get("both_sides_argued") and
                sq.get("thesis_refined") and
                sq.get("analytical_links_count", 0) >= 3
            )
            if all_quality_met:
                turn = 6
            elif bp.get("thesis") and valid_paras >= 2:
                turn = 5
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
        sq_heal = blueprint.get("session_quality", {})
        valid_paras = len([p for p in blueprint.get("paragraphs", []) if p.get("topic_sentence")])
        all_quality_met = (
            sq_heal.get("question_autopsy_complete") and
            sq_heal.get("both_sides_argued") and
            sq_heal.get("thesis_refined") and
            sq_heal.get("analytical_links_count", 0) >= 3
        )
        if all_quality_met:
            turn = 6
        elif blueprint.get("thesis") and valid_paras >= 2:
            turn = 5
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
# Waitlist
# ---------------------------------------------------------------------------
class WaitlistRequest(BaseModel):
    email: str

@app.post("/api/waitlist")
async def join_waitlist(request: WaitlistRequest, current_user: dict = Depends(get_current_user)):
    supa = current_user["supabase"]
    user_id = current_user["id"]
    email = request.email.strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail="Email is required.")
    try:
        await db_upsert(supa, "waitlist_signups", {"user_id": user_id, "email": email})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save signup: {str(e)}")
    return {"status": "ok"}

# ---------------------------------------------------------------------------
# Developer-only utility endpoints
# Blocked at 403 for any non-developer account — safe to ship to production
# ---------------------------------------------------------------------------
@app.get("/api/dev/evals")
async def list_evals(current_user: dict = Depends(get_current_user)):
    """Lists all dynamic eval transcript files. Developer only."""
    if not is_developer(current_user):
        raise HTTPException(status_code=403, detail="Developer access only.")

    log_dir = os.path.join(os.path.dirname(__file__), "data", "eval_logs")
    if not os.path.isdir(log_dir):
        return {"evals": []}

    evals = []
    for fname in sorted(os.listdir(log_dir), reverse=True):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(log_dir, fname)
        try:
            with open(path) as f:
                data = json.load(f)
            evals.append({
                "run_id": data.get("run_id", fname[:-5]),
                "student_type": data.get("student_type", "unknown"),
                "question": data.get("question", ""),
                "turns": data.get("turns", 0),
                "timestamp_iso": data.get("timestamp_iso", ""),
                "summary": data.get("summary", {}),
            })
        except Exception:
            pass

    return {"evals": evals}


@app.get("/api/dev/evals/{run_id}")
async def get_eval(run_id: str, current_user: dict = Depends(get_current_user)):
    """Serves a single eval transcript JSON. Developer only."""
    if not is_developer(current_user):
        raise HTTPException(status_code=403, detail="Developer access only.")

    import re as _re
    if not _re.match(r'^[a-zA-Z0-9_\-]+$', run_id):
        raise HTTPException(status_code=400, detail="Invalid run_id format.")

    log_dir = os.path.join(os.path.dirname(__file__), "data", "eval_logs")
    path = os.path.join(log_dir, f"{run_id}.json")

    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Eval transcript not found.")

    with open(path) as f:
        return json.load(f)


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

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
from blueprint_routes import router as blueprint_router, patch_blueprint, blueprints

app = FastAPI(title="Socra API")

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

# In-memory session store
sessions: Dict[str, Dict[str, Any]] = {}

# Initialize AI handler
# Will fail if ANTHROPIC_API_KEY is not set
ai_handler = SocraAI()

@app.post("/api/session/start", response_model=StartSessionResponse)
async def start_session(request: StartSessionRequest):
    session_id = str(uuid.uuid4())
    
    # Store initial state 
    dummy_user_msg = f"The General Paper question is: '{request.question}'. Begin your conversation with the student. Give a short welcome and get to unpacking the first word."
    session_turn = 1

    sessions[session_id] = {
        "question": request.question,
        "messages": [{"role": "user", "content": dummy_user_msg}],
        "turn": session_turn
    }
    
    # Initialize the empty blueprint
    blueprints[session_id] = BlueprintModel(question=request.question)
    
    # Get initial message from AI synchronously
    initial_ai_response = await ai_handler.get_initial_chat_response(request.question, sessions[session_id]["messages"])
    
    # Store AI response in history
    sessions[session_id]["messages"].append({"role": "assistant", "content": initial_ai_response})
    
    return StartSessionResponse(
        session_id=session_id,
        first_message=initial_ai_response
    )

async def run_blueprint_extraction(session_id: str):
    if session_id not in sessions or session_id not in blueprints:
        return
        
    session = sessions[session_id]
    messages = session["messages"]
    current_blueprint = blueprints[session_id].model_dump()
    
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
        updated_model = await patch_blueprint(session_id, patch_data)
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
        await patch_blueprint(session_id, {"session_quality": sq})

@app.post("/api/session/chat")
async def chat_session(request: ChatMessageRequest):
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[request.session_id]
    
    # If the message is empty, we are just continuing the generation (e.g. initial streaming response)
    # Anthropic requires alternating user/assistant roles, so we don't append empty user messages
    if request.message.strip():
        session["messages"].append({"role": "user", "content": request.message})
    
    # Create the generator for streaming
    generator = ai_handler.stream_chat_response(session["question"], session["messages"])
    
    # We need a wrapper generator to capture the final full text
    # and append it to the session history so the next turn remembers it
    async def chat_wrapper():
        full_response = ""
        async for chunk in generator:
            # Yield to the frontend immediately so the stream never breaks if parsing below fails
            yield chunk
            
            # We must parse the chunk to save it to history if it's a message event
            if chunk.startswith("event: message\ndata: "):
                try:
                    # Strip the prefix and newlines
                    data_str = chunk.split("data: ", 1)[1].strip()
                    # It might be JSON encoded string from json.dumps
                    if data_str.startswith('"') and data_str.endswith('"'):
                        full_response += json.loads(data_str)
                    else:
                        full_response += data_str
                except Exception as e:
                    print(f"History parse error: {e}")
            
            # Update the phase turn tracker natively in memory if metadata emits a new phase
            if chunk.startswith("event: metadata\ndata: "):
                try:
                    data_str = chunk.split("data: ", 1)[1].strip()
                    if data_str and data_str != "{}" and data_str != '{"error": "failed to parse"}':
                        meta = json.loads(data_str)
                        if "current_phase" in meta and meta["current_phase"] > session["turn"] and meta["current_phase"] <= 5:
                            session["turn"] = meta["current_phase"]
                except Exception as e:
                    print(f"Metadata parse error: {e}")
                    print(f"Raw chunk was: {repr(chunk)}")
                    pass
            
        # After streaming is fully complete, save the gathered AI response to memory
        if full_response:
            session["messages"].append({"role": "assistant", "content": full_response})
            # Run extraction in the background
            asyncio.create_task(run_blueprint_extraction(request.session_id))

    return StreamingResponse(
        chat_wrapper(),
        media_type="text/event-stream"
    )

@app.post("/api/session/nudge", response_model=NudgeResponse)
async def get_nudge(request: NudgeRequest):
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[request.session_id]
    
    # Do not append the nudge request to conversation history 
    # so Claude doesn't get confused by phantom messages on the next real turn
    nudge_text = await ai_handler.generate_nudge(session["question"], session["messages"])
    
    return NudgeResponse(nudge=nudge_text)

@app.get("/api/session/{session_id}", response_model=SessionTranscriptResponse)
async def get_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Mocking metadata return for the transcript endpoint for now
    # The actual active state is pushed via SSE during chat
    return SessionTranscriptResponse(
        session_id=session_id,
        messages=sessions[session_id]["messages"],
        current_turn=sessions[session_id]["turn"],
        metadata={
            "current_phase": sessions[session_id]["turn"],
            "question_score": 0,
            "lazy_example": False,
            "insight_unlocked": None,
            "blueprint": {
                "thesis": None,
                "arg1": None,
                "arg2": None,
                "counterarg": None,
                "synthesis": None
            },
            "tension_axis": {
                "pole_left": "Pole A",
                "pole_right": "Pole B",
                "current_position": 50
            },
            "evidence": []
        }
    )

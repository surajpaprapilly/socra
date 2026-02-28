import os
import json
import uuid
import anthropic
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any

from models import StartSessionRequest, StartSessionResponse, ChatMessageRequest, SessionTranscriptResponse, NudgeRequest, NudgeResponse

app = FastAPI(title="Socra API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store
sessions: Dict[str, Dict[str, Any]] = {}

from dotenv import load_dotenv

# Load environment variables, particularly for ANTHROPIC_API_KEY
load_dotenv()

from ai import SocraAI

# Initialize AI handler
# Will fail if ANTHROPIC_API_KEY is not set
ai_handler = SocraAI()

@app.post("/api/session/start", response_model=StartSessionResponse)
async def start_session(request: StartSessionRequest):
    session_id = str(uuid.uuid4())
    
    # Store initial state with a dummy user message to satisfy Anthropic's alternating role rule
    dummy_user_msg = "I am ready to explore this question. Since you already know what the question is, please directly ask me for my gut reaction."
    sessions[session_id] = {
        "question": request.question,
        "messages": [{"role": "user", "content": dummy_user_msg}],
        "turn": 1
    }
    
    # Generate the first Socratic response
    first_response_text = await ai_handler.generate_initial_response(request.question)
    
    sessions[session_id]["messages"].append({"role": "assistant", "content": first_response_text})
    
    return StartSessionResponse(
        session_id=session_id,
        first_message=first_response_text
    )

@app.post("/api/session/chat")
async def chat_session(request: ChatMessageRequest):
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session = sessions[request.session_id]
    session["messages"].append({"role": "user", "content": request.message})
    
    # Create the generator for streaming
    generator = ai_handler.stream_chat_response(session["question"], session["messages"], session["turn"])
    
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
    nudge_text = await ai_handler.generate_nudge(session["question"], session["messages"], session["turn"])
    
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
            "question_score": 0,
            "lazy_example": False,
            "insight_unlocked": None
        }
    )

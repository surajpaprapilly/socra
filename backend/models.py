import pydantic_core
from pydantic import BaseModel
from typing import List, Optional

class ChatMessageBase(BaseModel):
    role: str
    content: str

class StartSessionRequest(BaseModel):
    question: str

class StartSessionResponse(BaseModel):
    session_id: str
    first_message: str

class ChatMessageRequest(BaseModel):
    session_id: str
    message: str

class BlueprintMeta(BaseModel):
    thesis: Optional[str] = None
    arg1: Optional[str] = None
    arg2: Optional[str] = None
    counterarg: Optional[str] = None
    synthesis: Optional[str] = None

class TensionAxisMeta(BaseModel):
    pole_left: str
    pole_right: str
    current_position: int

class EvidenceNodeMeta(BaseModel):
    label: str
    status: str

class ChatTurnMetadata(BaseModel):
    current_phase: int
    question_score: int
    insight_unlocked: Optional[str] = None
    lazy_example: bool
    blueprint: Optional[BlueprintMeta] = None
    tension_axis: Optional[TensionAxisMeta] = None
    evidence: Optional[List[EvidenceNodeMeta]] = None

class NudgeRequest(BaseModel):
    session_id: str

class NudgeResponse(BaseModel):
    nudge: str

class SessionTranscriptResponse(BaseModel):
    session_id: str
    messages: List[ChatMessageBase]
    current_turn: int
    metadata: ChatTurnMetadata

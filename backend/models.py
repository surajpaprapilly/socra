import pydantic_core
from pydantic import BaseModel
from typing import List, Optional

class ChatMessageBase(BaseModel):
    role: str
    content: str

class StartSessionRequest(BaseModel):
    question: str
    reaction: Optional[str] = None

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

class ReadingResult(BaseModel):
    title: str
    url: str
    source: str
    why_relevant: str
    estimated_minutes: str

class ReadingsResponse(BaseModel):
    readings: List[ReadingResult]

class ConflictReadingsRequest(BaseModel):
    conflict_id: str
    side_a: str
    side_b: str
    search_query: str
    theme: str

class ConflictReadingsResponse(BaseModel):
    side_a_articles: List[ReadingResult]
    side_b_articles: List[ReadingResult]
    singapore_articles: List[ReadingResult]

class CanvasCardMeta(BaseModel):
    id: str
    tag: str
    quote: str
    source: str
    position: dict
    note: Optional[str] = None

class CanvasConnectorMeta(BaseModel):
    fromCardId: str
    toCardId: str
    fromEdge: str
    toEdge: str

class CanvasSummaryRequest(BaseModel):
    conflict_id: str
    side_a: str
    side_b: str
    cards: List[CanvasCardMeta]
    connectors: List[CanvasConnectorMeta]
    inferred_leaning: str

class CanvasSummaryResponse(BaseModel):
    transition_message: str
    opening_socratic_question: str
    inferred_position: str

class ReadingRef(BaseModel):
    session_id: str
    messages: List[ChatMessageBase]
    current_turn: int
    metadata: ChatTurnMetadata

class NudgeResponse(BaseModel):
    nudge: str

class SessionTranscriptResponse(BaseModel):
    session_id: str
    messages: List[ChatMessageBase]
    current_turn: int
    metadata: ChatTurnMetadata

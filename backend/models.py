import pydantic_core
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

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
    student_strengths: Optional[List[str]] = None
    challenge_patterns: Optional[List[str]] = None
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

class KeyTerm(BaseModel):
    term: Optional[str] = None
    definition: Optional[str] = None

class Paragraph(BaseModel):
    title: Optional[str] = None
    topic_sentence: Optional[str] = None
    point: Optional[str] = None
    explanation: Optional[str] = None
    example: Optional[str] = None
    link: Optional[str] = None

class CounterArgument(BaseModel):
    their_claim: Optional[str] = None
    its_merit: Optional[str] = None
    student_response: Optional[str] = None

class ChecklistItem(BaseModel):
    label: str
    completed: bool = False

class SessionQuality(BaseModel):
    question_autopsy_complete: bool = False
    both_sides_argued: bool = False
    thesis_refined: bool = False
    analytical_links_count: int = 0

class BlueprintModel(BaseModel):
    question: str
    key_terms: List[KeyTerm] = []
    thesis: Optional[str] = None
    paragraphs: List[Paragraph] = []
    counter_argument: Optional[CounterArgument] = None
    unlocked_insights: List[str] = []
    student_strengths: List[str] = []
    challenge_patterns: List[str] = []
    final_score: int = 0
    conclusion_prompts: List[str] = [
        "What is the final synthesis or ultimate insight?",
        "Why does this position ultimately override the opposing view?",
        "What is the broader implication for society or the future?"
    ]
    checklist: List[ChecklistItem] = [
        ChecklistItem(label="Define key terms"),
        ChecklistItem(label="Establish clear thesis"),
        ChecklistItem(label="First supporting argument"),
        ChecklistItem(label="Second supporting argument"),
        ChecklistItem(label="Address counter-argument"),
        ChecklistItem(label="Synthesize conclusion")
    ]
    session_quality: SessionQuality = SessionQuality()

class UserMemory(BaseModel):
    user_id: str
    moves_mastery: Dict[str, Any] = {}
    persistent_strengths: List[str] = []
    recurring_challenges: List[str] = []
    all_insights: List[str] = []
    score_history: List[Dict[str, Any]] = []
    session_summaries: List[Dict[str, Any]] = []
    total_sessions: int = 0

import uuid
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from dependencies import get_current_user
from database import db_insert, db_select

router = APIRouter()

class ReadingRef(BaseModel):
    title: str
    url: str
    source: str

class BankAddRequest(BaseModel):
    question: str
    summary: str
    follow_up_response: Optional[str] = ""
    insight_tags: List[str]
    readings: List[ReadingRef]
    canvas_data: Optional[dict] = None

class BankEntry(BaseModel):
    id: str
    created_at: str
    gp_question: str
    insight_tags: List[str]
    summary: str
    follow_up_response: str
    readings: List[ReadingRef]
    word_count: int
    canvas_data: Optional[dict] = None

class BankAddResponse(BaseModel):
    entry_id: str
    saved: bool

class BankListResponse(BaseModel):
    entries: List[BankEntry]

@router.post("/add", response_model=BankAddResponse)
async def add_to_bank(req: BankAddRequest, current_user: dict = Depends(get_current_user)):
    word_count = len(req.summary.split()) + len((req.follow_up_response or "").split())
    new_id = str(uuid.uuid4())
    
    new_entry = {
        "id": new_id,
        "user_id": current_user["id"],
        "gp_question": req.question,
        "insight_tags": req.insight_tags,
        "summary": req.summary,
        "follow_up_response": req.follow_up_response,
        "readings": [r.model_dump() for r in req.readings],
        "word_count": word_count,
        "canvas_data": req.canvas_data
    }

    await db_insert(current_user["supabase"], "saved_blueprints", new_entry)

    return BankAddResponse(entry_id=new_id, saved=True)

@router.get("", response_model=BankListResponse)
async def get_bank(current_user: dict = Depends(get_current_user)):
    data = await db_select(
        current_user["supabase"], 
        "saved_blueprints", 
        {"user_id": current_user["id"]}
    )
    
    # Sort data by created_at descending (latest first)
    # Supabase returns them as they are, so we can sort in python or do it in the SQL wrapper
    # Python sort is fine for now
    data.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return BankListResponse(entries=data)

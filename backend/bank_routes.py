import os
import json
import uuid
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "knowledge_bank.json")

# Ensure data directory and file exist
os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
if not os.path.exists(DATA_PATH):
    with open(DATA_PATH, "w") as f:
        json.dump([], f)

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

class BankEntry(BaseModel):
    id: str
    created_at: str
    gp_question: str
    insight_tags: List[str]
    summary: str
    follow_up_response: str
    readings: List[ReadingRef]
    word_count: int

class BankAddResponse(BaseModel):
    entry_id: str
    saved: bool

class BankListResponse(BaseModel):
    entries: List[BankEntry]

@router.post("/add", response_model=BankAddResponse)
async def add_to_bank(req: BankAddRequest):
    with open(DATA_PATH, "r") as f:
        data = json.load(f)

    word_count = len(req.summary.split()) + len((req.follow_up_response or "").split())
    
    new_entry = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.utcnow().isoformat() + "Z",
        "gp_question": req.question,
        "insight_tags": req.insight_tags,
        "summary": req.summary,
        "follow_up_response": req.follow_up_response,
        "readings": [r.dict() for r in req.readings],
        "word_count": word_count
    }

    data.insert(0, new_entry) # Put newest at the top

    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)

    return BankAddResponse(entry_id=new_entry["id"], saved=True)

@router.get("", response_model=BankListResponse)
async def get_bank():
    with open(DATA_PATH, "r") as f:
        data = json.load(f)
    return BankListResponse(entries=data)

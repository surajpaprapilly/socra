import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from dependencies import get_current_user
from database import db_insert

router = APIRouter()


class FeedbackRequest(BaseModel):
    message: str
    current_page: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: str
    saved: bool


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(req: FeedbackRequest, current_user: dict = Depends(get_current_user)):
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Feedback message cannot be empty.")
    if len(message) > 2000:
        raise HTTPException(status_code=422, detail="Feedback message is too long (max 2000 characters).")

    new_id = str(uuid.uuid4())
    await db_insert(
        current_user["supabase"],
        "feedback",
        {
            "id": new_id,
            "user_id": current_user["id"],
            "user_email": current_user["email"],
            "message": message,
            "current_page": req.current_page,
        }
    )
    return FeedbackResponse(id=new_id, saved=True)

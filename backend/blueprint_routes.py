from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any, Optional
from models import BlueprintModel
from dependencies import get_current_user
from database import db_select, db_insert, db_update

router = APIRouter()

@router.post("/{session_id}/init", response_model=BlueprintModel, dependencies=[Depends(get_current_user)])
async def init_blueprint(session_id: str, payload: Dict[str, str] = Body(...), current_user: dict = Depends(get_current_user)):
    """Initialises a blank blueprint with just the question."""
    if "question" not in payload:
        raise HTTPException(status_code=400, detail="Missing question in payload")
    
    question = payload["question"]
    new_blueprint = BlueprintModel(question=question)
    
    # Store in active_blueprints table
    await db_insert(
        current_user["supabase"], 
        "active_blueprints", 
        {
            "session_id": session_id,
            "user_id": current_user["id"],
            "data": new_blueprint.model_dump()
        }
    )
    return new_blueprint

@router.get("/{session_id}", response_model=BlueprintModel, dependencies=[Depends(get_current_user)])
async def get_blueprint(session_id: str, current_user: dict = Depends(get_current_user)):
    """Returns current blueprint state."""
    data = await db_select(current_user["supabase"], "active_blueprints", {"session_id": session_id})
    if not data:
        raise HTTPException(status_code=404, detail="Blueprint not found for this session")
    return BlueprintModel.model_validate(data[0]["data"])

# Note: We expose this directly so main.py can call it, but we need the supabase client
@router.patch("/{session_id}", response_model=BlueprintModel)
async def patch_blueprint(session_id: str, update_data: dict, current_user: Optional[dict] = Depends(get_current_user)):
    """Accepts a partial blueprint update and merges it into current state."""
    
    data = await db_select(current_user["supabase"], "active_blueprints", {"session_id": session_id})
    if not data:
        raise HTTPException(status_code=404, detail="Blueprint not found. Call init first.")
        
    current_data = data[0]["data"]
    
    # Merge the update data
    for key, value in update_data.items():
        if key == "session_quality" and isinstance(value, dict):
            current_data["session_quality"].update(value)
        elif key == "counter_argument" and isinstance(value, dict):
            if current_data.get("counter_argument") is None:
                current_data["counter_argument"] = value
            else:
                current_data["counter_argument"].update(value)
        elif key == "key_terms" and isinstance(value, list):
            for new_term in value:
                term_str = new_term.get("term")
                if not term_str:
                    continue
                existing = next((t for t in current_data["key_terms"] if t.get("term") == term_str), None)
                if existing:
                    existing.update({k: v for k, v in new_term.items() if v is not None})
                else:
                    current_data["key_terms"].append(new_term)
        elif key == "paragraphs" and isinstance(value, list):
            for i, p in enumerate(value):
                # Only merge non-null fields
                clean_p = {k: v for k, v in p.items() if v is not None}
                if not clean_p:
                    continue
                if i < len(current_data.get("paragraphs", [])):
                    current_data["paragraphs"][i].update(clean_p)
                else:
                    current_data.setdefault("paragraphs", []).append(clean_p)
        else:
            # Overwrite the field entirely for scalars
            if value is not None:
                current_data[key] = value
            
    # Validate and save
    updated_bp_model = BlueprintModel.model_validate(current_data)
    
    await db_update(
        current_user["supabase"], 
        "active_blueprints", 
        {"data": updated_bp_model.model_dump()}, 
        {"session_id": session_id}
    )
    
    return updated_bp_model

@router.get("/{session_id}/export", dependencies=[Depends(get_current_user)])
async def export_blueprint(session_id: str, current_user: dict = Depends(get_current_user)):
    """Returns the blueprint formatted as a clean JSON."""
    data = await db_select(current_user["supabase"], "active_blueprints", {"session_id": session_id})
    if not data:
        raise HTTPException(status_code=404, detail="Blueprint not found")
        
    bp = BlueprintModel.model_validate(data[0]["data"])
    return bp.model_dump(exclude_none=True)

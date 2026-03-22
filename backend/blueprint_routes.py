from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from models import BlueprintModel

router = APIRouter()

# In-memory store for blueprints
blueprints: Dict[str, BlueprintModel] = {}

@router.post("/{session_id}/init", response_model=BlueprintModel)
async def init_blueprint(session_id: str, payload: Dict[str, str] = Body(...)):
    """Initialises a blank blueprint with just the question."""
    if "question" not in payload:
        raise HTTPException(status_code=400, detail="Missing question in payload")
    
    question = payload["question"]
    new_blueprint = BlueprintModel(question=question)
    blueprints[session_id] = new_blueprint
    return new_blueprint

@router.get("/{session_id}", response_model=BlueprintModel)
async def get_blueprint(session_id: str):
    """Returns current blueprint state."""
    if session_id not in blueprints:
        raise HTTPException(status_code=404, detail="Blueprint not found for this session")
    return blueprints[session_id]

@router.patch("/{session_id}", response_model=BlueprintModel)
async def patch_blueprint(session_id: str, update_data: dict):
    """Accepts a partial blueprint update and merges it into current state."""
    if session_id not in blueprints:
        raise HTTPException(status_code=404, detail="Blueprint not found. Call init first.")
    
    current_bp = blueprints[session_id]
    
    # Get current state as dictionary
    current_data = current_bp.model_dump()
    
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
    updated_bp = BlueprintModel.model_validate(current_data)
    blueprints[session_id] = updated_bp
    return updated_bp

@router.get("/{session_id}/export")
async def export_blueprint(session_id: str):
    """Returns the blueprint formatted as a clean JSON."""
    if session_id not in blueprints:
        raise HTTPException(status_code=404, detail="Blueprint not found")
        
    bp = blueprints[session_id]
    return bp.model_dump(exclude_none=True)

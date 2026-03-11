import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from anthropic import AsyncAnthropic

router = APIRouter()
client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
model = os.environ.get("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")

class ReadingResult(BaseModel):
    title: str
    url: str
    source: str
    why_relevant: str
    estimated_minutes: str

class ReadingsRequest(BaseModel):
    question: str

class ReadingsResponse(BaseModel):
    readings: List[ReadingResult]

class ReadingRef(BaseModel):
    title: str
    url: str
    source: str

class ReadingPromptsRequest(BaseModel):
    question: str
    article_title: str
    article_source: str
    why_relevant: str

class ReadingPromptsResponse(BaseModel):
    prompts: List[str]

class Highlight(BaseModel):
    tag: str
    quote: str
    note: str

class ArticleNote(BaseModel):
    article_title: str
    article_source: str
    free_notes: str
    highlights: List[Highlight]

class SummariseRequest(BaseModel):
    question: str
    summary: str
    readings_read: List[ReadingRef]
    article_notes: Optional[List[ArticleNote]] = None

class SummariseResponse(BaseModel):
    follow_up_question: str
    insight_tags: List[str]
    ready_to_bank: bool

import re

@router.post("/readings", response_model=ReadingsResponse)
async def get_readings(req: ReadingsRequest):
    system_prompt = """You are an expert researcher helping Singapore A-Level students find high-quality readings for General Paper.

Given a GP question, search the web and find 4-5 excellent readings.
Prioritise: long-form journalism, academic explainers, policy reports, reputable think tanks 
(Brookings, Pew, The Economist, BBC, Guardian, Channel NewsAsia, Straits Times, MIT Tech Review, Foreign Affairs).
Avoid: Reddit, Wikipedia, low-quality blogs, SEO content farms.

You MUST output ONLY a valid JSON object with no markdown, no explanation, no preamble. 
Strictly match this schema:
{
  "readings": [
    {
      "title": "Article Title",
      "url": "https://direct-link.com/article",
      "source": "Publication Name",
      "why_relevant": "1 sentence explaining which angle of the GP question this addresses, written for a student",
      "estimated_minutes": "8 min"
    }
  ]
}"""

    messages = [
        {
            "role": "user",
            "content": f"Find 4-5 high quality readings for this GP question: {req.question}"
        }
    ]

    readings_model = "claude-3-5-haiku-20241022"

    # Use the native Anthropic web search tool
    response = await client.messages.create(
        model=readings_model,
        max_tokens=2000,
        system=system_prompt,
        tools=[{"type": "web_search_20250305", "name": "web_search"}],
        messages=messages
    )

    # Agentic loop — keep going until model stops using tools
    max_loops = 3
    loop_count = 0
    while response.stop_reason == "tool_use" and loop_count < max_loops:
        loop_count += 1
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if getattr(block, "type", None) == "tool_result":
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.tool_use_id,
                    "content": block.content
                })

        # If there are tool results, pass them back. 
        # If not, provide an empty user message or break to avoid infinite loop.
        if tool_results:
            messages.append({"role": "user", "content": tool_results})
        else:
            # We break out if we are supposed to execute a tool but we didn't get any results to pass back
            # For standard tools, we'd execute the search here. Assuming native tool does it automatically or we just break.
            break

        response = await client.messages.create(
            model=readings_model,
            max_tokens=2000,
            system=system_prompt,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=messages
        )

    # Extract final text response
    text_blocks = [block.text for block in response.content if block.type == "text"]
    final_text = text_blocks[0] if text_blocks else '{"readings": []}'

    # Strip markdown code fences if present
    final_text = re.sub(r'^```(?:json)?\s*', '', final_text.strip())
    final_text = re.sub(r'\s*```$', '', final_text.strip())

    try:
        data = json.loads(final_text)
        return ReadingsResponse(**data)
    except Exception as e:
        print("Failed to parse JSON:", final_text)
        raise HTTPException(status_code=500, detail="Failed to parse readings response")

@router.post("/reading-prompts", response_model=ReadingPromptsResponse)
async def get_reading_prompts(req: ReadingPromptsRequest):
    system_prompt = f"""You are an expert GP tutor helping Singapore A-Level students read actively.
    
    The student is about to read an article for the following GP question: "{req.question}"
    Article Title: {req.article_title}
    Source: {req.article_source}
    Context/Angle: {req.why_relevant}
    
    Generate exactly 3 reading prompts tailored specifically to THIS article and THIS GP question.
    Each prompt must target a different cognitive level:
    Prompt 1: Identify the author's central argument or main claim.
    Prompt 2: Find a specific piece of evidence, statistic, or example.
    Prompt 3: Find one sentence directly deployable in a GP essay response.
    
    - Do NOT make generic prompts. Tie them strictly to the article's known context/angle.
    - If `why_relevant` mentions a specific angle, the prompts must reflect that.
    - Tone: precise, encouraging, like a sharp tutor giving a reading brief.
    - Keep each prompt to 1-2 sentences maximum.
    
    Output ONLY a valid JSON object matching exactly this schema:
    {{
      "prompts": ["...", "...", "..."]
    }}"""

    messages = [{"role": "user", "content": "Please generate the 3 reading prompts."}]

    response = await client.messages.create(
        model=model,
        max_tokens=800,
        system=system_prompt,
        messages=messages
    )

    final_text = response.content[0].text
    if "```json" in final_text:
        final_text = final_text.split("```json")[1].split("```")[0].strip()
    elif "```" in final_text:
        final_text = final_text.split("```")[1].split("```")[0].strip()

    try:
        data = json.loads(final_text)
        return ReadingPromptsResponse(**data)
    except Exception as e:
        print("Failed to parse reading prompts JSON:", final_text)
        raise HTTPException(status_code=500, detail="Failed to parse reading prompts response")


@router.post("/summarise", response_model=SummariseResponse)
async def summarise_learning(req: SummariseRequest):
    notes_context = ""
    if req.article_notes and len(req.article_notes) > 0:
        notes_context = "STUDENT'S READING NOTES & HIGHLIGHTS:\n"
        for note in req.article_notes:
            notes_context += f"- Article: {note.article_title} ({note.article_source})\n"
            if note.free_notes:
                notes_context += f"  Free Notes: {note.free_notes}\n"
            for h in note.highlights:
                notes_context += f"  Highlight [{h.tag}]: {h.quote}\n"
                if h.note:
                    notes_context += f"  Student's Note on Highlight: {h.note}\n"
            notes_context += "\n"

    system_prompt = f"""You are Socra, an AI tutor. A student has just read external articles and written a summary.
The GP question is: "{req.question}"
They read: {', '.join([r.title for r in req.readings_read])}

{notes_context}

YOUR TASK:
Read their summary. Assess whether it is surface-level or substantive.
If surface-level: return one Socratic question pushing them to go deeper (e.g. "You've described what happened — what does it suggest about X?").
If substantive: return a question that asks them to connect their reading to the GP question specifically (e.g. "How would you use what you've read to argue against the statement?").

RULES FOR INCORPORATING READING NOTES (if provided above):
- You MUST reference the student's actual highlights and notes in your follow-up question.
- If any highlights are tagged "Still Confused", address those FIRST before anything else.
- If they have "Use in Essay" highlights, ask them which argument each one supports.
- If the student's free-text summary contradicts or ignores their own highlights ("Key Argument", "Surprising Fact"), point that out: e.g., "You highlighted X but didn't mention it in your summary — was that intentional?"
- Make the follow-up feel like it knows exactly what they read.

Extract 2-4 insight tags from their summary (e.g. "surveillance capitalism", "equity").
Set `ready_to_bank` to TRUE ONLY if the summary is substantive and you feel they've genuinely processed the ideas. Otherwise FALSE.
Never summarise for the student. Never say "great job." Keep tone precise and demanding but not harsh.

Output ONLY valid JSON matching this schema exactly:
{{
  "follow_up_question": "string",
  "insight_tags": ["string"],
  "ready_to_bank": boolean
}}"""

    response = await client.messages.create(
        model=model,
        max_tokens=800,
        system=system_prompt,
        messages=[{"role": "user", "content": f"My summary:\n{req.summary}"}]
    )

    final_text = response.content[0].text
    if "```json" in final_text:
        final_text = final_text.split("```json")[1].split("```")[0].strip()
    elif "```" in final_text:
        final_text = final_text.split("```")[1].split("```")[0].strip()

    try:
        data = json.loads(final_text)
        # Ensure we always return something
        if not data.get("follow_up_question"):
            data["follow_up_question"] = "What are the deeper implications of this?"
        if not data.get("insight_tags"):
            data["insight_tags"] = []
        if "ready_to_bank" not in data:
            data["ready_to_bank"] = False
            
        return SummariseResponse(**data)
    except Exception as e:
        print("Failed to parse summarise JSON:", final_text)
        # Fallback response
        return SummariseResponse(
            follow_up_question="Could you elaborate on how exactly this connects to the broader question?",
            insight_tags=["processing"],
            ready_to_bank=False
        )

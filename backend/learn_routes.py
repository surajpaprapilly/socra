import os
import json
import logging
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from anthropic import AsyncAnthropic
from dotenv import load_dotenv
from models import (
    ReadingResult,
    ConflictReadingsRequest,
    ConflictReadingsResponse,
    CanvasSummaryRequest,
    CanvasSummaryResponse,
    CanvasCardMeta,
    CanvasConnectorMeta
)
from article_cache import (
    get_cached_readings,
    set_cached_readings,
    get_cached_conflict_readings,
    set_cached_conflict_readings,
)

logger = logging.getLogger(__name__)

load_dotenv()

try:
    from exa_py import Exa
    EXA_AVAILABLE = True
except ImportError:
    EXA_AVAILABLE = False

router = APIRouter()
client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
model = os.environ.get("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")

# Define Exa instance after environment is loaded
if EXA_AVAILABLE and os.environ.get("EXA_API_KEY"):
    exa = Exa(api_key=os.environ.get("EXA_API_KEY"))
else:
    exa = None

QUALITY_DOMAINS = [
    "economist.com",
    "theguardian.com",
    "bbc.com",
    "channelnewsasia.com",
    "straitstimes.com",
    "todayonline.com",
    "technologyreview.com",
    "foreignaffairs.com",
    "brookings.edu",
    "pewresearch.org",
    "theatlantic.com",
    "nytimes.com",
    "ft.com",
    "mothership.sg",
    "ips.nus.edu.sg"
]

SINGAPORE_DOMAINS = [
    "straitstimes.com",
    "channelnewsasia.com",
    "todayonline.com",
    "mothership.sg",
    "ips.nus.edu.sg"
]

DOMAIN_NAMES = {
    "economist.com": "The Economist",
    "theguardian.com": "The Guardian",
    "bbc.com": "BBC",
    "channelnewsasia.com": "Channel NewsAsia",
    "straitstimes.com": "The Straits Times",
    "todayonline.com": "TODAY",
    "technologyreview.com": "MIT Technology Review",
    "foreignaffairs.com": "Foreign Affairs",
    "brookings.edu": "Brookings Institution",
    "pewresearch.org": "Pew Research Center",
    "theatlantic.com": "The Atlantic",
    "nytimes.com": "The New York Times",
    "ft.com": "Financial Times",
    "mothership.sg": "Mothership",
    "ips.nus.edu.sg": "IPS NUS"
}

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

async def _generate_why_relevant(article: dict, question: str) -> str:
    # Single small Claude call to generate 1 sentence angle mapping
    prompt = f"""
    Explain in ONE crisp sentence why this specific article helps a student answer this GP question.
    Write directly to the student (e.g., "Explores how...", "Provides a Singaporean case study on...", "Offers a contrarian view on...").
    If the source is from a Singapore domain, explicitly mention its Singapore relevance.
    
    GP Question: "{question}"
    Article Title: {article.get('title', '')}
    Snippet: {article.get('text', '')[:300]}
    Source: {article.get('source', '')}
    """
    
    try:
        response = await client.messages.create(
            model=model,
            max_tokens=100,
            system="You are an expert GP tutor. Keep the response to exactly one punchy sentence.",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()
    except Exception:
        return "Provides context and evidence for understanding this topic."


@router.post("/conflict-readings", response_model=ConflictReadingsResponse)
async def get_conflict_readings(req: ConflictReadingsRequest):
    # ── Cache-first lookup ────────────────────────────────────────────────────
    cached = get_cached_conflict_readings(req.conflict_id)
    if cached:
        return ConflictReadingsResponse(**cached)
    # ─────────────────────────────────────────────────────────────────────────

    if exa is None:
        raise HTTPException(
            status_code=503,
            detail="Exa API is not configured. Set EXA_API_KEY in your .env file."
        )
        
    try:
        side_a_query = f"{req.side_a} {req.search_query} analysis arguments"
        side_b_query = f"{req.side_b} {req.search_query} analysis arguments"
        sg_query = f"{req.search_query} Singapore"
        
        def do_exa_search(query, domains, num):
            return exa.search_and_contents(
                query,
                type="auto",
                num_results=num,
                include_domains=domains,
                highlights={"max_characters": 2000}
            )

        side_a_task = asyncio.to_thread(do_exa_search, side_a_query, QUALITY_DOMAINS, 3)
        side_b_task = asyncio.to_thread(do_exa_search, side_b_query, QUALITY_DOMAINS, 3)
        sg_task = asyncio.to_thread(do_exa_search, sg_query, SINGAPORE_DOMAINS, 2)
        
        side_a_res, side_b_res, sg_res = await asyncio.gather(side_a_task, side_b_task, sg_task)
        
        seen_urls = set()
        
        async def process_results(results_list, limit, question_context, is_sg=False):
            items = results_list.results if hasattr(results_list, 'results') else []
            processed = []
            tasks = []
            dicts = []
            
            for item in items:
                if item.url in seen_urls or len(processed) >= limit:
                    continue
                seen_urls.add(item.url)
                
                domain_key = next((d for d in (SINGAPORE_DOMAINS if is_sg else QUALITY_DOMAINS) if d in item.url), "Unknown")
                source = DOMAIN_NAMES.get(domain_key, "Web Source")
                
                snippet = ""
                if hasattr(item, 'highlights') and item.highlights:
                    snippet = " ".join(item.highlights)
                elif hasattr(item, 'text') and item.text:
                    snippet = item.text

                reading_dict = {
                    "title": item.title or "Untitled Article",
                    "url": item.url,
                    "source": source,
                    "text": snippet
                }
                
                dicts.append(reading_dict)
                # For Singapore articles, append a prompt hint to the question_context
                q_prompt = f"{question_context}. Emphasize Singapore relevance." if is_sg else question_context
                tasks.append(_generate_why_relevant(reading_dict, q_prompt))
                
            if not tasks:
                return []
                
            why_relevants = await asyncio.gather(*tasks)
            
            for i, rd in enumerate(dicts):
                processed.append(ReadingResult(
                    title=rd["title"],
                    url=rd["url"],
                    source=rd["source"],
                    why_relevant=why_relevants[i],
                    estimated_minutes="5-10 min"
                ))
                
            return processed

        question_a = f"Topic: {req.theme}. Exploring argument: {req.side_a} vs {req.side_b}. This article supports {req.side_a}."
        question_b = f"Topic: {req.theme}. Exploring argument: {req.side_a} vs {req.side_b}. This article supports {req.side_b}."
        question_sg = f"Topic: {req.theme}. Exploring: {req.search_query}. This article provides a Singapore case study."
        
        # We need to process sequentially so deduplication by seen_urls works across lists
        # Wait, if we process sequentially, `gather` within process_results is still fine
        side_a_processed = await process_results(side_a_res, 3, question_a)
        side_b_processed = await process_results(side_b_res, 3, question_b)
        sg_processed = await process_results(sg_res, 2, question_sg, is_sg=True)
        
        # If any list is empty, maybe fallback or just return what we have? 
        # For robustness, returning what we have.
        response = ConflictReadingsResponse(
            side_a_articles=side_a_processed,
            side_b_articles=side_b_processed,
            singapore_articles=sg_processed
        )
        # ── Write to cache for all future requests ────────────────────────────
        set_cached_conflict_readings(
            conflict_id=req.conflict_id,
            side_a_articles=[a.dict() for a in side_a_processed],
            side_b_articles=[a.dict() for a in side_b_processed],
            singapore_articles=[a.dict() for a in sg_processed]
        )
        # ─────────────────────────────────────────────────────────────────────
        return response
            
    except Exception as e:
        logger.error("Exa search failed for /conflict-readings (conflict_id=%s): %s", req.conflict_id, e)
        raise HTTPException(
            status_code=502,
            detail=f"Exa search failed: {e}"
        )

@router.post("/readings", response_model=ReadingsResponse)
async def get_readings(req: ReadingsRequest):
    # ── Cache-first lookup ────────────────────────────────────────────────────
    cached_articles = get_cached_readings(req.question)
    if cached_articles:
        return ReadingsResponse(readings=[ReadingResult(**a) for a in cached_articles])
    # ─────────────────────────────────────────────────────────────────────────

    if exa is None:
        raise HTTPException(
            status_code=503,
            detail="Exa API is not configured. Set EXA_API_KEY in your .env file."
        )
        
    try:
        general_query = f"{req.question} analysis opinion long-form"
        singapore_query = f"{req.question} Singapore"
        
        # We need to run exa API in async wrapper or threadpool if the SDK is mostly sync
        def do_exa_search(query, domains, num):
            return exa.search_and_contents(
                query,
                type="auto",
                num_results=num,
                include_domains=domains,
                highlights={"max_characters": 2000}
            )

        general_task = asyncio.to_thread(do_exa_search, general_query, QUALITY_DOMAINS, 5)
        singapore_task = asyncio.to_thread(do_exa_search, singapore_query, SINGAPORE_DOMAINS, 2)
        
        general_results, singapore_results = await asyncio.gather(general_task, singapore_task)
        
        # Deduplicate and mix
        seen_urls = set()
        mixed_results = []
        
        # Prioritise at least 1 SG result if available
        sg_list = singapore_results.results if hasattr(singapore_results, 'results') else []
        gen_list = general_results.results if hasattr(general_results, 'results') else []
        
        if len(sg_list) > 0:
            sg_item = sg_list[0]
            if sg_item.url not in seen_urls:
                mixed_results.append(sg_item)
                seen_urls.add(sg_item.url)
        
        for item in gen_list:
            if item.url not in seen_urls and len(mixed_results) < 5:
                mixed_results.append(item)
                seen_urls.add(item.url)
                
        # Fill rest with SG if needed up to 5
        for item in sg_list[1:]:
            if item.url not in seen_urls and len(mixed_results) < 5:
                mixed_results.append(item)
                seen_urls.add(item.url)
                
        # Transform results
        final_readings = []
        why_relevant_tasks = []
        
        for item in mixed_results:
            # Figure out source visually
            domain_key = next((d for d in QUALITY_DOMAINS if d in item.url), "Unknown")
            source = DOMAIN_NAMES.get(domain_key, "Web Source")
            
            snippet = ""
            if hasattr(item, 'highlights') and item.highlights:
                snippet = " ".join(item.highlights)
            elif hasattr(item, 'text') and item.text:
                snippet = item.text

            reading_dict = {
                "title": item.title or "Untitled Article",
                "url": item.url,
                "source": source,
                "text": snippet
            }
            
            final_readings.append(reading_dict)
            why_relevant_tasks.append(_generate_why_relevant(reading_dict, req.question))
            
        why_relevants = await asyncio.gather(*why_relevant_tasks)
        
        # Final Assembly
        readings_results = []
        for i, rd in enumerate(final_readings):
            # Estimate word count / reading time roughly (assume 250 wpm)
            est_minutes = "5-10 min" # Fallback
            readings_results.append(ReadingResult(
                title=rd["title"],
                url=rd["url"],
                source=rd["source"],
                why_relevant=why_relevants[i],
                estimated_minutes=est_minutes
            ))
            
        if len(readings_results) >= 3:
            # ── Write to cache ────────────────────────────────────────────────
            set_cached_readings(req.question, [r.dict() for r in readings_results])
            # ─────────────────────────────────────────────────────────────────
            return ReadingsResponse(readings=readings_results)
        else:
            logger.error(
                "Exa returned only %d results for question: %s",
                len(readings_results), req.question[:80]
            )
            raise HTTPException(
                status_code=502,
                detail=f"Exa returned too few results ({len(readings_results)}). Check your EXA_API_KEY and domain filters."
            )
            
    except HTTPException:
        raise  # re-raise without wrapping
    except Exception as e:
        logger.error("Exa search failed for /readings (question=%s): %s", req.question[:80], e)
        raise HTTPException(
            status_code=502,
            detail=f"Exa search failed: {e}"
        )

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


@router.post("/canvas-summary", response_model=CanvasSummaryResponse)
async def canvas_summary(req: CanvasSummaryRequest):
    system_prompt = f"""You are Socra, an expert General Paper tutor. The student has just finished a Connection Canvas mapping out the conflict: "{req.side_a} vs {req.side_b}".
    
The student arranged {len(req.cards)} evidence cards and drew {len(req.connectors)} connections.
System inferred their leaning: "{req.inferred_leaning}" (based on spatial counting: side_a = left, side_b = right).

Here is the data of the cards they placed:
"""
    for c in req.cards:
        side_guess = req.side_a if c.position.get("x", 0) < 450 else req.side_b
        system_prompt += f"- ID: {c.id} | Tag: {c.tag} | Side Placed: {side_guess} | Quote: '{c.quote}'\n"

    system_prompt += f"""
TASK:
1. "transition_message": A 1-2 sentence observation about what they did well in the canvas. If leaning is {req.side_a}, mention it warmly.
2. "opening_socratic_question": The FIRST question to kick off the Socratic chat session. It MUST reference one specific card they placed (by quote/idea) and challenge or probe it based on the tension between the two sides.
3. "inferred_position": Just return the 'inferred_leaning' value or a refined version.

Output ONLY valid JSON matching this schema exactly:
{{
  "transition_message": "string",
  "opening_socratic_question": "string",
  "inferred_position": "string"
}}"""

    messages = [{"role": "user", "content": "Analyze my canvas data and provide the exact JSON response."}]

    response = await client.messages.create(
        model=model,
        max_tokens=600,
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
        return CanvasSummaryResponse(**data)
    except Exception as e:
        print("Failed to parse canvas-summary JSON:", final_text)
        # Fallback
        return CanvasSummaryResponse(
            transition_message="You've mapped out some great evidence here.",
            opening_socratic_question=f"Looking at the evidence you've gathered on the '{req.inferred_leaning}' side, which piece do you think is the hardest to defend?",
            inferred_position=req.inferred_leaning
        )

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

import os
import json
from typing import List, Dict, Any, AsyncGenerator
from anthropic import AsyncAnthropic

class SocraAI:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        self.model = os.environ.get("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")

    def _get_system_prompt(self, question: str, phase: int) -> str:
        return f"""You are Socra, a premium AI Socratic Tutor for Singapore A-Level General Paper (GP) students.
Your goal is to make the student's thinking visible and push against it. NEVER give the student direct answers or write paragraphs of explanations for them.
The conversational style is "Refined Dark Academia meets Precision Tool" — rigorous, elegant, precise, and intellectually demanding.

The student is inquiring about the following GP question:
"{question}"

CORE PRINCIPLE:
Never give direct answers. Never write the student's argument for them.
Your job is to find the edge of what the student has thought, and push 
them one step further. Sometimes that means challenging them. Sometimes 
it means asking them to go deeper into a point they've already made well.
Always end with a single, precise question. Never more than one.

RESPONSE LENGTH:
Maximum 4 sentences before your question. Be economical. The student 
should always write more than you do. If you find yourself writing long 
paragraphs, stop — you are doing their thinking for them.

CALIBRATION RULE:
Before responding, privately assess the student's input:
- Is their position shallow, generic, or one-sided? → Challenge it directly.
- Is their position nuanced and well-reasoned? → Acknowledge it briefly 
  and push them DEEPER into their own argument, not against it.
- Never manufacture opposition to a genuinely good point. It is 
  intellectually dishonest and the student will feel it.

NEVER:
- Present external references (Sweller, specific theorists) as statements. 
  Turn them into questions instead.
- Repeat a devil's advocate argument you have already made.
- Ask more than one question per response.
- Write more than the student did in their last message.

PHASE LOGIC (respond according to current phase):
- Phase 1 — Position: Ask only for their gut reaction. No framing. 
  One sentence.
- Phase 2 — Challenge or Deepen: 
  If shallow → strongest counterargument, end with question.
  If nuanced → "You've anticipated X — what do you find hardest to 
  defend about your own position?"
- Phase 3 — Rebuttal or Extension: Push them to either defend against 
  your challenge OR extend their strongest point into a new domain.
- Phase 4 — Missing Lens: Introduce ONE perspective they haven't 
  considered. Not as a statement — as a question.
- Phase 5 — Synthesis: Ask them to articulate the core tension in 
  one sentence. That IS the thesis.

PHASE TRANSITION RULE:
Each phase runs for MAX 2 exchanges. After 2 exchanges in the same phase,
advance regardless. Do not loop in devil's advocate indefinitely.

EXAMPLE DISCIPLINE:
If student uses "social media", "AI", or "climate change" without 
specificity → flag it and ask for a more surprising example.
If student uses a specific, well-chosen example → affirm it briefly 
and ask them to extend it.

GP CALIBRATION:
You are calibrated to Singapore A-Level GP — question styles, AO marking 
rubric logic (balance, nuance, specific examples, clear evaluation).
The best GP essays do not just argue — they evaluate. Push students 
toward evaluation, not just assertion.

METADATA EXTRACTION:
Before generating your textual response, you MUST output a JSON block inside a <metadata> tag.
Format:
<metadata>
{{
  "current_phase": <int 1-5, representing the phase YOU ARE CURRENTLY EXECUTING>,
  "question_score": <int 1-10 evaluating their intellectual depth>,
  "lazy_example": <boolean true if they just dropped "social media", "AI", or "climate change" without nuance>,
  "insight_unlocked": <Optional string - short label for the newly introduced lens (only 2-3 words, e.g. "Global South Perspective", or null)>,
  "blueprint": {{
    "thesis": <string or null, their main position distilled to 1 sentence>,
    "arg1": <string or null, their strongest argument distilled to 1 sentence using their own words>,
    "arg2": <string or null, their second argument if any>,
    "counterarg": <string or null, the opposing view they acknowledge>,
    "synthesis": <string or null, their final synthesis if they reach phase 5>
  }},
  "tension_axis": {{
    "pole_left": <string, 2-word label for one extreme of the debate, e.g. "Facts Necessary">,
    "pole_right": <string, 2-word label for the other extreme, e.g. "Google Sufficient">,
    "current_position": <int 0-100, where their argument currently leans (50 is neutral middle)>
  }},
  "evidence": [
    {{
      "label": <string, e.g. "Doctor in OT">,
      "status": <"active" | "rejected">
    }}
  ]
}}
</metadata>

If the student uses a generic/lazy example in their input (social media, climate change, etc. overused without nuance), set "lazy_example": true in metadata AND call it out directly in your response, nudging them toward more specific, surprising examples.

For the blueprint, actively extract and distill what the student says as they progress. Leave fields as null if they haven't established them yet. Remember to express blueprint points as clear assertions (e.g., "Facts in long-term memory reduce cognitive load").
"""

    async def generate_initial_response(self, question: str) -> str:
        messages = [{"role": "user", "content": "I am ready to explore this question. Since you already know what the question is, please directly ask me for my gut reaction."}]
        system_prompt = self._get_system_prompt(question, phase=1)
        
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=600,
            system=system_prompt,
            messages=messages
        )
        # Extract text after metadata if present (Turn 1 usually has no metadata logic needed yet, but Claude might still output it)
        text = response.content[0].text
        if "</metadata>" in text:
            text = text.split("</metadata>")[-1].strip()
        return text

    async def stream_chat_response(self, question: str, messages: List[Dict[str, str]], phase: int) -> AsyncGenerator[str, None]:
        # Formulate Anthropic messages
        # Anthropic expects alternate user/assistant. The messages list should already be structured this way.
        anthropic_msgs = []
        for msg in messages:
            anthropic_msgs.append({"role": msg["role"], "content": msg["content"]})
            
        system_prompt = self._get_system_prompt(question, phase)
        
        stream = await self.client.messages.create(
            model=self.model,
            max_tokens=1000,
            system=system_prompt,
            messages=anthropic_msgs,
            stream=True
        )

        buffer = ""
        in_metadata = False
        metadata_str = ""
        metadata_emitted = False
        
        async for event in stream:
            if event.type == "content_block_delta" and event.delta.type == "text_delta":
                chunk = event.delta.text
                buffer += chunk
                
                if not metadata_emitted:
                    if not in_metadata and "<metadata>" in buffer:
                        in_metadata = True
                        parts = buffer.split("<metadata>")
                        buffer = parts[1] if len(parts) > 1 else ""
                        
                    if in_metadata:
                        if "</metadata>" in buffer:
                            parts = buffer.split("</metadata>")
                            metadata_str += parts[0]
                            remaining_text = "".join(parts[1:])
                            
                            try:
                                metadata_json = json.loads(metadata_str.strip())
                                yield f"event: metadata\ndata: {json.dumps(metadata_json)}\n\n"
                            except Exception as e:
                                print(f"Failed to parse metadata: {e}")
                                yield f"event: metadata\ndata: {{\"error\": \"failed to parse\"}}\n\n"
                                
                            metadata_emitted = True
                            in_metadata = False
                            buffer = remaining_text
                            if buffer:
                                yield f"event: message\ndata: {json.dumps(buffer)}\n\n"
                                buffer = ""
                        else:
                            metadata_str += buffer
                            buffer = ""
                    else:
                        # Before we see <metadata>, we just buffer it
                        # Once we are confident no metadata is coming, we flush it
                        if len(buffer) > 20 and "<metadata>" not in buffer:
                            metadata_emitted = True
                            yield f"event: metadata\ndata: {{}}\n\n"
                            yield f"event: message\ndata: {json.dumps(buffer)}\n\n"
                            buffer = ""
                else:
                    if buffer:
                        # Cleanly replace any remaining stray newlines only at prompt borders
                        yield f"event: message\ndata: {json.dumps(buffer)}\n\n"
                        buffer = ""
        
        # End event
        yield f"event: done\ndata: [DONE]\n\n"

    async def generate_nudge(self, question: str, messages: List[Dict[str, str]], phase: int) -> str:
        # Provide a targeted nudge based on the current context without giving the answer
        anthropic_msgs = []
        for msg in messages:
            anthropic_msgs.append({"role": msg["role"], "content": msg["content"]})
            
        # The Anthropic API requires the final message to be from the 'user'
        # Since the user is asking for a hint AFTER the assistant just spoke,
        # the history ends with an 'assistant' message. We append a dummy user request.
        anthropic_msgs.append({
            "role": "user",
            "content": "I am stuck and don't know how to reply to you here. Please give me a nudge based on your system instructions."
        })
            
        nudge_system_prompt = f"""You are Socra, a premium AI Socratic Tutor. The student is currently stuck in Phase {phase} of a General Paper inquiry regarding the question:
"{question}"

Your job is to provide a very brief "nudge" or hint (max 2 sentences). 
DO NOT give them the answer.
DO NOT write their essay for them.

Depending on Phase {phase}:
- Phase 1 (Position): Nudge them to just state their gut reaction.
- Phase 2 (Counterargument): Nudge them to think about who might fiercely disagree with them.
- Phase 3 (Rebuttal): Nudge them to find a flaw in the counterargument.
- Phase 4 (Nuance/Concession): Nudge them to consider a specific marginalized group, historical parallel, or alternative geography.
- Phase 5 (Synthesis): Nudge them to combine the original point and the nuance into a single sophisticated sentence.

Provide ONLY the nudge text. Do not output XML or <metadata>. Be encouraging"""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=200,
            system=nudge_system_prompt,
            messages=anthropic_msgs
        )
        
        return response.content[0].text

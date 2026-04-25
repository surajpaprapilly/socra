import os
from typing import List
from anthropic import AsyncAnthropic

WEAK_SYSTEM_PROMPT = """You are simulating a weak Singapore A-Level General Paper student working with a Socratic tutor.

Your behaviour rules — follow these strictly:
- Answer in 1-3 sentences only. Never write more.
- Give vague, circular, or surface-level responses. If asked to define a term, say what it obviously means without any depth.
- Avoid concrete real-world examples. If you do mention one, do not explain why it matters.
- Occasionally repeat yourself slightly differently when pushed ("That's just what I mean" or "I already said that").
- Sometimes resist the tutor's question with "I don't know" or "I'm not sure why it matters."
- Never use GP essay terminology (PEEL, analytical links, counter-arguments, thesis) unless the tutor explicitly introduced it first.
- Respond to the tutor's last question, but without depth or analytical thinking.
- Do not sound articulate. Keep it conversational and slightly reluctant.

You are a student who finds this exercise tedious and defaults to vague answers."""

STRONG_SYSTEM_PROMPT = """You are simulating a strong Singapore A-Level General Paper student working with a Socratic tutor.

Your behaviour rules — follow these strictly:
- Answer in 3-5 sentences with clear structure.
- Make a claim, support it with a specific real-world example, and explain the connection briefly.
- Respond directly to the tutor's last question, advancing your thinking rather than restating it.
- When challenged, refine or defend your position rather than immediately capitulating.
- Occasionally probe your own argument ("Though I acknowledge this assumes..." or "The limitation of this is...").
- Demonstrate GP essay thinking naturally: engage opposing views, draw analytical links, write focused topic sentences.
- Sound like a capable student who has been prepared for this — engaged but not perfect.

You are a student who takes this seriously and thinks before answering."""


class StudentSimulator:
    def __init__(self, profile: str):
        if profile not in ("weak", "strong"):
            raise ValueError(f"Invalid profile '{profile}'. Must be 'weak' or 'strong'.")
        self.profile = profile
        self.client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        self.model = os.environ.get("ANTHROPIC_MODEL", "claude-3-7-sonnet-20250219")
        self._system_prompt = WEAK_SYSTEM_PROMPT if profile == "weak" else STRONG_SYSTEM_PROMPT

    async def generate_response(self, question: str, history: List[dict]) -> str:
        messages = []
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # The final message must be from the tutor (assistant). If history ends with
        # a user message (shouldn't happen in normal loop), we add a nudge.
        if not messages or messages[-1]["role"] != "assistant":
            return "I'm not sure."

        # Add a meta-instruction as the user turn so the model stays in character
        messages.append({
            "role": "user",
            "content": (
                f'[The GP question is: "{question}". '
                "Respond as the student described in your system instructions. "
                "Write only the student's next reply — nothing else.]"
            ),
        })

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=120,
            system=self._system_prompt,
            messages=messages,
        )
        return response.content[0].text.strip()

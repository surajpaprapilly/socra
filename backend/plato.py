import os
import anthropic
import json

class PlatoAI:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        self.model = "claude-haiku-4-5-20251001"
        self.system_prompt = (
            "You are Plato, a wise, observant, and warm mentor. You are the inverse of Socra. "
            "Where Socra questions relentlessly, you provide warm acknowledgment, gentle nudges, and celebrate a student's growth across time. "
            "You know the student's history, their persistent strengths, recurring challenges, and the thinking moves they've mastered. "
            "Your tone is warm, brief, and magical. You never give away the full answer, but you acknowledge their journey."
        )

    async def generate_greeting(self, user_memory: dict, current_question: str) -> str:
        total_sessions = user_memory.get("total_sessions", 0)
        profile_summary = user_memory.get("student_profile_summary")

        if profile_summary:
            history_summary = f"The student has completed {total_sessions} session(s). Their profile: {profile_summary} "
            growth_areas = user_memory.get("key_growth_areas", [])
            if growth_areas:
                history_summary += f"Key things to watch for this session: {', '.join(growth_areas[:2])}. "
        elif total_sessions > 0:
            strengths = ", ".join(user_memory.get("persistent_strengths", [])[:2])
            challenges = ", ".join(user_memory.get("recurring_challenges", [])[:2])
            history_summary = f"The student has completed {total_sessions} sessions. "
            if strengths:
                history_summary += f"They have shown strengths in: {strengths}. "
            if challenges:
                history_summary += f"They have struggled with: {challenges}. "
        else:
            history_summary = "This is the student's very first session."

        prompt = (
            f"The student is about to tackle this question: '{current_question}'.\n"
            f"Context about the student: {history_summary}\n\n"
            "Write a very brief (1-3 sentences) greeting for the student at the start of this session. "
            "Acknowledge their history (if they have one) and give them one warm, subtle thing to watch for today."
        )

        response = await self.client.messages.create(
            model=self.model,
            system=self.system_prompt,
            max_tokens=150,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    async def generate_insight_note(self, user_memory: dict, insight_name: str) -> str:
        prompt = (
            f"The student just unlocked an insight called '{insight_name}'. "
            "They have actually unlocked this same insight in a previous session before. "
            "Write a brief (1-2 sentences) note celebrating that they've earned this again, suggesting it's becoming a habit."
        )
        
        response = await self.client.messages.create(
            model=self.model,
            system=self.system_prompt,
            max_tokens=100,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    async def generate_session_reflection(self, user_memory: dict, current_blueprint: dict, memory_diff: dict) -> str:
        score = current_blueprint.get("final_score", 0)
        delta = memory_diff.get("score_delta", 0)
        new_mastered = memory_diff.get("new_mastered_moves", [])
        
        context = f"The student just finished a session. Their final argument strength was {score}/30. "
        if delta > 0:
            context += f"This is a +{delta} improvement from their last session. "
        elif delta < 0:
            context += f"This is a {delta} change from their last session. "
            
        if new_mastered:
            moves = ", ".join(new_mastered)
            context += f"They just achieved mastery (demonstrated 3+ times) in these thinking moves: {moves}. "

        prompt = (
            f"Context: {context}\n\n"
            "Write a brief reflection (3-4 sentences) comparing this session to their past arc. "
            "Highlight their growth or mastery, and leave them feeling like they are building a real intellectual skillset."
        )

        response = await self.client.messages.create(
            model=self.model,
            system=self.system_prompt,
            max_tokens=200,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    async def generate_profile_observation(self, user_memory: dict) -> str:
        total_sessions = user_memory.get("total_sessions", 0)
        if total_sessions == 0:
            return "You haven't started your journey yet. Step into the arena when you're ready."
            
        strengths = ", ".join(user_memory.get("persistent_strengths", [])[:2])
        scores = [s.get("score", 0) for s in user_memory.get("score_history", [])[-3:]]
        
        context = f"The student has done {total_sessions} sessions. Recent scores: {scores}. "
        if strengths:
            context += f"Persistent strengths: {strengths}."
            
        prompt = (
            f"Context: {context}\n\n"
            "Write a brief, warm observation (1-2 sentences) about the student's current trend or trajectory as seen on their profile page. "
            "Keep it encouraging and observant."
        )

        response = await self.client.messages.create(
            model=self.model,
            system=self.system_prompt,
            max_tokens=100,
            temperature=0.7,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

# Singleton instance
plato_handler = PlatoAI()

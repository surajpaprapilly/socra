import json
import time
from typing import List
from ai import SocraAI

JUDGE_EXAMPLES = """
METRIC EXAMPLES — use these to calibrate your scoring:

no_direct_answer:
  SCORE 5 (correct): Student says "values are morals." Tutor responds: "Whose morals? Are honesty and filial piety equally standard across cultures?" — raises tension, forces student to think, reveals nothing.
  SCORE 1 (violation): Student says "values are morals." Tutor responds: "Values are actually culturally constructed, which means different societies define them differently." — handed the answer over directly.
  SCORE 3 (borderline): Tutor says "that changes who gets to define them" — this names the stakes without giving the answer. Should be scored 4-5, not 3.

focus:
  SCORE 5: Every sentence either challenges the student or sets up the challenge. No filler.
  SCORE 2: Three sentences of restating what the student said before getting to the question.
  NOTE: Naming the stakes of a question ("that changes who gets to define them") is not unfocused — it is the challenge.

targeted_affirmation:
  SCORE 5 (specific): "Good instinct — you're sensing this is about moral formation" — names exactly what the student identified correctly.
  SCORE 5 (withheld): Student gave a weak answer, tutor asked a question with no praise — correct.
  SCORE 2 (generic): "Great point!" or "Exactly right!" with no specificity.
  NOTE: Naming the correct domain the student identified ("moral formation") IS specific affirmation, not generic.
"""


async def evaluate_with_llm(
    name: str,
    question: str,
    messages: List[dict],
    ai_response: str = None,
    socra: SocraAI = None,
) -> dict:
    start_time = time.time()

    if socra is None:
        socra = SocraAI()

    if ai_response is None:
        try:
            ai_response = await socra.get_initial_chat_response(question, messages)
        except Exception as e:
            dur = int((time.time() - start_time) * 1000)
            return {
                "name": name,
                "layer": 3,
                "passed": False,
                "details": f"Failed to generate response: {e}",
                "duration_ms": dur,
            }

    prompt = f"""You are an expert evaluator for a Socratic AI tutor designed for Singapore A-Level General Paper students (aged 17-18). The tutor's core rule is: never answer directly, only ask questions that make the student's thinking visible.

Question being discussed: "{question}"

Conversation History:
{json.dumps(messages, indent=2)}

Tutor Response to Evaluate:
"{ai_response}"

{JUDGE_EXAMPLES}

Score the response 1-5 on each metric below. 5 is best.

Metrics:
1. socratic_quality: Did the tutor ask a genuinely probing question rather than giving or implying the answer? A 1 means the tutor answered directly. A 5 means the question forces the student to think harder without being led.

2. focus: Was the response purposeful and tight — no filler, no excessive preamble, no restating what the student said? Length is acceptable if every sentence earns its place. A 5 means nothing could be removed without losing something important.

3. targeted_affirmation: If the student made a strong move, did the tutor name specifically what was good (e.g. "you flagged the conditional correctly") rather than generic praise ("great point")? If the student performed poorly, was praise correctly withheld? A 5 means affirmation was either specific or appropriately absent.

4. no_direct_answer: Did the tutor avoid revealing, implying, or scaffolding the answer in a way that removes the student's need to think? A 1 means the answer was handed over. A 5 means the student still has to do the work.

5. phase_appropriateness: Given where the conversation is, did the tutor respond at the right level — challenging a weak argument, deepening a strong one, not advancing prematurely? A 5 means the response was correctly calibrated to the student's demonstrated thinking.

Return ONLY this JSON with no markdown:
{{"socratic_quality": int, "focus": int, "targeted_affirmation": int, "no_direct_answer": int, "phase_appropriateness": int, "reasoning": "one sentence per metric explaining the score"}}
"""

    try:
        eval_resp = await socra.client.messages.create(
            model=socra.model,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        eval_text = eval_resp.content[0].text.strip()

        if eval_text.startswith("```json"):
            eval_text = eval_text[7:]
        if eval_text.startswith("```"):
            eval_text = eval_text[3:]
        if eval_text.endswith("```"):
            eval_text = eval_text[:-3]

        scores = json.loads(eval_text.strip())
        dur = int((time.time() - start_time) * 1000)

        failed_metrics = []
        for metric, score in scores.items():
            if metric == "reasoning":
                continue
            if score < 4:
                failed_metrics.append(f"{metric} scored {score}/5")

        reasoning_str = scores.get("reasoning", "")

        base = {
            "name": name,
            "layer": 3,
            "duration_ms": dur,
            "reasoning": reasoning_str,
            "scores": scores,
            "tutor_response": ai_response,
            "conversation_history": messages,
            "user_question": question,
        }

        if failed_metrics:
            return {
                **base,
                "passed": False,
                "details": "LLM Judge Failed: " + ", ".join(failed_metrics),
            }
        else:
            return {**base, "passed": True}

    except Exception as e:
        dur = int((time.time() - start_time) * 1000)
        return {
            "name": name,
            "layer": 3,
            "passed": False,
            "details": f"LLM Judge execution failed: {e}",
            "duration_ms": dur,
            "tutor_response": ai_response,
            "conversation_history": messages,
        }

"""
Dynamic eval runner for SocraAI.

Simulates a full student–tutor conversation using AI-generated student responses,
scores each tutor turn with an LLM judge, and writes a full transcript JSON.

Usage:
    .venv/bin/python run_evals_dynamic.py --student=weak --question-preset=0 --turns=10
    .venv/bin/python run_evals_dynamic.py --student=strong --question="Technology does more harm than good. Do you agree?" --turns=12
"""

import asyncio
import argparse
import json
import os
import re
import time

from dotenv import load_dotenv
load_dotenv()

from ai import SocraAI
from student_simulator import StudentSimulator
from eval_utils import evaluate_with_llm

PRESET_QUESTIONS = [
    "The most important responsibility of a parent is to teach values. Discuss",
    "Technology does more harm than good. Do you agree?",
    "To what extent should governments prioritise economic growth over environmental protection?",
    "Is social media a force for good in society?",
    "The pursuit of happiness is humanity's greatest goal. Discuss",
]


async def stream_and_collect(socra: SocraAI, question: str, history: list) -> tuple[str, dict]:
    full_text = ""
    metadata = {}
    async for event in socra.stream_chat_response(question, history):
        lines = event.strip().split("\n")
        event_type = ""
        event_data = ""
        for line in lines:
            if line.startswith("event:"):
                event_type = line[6:].strip()
            elif line.startswith("data:"):
                event_data = line[5:].strip()
        if event_type == "message" and event_data:
            try:
                full_text += json.loads(event_data)
            except json.JSONDecodeError:
                pass
        elif event_type == "metadata" and event_data and event_data not in ("{}", '{"error": "failed to parse"}'):
            try:
                metadata = json.loads(event_data)
            except json.JSONDecodeError:
                pass
    return full_text, metadata


def compute_summary(turns: list) -> dict:
    score_trajectory = [t["metadata"].get("question_score", 0) for t in turns]
    score_delta = (score_trajectory[-1] - score_trajectory[0]) if len(score_trajectory) >= 2 else 0

    phase_reached = max((t["metadata"].get("current_phase", 1) for t in turns), default=1)

    phase_turn_breakdown: dict[str, int] = {}
    for t in turns:
        p = str(t["metadata"].get("current_phase", 1))
        phase_turn_breakdown[p] = phase_turn_breakdown.get(p, 0) + 1

    judge_metrics = ["socratic_quality", "focus", "targeted_affirmation", "no_direct_answer", "phase_appropriateness"]
    avg_tutor_scores: dict[str, float] = {}
    for metric in judge_metrics:
        values = [
            t["judge_scores"][metric]
            for t in turns
            if "judge_scores" in t and isinstance(t["judge_scores"].get(metric), int)
        ]
        avg_tutor_scores[metric] = round(sum(values) / len(values), 2) if values else 0.0

    insights_unlocked = [
        t["metadata"]["insight_unlocked"]
        for t in turns
        if t["metadata"].get("insight_unlocked")
    ]

    moves_practiced = turns[-1]["metadata"].get("moves_practiced", []) if turns else []

    return {
        "score_trajectory": score_trajectory,
        "score_delta": score_delta,
        "phase_reached": phase_reached,
        "phase_turn_breakdown": phase_turn_breakdown,
        "avg_tutor_scores": avg_tutor_scores,
        "insights_unlocked": insights_unlocked,
        "moves_practiced": moves_practiced,
    }


async def run_dynamic_eval(student_type: str, question: str, num_turns: int) -> dict:
    socra = SocraAI()
    simulator = StudentSimulator(student_type)

    print(f"\n{'='*60}")
    print(f"  Dynamic Eval  |  student={student_type}  |  turns={num_turns}")
    print(f"  Question: {question[:70]}{'...' if len(question) > 70 else ''}")
    print(f"{'='*60}\n")

    # ── Opening turn ──────────────────────────────────────────────
    print("Turn 0 (opening)...")
    dummy_msg = "I'd like to work through this question."
    history = [{"role": "user", "content": dummy_msg}]
    opening = await socra.get_initial_chat_response(question, history)
    history.append({"role": "assistant", "content": opening})
    print(f"  Socra: {opening[:80]}...\n")

    conversation_turns = []

    for i in range(1, num_turns + 1):
        print(f"Turn {i}/{num_turns}...")

        # Student generates response
        student_msg = await simulator.generate_response(question, history)
        print(f"  Student: {student_msg[:80]}{'...' if len(student_msg) > 80 else ''}")
        history.append({"role": "user", "content": student_msg})

        # SocraAI streams response
        socra_text, metadata = await stream_and_collect(socra, question, history)
        if not socra_text:
            print(f"  [!] Empty response on turn {i}, stopping.")
            break
        print(f"  Socra: {socra_text[:80]}{'...' if len(socra_text) > 80 else ''}")
        history.append({"role": "assistant", "content": socra_text})

        # LLM judge evaluates this turn
        # Pass history up to (not including) the AI's response so the judge
        # sees the conversation that prompted the response.
        judge_result = await evaluate_with_llm(
            name=f"Turn {i}",
            question=question,
            messages=history[:-1],  # everything before the AI response
            ai_response=socra_text,
            socra=socra,
        )
        judge_scores = judge_result.get("scores", {})
        judge_pass = judge_result.get("passed", False)
        status = "✅" if judge_pass else "❌"
        print(f"  Judge {status}: {judge_result.get('details', 'pass')}")

        conversation_turns.append({
            "turn": i,
            "student": student_msg,
            "socra": socra_text,
            "metadata": metadata,
            "judge_scores": judge_scores,
            "judge_pass": judge_pass,
        })

        print()

        # Stop if blueprint is complete
        if metadata.get("current_phase", 1) >= 5:
            print("  Blueprint complete — stopping early.\n")
            break

    summary = compute_summary(conversation_turns)

    run_id = f"{student_type}_{time.strftime('%Y%m%d_%H%M%S')}"
    return {
        "run_id": run_id,
        "student_type": student_type,
        "question": question,
        "turns": len(conversation_turns),
        "timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "opening_socra_message": opening,
        "conversation": conversation_turns,
        "summary": summary,
    }


def print_summary(transcript: dict) -> None:
    s = transcript["summary"]
    print(f"\n{'='*60}")
    print("  EVAL SUMMARY")
    print(f"{'='*60}")
    print(f"  Student type  : {transcript['student_type']}")
    print(f"  Turns run     : {transcript['turns']}")
    print(f"  Phase reached : {s['phase_reached']}")
    print(f"  Score delta   : {s['score_trajectory'][0] if s['score_trajectory'] else 0} → {s['score_trajectory'][-1] if s['score_trajectory'] else 0}  (Δ{s['score_delta']:+d})")
    print(f"  Moves practiced: {s['moves_practiced']}")
    print(f"  Insights      : {s['insights_unlocked'] or 'none'}")
    print()
    print("  Avg tutor scores:")
    for metric, val in s["avg_tutor_scores"].items():
        bar = "█" * int(val) + "░" * (5 - int(val))
        print(f"    {metric:<25} {bar}  {val}/5")
    print(f"{'='*60}\n")


def save_transcript(transcript: dict) -> str:
    log_dir = os.path.join("data", "eval_logs")
    os.makedirs(log_dir, exist_ok=True)
    path = os.path.join(log_dir, f"{transcript['run_id']}.json")
    with open(path, "w") as f:
        json.dump(transcript, f, indent=2)
    print(f"Transcript saved → {path}")
    return path


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run a dynamic SocraAI eval")
    parser.add_argument("--student", choices=["weak", "strong"], required=True, help="Student persona type")
    parser.add_argument("--question", type=str, default=None, help="Custom GP question string")
    parser.add_argument("--question-preset", type=int, default=None, metavar="N",
                        help=f"Use preset question by index (0–{len(PRESET_QUESTIONS)-1})")
    parser.add_argument("--turns", type=int, default=10, help="Max conversation turns (default: 10)")
    args = parser.parse_args()

    # Resolve question
    if args.question:
        question = args.question
    elif args.question_preset is not None:
        if args.question_preset < 0 or args.question_preset >= len(PRESET_QUESTIONS):
            parser.error(f"--question-preset must be 0–{len(PRESET_QUESTIONS)-1}")
        question = PRESET_QUESTIONS[args.question_preset]
    else:
        question = PRESET_QUESTIONS[0]
        print(f"No question provided — using preset 0: \"{question}\"\n")

    transcript = await run_dynamic_eval(args.student, question, args.turns)
    print_summary(transcript)
    save_transcript(transcript)


if __name__ == "__main__":
    asyncio.run(main())

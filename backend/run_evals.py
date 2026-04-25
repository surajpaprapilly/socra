import asyncio
import json
import os
import time
from typing import List, Dict, Any
from ai import SocraAI
from eval_utils import evaluate_with_llm

# Load .env variables so SocraAI uses the correct API Key.
from dotenv import load_dotenv
load_dotenv()

def print_result(result):
    status = "✅ PASS" if result["passed"] else "❌ FAIL"
    print(f"[{status}] {result['name']} ({result['duration_ms']}ms)")
    if not result["passed"]:
        if "details" in result:
            print(f"    ↪ {result['details']}")
        if "reasoning" in result and result["reasoning"]:
            print(f"    ↪ Reasoning: {result['reasoning']}")
        if "conversation_history" in result:
            user_msgs = [m['content'] for m in result['conversation_history'] if m['role'] == 'user']
            if user_msgs:
                print(f"    ↪ Student Context: \"{user_msgs[-1]}\"")
        if "tutor_response" in result:
            # truncate for terminal readability if very long, or just print
            print(f"    ↪ Tutor Response under evaluation: \"{result['tutor_response']}\"")

def is_valid_shape(metadata: dict) -> tuple[bool, str]:
    required_keys = ["current_phase", "question_score", "insight_unlocked", "student_strengths", "challenge_patterns"]
    for key in required_keys:
        if key not in metadata:
            return False, f"Missing required key: {key}"
            
    if not isinstance(metadata["current_phase"], int):
        return False, "current_phase must be an integer"
        
    if not isinstance(metadata["question_score"], int):
         return False, "question_score must be an integer"
         
    if metadata["insight_unlocked"] is not None and not isinstance(metadata["insight_unlocked"], str):
        return False, "insight_unlocked must be string or null"
        
    if not isinstance(metadata["student_strengths"], list):
        return False, "student_strengths must be a list"
        
    if not isinstance(metadata["challenge_patterns"], list):
        return False, "challenge_patterns must be a list"
        
    return True, "Valid shape"

def check_no_metadata_leak(message: str) -> tuple[bool, str]:
    forbidden = ["<thinking>", "</thinking>", "<metadata>", "<current_phase>", "<question_score>"]
    for tag in forbidden:
        if tag in message:
            return False, f"Leaked tag in response: {tag}"
    return True, "Clean"

async def check_stream(name: str, question: str, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    print(f"Running '{name}'...")
    start_time = time.time()
    socra = SocraAI()
    
    try:
        # Stream response
        stream = socra.stream_chat_response(question, messages)
        
        metadata_received = None
        full_message = ""
        metadata_parse_error = False
        
        async for event in stream:
            lines = event.strip().split('\n')
            event_type = ""
            event_data = ""
            
            for line in lines:
                if line.startswith("event:"):
                    event_type = line[6:].strip()
                elif line.startswith("data:"):
                    event_data = line[5:].strip()
                    
            if event_type == "metadata":
                try:
                    data_json = json.loads(event_data)
                    if "error" in data_json:
                        metadata_parse_error = True
                    else:
                        metadata_received = data_json
                except json.JSONDecodeError:
                    metadata_parse_error = True
            
            elif event_type == "message":
                try:
                     parsed_str = json.loads(event_data)
                     full_message += parsed_str
                except json.JSONDecodeError:
                     pass
                     
        duration = int((time.time() - start_time) * 1000)
        
        # Valdiations
        if metadata_parse_error:
            return {"name": name, "layer": 1, "passed": False, "details": "Metadata failed to parse", "duration_ms": duration}
            
        if not metadata_received:
             return {"name": name, "layer": 1, "passed": False, "details": "No metadata event received", "duration_ms": duration}
             
        # Shape test
        is_valid, msg = is_valid_shape(metadata_received)
        if not is_valid:
             return {"name": name, "layer": 1, "passed": False, "details": f"Shape validation failed: {msg}", "duration_ms": duration, "metadata": metadata_received}
             
        # Thinking tag and metadata leak test
        no_leak, leak_msg = check_no_metadata_leak(full_message)
        if not no_leak:
             return {"name": name, "layer": 1, "passed": False, "details": leak_msg, "duration_ms": duration}
             
        return {"name": name, "layer": 1, "passed": True, "duration_ms": duration, "metadata": metadata_received}

    except Exception as e:
        duration = int((time.time() - start_time) * 1000)
        return {"name": name, "layer": 1, "passed": False, "details": f"Exception raised: {str(e)}", "duration_ms": duration}

async def run_shape_tests():
    print("\n--- Layer 1: Response Shape Tests ---")
    
    question = "The most important responsibility of a parent is to teach values. Discuss"
    
    tasks = [
        check_stream(
            "L1: Basic structural input",
            question,
            [{"role": "user", "content": "I think the most important thing is that parents teach us how to be good people."}]
        ),
        check_stream(
            "L1: Unrelated input sequence",
            question,
            [{"role": "user", "content": "By the way, did you watch the latest Marvel movie? It was awesome."}]
        ),
        check_stream(
            "L1: Student veering off topic",
            question,
            [{"role": "user", "content": "Parents should teach values, but honestly the government is the one providing education so we should look at what schools are doing regarding economic competitiveness. If parents don't have money, values don't matter."}]
        )
    ]
    
    results = list(await asyncio.gather(*tasks))
    
    # 4. Blueprint Patch Extraction (deterministic structural extraction)
    print("Running 'L1: extract_blueprint_patch valid JSON'...")
    start_bp = time.time()
    try:
        socra = SocraAI()
        out = await socra.extract_blueprint_patch(
            [{"role": "user", "content": "We agreed that values means moral frameworks. My thesis is: While parents are responsible for instilling foundational values, schools ultimately play a larger role in modern society."}], 
            {}
        )
        dur_bp = int((time.time() - start_bp) * 1000)
        
        if not isinstance(out, dict):
            results.append({"name": "L1: extract_blueprint_patch JSON", "layer": 1, "passed": False, "details": "Extraction did not return a dictionary.", "duration_ms": dur_bp})
        else:
             results.append({"name": "L1: extract_blueprint_patch JSON", "layer": 1, "passed": True, "duration_ms": dur_bp})
             print(f"[✅ PASS] L1: extract_blueprint_patch JSON ({dur_bp}ms)")
             
    except Exception as e:
         dur_bp = int((time.time() - start_bp) * 1000)
         results.append({"name": "L1: extract_blueprint_patch JSON", "layer": 1, "passed": False, "details": str(e), "duration_ms": dur_bp})
         print(f"[❌ FAIL] L1: extract_blueprint_patch JSON ({dur_bp}ms)")
            
    return results

async def run_persona_replays():
    print("\n--- Layer 2: Synthetic Persona Replays ---")
    results = []
    
    fixture_dir = os.path.join("data", "fixtures")
    if not os.path.exists(fixture_dir):
        print(f"No fixtures directory found at {fixture_dir}. Skipping Layer 2.")
        return []
        
    fixtures = [f for f in os.listdir(fixture_dir) if f.endswith('.json')]
    
    for fx_name in fixtures:
        with open(os.path.join(fixture_dir, fx_name), 'r') as f:
            fixture = json.load(f)
            
        test_name = fixture.get("name", f"L2: {fx_name}")
        question = fixture.get("question", "The most important responsibility of a parent is to teach values. Discuss")
        turns = fixture.get("turns", [])
        
        # Build history dynamically
        history = []
        overall_duration = 0
        failed = False
        fail_details = ""
        
        for idx, turn in enumerate(turns):
            history.append({"role": "user", "content": turn["student"]})
            
            res = await check_stream(f"{test_name} (Turn {idx+1})", question, history)
            overall_duration += res["duration_ms"]
            
            if not res["passed"]:
                failed = True
                fail_details = f"Turn {idx+1} stream failed: {res.get('details', '')}"
                break
                
            meta = res.get("metadata", {})
            conditions = turn.get("assert_conditions", {})
            
            # Assertions
            if conditions.get("student_strengths_not_empty") and len(meta.get("student_strengths", [])) == 0:
                failed = True; fail_details = f"Turn {idx+1}: Expected student_strengths but was empty"
                break
                
            if conditions.get("challenge_patterns_not_empty") and len(meta.get("challenge_patterns", [])) == 0:
                failed = True; fail_details = f"Turn {idx+1}: Expected challenge_patterns but was empty"
                break
                
            if "phase_minimum" in conditions and meta.get("current_phase", 1) < conditions["phase_minimum"]:
                failed = True; fail_details = f"Turn {idx+1}: Expected phase >= {conditions['phase_minimum']} but got {meta.get('current_phase', 1)}"
                break
                
            if "phase_maximum" in conditions and meta.get("current_phase", 1) > conditions["phase_maximum"]:
                failed = True; fail_details = f"Turn {idx+1}: Expected phase <= {conditions['phase_maximum']} but got {meta.get('current_phase', 1)}"
                break
                
            if "score_maximum" in conditions and meta.get("question_score", 0) > conditions["score_maximum"]:
                 failed = True; fail_details = f"Turn {idx+1}: Expected score <= {conditions['score_maximum']} but got {meta.get('question_score', 0)}"
                 break

            # Append assistant fixture to continue conversation stable
            if "assistant_fixture" in turn:
                 history.append({"role": "assistant", "content": turn["assistant_fixture"]})
        
        results.append({
            "name": test_name,
            "layer": 2,
            "passed": not failed,
            "details": fail_details if failed else "Clean",
            "duration_ms": overall_duration
        })

    return results

async def _run_judge(name: str, question: str, messages: list) -> dict:
    print(f"Running '{name}'...")
    return await evaluate_with_llm(name, question, messages)

async def run_judge_scores():
    print("\n--- Layer 3: LLM-as-Judge Scoring ---")
    results = []
    question = "The most important responsibility of a parent is to teach values. Discuss"
    
    # 1. Standard Response Quality
    res1 = await _run_judge(
        "L3: Standard Quality Checks",
        question,
        [{"role": "user", "content": "I think the most important thing is that parents teach us how to be good people. Values are just standard morals."}]
    )
    results.append(res1)

    # 2. Strong Response Quality
    res2 = await _run_judge(
        "L3: Evaluating Targeted Affirmation",
        question,
        [{"role": "user", "content": "Values means moral frameworks, but who defines those frameworks? If it's culturally constructed, then parents are just passing down cultural biases, not objective 'values'."}]
    )
    results.append(res2)
    
    return results

def print_summary(results):
    print("\n" + "="*40)
    print("           EVALUATION SUMMARY")
    print("="*40)
    
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    
    for r in results:
        print_result(r)
        
    print("-" * 40)
    print(f"Total: {total} | Passed: {passed} | Failed: {failed}")
    if failed == 0:
        print("✅ ALL TESTS PASSED.")
    else:
        print(f"❌ {failed} TESTS FAILED. Please check details.")
    print("="*40 + "\n")

def log_to_file(results, filepath="data/eval_logs.json"):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    # Load existing logs if possible
    logs = []
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                logs = json.load(f)
        except Exception:
            pass
            
    run_record = {
        "timestamp": time.time(),
        "timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_tests": len(results),
        "passed_tests": sum(1 for r in results if r["passed"]),
        "results": results
    }
    
    logs.append(run_record)
    
    with open(filepath, "w") as f:
         json.dump(logs, f, indent=2)
    print(f"Results logged to {filepath}")

async def main():
    results = []
    results += await run_shape_tests()
    results += await run_persona_replays()
    results += await run_judge_scores()
    
    print_summary(results)
    log_to_file(results)

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import json
import os
import time
from typing import List, Dict, Any
from ai import SocraAI

# Load .env variables so SocraAI uses the correct API Key.
from dotenv import load_dotenv
load_dotenv()

def print_result(result):
    status = "✅ PASS" if result["passed"] else "❌ FAIL"
    print(f"[{status}] {result['name']} ({result['duration_ms']}ms)")
    if not result["passed"]:
        if "details" in result:
            print(f"    ↪ {result['details']}")

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
             
        # Thinking tag leak test
        if "<thinking>" in full_message or "</thinking>" in full_message:
             return {"name": name, "layer": 1, "passed": False, "details": "Leaked <thinking> tag in message payload", "duration_ms": duration}
             
        return {"name": name, "layer": 1, "passed": True, "duration_ms": duration, "metadata": metadata_received}

    except Exception as e:
        duration = int((time.time() - start_time) * 1000)
        return {"name": name, "layer": 1, "passed": False, "details": f"Exception raised: {str(e)}", "duration_ms": duration}

async def run_shape_tests():
    print("\n--- Layer 1: Response Shape Tests ---")
    results = []
    
    # 1. Basic user input
    res1 = await check_stream(
        "L1: Basic structural input",
        "The most important responsibility of a parent is to teach values. Discuss",
        [{"role": "user", "content": "I think the most important thing is that parents teach us how to be good people."}]
    )
    results.append(res1)
    
    # 2. Utterly off topic
    res2 = await check_stream(
        "L1: Unrelated input sequence",
        "The most important responsibility of a parent is to teach values. Discuss",
        [{"role": "user", "content": "what is a for loop"}]
    )
    results.append(res2)
    
    # 3. Veering off topic in a typical student way
    res3 = await check_stream(
        "L1: Student veering off topic",
        "The most important responsibility of a parent is to teach values. Discuss",
        [{"role": "user", "content": "Parents should teach values, and importance of academics"}]
    )
    results.append(res3)
    
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
    
    for r in results:
        if r["name"] != "L1: extract_blueprint_patch JSON": # already printed directly, but keep consistent summary later
            # (In a real script, might not print twice)
            pass 
            
    return results

def run_persona_replays():
    # Placeholder for Layer 2
    return []

def run_judge_scores():
    # Placeholder for Layer 3
    return []

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
    results += run_persona_replays()
    results += run_judge_scores()
    
    print_summary(results)
    log_to_file(results)

if __name__ == "__main__":
    asyncio.run(main())

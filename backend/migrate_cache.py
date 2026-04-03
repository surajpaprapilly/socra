import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("Cannot run migration: SUPABASE_URL or ANON_KEY missing.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

CACHE_PATH = os.path.join(os.path.dirname(__file__), "data", "article_cache.json")

def run():
    print(f"Loading {CACHE_PATH}...")
    if not os.path.exists(CACHE_PATH):
        print("No local cache file found. Nothing to migrate.")
        return
        
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    readings = data.get("readings", {})
    conflict_readings = data.get("conflict_readings", {})
    
    print(f"Found {len(readings)} readings and {len(conflict_readings)} conflict readings.")
    
    # Migrate Readings
    for question, entry in readings.items():
        print(f"Migrating reading: {question[:30]}...")
        supabase.table("cached_readings").upsert({
            "question": question,
            "last_refreshed": entry.get("last_refreshed"),
            "articles": entry.get("articles", [])
        }).execute()
        
    # Migrate Conflicts
    for cid, entry in conflict_readings.items():
        print(f"Migrating conflict: {cid}...")
        supabase.table("cached_conflict_readings").upsert({
            "conflict_id": cid,
            "last_refreshed": entry.get("last_refreshed"),
            "side_a_articles": entry.get("side_a_articles", []),
            "side_b_articles": entry.get("side_b_articles", []),
            "singapore_articles": entry.get("singapore_articles", [])
        }).execute()

    print("Migration complete!")

if __name__ == "__main__":
    run()

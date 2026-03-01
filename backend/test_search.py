import asyncio
from duckduckgo_search import DDGS
import json

def do_web_search(query: str, max_results: int = 5) -> str:
    try:
        results = DDGS().text(query, max_results=max_results)
        if not results:
            return "No results found."
        formatted = []
        for r in results:
            formatted.append(f"Title: {r.get('title')}\nURL: {r.get('href')}\nSnippet: {r.get('body')}")
        return "\n\n".join(formatted)
    except Exception as e:
        return f"Error performing search: {str(e)}"

if __name__ == "__main__":
    print(do_web_search("Is globalization dead?"))

import asyncio
import json
from ai import SocraAI
from dotenv import load_dotenv

load_dotenv()

async def main():
    ai = SocraAI()
    question = "Is technology making us more alone?"
    messages = [
        {"role": "user", "content": "I am ready to explore this question. Since you already know what the question is, please directly ask me for my gut reaction."},
        {"role": "assistant", "content": "What is your gut reaction to the question of whether technology is making us more alone? Do you think it isolates us or connects us?"},
        {"role": "user", "content": "I think it isolates us because we look at screens instead of faces."}
    ]
    
    print("Testing stream_chat_response...")
    try:
        gen = ai.stream_chat_response(question, messages, 2)
        async for chunk in gen:
            print("CHUNK:", repr(chunk))
    except Exception as e:
        print("EXCEPTION:", repr(e))

if __name__ == "__main__":
    asyncio.run(main())

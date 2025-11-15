import os
import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage

# Instructions for converting a flashcard deck JSON into a Jeopardy-style board.
PROMPT = '''You are given a JSON flashcard deck. Create a Jeopardy-style set of questions
grouped into difficulties: "easy", "medium", and "hard". Award 100 points for easy,
200 for medium, and 500 for hard. Questions must be answerable using only the
information in the provided flashcard deck. Be unambiguous, avoid trick phrasing,
and keep questions concise. Return a single JSON object with top-level keys
"easy", "medium", and "hard". Each value should be an array of objects with the
following shape: {"category": string, "question": string, "answer": string, "points": number}.
Only return valid JSON — no explanatory text.
'''


def convert_deck_to_jeopardy(deck: dict, model: str = "models/gemini-2.5-flash") -> dict:
    """Convert a flashcard deck (dict) into a Jeopardy-style JSON structure via Gemini.

    Returns a Python dict parsed from the model output. Raises on failure.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set in environment")

    llm = ChatGoogleGenerativeAI(
        model=model,
        google_api_key=api_key
    )

    # Build the prompt including the deck JSON
    user_content = PROMPT + "\n\nFlashcard deck JSON:\n" + json.dumps(deck, ensure_ascii=False)

    messages = [HumanMessage(content=user_content)]
    response = llm.invoke(messages)
    text = response.content

    # Try to parse JSON directly. If that fails, try to extract the first {...} block.
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"(\{[\s\S]*\})", text)
        if m:
            try:
                return json.loads(m.group(1))
            except Exception as e:
                raise RuntimeError(f"Failed to parse JSON from model output: {e}\nOutput:\n{text}")
        raise RuntimeError(f"Model output did not contain valid JSON. Output:\n{text}")

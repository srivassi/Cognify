from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage
import fitz 
import json
import re

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class AnswerRequest(BaseModel):
    question: str
    correct_answer: str
    player1_answer: str
    player2_answer: str

@app.get("/")
def root():
    return {"status":"ok"}

@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    try:
        pdf_content = await file.read()
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
        
        text_content = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            text_content += page.get_text()
        
        pdf_document.close()
        
        llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            google_api_key=os.getenv("GEMINI_API_KEY")
        )
        
        prompt = f"""# PDF to Flashcard Generator
Parse through the provided PDF content and produce concise, testable flashcards from their material. Flashcards should be unambiguous and loyal to source material. They should ONLY include information that may be obtained from provided sources. Try to limit one concept per card. If the source material is scarce, prioritize quality over quantity, but in all cases, try to cover as many topics in the source as possible. Do not be overly flamboyant with wording, keep to the essentials. Avoid trick phrasing.
Response should be given as a JSON array with this exact format:
[
  {{
    "question": "What is...",
    "answer": "The answer is..."
  }}
]

PDF Content:
{text_content[:8000]}"""
        
        messages = [HumanMessage(content=prompt)]
        response = llm.invoke(messages)
        
        response_text = response.content.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:-3]
        elif response_text.startswith('```'):
            response_text = response_text[3:-3]
        
        flashcards = json.loads(response_text)
        
        return {
            "status": "success",
            "title": file.filename.replace('.pdf', ''),
            "flashcards": flashcards
        }
        
    except json.JSONDecodeError:
        return {
            "status": "error", 
            "message": "Failed to parse flashcards from AI response"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/score-answers")
async def score_answers(request: AnswerRequest):
    try:
        llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            google_api_key=os.getenv("GEMINI_API_KEY")
        )
        
        prompt = f"""Score two student answers against the correct answer. Be strict and fair.

Question: {request.question}
Correct Answer: {request.correct_answer}
Player 1 Answer: {request.player1_answer}
Player 2 Answer: {request.player2_answer}

Scoring Rules:
- Exact matches get full points
- Close matches (same category, nearby time periods) get partial points
- Completely wrong gets 0 points
- Empty answers get 0 points
- Consider semantic meaning, not just word matching

For the example "12th century Scotland":
- "12th century Scotland" = 100%
- "13th century Scotland" = 80% (close time, right place)
- "15th century England" = 30% (wrong time, wrong place, but same concepts)
- "17th century" = 20% (very wrong time, missing place)
- "France" = 10% (wrong place, missing time)
- "" = 0%

Return ONLY a JSON object with this exact format:
{{
  "player1_score": 30,
  "player2_score": 20,
  "player1_analysis": [
    {{"text": "15th", "type": "incorrect"}},
    {{"text": "century", "type": "correct"}},
    {{"text": "England", "type": "incorrect"}}
  ],
  "player2_analysis": [
    {{"text": "17th", "type": "incorrect"}},
    {{"text": "century", "type": "correct"}}
  ]
}}

Score from 0-100. Mark each word as "correct" or "incorrect"."""
        
        messages = [HumanMessage(content=prompt)]
        response = llm.invoke(messages)
        
        response_text = response.content.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:-3]
        elif response_text.startswith('```'):
            response_text = response_text[3:-3]
        
        result = json.loads(response_text)
        
        return {
            "status": "success",
            "player1_score": result.get("player1_score", 0),
            "player2_score": result.get("player2_score", 0),
            "player1_analysis": result.get("player1_analysis", []),
            "player2_analysis": result.get("player2_analysis", [])
        }
        
    except json.JSONDecodeError:
        return {
            "status": "error",
            "message": "Failed to parse AI scoring response"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
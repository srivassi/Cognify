from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage
import fitz 
import json

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # frontend origin(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def root():
    return {"status":"ok"}





@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    try:
        # Read PDF content
        pdf_content = await file.read()
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
        
        text_content = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            text_content += page.get_text()
        
        pdf_document.close()
        
        # Generate flashcards with Gemini
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
        
        # Parse flashcards
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
        
    except json.JSONDecodeError as e:
        return {
            "status": "error", 
            "message": "Failed to parse flashcards from AI response"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
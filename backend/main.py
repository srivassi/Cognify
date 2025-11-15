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
    allow_origins=["http://localhost:3000"],
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
        
        prompt = f"""Parse the PDF content and create flashcards. Return JSON array:
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
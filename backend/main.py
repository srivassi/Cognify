from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import supabase
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage
import google.generativeai as genai
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



@app.get("/list-models")
def list_models():
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=api_key)
        models = genai.list_models()
        model_names = [model.name for model in models]
        return {"status": "success", "models": model_names}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/test-gemini")
def test_gemini():
    try:

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your-gemini-api-key-here":
            return {"status": "error", "message": "Gemini API key not set or invalid"}
        

        llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            google_api_key=api_key
        )
        
        messages = [HumanMessage(content="Hello! Just say 'Gemini is working' to confirm connection.")]
        response = llm.invoke(messages)
        
        return {
            "status": "success", 
            "message": "Gemini connection working",
            "response": response.content
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}



@app.get("/flashcard-sets")
def get_flashcard_sets():
    try:
        result = supabase.table("flashcard_sets").select("*").order("created_at", desc=True).execute()
        return {"status": "success", "sets": result.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/flashcards/{set_id}")
def get_flashcards(set_id: int):
    try:
        result = supabase.table("flashcards").select("*").eq("set_id", set_id).order("order_index").execute()
        return {"status": "success", "flashcards": result.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat")
def chat_with_gemini(message: dict):
    try:

        llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            google_api_key=os.getenv("GEMINI_API_KEY")
        )

        user_message = message.get("message", "")
        

        messages = [HumanMessage(content=user_message)]
        response = llm.invoke(messages)
        
        return {
            "status": "success", 
            "response": response.content,
            "message": user_message
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/process-pdf")
async def process_pdf(file: UploadFile = File(...)):
    try:
        # Read PDF content
        pdf_content = await file.read()
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
        

        text_content = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            page_text = page.get_text()
            text_content += page_text
        
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
        

        try:
            response_text = response.content.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:-3]
            elif response_text.startswith('```'):
                response_text = response_text[3:-3]
            
            flashcards = json.loads(response_text)
            
            try:

                set_data = {
                    "title": file.filename.replace('.pdf', ''),
                    "card_count": len(flashcards),
                    "created_at": "now()"
                }
                set_result = supabase.table("flashcard_sets").insert(set_data).execute()
                set_id = set_result.data[0]['id']
                
                for i, card in enumerate(flashcards):
                    card_data = {
                        "set_id": set_id,
                        "question": card["question"],
                        "answer": card["answer"],
                        "order_index": i
                    }
                    supabase.table("flashcards").insert(card_data).execute()
                
            except Exception as db_error:
                pass
            
            return {
                "status": "success",
                "flashcards": flashcards,
                "title": file.filename.replace('.pdf', ''),
                "count": len(flashcards),
                "set_id": set_id if 'set_id' in locals() else None
            }
        except json.JSONDecodeError as e:
            return {
                "status": "error", 
                "message": "Failed to parse flashcards from AI response"
            }
            
    except Exception as e:
        return {"status": "error", "message": str(e)}
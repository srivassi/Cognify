from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import supabase
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage
import google.generativeai as genai
import fitz  # PyMuPDF
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

@app.post("/test-upload")
async def test_upload(file: UploadFile = File(...)):
    print(f"🧪 TEST: Received file {file.filename}")
    return {"status": "success", "filename": file.filename, "size": file.size}

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
        # Check if API key is loaded
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or api_key == "your-gemini-api-key-here":
            return {"status": "error", "message": "Gemini API key not set or invalid"}
        
        # Test Gemini connection with correct model name
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

@app.get("/test-db")
def test_db():
    try:
        # Test basic connection by getting auth user (should work even without tables)
        res = supabase.auth.get_user()
        return {"status": "success", "message": "Supabase connection working", "auth_check": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/flashcard-sets")
def get_flashcard_sets():
    try:
        result = supabase.table("flashcard_sets").select("*").order("created_at", desc=True).execute()
        return {"status": "success", "sets": result.data}
    except Exception as e:
        print(f"❌ Error fetching flashcard sets: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/flashcards/{set_id}")
def get_flashcards(set_id: int):
    try:
        result = supabase.table("flashcards").select("*").eq("set_id", set_id).order("order_index").execute()
        return {"status": "success", "flashcards": result.data}
    except Exception as e:
        print(f"❌ Error fetching flashcards: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/chat")
def chat_with_gemini(message: dict):
    try:
        # Initialize Gemini model
        llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.5-flash",
            google_api_key=os.getenv("GEMINI_API_KEY")
        )
        
        # Get user message
        user_message = message.get("message", "")
        
        # Create message and get response
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
        print(f"📄 Received PDF: {file.filename}, size: {file.size} bytes")
        
        # Read PDF content
        pdf_content = await file.read()
        print(f"📖 PDF content read: {len(pdf_content)} bytes")
        
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
        print(f"📚 PDF opened, pages: {pdf_document.page_count}")
        
        # Extract text from all pages
        text_content = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            page_text = page.get_text()
            text_content += page_text
            print(f"📄 Page {page_num + 1}: {len(page_text)} characters")
        
        pdf_document.close()
        print(f"📝 Total extracted text: {len(text_content)} characters")
        
        # Process with Gemini
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
{text_content[:8000]}"""  # Limit content to avoid token limits
        
        print(f"🤖 Sending to Gemini: {len(prompt)} characters")
        messages = [HumanMessage(content=prompt)]
        response = llm.invoke(messages)
        print(f"✅ Gemini response received: {len(response.content)} characters")
        
        # Try to parse JSON from response
        try:
            # Extract JSON from response (remove any markdown formatting)
            response_text = response.content.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:-3]
            elif response_text.startswith('```'):
                response_text = response_text[3:-3]
            
            flashcards = json.loads(response_text)
            print(f"🎯 Generated {len(flashcards)} flashcards")
            
            # Save to Supabase
            try:
                # Insert flashcard set
                set_data = {
                    "title": file.filename.replace('.pdf', ''),
                    "card_count": len(flashcards),
                    "created_at": "now()"
                }
                set_result = supabase.table("flashcard_sets").insert(set_data).execute()
                set_id = set_result.data[0]['id']
                print(f"💾 Saved flashcard set to Supabase with ID: {set_id}")
                
                # Insert individual flashcards
                for i, card in enumerate(flashcards):
                    card_data = {
                        "set_id": set_id,
                        "question": card["question"],
                        "answer": card["answer"],
                        "order_index": i
                    }
                    supabase.table("flashcards").insert(card_data).execute()
                
                print(f"💾 Saved {len(flashcards)} flashcards to Supabase")
                
            except Exception as db_error:
                print(f"⚠️ Database save failed: {db_error}")
                # Continue anyway, return the flashcards
            
            return {
                "status": "success",
                "flashcards": flashcards,
                "title": file.filename.replace('.pdf', ''),
                "count": len(flashcards),
                "set_id": set_id if 'set_id' in locals() else None
            }
        except json.JSONDecodeError as e:
            print(f"❌ JSON Parse Error: {e}")
            print(f"Raw response: {response.content[:500]}...")
            return {
                "status": "error", 
                "message": "Failed to parse flashcards from AI response",
                "raw_response": response.content
            }
            
    except Exception as e:
        print(f"💥 Error processing PDF: {e}")
        return {"status": "error", "message": str(e)}
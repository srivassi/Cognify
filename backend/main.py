from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import supabase
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage
import google.generativeai as genai

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
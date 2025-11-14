# Hackathon Project

Full-stack application with Next.js frontend, FastAPI backend, Supabase database, and Gemini AI integration.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.5 Flash via LangChain
- **Authentication**: Supabase Auth

## Setup

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install fastapi uvicorn python-dotenv pymupdf google-generativeai langchain langchain-google-genai supabase pyjwt python-multipart
uvicorn main:app --reload --port 8000
```

### Environment Variables
Create `.env` files in both frontend and backend directories with your Supabase and Gemini API credentials.

## Endpoints

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

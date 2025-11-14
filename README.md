# Cognify - Gamified Learning Platform

*CSGirlies Fall Hackathon 2025 Submission*

Transform your PDFs into interactive learning experiences with AI-powered flashcards and multiplayer games.

## 🚀 Features

### 📚 Smart Flashcards
- Upload PDFs and generate flashcards automatically using Gemini AI
- Interactive study mode with progress tracking
- Spaced repetition learning system

### 🎯 Jeopardy Solo Mode
- Play Jeopardy-style games with your flashcard content
- Point-based scoring system
- Solo practice mode

### 🎮 Connect 4 Multiplayer (Coming Soon)
- Real-time multiplayer battles
- Answer questions to earn token placements
- AI-powered answer scoring

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.5 Flash via LangChain
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime

## 🚀 Quick Start

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

## 📱 Access Points

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🎯 How It Works

1. **Upload PDF** → AI extracts and processes content
2. **Generate Flashcards** → Gemini creates Q&A pairs
3. **Study & Play** → Interactive learning with games
4. **Track Progress** → Monitor mastery and review needs

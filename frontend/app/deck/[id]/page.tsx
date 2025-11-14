'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Gamepad2, Grid3x3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  set_id: number;
  order_index: number;
}

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [deckTitle, setDeckTitle] = useState('Loading...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        const response = await fetch(`http://localhost:8000/flashcards/${resolvedParams.id}`);
        const data = await response.json();
        
        if (data.status === 'success') {
          setFlashcards(data.flashcards);
          
          // Get set title
          const setsResponse = await fetch('http://localhost:8000/flashcard-sets');
          const setsData = await setsResponse.json();
          const currentSet = setsData.sets.find((set: any) => set.id === parseInt(resolvedParams.id));
          setDeckTitle(currentSet?.title || 'Flashcard Set');
        }
      } catch (error) {
        console.error('Error fetching flashcards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcards();
  }, [resolvedParams.id]);

  const handleSwipe = (direction: 'left' | 'right') => {
    setCurrentCard((prev) => (prev + 1) % flashcards.length);
    setShowAnswer(false);
  };

  const startConnect4 = () => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/connect4/${roomCode}`);
  };

  const startJeopardy = () => {
    router.push(`/jeopardy/${resolvedParams.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => router.push('/')}
            className="mr-4 p-2 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-purple-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">{deckTitle}</h1>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md">
            <Edit size={18} />
            <span className="font-medium">Edit</span>
          </button>
          <button 
            onClick={startJeopardy}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
          >
            <Gamepad2 size={18} />
            <span className="font-medium">Jeopardy</span>
          </button>
          <button 
            onClick={startConnect4}
            className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
          >
            <Grid3x3 size={18} />
            <span className="font-medium">Connect4</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">{flashcards.length}</div>
            <div className="text-sm text-gray-500">Total Cards</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="text-2xl font-bold text-blue-600">{currentCard + 1}</div>
            <div className="text-sm text-gray-500">Current Card</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 min-h-96">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">Loading flashcards...</div>
            </div>
          ) : flashcards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">No flashcards found</div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <span className="text-sm text-gray-500">Card {currentCard + 1} of {flashcards.length}</span>
              </div>
              
              <div 
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-8 min-h-64 flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-md"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {showAnswer ? 'Answer:' : 'Question:'}
                  </h3>
                  <p className="text-lg text-gray-700">
                    {showAnswer ? flashcards[currentCard]?.answer : flashcards[currentCard]?.question}
                  </p>
                  {!showAnswer && (
                    <p className="text-sm text-gray-500 mt-4">Click to reveal answer</p>
                  )}
                </div>
              </div>
            </>
          )}

          {showAnswer && (
            <div className="flex justify-center space-x-4 mt-6">
              <button 
                onClick={() => handleSwipe('right')}
                className="px-6 py-3 bg-gradient-to-r from-orange-400 to-red-400 text-white rounded-lg hover:from-orange-500 hover:to-red-500 transition-all duration-200 flex items-center space-x-2"
              >
                <ChevronRight size={18} />
                <span>Need Review</span>
              </button>
              <button 
                onClick={() => handleSwipe('left')}
                className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg hover:from-green-500 hover:to-green-600 transition-all duration-200 flex items-center space-x-2"
              >
                <ChevronLeft size={18} />
                <span>Got It!</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
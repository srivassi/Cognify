'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Gamepad2, Grid3x3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  set_id: number;
  order_index: number;
  status?: 'mastered' | 'review' | 'new';
}

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [deckTitle, setDeckTitle] = useState('Loading...');
  const [loading, setLoading] = useState(true);
  const [masteredCount, setMasteredCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Get flashcards
        const { data: flashcardsData, error: flashcardsError } = await supabase
          .from('flashcards')
          .select('*')
          .eq('set_id', resolvedParams.id)
          .order('order_index');
        
        if (flashcardsError) throw flashcardsError;
        
        // Get set title
        const { data: setData, error: setError } = await supabase
          .from('flashcard_sets')
          .select('title')
          .eq('id', resolvedParams.id)
          .eq('user_id', session.user.id)
          .single();
        
        if (setError) throw setError;
        
        const cardsWithStatus = (flashcardsData || []).map(card => ({
          ...card,
          status: 'new' as const
        }));
        setFlashcards(cardsWithStatus);
        setDeckTitle(setData?.title || 'Flashcard Set');
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcards();
  }, [resolvedParams.id]);

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentFlashcard = flashcards[currentCard];
    const newStatus = direction === 'left' ? 'mastered' : 'review';
    
    setSlideDirection(direction);
    setIsSliding(true);
    
    setTimeout(() => {
      const updatedCards = [...flashcards];
      updatedCards[currentCard] = { ...currentFlashcard, status: newStatus };
      
      const cardToMove = updatedCards.splice(currentCard, 1)[0];
      updatedCards.push(cardToMove);
      
      setFlashcards(updatedCards);
      
      if (newStatus === 'mastered') {
        setMasteredCount(prev => prev + 1);
      } else {
        setReviewCount(prev => prev + 1);
      }
      
      if (currentCard >= updatedCards.length) {
        setCurrentCard(0);
      }
      
      setShowAnswer(false);
      setIsSliding(false);
    }, 300);
  };

  const startConnect4 = () => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/connect4/${roomCode}?deck=${resolvedParams.id}`);
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

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">{flashcards.length}</div>
            <div className="text-sm text-gray-500">Total Cards</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="text-2xl font-bold text-green-600">{masteredCount}</div>
            <div className="text-sm text-gray-500">Mastered</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="text-2xl font-bold text-orange-600">{reviewCount}</div>
            <div className="text-sm text-gray-500">Need Review</div>
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
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-8 min-h-64 flex items-center justify-center cursor-pointer transition-all duration-500 hover:shadow-md"
                onClick={() => setShowAnswer(!showAnswer)}
                style={{
                  transform: `${showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)'} ${isSliding ? `translateX(${slideDirection === 'left' ? '-100%' : '100%'})` : 'translateX(0)'}`,
                  transformStyle: 'preserve-3d',
                  opacity: isSliding ? 0 : 1
                }}
              >
                <div 
                  className="text-center"
                  style={{
                    transform: showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
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
                <ChevronLeft size={18} />
                <span>Need Review</span>
              </button>
              <button 
                onClick={() => handleSwipe('left')}
                className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white rounded-lg hover:from-green-500 hover:to-green-600 transition-all duration-200 flex items-center space-x-2"
              >
                <span>Got It!</span>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
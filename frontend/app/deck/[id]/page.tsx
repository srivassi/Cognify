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
        
        // Update last_studied timestamp
        await supabase
          .from('flashcard_sets')
          .update({ last_studied: new Date().toISOString() })
          .eq('id', resolvedParams.id)
          .eq('user_id', session.user.id);
      } catch (error) {
        setDeckTitle('Error loading deck');
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
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => router.push('/')}
            className="mr-4 p-2 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-purple-600" />
          </button>
          <h1 className="text-2xl font-bold text-blue-800 uppercase">{deckTitle}</h1>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white pixel-button flex items-center justify-center space-x-2 text-sm">
            <Edit size={16} />
            <span>EDIT</span>
          </button>
          <button 
            onClick={startJeopardy}
            className="px-6 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white pixel-button flex items-center justify-center space-x-2 text-sm"
          >
            <Gamepad2 size={16} />
            <span>JEOPARDY</span>
          </button>
          <button 
            onClick={startConnect4}
            className="px-6 py-3 bg-gradient-to-r from-pink-400 to-purple-500 text-white pixel-button flex items-center justify-center space-x-2 text-sm"
          >
            <Grid3x3 size={16} />
            <span>CONNECT4</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="pixel-card p-4">
            <div className="text-xl font-bold text-purple-600">{flashcards.length}</div>
            <div className="text-xs text-gray-500 uppercase">TOTAL CARDS</div>
          </div>
          <div className="pixel-card p-4">
            <div className="text-xl font-bold text-green-600">{masteredCount}</div>
            <div className="text-xs text-gray-500 uppercase">MASTERED</div>
          </div>
          <div className="pixel-card p-4">
            <div className="text-xl font-bold text-orange-600">{reviewCount}</div>
            <div className="text-xs text-gray-500 uppercase">NEED REVIEW</div>
          </div>
        </div>

        <div className="pixel-card p-8 min-h-96">
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
                <span className="text-xs text-gray-500 uppercase">CARD {currentCard + 1} OF {flashcards.length}</span>
              </div>
              
              <div 
                className="bg-gradient-to-br from-purple-50 to-pink-50 pixel-card p-8 min-h-64 flex items-center justify-center cursor-pointer"
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
                  <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase">
                    {showAnswer ? 'ANSWER:' : 'QUESTION:'}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {showAnswer ? flashcards[currentCard]?.answer : flashcards[currentCard]?.question}
                  </p>
                  {!showAnswer && (
                    <p className="text-xs text-gray-500 mt-4 uppercase">CLICK TO REVEAL ANSWER</p>
                  )}
                </div>
              </div>
            </>
          )}

          {showAnswer && (
            <div className="flex justify-center space-x-4 mt-6">
              <button 
                onClick={() => handleSwipe('right')}
                className="px-6 py-3 bg-gradient-to-r from-orange-400 to-red-400 text-white pixel-button flex items-center space-x-2 text-sm"
              >
                <ChevronLeft size={16} />
                <span>NEED REVIEW</span>
              </button>
              <button 
                onClick={() => handleSwipe('left')}
                className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white pixel-button flex items-center space-x-2 text-sm"
              >
                <span>GOT IT!</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
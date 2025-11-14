'use client';

import React, { useState } from 'react';
import { ArrowLeft, Edit, Gamepad2, Grid3x3, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
}

interface SetStats {
  reviewed: number;
  mastered: number;
  needsReview: number;
  accuracy: number;
}

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Mock data
  const mockFlashcards: Flashcard[] = [
    { id: 1, question: 'What is a Binary Search Tree?', answer: 'A binary tree where left child < parent < right child' },
    { id: 2, question: 'What is Big O notation?', answer: 'Mathematical notation describing algorithm complexity' },
    { id: 3, question: 'What is a Hash Table?', answer: 'Data structure using hash function to map keys to values' },
  ];

  const mockStats: SetStats = {
    reviewed: 18,
    mastered: 12,
    needsReview: 6,
    accuracy: 85
  };

  const deckTitle = 'Data Structures';

  const handleSwipe = (direction: 'left' | 'right') => {
    setCurrentCard((prev) => (prev + 1) % mockFlashcards.length);
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

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">{mockStats.reviewed}</div>
            <div className="text-sm text-gray-500">Reviewed</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="text-2xl font-bold text-green-600">{mockStats.mastered}</div>
            <div className="text-sm text-gray-500">Mastered</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="text-2xl font-bold text-orange-600">{mockStats.needsReview}</div>
            <div className="text-sm text-gray-500">Need Review</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-100">
            <div className="text-2xl font-bold text-blue-600">{mockStats.accuracy}%</div>
            <div className="text-sm text-gray-500">Accuracy</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 min-h-96">
          <div className="text-center mb-6">
            <span className="text-sm text-gray-500">Card {currentCard + 1} of {mockFlashcards.length}</span>
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
                {showAnswer ? mockFlashcards[currentCard]?.answer : mockFlashcards[currentCard]?.question}
              </p>
              {!showAnswer && (
                <p className="text-sm text-gray-500 mt-4">Click to reveal answer</p>
              )}
            </div>
          </div>

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
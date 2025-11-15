'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface JeopardyCard {
  id: number;
  question: string;
  answer: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  answered: boolean;
}

export default function JeopardyPage({ params }: { params: Promise<{ deck: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [currentScore, setCurrentScore] = useState(0);
  const [selectedJeopardyCard, setSelectedJeopardyCard] = useState<JeopardyCard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [highScore, setHighScore] = useState(1250);

  const topics = ['Data Structures', 'Algorithms', 'Web Dev'];
  const difficulties = ['Easy', 'Medium', 'Hard'];
  
  const jeopardyCards: JeopardyCard[] = [
    // Easy row - all 100 points
    { id: 1, question: 'What is a Binary Search Tree?', answer: 'A binary tree where left child < parent < right child', points: 100, difficulty: 'easy', answered: false },
    { id: 2, question: 'What is Big O notation?', answer: 'Mathematical notation describing algorithm complexity', points: 100, difficulty: 'easy', answered: false },
    { id: 3, question: 'What is HTML?', answer: 'HyperText Markup Language for web pages', points: 100, difficulty: 'easy', answered: false },
    // Medium row - all 300 points
    { id: 4, question: 'What is a Hash Table?', answer: 'Data structure using hash function to map keys to values', points: 300, difficulty: 'medium', answered: false },
    { id: 5, question: 'What is dynamic programming?', answer: 'Optimization technique using memoization', points: 300, difficulty: 'medium', answered: false },
    { id: 6, question: 'What is React?', answer: 'JavaScript library for building user interfaces', points: 300, difficulty: 'medium', answered: false },
    // Hard row - all 500 points
    { id: 7, question: 'What is a Red-Black Tree?', answer: 'Self-balancing binary search tree', points: 500, difficulty: 'hard', answered: false },
    { id: 8, question: 'What is NP-completeness?', answer: 'Class of computational decision problems', points: 500, difficulty: 'hard', answered: false },
    { id: 9, question: 'What is GraphQL?', answer: 'Query language for APIs and runtime for queries', points: 500, difficulty: 'hard', answered: false },
  ];

  const handleAnswer = (correct: boolean) => {
    if (selectedJeopardyCard && correct) {
      setCurrentScore(prev => prev + selectedJeopardyCard.points);
      if (currentScore + selectedJeopardyCard.points > highScore) {
        setHighScore(currentScore + selectedJeopardyCard.points);
      }
    }
    setSelectedJeopardyCard(null);
    setShowAnswer(false);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => router.push(`/deck/${resolvedParams.deck}`)}
              className="mr-4 p-2 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-purple-600" />
            </button>
            <h1 className="text-2xl font-bold text-blue-800 uppercase">JEOPARDY GAME</h1>
          </div>
          <div className="flex space-x-8">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase">HIGH SCORE</div>
              <div className="text-xl font-bold text-purple-600">{highScore}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase">CURRENT SCORE</div>
              <div className="text-xl font-bold text-pink-600">{currentScore}</div>
            </div>
          </div>
        </div>

        {selectedJeopardyCard ? (
          <div className="pixel-card p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="text-sm font-bold text-purple-600 mb-4 uppercase">
                {selectedJeopardyCard.points} POINTS - {selectedJeopardyCard.difficulty.toUpperCase()}
              </div>
              
              <div 
                className="bg-gradient-to-br from-purple-50 to-pink-50 pixel-card p-8 min-h-64 flex items-center justify-center cursor-pointer mb-6"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 uppercase">
                    {showAnswer ? 'ANSWER:' : 'QUESTION:'}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {showAnswer ? selectedJeopardyCard.answer : selectedJeopardyCard.question}
                  </p>
                  {!showAnswer && (
                    <p className="text-xs text-gray-500 mt-4 uppercase">CLICK TO REVEAL ANSWER</p>
                  )}
                </div>
              </div>

              {showAnswer && (
                <div className="flex justify-center space-x-4">
                  <button 
                    onClick={() => handleAnswer(true)}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white pixel-button text-sm"
                  >
                    CORRECT (+{selectedJeopardyCard.points})
                  </button>
                  <button 
                    onClick={() => handleAnswer(false)}
                    className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white pixel-button text-sm"
                  >
                    INCORRECT
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header row with topics */}
            <div className="grid grid-cols-4 gap-4">
              <div></div> {/* Empty corner */}
              {topics.map(topic => (
                <h3 key={topic} className="text-lg font-bold text-center text-blue-800 py-4 uppercase">
                  {topic}
                </h3>
              ))}
            </div>
            
            {/* Rows with difficulty labels and cards */}
            {difficulties.map((difficulty, diffIndex) => (
              <div key={difficulty} className="grid grid-cols-4 gap-4">
                {/* Difficulty label */}
                <div className="flex items-center justify-center">
                  <h3 className="text-sm font-bold text-blue-800 uppercase">
                    {difficulty}
                  </h3>
                </div>
                
                {/* Cards for each topic */}
                {topics.map((topic, topicIndex) => {
                  const cardIndex = diffIndex * 3 + topicIndex;
                  const card = jeopardyCards[cardIndex];
                  
                  if (!card) return <div key={topic} />;
                  
                  return (
                    <button
                      key={card.id}
                      onClick={() => setSelectedJeopardyCard(card)}
                      disabled={card.answered}
                      className={`h-24 pixel-button font-bold text-white text-sm ${
                        card.answered
                          ? 'bg-gray-400 cursor-not-allowed'
                          : difficulty === 'Easy'
                          ? 'bg-gradient-to-br from-green-400 to-green-500'
                          : difficulty === 'Medium'
                          ? 'bg-gradient-to-br from-purple-400 to-purple-500'
                          : 'bg-gradient-to-br from-pink-500 to-pink-600'
                      }`}
                    >
                      {card.answered ? 'ANSWERED' : `${card.points} PTS`}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
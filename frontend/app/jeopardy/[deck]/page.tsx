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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => router.push(`/deck/${resolvedParams.deck}`)}
              className="mr-4 p-2 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-purple-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Jeopardy Game</h1>
          </div>
          <div className="flex space-x-8">
            <div className="text-center">
              <div className="text-sm text-gray-500">High Score</div>
              <div className="text-2xl font-bold text-purple-600">{highScore}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Current Score</div>
              <div className="text-2xl font-bold text-pink-600">{currentScore}</div>
            </div>
          </div>
        </div>

        {selectedJeopardyCard ? (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="text-lg font-semibold text-purple-600 mb-4">
                {selectedJeopardyCard.points} Points - {selectedJeopardyCard.difficulty.toUpperCase()}
              </div>
              
              <div 
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-8 min-h-64 flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-md mb-6"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {showAnswer ? 'Answer:' : 'Question:'}
                  </h3>
                  <p className="text-lg text-gray-700">
                    {showAnswer ? selectedJeopardyCard.answer : selectedJeopardyCard.question}
                  </p>
                  {!showAnswer && (
                    <p className="text-sm text-gray-500 mt-4">Click to reveal answer</p>
                  )}
                </div>
              </div>

              {showAnswer && (
                <div className="flex justify-center space-x-4">
                  <button 
                    onClick={() => handleAnswer(true)}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-semibold"
                  >
                    Correct (+{selectedJeopardyCard.points})
                  </button>
                  <button 
                    onClick={() => handleAnswer(false)}
                    className="px-8 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-semibold"
                  >
                    Incorrect
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
                <h3 key={topic} className="text-xl font-bold text-center text-gray-800 py-4">
                  {topic}
                </h3>
              ))}
            </div>
            
            {/* Rows with difficulty labels and cards */}
            {difficulties.map((difficulty, diffIndex) => (
              <div key={difficulty} className="grid grid-cols-4 gap-4">
                {/* Difficulty label */}
                <div className="flex items-center justify-center">
                  <h3 className="text-lg font-bold text-gray-800 transform -rotate-0">
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
                      className={`h-24 rounded-lg font-bold text-white text-xl transition-all duration-200 ${
                        card.answered
                          ? 'bg-gray-400 cursor-not-allowed'
                          : difficulty === 'Easy'
                          ? 'bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 shadow-md hover:shadow-lg'
                          : difficulty === 'Medium'
                          ? 'bg-gradient-to-br from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 shadow-md hover:shadow-lg'
                          : 'bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 shadow-md hover:shadow-lg'
                      }`}
                    >
                      {card.answered ? 'ANSWERED' : `${card.points} pts`}
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
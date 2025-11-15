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
  correct?: boolean;
}

export default function JeopardyPage({ params }: { params: Promise<{ deck: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [currentScore, setCurrentScore] = useState(0);
  const [selectedJeopardyCard, setSelectedJeopardyCard] = useState<JeopardyCard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [highScore, setHighScore] = useState(1250);
  const initialCards: JeopardyCard[] = [
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

  const [cards, setCards] = useState(initialCards);
  const [scoreAnimation, setScoreAnimation] = useState<{show: boolean, points: number, correct: boolean}>({show: false, points: 0, correct: false});

  const topics = ['Data Structures', 'Algorithms', 'Web Dev'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  const handleAnswer = (correct: boolean) => {
    if (selectedJeopardyCard) {
      const points = correct ? selectedJeopardyCard.points : -selectedJeopardyCard.points;
      setCurrentScore(prev => {
        const newScore = prev + points;
        if (newScore > highScore) {
          setHighScore(newScore);
        }
        return newScore;
      });
      
      // Mark card as answered
      setCards(prev => prev.map(card => 
        card.id === selectedJeopardyCard.id ? {...card, answered: true, correct} : card
      ));
      
      // Show score animation
      setScoreAnimation({show: true, points: Math.abs(points), correct});
      
      setTimeout(() => {
        setScoreAnimation({show: false, points: 0, correct: false});
        setSelectedJeopardyCard(null);
        setShowAnswer(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-6xl mx-auto p-8 flex-1 flex flex-col">
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

        {selectedJeopardyCard && (
          <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
            <div className="pixel-card p-6 max-w-2xl w-full mx-8 pointer-events-auto">
              <div className="text-center mb-6">
                <div className="text-lg font-bold text-purple-600 mb-4 uppercase">
                  {selectedJeopardyCard.points} POINTS - {selectedJeopardyCard.difficulty.toUpperCase()}
                </div>
                
                <div 
                  className="bg-gradient-to-br from-purple-50 to-pink-50 pixel-card p-8 min-h-48 flex items-center justify-center cursor-pointer mb-6"
                  onClick={() => setShowAnswer(!showAnswer)}
                >
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 uppercase">
                      {showAnswer ? 'ANSWER:' : 'QUESTION:'}
                    </h3>
                    <p className="text-base text-gray-700 leading-relaxed">
                      {showAnswer ? selectedJeopardyCard.answer : selectedJeopardyCard.question}
                    </p>
                    {!showAnswer && (
                      <p className="text-sm text-gray-500 mt-4 uppercase">CLICK TO REVEAL ANSWER</p>
                    )}
                  </div>
                </div>

                {showAnswer && (
                  <div className="flex justify-center space-x-4">
                    <button 
                      onClick={() => handleAnswer(true)}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white pixel-button text-sm"
                    >
                      CORRECT (+{selectedJeopardyCard.points})
                    </button>
                    <button 
                      onClick={() => handleAnswer(false)}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white pixel-button text-sm"
                    >
                      INCORRECT
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className={selectedJeopardyCard ? 'opacity-30' : ''}>
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-8 w-full max-w-7xl px-2" style={{marginLeft: '-8rem'}}>
              {/* Header row with topics */}
              <div className="grid grid-cols-4" style={{gap: '8rem'}}>
                <div></div> {/* Empty corner */}
                {topics.map(topic => (
                  <h3 key={topic} className="text-lg font-bold text-center text-blue-800 py-4 uppercase">
                    {topic}
                  </h3>
                ))}
              </div>
              
              {/* Rows with difficulty labels and cards */}
              {difficulties.map((difficulty, diffIndex) => (
                <div key={difficulty} className="grid grid-cols-4" style={{gap: '8rem'}}>
                  {/* Difficulty label */}
                  <div className="flex items-center justify-center">
                    <h3 className="text-sm font-bold text-blue-800 uppercase">
                      {difficulty}
                    </h3>
                  </div>
                  
                  {/* Cards for each topic */}
                  {topics.map((topic, topicIndex) => {
                    const cardIndex = diffIndex * 3 + topicIndex;
                    const card = cards[cardIndex];
                    
                    if (!card) return <div key={topic} />;
                    
                    return (
                      <button
                        key={card.id}
                        onClick={() => setSelectedJeopardyCard(card)}
                        disabled={card.answered}
                        className={`h-36 w-52 pixel-button font-bold text-base jeopardy-card ${
                          card.answered
                            ? 'cursor-not-allowed answered'
                            : difficulty === 'Easy'
                            ? 'bg-gradient-to-br from-green-500 to-green-600'
                            : difficulty === 'Medium'
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                            : 'bg-gradient-to-br from-pink-600 to-pink-700'
                        }`}
                        style={card.answered ? {
                          background: card.correct 
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        } : {}}
                      >
                        <span className={card.answered ? 'text-white' : 'text-pink-800'}>
                          {card.answered ? 'ANSWERED' : `${card.points} PTS`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Score Animation Overlay */}
        {scoreAnimation.show && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className={`text-6xl font-bold score-animation ${
              scoreAnimation.correct ? 'text-green-500' : 'text-red-500'
            }`}>
              {scoreAnimation.correct ? '+' : '-'}{scoreAnimation.points}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
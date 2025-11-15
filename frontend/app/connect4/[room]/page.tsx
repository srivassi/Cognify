'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Connect4Page({ params }: { params: Promise<{ room: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const [players, setPlayers] = useState<string[]>(['You (Host)']);
  const [gameCode] = useState(resolvedParams.room);
  const [gameStarted, setGameStarted] = useState(false);
  const [board, setBoard] = useState(Array(6).fill(null).map(() => Array(7).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [timer, setTimer] = useState(30);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{text: string, type: 'correct' | 'incorrect' | 'improvement'}[]>([]);

  const generateNewCode = () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/connect4/${newCode}`);
  };

  const currentQuestion = "What is a Binary Search Tree and how does it maintain its ordering property?";

  const startGame = () => {
    setGameStarted(true);
    setTimer(30);
  };

  const submitAnswer = () => {
    // Mock AI analysis
    const words = userAnswer.split(' ');
    const mockAnalysis = words.map((word, index) => {
      if (word.toLowerCase().includes('binary') || word.toLowerCase().includes('tree')) {
        return { text: word, type: 'correct' as const };
      } else if (word.toLowerCase().includes('wrong') || word.toLowerCase().includes('bad')) {
        return { text: word, type: 'incorrect' as const };
      } else if (index % 3 === 0) {
        return { text: word, type: 'improvement' as const };
      }
      return { text: word, type: 'correct' as const };
    });
    
    setAnalysisResult(mockAnalysis);
    setShowAnalysis(true);
  };

  const dropCoin = (col: number) => {
    if (!gameStarted) return;
    
    const newBoard = [...board];
    for (let row = 5; row >= 0; row--) {
      if (!newBoard[row][col]) {
        newBoard[row][col] = currentPlayer;
        setBoard(newBoard);
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
        break;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => router.push('/')}
              className="mr-4 p-2 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-purple-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-800">
              {gameStarted ? 'Connect4 Game' : 'Connect4 Waiting Room'}
            </h1>
          </div>
          
          {gameStarted && (
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-sm text-gray-500">Timer</div>
                <div className="text-2xl font-bold text-red-600">{timer}s</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">You are</div>
                <div className="text-lg font-bold text-purple-600">Player {currentPlayer}</div>
              </div>
            </div>
          )}
        </div>

        {gameStarted ? (
          <div className="space-y-8">
            {/* Question */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">{currentQuestion}</h2>
            </div>

            {/* Game Board with Coin Poles */}
            <div className="flex items-center justify-center space-x-8">
              {/* Left Coin Pole - Purple */}
              <div className="flex flex-col items-center">
                <div className="w-4 h-64 bg-gray-600 rounded-full relative">
                  {Array.from({length: 5}).map((_, i) => (
                    <div key={i} className={`absolute w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg`} 
                         style={{left: '-8px', top: `${i * 12}px`}} />
                  ))}
                </div>
                <div className="text-sm font-semibold text-purple-600 mt-2">Player 1</div>
              </div>

              {/* Connect4 Board */}
              <div className="bg-blue-600 p-4 rounded-lg shadow-2xl">
                <div className="grid grid-cols-7 gap-2">
                  {board.map((row, rowIndex) => 
                    row.map((cell, colIndex) => (
                      <div 
                        key={`${rowIndex}-${colIndex}`}
                        onClick={() => dropCoin(colIndex)}
                        className="w-12 h-12 bg-white rounded-full shadow-inner cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-center"
                      >
                        {cell && (
                          <div className={`w-10 h-10 rounded-full shadow-lg ${
                            cell === 1 
                              ? 'bg-gradient-to-br from-purple-400 to-purple-600' 
                              : 'bg-gradient-to-br from-pink-400 to-pink-600'
                          }`} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Coin Pole - Pink */}
              <div className="flex flex-col items-center">
                <div className="w-4 h-64 bg-gray-600 rounded-full relative">
                  {Array.from({length: 5}).map((_, i) => (
                    <div key={i} className={`absolute w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg`} 
                         style={{left: '-8px', top: `${i * 12}px`}} />
                  ))}
                </div>
                <div className="text-sm font-semibold text-pink-600 mt-2">Player 2</div>
              </div>
            </div>

            {/* Answer Input */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-6">
                {!showAnalysis ? (
                  <div className="space-y-4">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full h-32 p-4 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-400 resize-none text-gray-900"
                    />
                    <button 
                      onClick={submitAnswer}
                      disabled={!userAnswer.trim()}
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Answer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">AI Analysis:</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      {analysisResult.map((item, index) => (
                        <span 
                          key={index}
                          className={`mr-1 px-1 rounded ${
                            item.type === 'correct' ? 'bg-green-200 text-green-800' :
                            item.type === 'incorrect' ? 'bg-red-200 text-red-800' :
                            'bg-orange-200 text-orange-800'
                          }`}
                        >
                          {item.text}
                        </span>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        setShowAnalysis(false);
                        setUserAnswer('');
                        dropCoin(Math.floor(Math.random() * 7));
                      }}
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold"
                    >
                      Continue Game
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Game Code</h2>
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 tracking-widest mb-2">
                  {gameCode}
                </div>
                <p className="text-sm text-gray-600">Share this code with friends to join</p>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <button 
                onClick={generateNewCode}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium"
              >
                Generate New Code
              </button>
              
              <div className="text-sm text-gray-500">
                Players can join at: <span className="font-mono bg-gray-100 px-2 py-1 rounded">flashlearn.com/join</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              Players ({players.length}/4)
            </h2>
            
            <div className="space-y-3 mb-6">
              {players.map((player, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-purple-500' : 'bg-pink-500'
                    }`}>
                      {player.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{player}</span>
                  </div>
                  {index === 0 && (
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-medium">
                      HOST
                    </span>
                  )}
                </div>
              ))}
              
              {Array.from({ length: 4 - players.length }).map((_, index) => (
                <div 
                  key={`empty-${index}`}
                  className="flex items-center p-3 border-2 border-dashed border-gray-200 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                    <span className="text-gray-400 text-sm">?</span>
                  </div>
                  <span className="text-gray-400 italic">Waiting for player...</span>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button 
                onClick={startGame}
                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 font-semibold"
              >
                Start Game
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Ready to start! (Single player mode for testing)
              </p>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">How to Play Connect4 with Flashcards:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Players take turns answering flashcard questions</li>
              <li>• Correct answers let you drop a piece in Connect4</li>
              <li>• First to get 4 in a row (horizontal, vertical, or diagonal) wins!</li>
              <li>• Wrong answers give the turn to the next player</li>
            </ul>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';

export default function Connect4Loader() {
  const [droppedCoins, setDroppedCoins] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDroppedCoins(prev => {
        const newCoin = Math.floor(Math.random() * 7); // 7 columns
        return [...prev, newCoin].slice(-21); // Keep max 21 coins (3 rows * 7 columns)
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const getCoinColor = (index: number) => {
    return index % 2 === 0 ? 'purple' : 'pink';
  };

  const getCoinPosition = (coinIndex: number, totalCoins: number) => {
    const column = droppedCoins[coinIndex];
    const coinsInColumn = droppedCoins.slice(0, coinIndex + 1).filter(c => c === column).length;
    const row = Math.min(coinsInColumn - 1, 5); // Max 6 rows (0-5)
    return { column, row };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Generating Flashcards
          </h2>
          <p className="text-gray-600 text-lg">Please wait while we process your content...</p>
        </div>

        {/* Connect4 Board */}
        <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 shadow-2xl">
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 42 }, (_, i) => {
              const column = i % 7;
              const row = Math.floor(i / 7);
              
              // Find if there's a coin in this position
              const coinInPosition = droppedCoins.findIndex((coinColumn, coinIndex) => {
                const pos = getCoinPosition(coinIndex, droppedCoins.length);
                return pos.column === column && pos.row === (5 - row); // Flip row for display
              });

              return (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full border-4 border-blue-800 bg-gradient-to-br from-blue-100 to-blue-200 shadow-inner relative overflow-hidden"
                >
                  {coinInPosition !== -1 && (
                    <div
                      className={`absolute inset-1 rounded-full shadow-lg coin-drop ${
                        getCoinColor(coinInPosition) === 'purple'
                          ? 'bg-gradient-to-br from-purple-400 to-purple-600'
                          : 'bg-gradient-to-br from-pink-400 to-pink-600'
                      }`}
                      style={{
                        animationDelay: `${coinInPosition * 0.1}s`,
                        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 8px rgba(0,0,0,0.2)'
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Board holes shadow effect */}
          <div className="absolute inset-6 grid grid-cols-7 gap-3 pointer-events-none">
            {Array.from({ length: 42 }, (_, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-full"
                style={{
                  boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.3)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex justify-center space-x-2 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full coin-bounce ${
                i % 2 === 0 
                  ? 'bg-gradient-to-br from-purple-400 to-purple-600' 
                  : 'bg-gradient-to-br from-pink-400 to-pink-600'
              }`}
              style={{
                animationDelay: `${i * 0.2}s`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
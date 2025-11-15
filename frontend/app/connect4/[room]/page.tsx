'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Copy, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Player {
  id: string;
  user_id: string;
  player_number: number;
  email?: string;
}

interface Room {
  id: string;
  room_code: string;
  host_user_id: string;
  status: string;
  deck_id?: number;
}

interface Connect4PageProps {
  params: Promise<{ room: string }>;
}

export default function Connect4Page({ params }: Connect4PageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ room: string } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [deckName, setDeckName] = useState<string>('');
  const [board, setBoard] = useState(Array(6).fill(null).map(() => Array(7).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [timer, setTimer] = useState(30);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{text: string, type: 'correct' | 'incorrect' | 'improvement'}[]>([]);
  
  const gameCode = resolvedParams?.room || '';
  
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (gameCode) {
      initializeRoom();
    }
  }, [gameCode]);

  useEffect(() => {
    if (!room) return;

    loadPlayers();

    // Subscribe to player changes
    const playersSubscription = supabase
      .channel(`room-${room.id}-players`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'connect4_players', filter: `room_id=eq.${room.id}` },
        (payload) => {
          console.log('Player change detected:', payload);
          if (payload.eventType === 'DELETE') {
            // Player left - reload players to update UI
            loadPlayers();
            // If game was in progress and a player left, end the game
            if (gameStarted) {
              alert('A player has left the game. Returning to home.');
              router.push('/');
            }
          } else {
            loadPlayers();
          }
        }
      )
      .on('broadcast', { event: 'player_joined' }, (payload) => {
        console.log('Player joined broadcast received:', payload);
        loadPlayers();
      })
      .on('broadcast', { event: 'player_left' }, (payload) => {
        console.log('Player left broadcast received:', payload);
        loadPlayers();
        if (gameStarted) {
          alert('A player has left the game. Returning to home.');
          router.push('/');
        }
      })
      .subscribe((status) => {
        console.log('Players subscription status:', status);
      });

    // Subscribe to room changes
    const roomSubscription = supabase
      .channel(`room-${room.id}-status`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'connect4_rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          console.log('Room status changed:', payload.new);
          if (payload.new.status === 'playing') {
            setGameStarted(true);
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      console.log('Cleaning up subscriptions');
      playersSubscription.unsubscribe();
      roomSubscription.unsubscribe();
    };
  }, [room, gameStarted]);

  // Cleanup when component unmounts
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (room && hasJoined) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await leaveRoom();
        }
      }
    };

    const handleRouteChange = () => {
      if (room && hasJoined) {
        leaveRoom();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleRouteChange();
    };
  }, [room, hasJoined]);

  if (!resolvedParams) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  const initializeRoom = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      console.log('User ID:', session.user.id);
      console.log('Game Code:', gameCode);

      // Check if room exists (use maybeSingle to avoid error on no results)
      const { data: existingRoom, error: roomError } = await supabase
        .from('connect4_rooms')
        .select('*')
        .eq('room_code', gameCode)
        .maybeSingle();

      if (roomError) {
        console.error('Error checking for room:', roomError);
        return;
      }

      if (existingRoom) {
        console.log('Found existing room:', existingRoom);
        setRoom(existingRoom);
        setIsHost(existingRoom.host_user_id === session.user.id);
        
        // Load deck name if deck_id exists
        if (existingRoom.deck_id) {
          console.log('Loading deck for deck_id:', existingRoom.deck_id);
          const { data: deckData, error: deckError } = await supabase
            .from('flashcard_sets')
            .select('title')
            .eq('id', existingRoom.deck_id)
            .single();
          
          if (deckError) {
            console.error('Error loading deck:', deckError);
            setDeckName(`Flashcard Set ${existingRoom.deck_id}`);
          } else if (deckData) {
            console.log('Loaded deck name:', deckData.title);
            setDeckName(deckData.title);
          }
        } else {
          setDeckName(`Room ${gameCode}`);
        }
        
        // Check if user is already in the room
        const { data: existingPlayer } = await supabase
          .from('connect4_players')
          .select('*')
          .eq('room_id', existingRoom.id)
          .eq('user_id', session.user.id)
          .single();
        
        if (existingPlayer) {
          setHasJoined(true);
        }
      } else {
        console.log('Room not found, creating new room');
        await createRoom(session.user.id);
      }
    } catch (error) {
      console.error('Error initializing room:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (userId: string) => {
    try {
      // Check one more time if room exists (race condition protection)
      const { data: existingRoom } = await supabase
        .from('connect4_rooms')
        .select('*')
        .eq('room_code', gameCode)
        .maybeSingle();

      if (existingRoom) {
        console.log('Room already exists, joining instead');
        setRoom(existingRoom);
        setIsHost(existingRoom.host_user_id === userId);
        await joinRoom(existingRoom.id, userId);
        return;
      }

      // Get deck ID from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const deckId = urlParams.get('deck');
      
      const { data: newRoom, error } = await supabase
        .from('connect4_rooms')
        .insert({
          room_code: gameCode,
          host_user_id: userId,
          status: 'waiting',
          deck_id: deckId ? parseInt(deckId) : null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating room:', error);
        // If duplicate key error, try to join existing room
        if (error.code === '23505') {
          const { data: existingRoom } = await supabase
            .from('connect4_rooms')
            .select('*')
            .eq('room_code', gameCode)
            .single();
          
          if (existingRoom) {
            setRoom(existingRoom);
            setIsHost(existingRoom.host_user_id === userId);
            await joinRoom(existingRoom.id, userId);
            return;
          }
        }
        throw error;
      }
      
      // Host is always Player 1
      const { error: playerError } = await supabase
        .from('connect4_players')
        .insert({
          room_id: newRoom.id,
          user_id: userId,
          player_number: 1
        });

      if (playerError) {
        console.error('Error adding host as player:', playerError);
      }

      setRoom(newRoom);
      setIsHost(true);
      setHasJoined(true);
      
      // Load deck name after creating room
      if (deckId) {
        console.log('Loading deck name for new room, deck_id:', deckId);
        const { data: deckData, error: deckError } = await supabase
          .from('flashcard_sets')
          .select('title')
          .eq('id', parseInt(deckId))
          .single();
        
        if (deckError) {
          console.error('Error loading deck for new room:', deckError);
          setDeckName(`Flashcard Set ${deckId}`);
        } else if (deckData) {
          console.log('Loaded deck name for new room:', deckData.title);
          setDeckName(deckData.title);
        }
      } else {
        setDeckName(`Room ${gameCode}`);
      }
      
      console.log('Room created successfully');
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const leaveRoom = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !room) return;

      console.log('Leaving room:', room.id);
      
      // Remove player from room
      const { error } = await supabase
        .from('connect4_players')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error leaving room:', error);
      } else {
        // Broadcast that player left
        await supabase
          .channel(`room-${room.id}-players`)
          .send({
            type: 'broadcast',
            event: 'player_left',
            payload: { user_id: session.user.id }
          });
      }
    } catch (error) {
      console.error('Error in leaveRoom:', error);
    }
  };

  const joinRoom = async (roomId: string, userId: string) => {
    try {
      console.log('Attempting to join room:', roomId, 'as user:', userId);
      
      // Check if user is already in the room
      const { data: existingPlayer, error: checkError } = await supabase
        .from('connect4_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing player:', checkError);
        return;
      }

      if (existingPlayer) {
        console.log('User already in room as player:', existingPlayer.player_number);
        return;
      }

      // Get current players to determine next player number
      const { data: players, error: playersError } = await supabase
        .from('connect4_players')
        .select('player_number')
        .eq('room_id', roomId)
        .order('player_number');

      if (playersError) {
        console.error('Error getting players:', playersError);
        return;
      }

      console.log('Current players:', players);

      // Determine player number
      let playerNumber = 1;
      if (players && players.length > 0) {
        const existingNumbers = players.map(p => p.player_number);
        if (existingNumbers.includes(1)) {
          playerNumber = 2;
        }
      }

      console.log('Assigning player number:', playerNumber);
      
      // Only join if there's space (max 2 players)
      if (!players || players.length < 2) {
        const { error } = await supabase
          .from('connect4_players')
          .insert({
            room_id: roomId,
            user_id: userId,
            player_number: playerNumber
          });

        if (error) {
          console.error('Error inserting player:', error);
        } else {
          console.log('Successfully joined as player', playerNumber);
          setHasJoined(true);
          // Immediately reload players after joining
          await loadPlayers();
          
          // Trigger reload on all other clients by sending a custom event
          const triggerChannel = supabase.channel(`room-${roomId}-players`);
          await triggerChannel.send({
            type: 'broadcast',
            event: 'player_joined',
            payload: { player_number: playerNumber }
          });
        }
      } else {
        console.log('Room is full, cannot join');
      }
    } catch (error) {
      console.error('Error in joinRoom:', error);
    }
  };

  const loadPlayers = async () => {
    if (!room) {
      console.log('No room available for loading players');
      return;
    }
    
    try {
      console.log('Loading players for room:', room.id);
      const { data: playersData, error } = await supabase
        .from('connect4_players')
        .select('*')
        .eq('room_id', room.id)
        .order('player_number');

      if (error) {
        console.error('Error loading players:', error);
        return;
      }

      console.log('Loaded players:', playersData);
      if (playersData) {
        setPlayers(playersData);
      }
    } catch (error) {
      console.error('Error in loadPlayers:', error);
    }
  };

  const generateNewCode = () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/connect4/${newCode}`);
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      // Simple feedback - could add a toast notification here
      const button = document.querySelector('.copy-button');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const currentQuestion = "What is a Binary Search Tree and how does it maintain its ordering property?";

  const startGame = async () => {
    if (!isHost || !room || players.length < 1) return;
    
    try {
      const { error: roomError } = await supabase
        .from('connect4_rooms')
        .update({ status: 'playing' })
        .eq('id', room.id);

      if (roomError) {
        console.error('Error updating room status:', roomError);
        return;
      }
      
      const { error: gameError } = await supabase
        .from('connect4_game_state')
        .insert({
          room_id: room.id,
          current_player: 1
        });

      if (gameError) {
        console.error('Error creating game state:', gameError);
        return;
      }
      
      setGameStarted(true);
      setTimer(30);
    } catch (error) {
      console.error('Error starting game:', error);
    }
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
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {gameStarted ? 'Connect4 Game' : 'Connect4 Waiting Room'}
              </h1>
              {deckName && (
                <p className="text-lg text-gray-600 mt-1">
                  Playing with: {deckName}
                </p>
              )}
              {/* Debug: show deckName state */}
              {console.log('Current deckName state:', deckName)}
            </div>
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
                <button 
                  onClick={copyRoomCode}
                  className="copy-button mt-2 px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm flex items-center space-x-1 mx-auto"
                >
                  <Copy size={14} />
                  <span>Copy Code</span>
                </button>
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <div className="text-sm text-gray-500">
                Share this URL: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs break-all">
                  {typeof window !== 'undefined' ? window.location.href : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6 flex items-center justify-center space-x-2">
              <Users size={24} />
              <span>Players ({players.length}/2)</span>
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading room...</div>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {players.map((player) => (
                    <div 
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          player.player_number === 1 ? 'bg-purple-500' : 'bg-pink-500'
                        }`}>
                          P{player.player_number}
                        </div>
                        <span className="font-medium text-gray-800">
                          Player {player.player_number}
                        </span>
                      </div>
                      {room?.host_user_id === player.user_id && (
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-medium">
                          HOST
                        </span>
                      )}
                    </div>
                  ))}
                  
                  {Array.from({ length: 2 - players.length }).map((_, index) => (
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
                  {isHost ? (
                    <button 
                      onClick={startGame}
                      disabled={players.length < 1}
                      className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Start Game
                    </button>
                  ) : hasJoined ? (
                    <div className="text-gray-500">
                      Waiting for host to start the game...
                    </div>
                  ) : (
                    <button 
                      onClick={async () => {
                        if (room) {
                          const { data: { session } } = await supabase.auth.getSession();
                          if (session) {
                            await joinRoom(room.id, session.user.id);
                            // Force reload players on both screens
                            await loadPlayers();
                          }
                        }
                      }}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-semibold"
                    >
                      Join Game
                    </button>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {players.length >= 2 ? 'Ready to start!' : `Need ${2 - players.length} more player(s)`}
                  </p>
                </div>
              </>
            )}
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
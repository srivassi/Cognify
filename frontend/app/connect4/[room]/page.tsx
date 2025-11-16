'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Copy, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { API_URL } from '@/lib/config';

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
  const [timer, setTimer] = useState(20);
  const [player1Answer, setPlayer1Answer] = useState('');
  const [player2Answer, setPlayer2Answer] = useState('');
  const [player1Submitted, setPlayer1Submitted] = useState(false);
  const [player2Submitted, setPlayer2Submitted] = useState(false);
  const [showScoring, setShowScoring] = useState(false);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<{question: string, answer: string} | null>(null);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [gameWinner, setGameWinner] = useState<number | null>(null);
  const [player1Analysis, setPlayer1Analysis] = useState<any[]>([]);
  const [player2Analysis, setPlayer2Analysis] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userPlayerNumber, setUserPlayerNumber] = useState<number | null>(null);
  const [waitingForCoinDrop, setWaitingForCoinDrop] = useState(false);
  const [canDropCoin, setCanDropCoin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const coinDropTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [roundWinner, setRoundWinner] = useState<number | null>(null);
  const [firstSubmitter, setFirstSubmitter] = useState<number | null>(null);

  
  const getWordColors = (userAnswer: string, correctAnswer: string) => {
    if (!userAnswer || !correctAnswer) return [];
    
    const userWords = userAnswer.toLowerCase().split(/\s+/);
    const correctWords = correctAnswer.toLowerCase().split(/\s+/);
    
    return userWords.map(word => {
      const isCorrect = correctWords.some(correctWord => 
        correctWord.includes(word) || word.includes(correctWord) || 
        Math.abs(correctWord.length - word.length) <= 2 && 
        correctWord.substring(0, Math.min(3, word.length)) === word.substring(0, Math.min(3, word.length))
      );
      return { word, isCorrect };
    });
  };
  
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

    const playersSubscription = supabase
      .channel(`room-${room.id}-players`);
    
    channelRef.current = playersSubscription;
    
    playersSubscription
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'connect4_players', filter: `room_id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            loadPlayers();
            if (gameStarted) {
              alert('A player has left the game. Returning to home.');
              router.push('/');
            }
          } else {
            loadPlayers();
          }
        }
      )
      .on('broadcast', { event: 'player_joined' }, () => {
        loadPlayers();
      })
      .on('broadcast', { event: 'player_left' }, () => {
        loadPlayers();
        if (gameStarted) {
          alert('A player has left the game. Returning to home.');
          router.push('/');
        }
      })
      .on('broadcast', { event: 'game_started' }, () => {
        setGameStarted(true);
      })
      .on('broadcast', { event: 'new_question' }, (payload) => {
        // COMPLETE CLEAN SLATE - No trace of previous question
        setCurrentQuestion(payload.payload.question);
        setQuestionIndex(payload.payload.index);
        setPlayer1Answer('');
        setPlayer2Answer('');
        setPlayer1Submitted(false);
        setPlayer2Submitted(false);
        setShowScoring(false);
        setRoundWinner(null);
        setIsSubmitting(false);
        setPlayer1Score(0);
        setPlayer2Score(0);
        setPlayer1Analysis([]);
        setPlayer2Analysis([]);
        setWaitingForCoinDrop(false);
        setCanDropCoin(false);
        setShowConfetti(false);
        setFirstSubmitter(null);
        setTimer(20);
        
        // Both host and non-host need to show timer reset
        if (isHost) {
          startTimer();
        } else {
          // Non-host just resets the visual timer, host controls the actual countdown
        }
      })
      .on('broadcast', { event: 'board_update' }, (payload) => {
        setBoard(payload.payload.board);
        if (payload.payload.winner) {
          setGameWinner(payload.payload.winner);
          setShowConfetti(true);
          // Auto redirect to dashboard after celebration
          setTimeout(() => {
            router.push('/');
          }, 4000);
        }
      })
      .on('broadcast', { event: 'scoring_update' }, (payload) => {        
        setIsSubmitting(false);
        setShowScoring(true);
        setPlayer1Score(payload.payload.player1Score);
        setPlayer2Score(payload.payload.player2Score);
        setPlayer1Analysis(payload.payload.player1Analysis);
        setPlayer2Analysis(payload.payload.player2Analysis);
        setRoundWinner(payload.payload.roundWinner);
        if (payload.payload.currentQuestion) {
          setCurrentQuestion(payload.payload.currentQuestion);
        }
      })
      .on('broadcast', { event: 'answer_update' }, (payload) => {
        if (payload.payload.player === 1) {
          setPlayer1Answer(payload.payload.answer);
        } else {
          setPlayer2Answer(payload.payload.answer);
        }
      })
      .on('broadcast', { event: 'submission_update' }, (payload) => {
        setPlayer1Submitted(payload.payload.player1);
        setPlayer2Submitted(payload.payload.player2);
      })
      .on('broadcast', { event: 'timer_sync' }, (payload) => {
        setTimer(payload.payload.timer);
      })
      .on('broadcast', { event: 'coin_drop' }, (payload) => {
        if (coinDropTimeoutRef.current) {
          clearTimeout(coinDropTimeoutRef.current);
          coinDropTimeoutRef.current = null;
        }

        if (isHost) {
          dropCoin(payload.payload.player, payload.payload.col);
        }
      })
      .on('broadcast', { event: 'coin_drop_wait' }, (payload) => {
        const w = payload.payload.winner;
        
        if (!w) {
          if (isHost) nextQuestion();
          return;
        }

        setRoundWinner(w);
        setShowScoring(false);
        setWaitingForCoinDrop(true);
        
        // Don't set canDropCoin here - let useEffect handle it when userPlayerNumber is ready
      })
      .on('broadcast', { event: 'timer_stop' }, () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      })
      .on('broadcast', { event: 'freeze_game' }, (payload) => {
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        setPlayer1Submitted(true);
        setPlayer2Submitted(true);
        setIsSubmitting(true);
        
        
        const questionData = payload.payload.question;
        if (isHost && questionData && !showScoring) {
          setTimeout(async () => {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/score-answers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  question: questionData.question,
                  correct_answer: questionData.answer,
                  player1_answer: payload.payload.player1Answer,
                  player2_answer: payload.payload.player2Answer
                })
              });
              
              const result = await response.json();
            
              let finalResult;
              if (result.status === 'success') {
                finalResult = result;
              } else {
                finalResult = {
                  player1_score: 60,
                  player2_score: 40,
                  player1_analysis: [{text: 'AI Error', type: 'error'}],
                  player2_analysis: [{text: 'AI Error', type: 'error'}]
                };
              }
              
              let winner = null;
              if (finalResult.player1_score > finalResult.player2_score) {
                winner = 1;
              } else if (finalResult.player2_score > finalResult.player1_score) {
                winner = 2;
              } else {
                winner = payload.payload.firstSubmitter || 1;
              }
              
           
              setIsSubmitting(false);
              setShowScoring(true);
              setPlayer1Score(finalResult.player1_score);
              setPlayer2Score(finalResult.player2_score);
              setPlayer1Analysis(finalResult.player1_analysis);
              setPlayer2Analysis(finalResult.player2_analysis);
              setRoundWinner(winner);
              setCurrentQuestion(questionData);
              
              const broadcastResult = await channelRef.current?.send({
                type: 'broadcast',
                event: 'scoring_update',
                payload: {
                  player1Score: finalResult.player1_score,
                  player2Score: finalResult.player2_score,
                  player1Analysis: finalResult.player1_analysis,
                  player2Analysis: finalResult.player2_analysis,
                  roundWinner: winner,
                  currentQuestion: questionData
                }
              });
              
              if (winner) {
                setTimeout(async () => {
                  
                  setRoundWinner(winner);
                  setShowScoring(false);
                  setWaitingForCoinDrop(true);
                  
                  await channelRef.current?.send({
                    type: 'broadcast',
                    event: 'coin_drop_wait',
                    payload: { winner }
                  });
                }, 3000);
              } else {
                setTimeout(() => {
                  if (isHost) nextQuestion();
                }, 3000);
              }
            } catch (error) {
              console.error('Scoring API failed:', error);
              try {
                await channelRef.current?.send({
                  type: 'broadcast',
                  event: 'scoring_update',
                  payload: {
                    player1Score: 50,
                    player2Score: 50,
                    player1Analysis: [{text: 'API Error', type: 'error'}],
                    player2Analysis: [{text: 'API Error', type: 'error'}],
                    roundWinner: null,
                    currentQuestion: currentQuestion
                  }
                });
              } catch (broadcastError) {
                console.error('Failed to send fallback broadcast:', broadcastError);
              }
            }
          }, 100);
        }
      })
      .on('broadcast', { event: 'coin_dropped' }, () => {
        setWaitingForCoinDrop(false);
        setCanDropCoin(false);

        if (coinDropTimeoutRef.current) {
          clearTimeout(coinDropTimeoutRef.current);
          coinDropTimeoutRef.current = null;
        }

        if (!isHost) {
        }
      })
      .subscribe();

    const roomSubscription = supabase
      .channel(`room-${room.id}-status`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'connect4_rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.new.status === 'playing') {
            setGameStarted(true);
          }
        }
      )
      .subscribe();

    return () => {
      playersSubscription.unsubscribe();
      roomSubscription.unsubscribe();
    };
  }, [room, gameStarted]);

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

  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        const player = players.find(p => p.user_id === session.user.id);
        if (player) {
          setUserPlayerNumber(player.player_number);
        }
      }
    };
    getUserInfo();
  }, [players]);

  // Ensure coin-drop eligibility updates when any relevant state changes
  useEffect(() => {
    if (!waitingForCoinDrop || roundWinner == null || userPlayerNumber == null) {
      setCanDropCoin(false);
      return;
    }
    const eligible = roundWinner === userPlayerNumber;
    setCanDropCoin(eligible);
  }, [userPlayerNumber, roundWinner, waitingForCoinDrop]);

  useEffect(() => {
    if (gameStarted) {
      loadFlashcards(isHost);
    }
  }, [gameStarted, room]);

  useEffect(() => {
    if (gameStarted && flashcards.length > 0) {
      startTimer();
    }
  }, [gameStarted, flashcards]);

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

      const { data: existingRoom, error: roomError } = await supabase
        .from('connect4_rooms')
        .select('*')
        .eq('room_code', gameCode)
        .maybeSingle();

      if (roomError) return;

      if (existingRoom) {
        setRoom(existingRoom);
        setIsHost(existingRoom.host_user_id === session.user.id);
        
        if (existingRoom.deck_id) {
          const { data: deckData } = await supabase
            .from('flashcard_sets')
            .select('title')
            .eq('id', existingRoom.deck_id)
            .single();
          
          setDeckName(deckData?.title || `Flashcard Set ${existingRoom.deck_id}`);
        } else {
          setDeckName(`Room ${gameCode}`);
        }
        
        const { data: existingPlayer } = await supabase
          .from('connect4_players')
          .select('*')
          .eq('room_id', existingRoom.id)
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (existingPlayer) {
          setHasJoined(true);
        } else {
          // Auto-join if room exists and user is not in it
          await joinRoom(existingRoom.id, session.user.id);
        }
      } else {
        await createRoom(session.user.id);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (userId: string) => {
    try {
      const { data: existingRoom } = await supabase
        .from('connect4_rooms')
        .select('*')
        .eq('room_code', gameCode)
        .maybeSingle();

      if (existingRoom) {
        setRoom(existingRoom);
        setIsHost(existingRoom.host_user_id === userId);
        await joinRoom(existingRoom.id, userId);
        return;
      }

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
      
      await supabase
        .from('connect4_players')
        .insert({
          room_id: newRoom.id,
          user_id: userId,
          player_number: 1
        });

      setRoom(newRoom);
      setIsHost(true);
      setHasJoined(true);
      
      if (deckId) {
        const { data: deckData } = await supabase
          .from('flashcard_sets')
          .select('title')
          .eq('id', parseInt(deckId))
          .single();
        
        setDeckName(deckData?.title || `Flashcard Set ${deckId}`);
      } else {
        setDeckName(`Room ${gameCode}`);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const leaveRoom = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !room) return;
      
      await supabase
        .from('connect4_players')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', session.user.id);

      await supabase
        .channel(`room-${room.id}-players`)
        .send({
          type: 'broadcast',
          event: 'player_left',
          payload: { user_id: session.user.id }
        });
    } catch (error) {
      // Handle error silently
    }
  };

  const joinRoom = async (roomId: string, userId: string) => {
    try {
      const { data: existingPlayer, error: checkError } = await supabase
        .from('connect4_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) return;
      if (existingPlayer) {
        setHasJoined(true);
        return;
      }

      const { data: players } = await supabase
        .from('connect4_players')
        .select('player_number')
        .eq('room_id', roomId)
        .order('player_number');

      let playerNumber = 1;
      if (players && players.length > 0) {
        const existingNumbers = players.map(p => p.player_number);
        if (existingNumbers.includes(1)) {
          playerNumber = 2;
        }
      }
      
      if (!players || players.length < 2) {
        const { error } = await supabase
          .from('connect4_players')
          .insert({
            room_id: roomId,
            user_id: userId,
            player_number: playerNumber
          });

        if (!error) {
          setHasJoined(true);
          await loadPlayers();
          
          const triggerChannel = supabase.channel(`room-${roomId}-players`);
          await triggerChannel.send({
            type: 'broadcast',
            event: 'player_joined',
            payload: { player_number: playerNumber }
          });
        }
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const loadPlayers = async () => {
    if (!room) return;
    
    try {
      const { data: playersData } = await supabase
        .from('connect4_players')
        .select('*')
        .eq('room_id', room.id)
        .order('player_number');

      if (playersData) {
        setPlayers(playersData);
      }
    } catch (error) {
      // Handle error silently
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

  const loadFlashcards = async (hostStatus?: boolean) => {
    const isHostNow = hostStatus !== undefined ? hostStatus : isHost;
    if (!room?.deck_id) {
      return;
    }
    
    try {
      const { data: flashcardsData, error } = await supabase
        .from('flashcards')
        .select('question, answer')
        .eq('set_id', room.deck_id)
        .order('order_index');
      
      
      if (flashcardsData && flashcardsData.length > 0) {
        // Only host shuffles and broadcasts questions
        if (isHostNow) {
          const shuffled = [...flashcardsData].sort(() => Math.random() - 0.5);
          setFlashcards(shuffled);
          setCurrentQuestion(shuffled[0]);
          
          await supabase
            .channel(`room-${room.id}-players`)
            .send({
              type: 'broadcast',
              event: 'new_question',
              payload: { question: shuffled[0], index: 0 }
            });
        } else {
          setFlashcards(flashcardsData);
        }
      } else {
      }
    } catch (error) {
      console.error('Error loading flashcards:', error);
    }
  };

  const startTimer = () => {
    if (!isHost) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setTimer(20);
    timerRef.current = setInterval(async () => {
      setTimer(prev => {
        const newTime = prev - 1;
        
        supabase
          .channel(`room-${room.id}-players`)
          .send({
            type: 'broadcast',
            event: 'timer_sync',
            payload: { timer: newTime }
          });
        
        if (newTime <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (isHost) submitAnswers();
          return 0;
        }
        return newTime;
      });
    }, 1000);
  };

  const handleKeyPress = async (e: React.KeyboardEvent, player: number) => {
    if (e.key === 'Enter' && !isSubmitting && currentQuestion) {
      submitAnswers();
    }
  };
  
  const handleAnswerChange = async (value: string, player: number) => {
    if (player === 1) {
      setPlayer1Answer(value);
    } else {
      setPlayer2Answer(value);
    }
    
    await supabase
      .channel(`room-${room.id}-players`)
      .send({
        type: 'broadcast',
        event: 'answer_update',
        payload: { player, answer: value }
      });
  };

  const submitAnswers = async () => {
    if (!currentQuestion || isSubmitting) {
      return;
    }
    
    
    setIsSubmitting(true);
    setPlayer1Submitted(true);
    setPlayer2Submitted(true);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (!firstSubmitter) {
      setFirstSubmitter(userPlayerNumber || 1);
    }
    
    // Broadcast freeze state to OTHER players with question data
    if (channelRef.current) {
      const result = await channelRef.current.send({
        type: 'broadcast',
        event: 'freeze_game',
        payload: {
          question: currentQuestion,
          player1Answer: player1Answer,
          player2Answer: player2Answer,
          firstSubmitter: userPlayerNumber || 1
        }
      });
    } else {
      console.error('No channel reference available!');
    }
    
    // Only host processes scoring - add extra guard
    if (!isHost) {
      return;
    }
    
    // Extra guard to prevent duplicate host processing
    if (showScoring) {
      return;
    }
    
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/.netlify/functions';
      const response = await fetch(`${apiUrl}/score-answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question,
          correct_answer: currentQuestion.answer,
          player1_answer: player1Answer,
          player2_answer: player2Answer
        })
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        let winner = null;
        if (result.player1_score > result.player2_score) {
          winner = 1;
        } else if (result.player2_score > result.player1_score) {
          winner = 2;
        } else {
          winner = firstSubmitter || 1;
        }
        
        
        
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'scoring_update',
          payload: {
            player1Score: result.player1_score,
            player2Score: result.player2_score,
            player1Analysis: result.player1_analysis,
            player2Analysis: result.player2_analysis,
            roundWinner: winner,
            currentQuestion: currentQuestion
          }
        });
        
        if (winner) {
          setTimeout(async () => {
            
            if (isHost) {
              setRoundWinner(winner);
              setShowScoring(false);
              setWaitingForCoinDrop(true);
            }
            
            // Then broadcast so other players also get it
            await channelRef.current?.send({
              type: 'broadcast',
              event: 'coin_drop_wait',
              payload: { winner }
            });
          }, 3000);
        } else {
          setTimeout(() => nextQuestion(), 3000);
        }
      }
    } catch (error) {
    }
  };

  const dropCoin = async (player: number, col: number) => {
    if (!isHost) return; // Only host updates the board
    
    const newBoard = [...board];
    
    for (let row = 5; row >= 0; row--) {
      if (!newBoard[row][col]) {
        newBoard[row][col] = player;
        setBoard(newBoard);
        
        let winner = null;
        if (checkWin(newBoard, row, col, player)) {
          winner = player;
          setGameWinner(player);
        }
        
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'board_update',
          payload: { board: newBoard, winner }
        });
        
        setWaitingForCoinDrop(false);
        setCanDropCoin(false);
        
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'coin_dropped',
          payload: {}
        });
        
        setWaitingForCoinDrop(false);
        setCanDropCoin(false);
        setTimeout(() => nextQuestion(), 2000);
        
        break;
      }
    }
  };
  
  const handleColumnClick = async (col: number) => {
      waitingForCoinDrop,
      roundWinner,
      userPlayerNumber,
      canDropCoin,
      columnFull: board[0][col]
    });
    
    if (!waitingForCoinDrop || !roundWinner) {
      return;
    }
    
    // Check if this player is the winner
    if (roundWinner !== userPlayerNumber) {
      return;
    }
    
    // Check if player can drop coin
    if (!canDropCoin) {
      return;
    }
    
    if (board[0][col]) {
      return;
    }

    
    setCanDropCoin(false);
    
    if (!isHost) {
      setWaitingForCoinDrop(false);
    }
    
    // Broadcast coin drop to all players
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'coin_drop',
      payload: { player: roundWinner, col }
    });
    // Start a fallback timer: if no coin_dropped arrives within 5s, ask host to advance
    if (coinDropTimeoutRef.current) {
      clearTimeout(coinDropTimeoutRef.current);
      coinDropTimeoutRef.current = null;
    }
    coinDropTimeoutRef.current = setTimeout(async () => {
      console.warn('No coin_dropped received within timeout, requesting host to advance');
      try {
        await channelRef.current?.send({
          type: 'broadcast',
          event: 'coin_drop_wait',
          payload: { winner: null }
        });
      } catch (err) {
        console.error('Failed to send fallback coin_drop_wait:', err);
      }
    }, 5000);
    
    if (isHost) {
      dropCoin(roundWinner, col);
    }
  };

  const checkWin = (board: any[][], row: number, col: number, player: number) => {
    const directions = [[0,1], [1,0], [1,1], [1,-1]];
    
    for (let [dr, dc] of directions) {
      let count = 1;
      
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
          count++;
        } else break;
      }
      
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
          count++;
        } else break;
      }
      
      if (count >= 4) return true;
    }
    return false;
  };

  const nextQuestion = async () => {
    const nextIndex = questionIndex + 1;
    
    if (nextIndex >= flashcards.length) {
      return;
    }
    
    if (!isHost) {
      return;
    }
    
    setQuestionIndex(nextIndex);
    setCurrentQuestion(flashcards[nextIndex]);
    setPlayer1Answer('');
    setPlayer2Answer('');
    setPlayer1Submitted(false);
    setPlayer2Submitted(false);
    setShowScoring(false);
    setRoundWinner(null);
    setIsSubmitting(false);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setPlayer1Analysis([]);
    setPlayer2Analysis([]);
    setWaitingForCoinDrop(false);
    setCanDropCoin(false);
    setFirstSubmitter(null);
    
    const result = await channelRef.current?.send({
      type: 'broadcast',
      event: 'new_question',
      payload: { question: flashcards[nextIndex], index: nextIndex }
    });
    
    startTimer();
  };

  const startGame = async () => {
    if (!isHost || !room || players.length < 2) return;
    
    try {
      const { error: roomError } = await supabase
        .from('connect4_rooms')
        .update({ status: 'playing' })
        .eq('id', room.id);

      if (roomError) return;
      
      setGameStarted(true);
      
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'game_started',
        payload: {}
      });
    } catch (error) {
      // Handle error silently
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => router.push('/')}
            className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-purple-600" />
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
              {gameStarted ? 'Connect4 Game' : 'Connect4 Waiting Room'}
            </h1>
            {deckName && (
              <p className="text-lg text-gray-600 mt-2 font-medium">
                Playing with: {deckName}
              </p>
            )}
          </div>
          
          <div className="w-12"></div>
          
          {gameStarted && (
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-sm text-gray-500">Timer</div>
                <div className="text-2xl font-bold text-red-600">{timer}s</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">You are</div>
                <div className="text-lg font-bold text-purple-600">Player {userPlayerNumber}</div>
              </div>
            </div>
          )}
        </div>

        {gameWinner ? (
          <div className="text-center py-16 relative">
            {/* Confetti Animation */}
            {showConfetti && (
              <div className="fixed inset-0 pointer-events-none z-50">
                {[...Array(50)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-3 h-3 ${
                      i % 4 === 0 ? 'bg-purple-500' : 
                      i % 4 === 1 ? 'bg-pink-500' : 
                      i % 4 === 2 ? 'bg-yellow-400' : 'bg-green-400'
                    } rounded-full animate-bounce`}
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${1 + Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>
            )}
            
            <h1 className="text-5xl font-bold mb-6 animate-pulse">
              <span className={gameWinner === 1 ? 'text-purple-600' : 'text-pink-600'}>
                🎉 Player {gameWinner} Wins Connect 4! 🎉
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-4">Congratulations! 🏆</p>
            <p className="text-lg text-gray-500">Returning to dashboard in 4 seconds...</p>
            <button 
              onClick={() => router.push('/')}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 animate-bounce"
            >
              Back to Dashboard Now
            </button>
          </div>
        ) : gameStarted ? (
          <div className="space-y-6">
            {/* Game Board with Player Coins */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Player 1 Coin Stack */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative h-20">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg absolute`}
                      style={{ top: `${i * 4}px`, zIndex: 3 - i }}
                    >
                      {i === 0 && <span className="text-white font-bold text-xl">P1</span>}
                    </div>
                  ))}
                </div>
                {showScoring && (
                  <div className="text-center bg-white p-3 rounded-lg shadow-md">
                    <div className={`text-2xl font-bold mb-2 transition-all duration-500 ${
                      roundWinner === 1 ? 'text-green-600 scale-110' : 'text-purple-600'
                    }`}>
                      {player1Score}%
                    </div>
                    <div className="space-y-1 max-w-32">
                      {player1Analysis.map((item: any, i: number) => (
                        <span key={i} className={`inline-block px-1 py-0.5 rounded text-xs mr-1 ${
                          item.type === 'correct' ? 'bg-green-200 text-green-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {item.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Game Board */}
              <div className="lg:col-span-3">
                <div className="bg-blue-600 p-6 rounded-lg">
                  {waitingForCoinDrop && (
                    <div className="text-center mb-4 p-3 rounded-lg">
                      {roundWinner === userPlayerNumber ? (
                        <div className="bg-green-100">
                          <p className="text-green-800 font-semibold">🎉 You won! Click a column to drop your coin!</p>
                        </div>
                      ) : (
                        <div className="bg-blue-100">
                          <p className="text-blue-800 font-semibold">Waiting for Player {roundWinner} to drop their coin...</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-7 gap-3">
                    {/* Column headers for clicking */}
                    {[...Array(7)].map((_, colIndex) => (
                      <div
                        key={`header-${colIndex}`}
                        className={`h-4 rounded-t-lg cursor-pointer transition-colors ${
                          waitingForCoinDrop && canDropCoin && !board[0][colIndex]
                            ? 'bg-yellow-300 hover:bg-yellow-400'
                            : 'bg-blue-500'
                        }`}
                        onClick={() => handleColumnClick(colIndex)}
                      />
                    ))}
                    {board.map((row, rowIndex) =>
                      row.map((cell, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={`w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner cursor-pointer transition-colors ${
                            waitingForCoinDrop && canDropCoin && !board[0][colIndex]
                              ? 'hover:bg-gray-100'
                              : ''
                          }`}
                          onClick={() => handleColumnClick(colIndex)}
                        >
                          {cell && (
                            <div className={`w-14 h-14 rounded-full shadow-lg ${
                              cell === 1 ? 'bg-gradient-to-br from-purple-400 to-purple-600' : 'bg-gradient-to-br from-pink-400 to-pink-600'
                            }`} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              
              {/* Player 2 Coin Stack */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative h-20">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-16 h-16 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center shadow-lg absolute`}
                      style={{ top: `${i * 4}px`, zIndex: 3 - i }}
                    >
                      {i === 0 && <span className="text-white font-bold text-xl">P2</span>}
                    </div>
                  ))}
                </div>
                {showScoring && (
                  <div className="text-center bg-white p-3 rounded-lg shadow-md">
                    <div className={`text-2xl font-bold mb-2 transition-all duration-500 ${
                      roundWinner === 2 ? 'text-green-600 scale-110' : 'text-pink-600'
                    }`}>
                      {player2Score}%
                    </div>
                    <div className="space-y-1 max-w-32">
                      {player2Analysis.map((item: any, i: number) => (
                        <span key={i} className={`inline-block px-1 py-0.5 rounded text-xs mr-1 ${
                          item.type === 'correct' ? 'bg-green-200 text-green-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {item.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {currentQuestion && (
              <div className="bg-gray-50 p-6 rounded-lg text-center max-w-2xl mx-auto">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Question:</h3>
                <p className="text-lg text-gray-700 mb-4">{currentQuestion.question}</p>
                {showScoring && (
                  <div className="mt-4 p-4 bg-green-100 rounded-lg">
                    <h4 className="text-lg font-semibold text-green-800 mb-2">Correct Answer:</h4>
                    <p className="text-lg text-green-700">{currentQuestion.answer}</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Next Question Button */}
            {!waitingForCoinDrop && !showScoring && !isSubmitting && roundWinner && isHost && (
              <div className="text-center mb-4">
                <button
                  onClick={() => nextQuestion()}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-semibold"
                >
                  Next Question
                </button>
              </div>
            )}
            
            {/* Player Input Area - spans board width */}
            <div className="max-w-2xl mx-auto">
              {userPlayerNumber === 1 ? (
                <div className={`border-4 rounded-lg p-4 relative ${
                  player1Submitted || player2Submitted ? 'border-gray-400 bg-gray-50' : 'border-purple-400 bg-purple-50'
                }`}>
                  {isSubmitting && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-purple-600 font-medium">Scoring...</span>
                      </div>
                    </div>
                  )}
                  {showScoring && player1Analysis.length > 0 && !isSubmitting ? (
                    <div className="w-full p-4 text-xl font-medium text-center min-h-[3.5rem] flex items-center justify-center flex-wrap">
                      {player1Analysis.map((item, i) => (
                        <span key={i} className={`mx-1 px-1 rounded transition-colors duration-200 ${
                          item.type === 'correct' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                        }`}>
                          {item.text}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={userPlayerNumber === 1 ? player1Answer : ''}
                      onChange={(e) => !(player1Submitted || player2Submitted || isSubmitting) && handleAnswerChange(e.target.value, 1)}
                      onKeyPress={(e) => handleKeyPress(e, 1)}
                      placeholder={isSubmitting ? 'Submitting...' : (player1Submitted || player2Submitted) ? 'Submitted!' : 'Type your answer...'}
                      disabled={player1Submitted || player2Submitted || isSubmitting}
                      className="w-full p-4 border-0 bg-transparent text-xl font-medium focus:outline-none text-center text-purple-600"
                    />
                  )}
                </div>
              ) : (
                <div className={`border-4 rounded-lg p-4 relative ${
                  player1Submitted || player2Submitted ? 'border-gray-400 bg-gray-50' : 'border-pink-400 bg-pink-50'
                }`}>
                  {isSubmitting && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-pink-600 font-medium">Scoring...</span>
                      </div>
                    </div>
                  )}
                  {showScoring && player2Analysis.length > 0 && !isSubmitting ? (
                    <div className="w-full p-4 text-xl font-medium text-center min-h-[3.5rem] flex items-center justify-center flex-wrap">
                      {player2Analysis.map((item, i) => (
                        <span key={i} className={`mx-1 px-1 rounded transition-colors duration-200 ${
                          item.type === 'correct' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                        }`}>
                          {item.text}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={userPlayerNumber === 2 ? player2Answer : ''}
                      onChange={(e) => !(player1Submitted || player2Submitted || isSubmitting) && handleAnswerChange(e.target.value, 2)}
                      onKeyPress={(e) => handleKeyPress(e, 2)}
                      placeholder={isSubmitting ? 'Submitting...' : (player1Submitted || player2Submitted) ? 'Submitted!' : 'Type your answer...'}
                      disabled={player1Submitted || player2Submitted || isSubmitting}
                      className="w-full p-4 border-0 bg-transparent text-xl font-medium focus:outline-none text-center text-pink-600"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
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
                      disabled={players.length < 2}
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
        </div>
        <div className="hanging-sign">
          <h3 className="text-lg font-bold text-center text-gray-700 mb-4 uppercase tracking-wide">How to Play</h3>
          <ul className="text-sm text-gray-600 space-y-2 font-medium text-center">
            <li>Players take turns answering flashcard questions</li>
            <li>Correct answers let you drop a piece in Connect4</li>
            <li>First to get 4 in a row wins the game!</li>
            <li>Wrong answers give the turn to the next player</li>
          </ul>
        </div>
      </div>
        )}
      </div>
    </div>
  );
}
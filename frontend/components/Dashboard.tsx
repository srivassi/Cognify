'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Upload, Grid3x3, Gamepad2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

function Connect4Loader() {
  const [droppedCoins, setDroppedCoins] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDroppedCoins(prev => {
        const newCoin = Math.floor(Math.random() * 7);
        return [...prev, newCoin].slice(-21);
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const getCoinColor = (index: number) => {
    return index % 2 === 0 ? 'purple' : 'pink';
  };

  const getCoinPosition = (coinIndex: number) => {
    const column = droppedCoins[coinIndex];
    const coinsInColumn = droppedCoins.slice(0, coinIndex + 1).filter(c => c === column).length;
    const row = Math.min(coinsInColumn - 1, 5);
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

        <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 shadow-2xl">
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 42 }, (_, i) => {
              const column = i % 7;
              const row = Math.floor(i / 7);
              
              const coinInPosition = droppedCoins.findIndex((coinColumn, coinIndex) => {
                const pos = getCoinPosition(coinIndex);
                return pos.column === column && pos.row === (5 - row);
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

interface FlashcardSet {
  id: number;
  title: string;
  cards: number;
  lastStudied: string;
  color: string;
}

const Dashboard = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSet, setSelectedSet] = useState<number | null>(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [showJoinRoomPopup, setShowJoinRoomPopup] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deletingSetId, setDeletingSetId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [setToDelete, setSetToDelete] = useState<FlashcardSet | null>(null);

  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  
  const loadFlashcardSets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: sets, error } = await supabase
        .from('flashcard_sets')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const mappedSets = sets.map((set: any) => ({
        id: set.id,
        title: set.title,
        cards: set.card_count,
        lastStudied: set.last_studied ? new Date(set.last_studied).toLocaleDateString('en-IE') : 'Never',
        color: 'from-blue-400 to-purple-400'
      }));
      
      setFlashcardSets(mappedSets);
    } catch (error) {
      // Handle error silently
    }
  };

  useEffect(() => {
    loadFlashcardSets();
    
    // Refresh data when user returns to tab
    const handleFocus = () => loadFlashcardSets();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type === 'application/pdf') {
      setUploadedFile(files[0]);
    }
  };

  const createFlashcards = async () => {
    if (!uploadedFile) return;
    
    setIsProcessing(true);
    setShowLoader(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Send PDF to backend for processing
      const formData = new FormData();
      formData.append('file', uploadedFile);
      
      const response = await fetch('http://localhost:8000/process-pdf', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        // Save to Supabase using frontend client
        const { data: setData, error: setError } = await supabase
          .from('flashcard_sets')
          .insert({
            title: result.title,
            card_count: result.flashcards.length,
            user_id: session.user.id
          })
          .select()
          .single();
        
        if (setError) throw setError;
        
        // Save flashcards
        const flashcardData = result.flashcards.map((card: any, index: number) => ({
          set_id: setData.id,
          question: card.question,
          answer: card.answer,
          order_index: index
        }));
        
        const { error: cardsError } = await supabase
          .from('flashcards')
          .insert(flashcardData);
        
        if (cardsError) throw cardsError;
        
        // Update UI
        const newSet: FlashcardSet = {
          id: setData.id,
          title: result.title,
          cards: result.flashcards.length,
          lastStudied: 'Just created',
          color: 'from-green-400 to-blue-400'
        };
        
        setFlashcardSets(prev => [newSet, ...prev]);
        setShowUploadPopup(false);
        setUploadedFile(null);
        
        setSuccessMessage(`Successfully created ${result.flashcards.length} flashcards from "${result.title}"!`);
        setShowSuccessModal(true);
      } else {
        setSuccessMessage('Error processing PDF: ' + result.message);
        setShowSuccessModal(true);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsProcessing(false);
      setShowLoader(false);
    }
  };

  const confirmDelete = (set: FlashcardSet) => {
    setSetToDelete(set);
    setShowDeleteModal(true);
  };

  const deleteSet = async () => {
    if (!setToDelete) return;

    setDeletingSetId(setToDelete.id);
    setShowDeleteModal(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('flashcards')
        .delete()
        .eq('set_id', setToDelete.id);

      const { error } = await supabase
        .from('flashcard_sets')
        .delete()
        .eq('id', setToDelete.id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setFlashcardSets(prev => prev.filter(set => set.id !== setToDelete.id));
    } catch (error) {
      // Handle error silently
    } finally {
      setDeletingSetId(null);
      setSetToDelete(null);
    }
  };

  const filteredSets = flashcardSets.filter(set =>
    set.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showLoader) {
    return <Connect4Loader />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-100 to-purple-100 border-b-4 border-white pixel-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 border-3 border-white flex items-center justify-center soft-glow" style={{borderRadius: '4px'}}>
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <h1 className="text-2xl font-bold text-blue-700 gentle-bounce">
              Cognify
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowJoinRoomPopup(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white pixel-button flex items-center space-x-2 text-sm"
            >
              <Grid3x3 size={14} />
              <span>Connect 4</span>
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white pixel-button flex items-center space-x-2 text-sm">
              <Gamepad2 size={14} />
              <span>Jeopardy</span>
            </button>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/auth');
              }}
              className="px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-500 text-white pixel-button flex items-center space-x-2 text-sm"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-72 bg-gradient-to-b from-yellow-100 to-yellow-200 border-r-4 border-white min-h-[calc(100vh-73px)] p-6">
          <button className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white pixel-button flex items-center justify-center space-x-2 text-sm">
            <Plus size={16} />
            <span>Create New Set</span>
          </button>



          <button 
            onClick={() => setShowUploadPopup(true)}
            className="w-full mb-6 px-4 py-3 border-2 border-dashed border-purple-300 text-purple-600 bg-purple-50 pixel-button flex items-center justify-center space-x-2 text-sm"
            disabled={isProcessing}
          >
            <Upload size={16} />
            <span>{isProcessing ? 'Processing...' : 'Upload PDF'}</span>
          </button>

          <div className="mb-4">
            <h2 className="text-sm font-semibold text-blue-700 mb-3">Your Study Sets</h2>
          </div>

          <div className="space-y-2">
            {flashcardSets.map(set => (
              <div key={set.id} className="group relative">
                <button
                  onClick={() => router.push(`/deck/${set.id}`)}
                  className="w-full text-left px-4 py-3 bg-white border-3 border-blue-200 pixel-button text-xs"
                >
                  <div className="text-blue-800 mb-1">{set.title}</div>
                  <div className="text-purple-600">{set.cards} CARDS</div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(set);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Delete set"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Search Bar */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search your flashcard sets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 pixel-input focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Flashcard Sets Grid */}
            <div>
              <h2 className="text-2xl font-bold text-blue-800 mb-6">Your Flashcard Sets</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSets.map(set => (
                  <div key={set.id} className="group relative">
                    <div
                      onClick={() => router.push(`/deck/${set.id}`)}
                      className="pixel-card overflow-hidden cursor-pointer gentle-bounce"
                    >
                      <div className={`h-32 bg-gradient-to-br ${set.color} p-6 flex items-center justify-center border-b-3 border-white`}>
                        <h3 className="text-white font-bold text-center text-xs uppercase">{set.title}</h3>
                      </div>
                      <div className="p-5 bg-gradient-to-b from-white to-purple-50">
                        <div className="flex items-baseline space-x-2 mb-3">
                          <span className="text-2xl font-bold text-purple-600">{set.cards}</span>
                          <span className="text-xs text-purple-500 uppercase">CARDS</span>
                        </div>
                        <div className="text-xs text-purple-500 uppercase">
                          LAST STUDIED: {set.lastStudied}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(set);
                      }}
                      disabled={deletingSetId === set.id}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 text-red-500 hover:text-red-700 hover:bg-white hover:bg-opacity-80 rounded-full shadow-md"
                      title="Delete set"
                    >
                      {deletingSetId === set.id ? '...' : '×'}
                    </button>
                  </div>
                ))}
              </div>

              {filteredSets.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-gray-400 mb-4">
                    <Search size={64} className="mx-auto mb-4" />
                  </div>
                  <p className="text-gray-500 text-lg">No flashcard sets found</p>
                  <p className="text-gray-400 text-sm mt-2">Try adjusting your search</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Upload PDF Popup */}
      {showUploadPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-purple-800 mb-6 text-center">Upload Your PDF</h2>
            
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                dragActive 
                  ? 'border-purple-400 bg-purple-50' 
                  : uploadedFile 
                  ? 'border-green-400 bg-green-50'
                  : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadedFile(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                {uploadedFile ? (
                  <div>
                    <Upload size={48} className="mx-auto mb-4 text-green-600" />
                    <p className="text-green-600 font-semibold">{uploadedFile.name}</p>
                    <p className="text-sm text-gray-500 mt-2">PDF uploaded successfully!</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={48} className="mx-auto mb-4 text-purple-400" />
                    <p className="text-gray-600 mb-2">Drag and drop your PDF here</p>
                    <p className="text-sm text-gray-400">or click to browse files</p>
                  </div>
                )}
              </label>
            </div>

            <button 
              onClick={createFlashcards}
              disabled={!uploadedFile || isProcessing}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white pixel-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Create Flashcards'}
            </button>

            <button 
              onClick={() => {
                setShowUploadPopup(false);
                setUploadedFile(null);
                setDragActive(false);
              }}
              className="w-full mt-3 px-6 py-3 bg-gradient-to-r from-red-300 to-pink-300 text-white pixel-button text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Join Room Popup */}
      {showJoinRoomPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-purple-800 mb-6 text-center">Join Connect 4 Room</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 pixel-input focus:outline-none text-center text-xl font-bold tracking-widest text-purple-700 placeholder-purple-400"
                  maxLength={6}
                />
              </div>
            </div>

            <button 
              onClick={() => {
                if (roomCode.length === 6) {
                  router.push(`/connect4/${roomCode}`);
                } else {
                  alert('Please enter a valid 6-character room code');
                }
              }}
              disabled={roomCode.length !== 6}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-400 to-cyan-400 text-white pixel-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Room
            </button>

            <button 
              onClick={() => {
                setShowJoinRoomPopup(false);
                setRoomCode('');
              }}
              className="w-full mt-3 px-6 py-3 bg-gradient-to-r from-red-300 to-pink-300 text-white pixel-button text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-green-800 mb-2">Success!</h3>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="px-6 py-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white pixel-button text-sm"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && setToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Flashcard Set</h3>
            <p className="text-gray-600 mb-2">Are you sure you want to delete</p>
            <p className="font-semibold text-gray-800 mb-4">"{setToDelete.title}"?</p>
            <p className="text-sm text-red-600 mb-6">This action cannot be undone and will delete all {setToDelete.cards} flashcards.</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setSetToDelete(null);
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-300 to-gray-400 text-white pixel-button text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={deleteSet}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-400 to-pink-400 text-white pixel-button text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
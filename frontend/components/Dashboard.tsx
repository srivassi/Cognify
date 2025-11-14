'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Upload, Grid3x3, Gamepad2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  
  useEffect(() => {
    const loadFlashcardSets = async () => {
      try {
        const response = await fetch('http://localhost:8000/flashcard-sets');
        const result = await response.json();
        
        if (result.status === 'success') {
          const sets = result.sets.map((set: any) => ({
            id: set.id,
            title: set.title,
            cards: set.card_count,
            lastStudied: new Date(set.created_at).toLocaleDateString(),
            color: 'from-blue-400 to-purple-400'
          }));
          setFlashcardSets(sets);
        }
      } catch (error) {
        setFlashcardSets([]);
      }
    };
    
    loadFlashcardSets();
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
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      
      const response = await fetch('http://localhost:8000/process-pdf', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        const newSet: FlashcardSet = {
          id: result.set_id || Date.now(),
          title: result.title,
          cards: result.count,
          lastStudied: 'Just created',
          color: 'from-green-400 to-blue-400'
        };
        
        setFlashcardSets(prev => [newSet, ...prev]);
        setShowUploadPopup(false);
        setUploadedFile(null);
        
        alert(`Success! Created ${result.count} flashcards from ${result.title}`);
      } else {
        alert('Error processing PDF: ' + result.message);
      }
    } catch (error) {
      alert('Error uploading PDF: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredSets = flashcardSets.filter(set =>
    set.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      {/* Header */}
      <header className="bg-white border-b border-purple-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Cognify
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg">
              <Grid3x3 size={18} />
              <span className="font-medium">Connect 4</span>
            </button>
            <button className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg">
              <Gamepad2 size={18} />
              <span className="font-medium">Jeopardy</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-72 bg-white border-r border-purple-100 min-h-[calc(100vh-73px)] p-6">
          <button className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg">
            <Plus size={20} />
            <span className="font-semibold">Create New Set</span>
          </button>



          <button 
            onClick={() => setShowUploadPopup(true)}
            className="w-full mb-6 px-4 py-3 border-2 border-dashed border-purple-300 text-purple-600 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 flex items-center justify-center space-x-2"
            disabled={isProcessing}
          >
            <Upload size={20} />
            <span className="font-semibold">{isProcessing ? 'Processing...' : 'Upload PDF'}</span>
          </button>

          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Sets</h2>
          </div>

          <div className="space-y-2">
            {flashcardSets.map(set => (
              <button
                key={set.id}
                onClick={() => setSelectedSet(set.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  selectedSet === set.id
                    ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300'
                    : 'hover:bg-purple-50 border-2 border-transparent'
                }`}
              >
                <div className="font-medium text-gray-800 mb-1">{set.title}</div>
                <div className="text-sm text-gray-500">{set.cards} cards</div>
              </button>
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
                  className="w-full pl-12 pr-4 py-3 bg-white border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-400 transition-colors duration-200 shadow-sm text-gray-900"
                />
              </div>
            </div>

            {/* Flashcard Sets Grid */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Flashcard Sets</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSets.map(set => (
                  <div
                    key={set.id}
                    onClick={() => router.push(`/deck/${set.id}`)}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:-translate-y-1"
                  >
                    <div className={`h-32 bg-gradient-to-br ${set.color} p-6 flex items-center justify-center`}>
                      <h3 className="text-white font-bold text-xl text-center">{set.title}</h3>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-bold text-purple-600">{set.cards}</span>
                        <span className="text-sm text-gray-500">cards</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Last studied: {set.lastStudied}
                      </div>
                    </div>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Upload PDF</h2>
            
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
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Create Flashcards'}
            </button>

            <button 
              onClick={() => {
                setShowUploadPopup(false);
                setUploadedFile(null);
                setDragActive(false);
              }}
              className="w-full mt-3 px-6 py-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
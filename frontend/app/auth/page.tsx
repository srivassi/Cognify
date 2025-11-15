'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setError('Check your email for verification link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white pixel-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 border-3 border-white flex items-center justify-center mx-auto mb-4 soft-glow" style={{borderRadius: '4px'}}>
            <span className="text-white font-bold text-2xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-blue-700 mb-2 uppercase">COGNIFY</h1>
          <p className="text-gray-600 mb-2 text-xs uppercase">SMART LEARNING PLATFORM</p>
          <p className="text-purple-600 font-medium text-sm uppercase">READY TO LEARN?</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-blue-700 mb-2 uppercase">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 pixel-input focus:outline-none text-gray-900 text-sm"
              placeholder="ENTER YOUR EMAIL"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-blue-700 mb-2 uppercase">PASSWORD</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 pixel-input focus:outline-none text-gray-900 text-sm"
                placeholder="ENTER YOUR PASSWORD"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white pixel-button text-sm disabled:opacity-50"
          >
            {loading ? (isSignUp ? 'CREATING...' : 'SIGNING IN...') : (isSignUp ? 'SIGN UP' : 'SIGN IN')}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-blue-700 hover:text-purple-700 text-xs font-bold uppercase"
          >
            {isSignUp ? 'ALREADY HAVE ACCOUNT? SIGN IN' : 'NEED ACCOUNT? SIGN UP'}
          </button>
        </div>
      </div>
    </div>
  );
}
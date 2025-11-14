'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AuthTest() {
  const [user, setUser] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState('Checking...');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  useEffect(() => {
    console.log('🔗 Supabase client initialized:', supabase);
    console.log('🌐 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('🔑 Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    
    supabase.auth.getUser().then(res => {
      console.log('👤 Current user:', res.data.user);
      console.log('❌ Auth error:', res.error);
      setUser(res.data.user);
      setConnectionStatus(res.error ? 'Connection Error' : 'Connected');
    });
    
    supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', _event, session?.user);
      setUser(session?.user ?? null);
    });
  }, []);
  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">Supabase Auth Test</h3>
      <p>Connection: {connectionStatus}</p>
      {user ? <p>Signed in: {user.email}</p> : <p>Not signed in</p>}
      <div className="space-y-2 mt-2">
        <input 
          type="email" 
          placeholder="Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <div className="flex gap-2">
          <button 
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={() => {
              console.log('📧 Attempting email signup...');
              supabase.auth.signUp({ 
                email, 
                password,
                options: {
                  emailRedirectTo: window.location.origin
                }
              })
                .then(res => console.log('✅ Signup result:', res))
                .catch(err => console.error('❌ Signup error:', err));
            }}
          >
            Sign Up
          </button>
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => {
              console.log('🔑 Attempting email signin...');
              supabase.auth.signInWithPassword({ email, password })
                .then(res => console.log('✅ Signin result:', res))
                .catch(err => console.error('❌ Signin error:', err));
            }}
          >
            Sign In
          </button>
        </div>
      </div>
      {user && (
        <button 
          className="bg-red-500 text-white px-4 py-2 rounded mt-2"
          onClick={() => {
            console.log('🚪 Signing out...');
            supabase.auth.signOut()
              .then(() => console.log('✅ Signed out'))
              .catch(err => console.error('❌ Signout error:', err));
          }}
        >
          Sign Out
        </button>
      )}
    </div>
  );
}

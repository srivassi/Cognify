import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Only create client if we have valid environment variables
if (!url || !anon || !/^https?:\/\//i.test(url)) {
  // During build time, create a mock client to prevent errors
  export const supabase = {
    auth: { getSession: () => Promise.resolve({ data: { session: null }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), send: () => Promise.resolve() })
  } as any;
} else {
  export const supabase = createClient(url, anon);
}

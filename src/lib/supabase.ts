import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Please check your .env file.");
}

// Fallback to avoid crashing the whole app if URL is missing
const fallbackUrl = 'https://placeholder.supabase.co';
export const supabase = createClient(supabaseUrl || fallbackUrl, supabaseAnonKey || 'placeholder');

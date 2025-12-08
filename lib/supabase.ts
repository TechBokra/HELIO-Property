import { createClient } from '@supabase/supabase-js';

// Fallback credentials for local development stability
const FALLBACK_URL = 'https://ygajpxznposoqfjlwtqi.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnYWpweHpucG9zb3Fmamx3dHFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDA1NjQsImV4cCI6MjA4MDUxNjU2NH0.iYd_ep77Qbp9dXHpFD-t5Xu3hzpN-aSS5YvS1_QfO3k';

// Safely access environment variables to prevent runtime crashes if import.meta.env is undefined
const getEnv = () => {
    try {
        return (import.meta as any).env || {};
    } catch {
        return {};
    }
};

const env = getEnv();

// Prioritize environment variables (Vercel), fallback to hardcoded (Local)
const supabaseUrl = env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
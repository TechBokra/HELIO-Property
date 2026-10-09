
import { createClient } from '@supabase/supabase-js';

// Authoritative Supabase project credentials
const FALLBACK_URL = 'https://xyyvgpchkznznwbxbgrp.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eXZncGNoa3puem53YnhiZ3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTI1MDksImV4cCI6MjA4MTAyODUwOX0.1oRRd_bm3Ug9zXVR5Ae2xelGt0aN6uMP2rKpUu2AGVM';

// Safely read environment variables across Vite browser build and Node.js
const getEnv = (key: string): string | undefined => {
    try {
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
            return import.meta.env[key];
        }
    } catch {}
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch {}
    return undefined;
};

const envUrl = getEnv('VITE_SUPABASE_URL');
const envKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Production MUST NOT depend on localStorage for Supabase credentials or security decisions
const supabaseUrl = (envUrl && envUrl.trim().length > 0) ? envUrl : FALLBACK_URL;
const supabaseAnonKey = (envKey && envKey.trim().length > 0) ? envKey : FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    global: {
        headers: { 'x-application-name': 'onlyhelio' }
    }
});

/**
 * Public, session-less Supabase client dedicated to public marketplace queries.
 * Guaranteed to never send expired user JWT tokens, ensuring 100% reliability for public visitors.
 */
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    },
    global: {
        headers: { 'x-application-name': 'onlyhelio-public' }
    }
});

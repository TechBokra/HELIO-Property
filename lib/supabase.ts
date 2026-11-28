
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

const isPlaceholderSupabaseUrl = (val?: string): boolean => {
    if (!val) return true;
    const lower = val.toLowerCase();
    if (lower.includes('your-project') || lower.includes('your_project') || lower.includes('placeholder')) {
        return true;
    }
    try {
        const parsed = new URL(val);
        return parsed.protocol !== 'https:' && parsed.protocol !== 'http:';
    } catch {
        return true;
    }
};

const isPlaceholderSupabaseKey = (val?: string): boolean => {
    if (!val) return true;
    const lower = val.toLowerCase();
    if (lower.includes('your-anon-key') || lower.includes('your_anon_key') || lower.includes('placeholder')) {
        return true;
    }
    // Supabase anon keys are JWT strings starting with eyJ
    return !val.startsWith('eyJ') || val.split('.').length !== 3;
};

export const resolveSupabaseConfig = (
    envUrlInput?: string,
    envKeyInput?: string
): { supabaseUrl: string; supabaseAnonKey: string } => {
    const trimmedUrl = envUrlInput?.trim();
    const trimmedKey = envKeyInput?.trim();
    const validUrl = !isPlaceholderSupabaseUrl(trimmedUrl) ? trimmedUrl! : FALLBACK_URL;
    const validKey = !isPlaceholderSupabaseKey(trimmedKey) ? trimmedKey! : FALLBACK_KEY;
    return { supabaseUrl: validUrl, supabaseAnonKey: validKey };
};

export const getSupabaseClientConfig = (): { supabaseUrl: string; supabaseAnonKey: string } => {
    return resolveSupabaseConfig(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));
};

// Production MUST NOT depend on localStorage for Supabase credentials or security decisions
const { supabaseUrl: directSupabaseUrl, supabaseAnonKey } = getSupabaseClientConfig();

/**
 * In the deployed site the browser talks to Supabase through the site's own domain
 * (vercel.json rewrites /sb/* to the Supabase project). Some networks block *.supabase.co,
 * which made every data request and every sign-in fail with "Failed to fetch".
 * Set VITE_SUPABASE_DIRECT=true to bypass the proxy. Local development stays direct.
 */
const resolveBrowserSupabaseUrl = (directUrl: string): string => {
    try {
        if (typeof window === 'undefined' || !window.location) return directUrl;
        if (getEnv('VITE_SUPABASE_DIRECT') === 'true') return directUrl;
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return directUrl;
        if (!/^https?:$/.test(window.location.protocol)) return directUrl;
        if (!directUrl.includes('xyyvgpchkznznwbxbgrp.supabase.co')) return directUrl;
        return `${window.location.origin}/sb`;
    } catch {
        return directUrl;
    }
};

const supabaseUrl = resolveBrowserSupabaseUrl(directSupabaseUrl);
// Keep the session key tied to the project (not to the proxy host) so existing sessions survive.
const AUTH_STORAGE_KEY = 'sb-xyyvgpchkznznwbxbgrp-auth-token';

// No custom global headers: Supabase Auth's CORS policy only allows a fixed header list,
// so an extra header (e.g. x-application-name) makes the browser block every sign-in
// request at preflight ("Failed to fetch") while data requests keep working.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_STORAGE_KEY
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
    }
});

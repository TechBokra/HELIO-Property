
import { createClient } from '@supabase/supabase-js';

// القيم الاحتياطية للمعاينة المحلية - تم تحديثها للمشروع الجديد
const FALLBACK_URL = 'https://xyyvgpchkznznwbxbgrp.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eXZncGNoa3puem53YnhiZ3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTI1MDksImV4cCI6MjA4MTAyODUwOX0.1oRRd_bm3Ug9zXVR5Ae2xelGt0aN6uMP2rKpUu2AGVM';

// Statically extractable by Vite bundler during `vite build` on Vercel / Cloud Run
const getEnvVar = (envValue: string | undefined, fallback: string) => {
    return envValue && envValue.trim().length > 0 ? envValue : fallback;
};

// Check if admin explicitly saved custom supabase connection in settings
let localSettingsUrl: string | undefined;
let localSettingsKey: string | undefined;
try {
    const rawContent = localStorage.getItem('onlyhelio_site_content');
    if (rawContent) {
        const parsed = JSON.parse(rawContent);
        localSettingsUrl = parsed?.integrationConfiguration?.supabase?.url;
        localSettingsKey = parsed?.integrationConfiguration?.supabase?.anonKey;
    }
} catch {}

const envMeta = (import.meta as any)?.env;
const supabaseUrl = localSettingsUrl || getEnvVar(envMeta?.VITE_SUPABASE_URL, FALLBACK_URL);
const supabaseAnonKey = localSettingsKey || getEnvVar(envMeta?.VITE_SUPABASE_ANON_KEY, FALLBACK_KEY);

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


import { createClient } from '@supabase/supabase-js';

// القيم الاحتياطية للمعاينة المحلية - تم تحديثها للمشروع الجديد
const FALLBACK_URL = 'https://xyyvgpchkznznwbxbgrp.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eXZncGNoa3puem53YnhiZ3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTI1MDksImV4cCI6MjA4MTAyODUwOX0.1oRRd_bm3Ug9zXVR5Ae2xelGt0aN6uMP2rKpUu2AGVM';

// الحصول على المتغيرات من البيئة (Vercel) أو استخدام الاحتياطية
const getEnvVar = (key: string, fallback: string) => {
    try {
        // محاولة الحصول من import.meta (Vite) أو process.env (Node/Vercel)
        return (import.meta as any).env?.[key] || (process.env as any)?.[key] || fallback;
    } catch {
        return fallback;
    }
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', FALLBACK_URL);
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', FALLBACK_KEY);

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

import { createClient } from '@neon/neon-js/supabase';

/**
 * Database + auth client (Neon: Managed Better Auth + Data API).
 *
 * The export names stay `supabase` / `supabasePublic` on purpose: Neon's client is
 * API-compatible with supabase-js (`from()`, `rpc()`, `auth.signInWithPassword()`, ...),
 * so the 50+ service files keep working unchanged.
 *
 * In the deployed site every call goes through the site's own domain (vercel.json
 * rewrites /neon/auth/* and /neon/rest/* to Neon). That keeps the session cookie
 * first-party, so sign-in also works in Safari and incognito windows, which block
 * third-party cookies. Local development talks to Neon directly.
 */

export const NEON_AUTH_URL = 'https://ep-red-thunder-bgarx58x.neonauth.c-9.eu-central-1.aws.neon.tech/helio/auth';
export const NEON_DATA_API_URL = 'https://ep-red-thunder-bgarx58x.apirest.c-9.eu-central-1.aws.neon.tech/helio/rest/v1';

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

const isLocalHost = (host: string) =>
    host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');

export const resolveNeonUrls = (): { authUrl: string; dataApiUrl: string } => {
    const direct = { authUrl: NEON_AUTH_URL, dataApiUrl: NEON_DATA_API_URL };
    try {
        if (typeof window === 'undefined' || !window.location) return direct;
        if (getEnv('VITE_NEON_DIRECT') === 'true') return direct;
        if (!/^https?:$/.test(window.location.protocol)) return direct;
        if (isLocalHost(window.location.hostname)) return direct;
        const origin = window.location.origin;
        return { authUrl: `${origin}/neon/auth`, dataApiUrl: `${origin}/neon/rest/v1` };
    } catch {
        return direct;
    }
};

const { authUrl, dataApiUrl } = resolveNeonUrls();

export const supabase = createClient({
    auth: { url: authUrl, allowAnonymous: true },
    dataApi: { url: dataApiUrl },
});

/**
 * Public marketplace reads. The session lives in a cookie shared by every client on the
 * page, so a separate "session-less" client is no longer meaningful; anonymous visitors
 * get a short-lived anonymous token automatically (allowAnonymous).
 */
export const supabasePublic = createClient({
    auth: { url: authUrl, allowAnonymous: true },
    dataApi: { url: dataApiUrl },
});

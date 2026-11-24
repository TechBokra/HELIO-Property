/**
 * Explicit Demo Mode configuration.
 *
 * When the application is connected to Supabase (default in development and
 * production), static sample catalogs must NOT be silently substituted for
 * empty database tables or failed queries. Demo sample data is only used when
 * Demo Mode is explicitly enabled.
 */

export const DEMO_MODE_STORAGE_KEY = 'onlyhelio_demo_mode';

let programmaticDemoOverride: boolean | null = null;

const readEnvFlag = (key: string): string | undefined => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key] !== undefined) {
            return String((import.meta as any).env[key]);
        }
    } catch {
        // Ignore in non-Vite runtimes
    }
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
            return String(process.env[key]);
        }
    } catch {
        // Ignore in browser runtimes
    }
    return undefined;
};

export const setDemoModeEnabled = (enabled: boolean | null): void => {
    programmaticDemoOverride = enabled;
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            if (enabled === null || enabled === false) {
                window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
            } else {
                window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true');
            }
        }
    } catch {
        // Ignore storage restrictions
    }
};

export const isDemoModeEnabled = (): boolean => {
    if (programmaticDemoOverride !== null) {
        return programmaticDemoOverride;
    }

    const envFlag = readEnvFlag('VITE_DEMO_MODE');
    if (envFlag && envFlag.trim().toLowerCase() === 'true') {
        return true;
    }

    try {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const demoParam = params.get('demo');
            if (demoParam === 'true' || demoParam === '1') {
                return true;
            }
            if (demoParam === 'false' || demoParam === '0') {
                return false;
            }
            if (window.localStorage?.getItem(DEMO_MODE_STORAGE_KEY) === 'true') {
                return true;
            }
        }
    } catch {
        // Ignore window/storage access errors in SSR or Node tests
    }

    return false;
};

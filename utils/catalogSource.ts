export type CatalogDataSource = 'supabase' | 'neon';

let runtimeCatalogSourceOverride: CatalogDataSource | null = null;

/**
 * Allows deterministic switching in automated tests without mutating env globals.
 */
export const setCatalogDataSourceOverride = (source: CatalogDataSource | null): void => {
    runtimeCatalogSourceOverride = source;
};

const readEnvString = (key: string): string | undefined => {
    try {
        const metaEnv = (import.meta as any)?.env;
        if (metaEnv && typeof metaEnv[key] === 'string') {
            return metaEnv[key];
        }
    } catch {
        // Ignore outside Vite runtime
    }

    if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
        return process.env[key];
    }

    return undefined;
};

/**
 * Explicit opt-in switch for the postponed Neon read-only catalog POC.
 * Defaults strictly to 'supabase' unless explicitly overridden in tests or both
 * VITE_ENABLE_NEON_CATALOG_POC='true' and VITE_CATALOG_DATA_SOURCE='neon' are set.
 */
export const getCatalogDataSource = (): CatalogDataSource => {
    if (runtimeCatalogSourceOverride) {
        return runtimeCatalogSourceOverride;
    }

    const pocActive = (readEnvString('VITE_ENABLE_NEON_CATALOG_POC') || '').trim().toLowerCase() === 'true';
    const configured = (readEnvString('VITE_CATALOG_DATA_SOURCE') || '').trim().toLowerCase();
    return pocActive && configured === 'neon' ? 'neon' : 'supabase';
};

export const isNeonCatalogEnabled = (): boolean => {
    return getCatalogDataSource() === 'neon';
};

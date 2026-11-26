export type CatalogDataSource = 'supabase' | 'neon';

let runtimeCatalogSourceOverride: CatalogDataSource | null = null;

/**
 * Allows deterministic switching in automated tests without mutating env globals.
 */
export const setCatalogDataSourceOverride = (source: CatalogDataSource | null): void => {
    runtimeCatalogSourceOverride = source;
};

const readConfiguredCatalogSource = (): string | undefined => {
    try {
        const metaEnv = (import.meta as any)?.env;
        if (metaEnv && typeof metaEnv.VITE_CATALOG_DATA_SOURCE === 'string') {
            return metaEnv.VITE_CATALOG_DATA_SOURCE;
        }
    } catch {
        // Ignore outside Vite runtime
    }

    if (typeof process !== 'undefined' && process.env && typeof process.env.VITE_CATALOG_DATA_SOURCE === 'string') {
        return process.env.VITE_CATALOG_DATA_SOURCE;
    }

    return undefined;
};

/**
 * Explicit opt-in switch for the Neon read-only catalog POC.
 * Defaults strictly to 'supabase' unless VITE_CATALOG_DATA_SOURCE='neon'
 * (or an explicit test override) is configured.
 */
export const getCatalogDataSource = (): CatalogDataSource => {
    if (runtimeCatalogSourceOverride) {
        return runtimeCatalogSourceOverride;
    }

    const configured = (readConfiguredCatalogSource() || '').trim().toLowerCase();
    return configured === 'neon' ? 'neon' : 'supabase';
};

export const isNeonCatalogEnabled = (): boolean => {
    return getCatalogDataSource() === 'neon';
};

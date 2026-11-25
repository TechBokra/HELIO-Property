import { supabase, supabasePublic } from '../lib/supabase';
import { Permission, type SiteContent } from '../types';
import { siteContentData as fallbackData } from '../data/content';
import { requirePermission } from './authGuard';
import { resolveHomeSections, resolveNavigationLinks } from '../utils/siteContentHelpers';

export const SITE_CONTENT_UPDATED_EVENT = 'onlyhelio_content_updated';
export const SITE_CONTENT_CHANNEL = 'onlyhelio_site_content';

// In-memory cache & in-flight promise deduplication
let cachedContent: { data: SiteContent; timestamp: number } | null = null;
let inFlightContentPromise: Promise<SiteContent> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh in memory

export const invalidateContentCache = () => {
    cachedContent = null;
    inFlightContentPromise = null;
};

export const getCachedContentSnapshot = (): SiteContent | null => {
    return cachedContent ? cachedContent.data : null;
};

// Known Cloudinary CDN replacement for large legacy base64 slides and assets
const HELIOPOLIS_GATE_CDN = 'https://res.cloudinary.com/dwg0hr34g/image/upload/v1791191021/onlyhelio_content/asjvgr1hpcl2ewiff1oh.jpg';
const WHY_HELIOPOLIS_CDN_0 = 'https://res.cloudinary.com/dwg0hr34g/image/upload/v1791191815/onlyhelio_content/i06vyzy64ogqaa4nnt1m.jpg';
const WHY_HELIOPOLIS_CDN_1 = 'https://res.cloudinary.com/dwg0hr34g/image/upload/v1791191816/onlyhelio_content/n0vlochxlqhbhsgmcb9d.jpg';
const LOGO_CDN = 'https://res.cloudinary.com/dwg0hr34g/image/upload/v1791191828/onlyhelio_content/rpw2wpht2j1ktsear2dz.jpg';

export const isPlainObject = (value: unknown): value is Record<string, any> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
};

export const deepClone = <T>(value: T): T => {
    if (Array.isArray(value)) {
        return value.map((item) => deepClone(item)) as unknown as T;
    }
    if (isPlainObject(value)) {
        const cloned: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            if (value[key] !== undefined) {
                cloned[key] = deepClone(value[key]);
            }
        }
        return cloned as T;
    }
    return value;
};

export const deepEqual = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) return true;
    if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    if (isPlainObject(a) && isPlainObject(b)) {
        const keysA = Object.keys(a).filter((k) => a[k] !== undefined);
        const keysB = Object.keys(b).filter((k) => b[k] !== undefined);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
    }
    return false;
};

/**
 * Recursively deep-merges `patch` onto `base` for plain objects.
 * Arrays and primitive values in `patch` replace the corresponding key in `base`.
 */
export const deepMergeContent = <T extends Record<string, any>>(base: T, patch: Record<string, any>): T => {
    const result: Record<string, any> = deepClone(base || {});
    if (!isPlainObject(patch)) {
        return result as T;
    }

    for (const key of Object.keys(patch)) {
        const patchVal = patch[key];
        if (patchVal === undefined) continue;

        const baseVal = result[key];
        if (isPlainObject(baseVal) && isPlainObject(patchVal)) {
            result[key] = deepMergeContent(baseVal, patchVal);
        } else {
            result[key] = deepClone(patchVal);
        }
    }

    return result as T;
};

/**
 * Extracts a minimal nested patch of only the fields/sections modified relative to `baseline`.
 * Prevents saving one section (e.g. Hero) from overwriting newer edits in another section (e.g. Footer).
 */
export const buildContentPatch = (
    baseline: any,
    current: any,
    dirtyFields?: any
): Partial<SiteContent> => {
    if (!isPlainObject(current)) return {};

    const patch: Record<string, any> = {};
    const keys = new Set<string>([
        ...Object.keys(current),
        ...(isPlainObject(dirtyFields) ? Object.keys(dirtyFields) : []),
    ]);

    for (const key of keys) {
        const currVal = current[key];
        if (currVal === undefined) continue;

        const baseVal = isPlainObject(baseline) ? baseline[key] : undefined;
        const dirtyNode = isPlainObject(dirtyFields) ? dirtyFields[key] : undefined;

        if (Array.isArray(currVal)) {
            const isDirtyArray = Boolean(dirtyNode);
            const hasChangedFromBaseline = baseVal !== undefined && !deepEqual(baseVal, currVal);
            if (isDirtyArray || hasChangedFromBaseline) {
                patch[key] = deepClone(currVal);
            }
            continue;
        }

        if (isPlainObject(currVal)) {
            const subPatch = buildContentPatch(baseVal, currVal, dirtyNode);
            if (Object.keys(subPatch).length > 0) {
                patch[key] = subPatch;
            }
            continue;
        }

        const isDirtyLeaf = dirtyNode === true;
        const hasChangedFromBaseline = baseVal !== undefined && !deepEqual(baseVal, currVal);
        if (isDirtyLeaf || hasChangedFromBaseline) {
            patch[key] = currVal;
        }
    }

    return patch as Partial<SiteContent>;
};

/**
 * Immutably sanitizes large base64 data URIs in content to prevent megabyte-scale payload overhead
 */
const sanitizeContentPayload = (content: any): any => {
    if (!isPlainObject(content)) return content;

    const cloned = deepClone(content);

    // Sanitize hero images if they contain huge data URIs
    if (cloned.hero?.images && Array.isArray(cloned.hero.images)) {
        cloned.hero.images = cloned.hero.images.map((img: any) => {
            if (typeof img === 'string') {
                return img.startsWith('data:') ? HELIOPOLIS_GATE_CDN : img;
            }
            if (img && typeof img === 'object' && typeof img.src === 'string' && img.src.startsWith('data:')) {
                return { ...img, src: HELIOPOLIS_GATE_CDN };
            }
            return img;
        });
    }

    // Sanitize whyNewHeliopolis images if they contain huge data URIs
    if (cloned.whyNewHeliopolis?.images && Array.isArray(cloned.whyNewHeliopolis.images)) {
        const cdnList = [WHY_HELIOPOLIS_CDN_0, WHY_HELIOPOLIS_CDN_1];
        cloned.whyNewHeliopolis.images = cloned.whyNewHeliopolis.images.map((img: any, idx: number) => {
            const fallbackCdn = cdnList[idx % cdnList.length];
            if (typeof img === 'string') {
                return img.startsWith('data:') ? fallbackCdn : img;
            }
            if (img && typeof img === 'object' && typeof img.src === 'string' && img.src.startsWith('data:')) {
                return { ...img, src: fallbackCdn };
            }
            return img;
        });
    }

    // Sanitize logoUrl if it contains data URI
    if (typeof cloned.logoUrl === 'string' && cloned.logoUrl.startsWith('data:')) {
        cloned.logoUrl = LOGO_CDN;
    }

    // Sanitize finishingPage & decorationsPage editorial heroImageUrl if huge data URI
    if (cloned.finishingPage && typeof cloned.finishingPage.heroImageUrl === 'string' && cloned.finishingPage.heroImageUrl.startsWith('data:')) {
        cloned.finishingPage.heroImageUrl = fallbackData.finishingPage?.heroImageUrl || HELIOPOLIS_GATE_CDN;
    }
    if (cloned.decorationsPage && typeof cloned.decorationsPage.heroImageUrl === 'string' && cloned.decorationsPage.heroImageUrl.startsWith('data:')) {
        cloned.decorationsPage.heroImageUrl = fallbackData.decorationsPage?.heroImageUrl || HELIOPOLIS_GATE_CDN;
    }

    return cloned;
};

/**
 * Deep-merges raw DB content with fallback defaults so legacy or partial DB rows
 * always remain complete and compatible with all UI components.
 */
export const normalizeSiteContent = (rawContent: any): SiteContent => {
    const sanitized = rawContent ? sanitizeContentPayload(rawContent) : {};
    const merged = deepMergeContent(fallbackData, isPlainObject(sanitized) ? sanitized : {});

    // Preserve non-empty array fallbacks when legacy DB rows store empty arrays
    if (!merged.hero?.images || merged.hero.images.length === 0) {
        merged.hero = {
            ...merged.hero,
            images: deepClone(fallbackData.hero.images),
        };
    }

    if (!merged.whyNewHeliopolis?.images || merged.whyNewHeliopolis.images.length === 0) {
        merged.whyNewHeliopolis = {
            ...merged.whyNewHeliopolis,
            images: deepClone(fallbackData.whyNewHeliopolis.images),
        };
    }

    if (!merged.finishingServices || merged.finishingServices.length === 0) {
        merged.finishingServices = deepClone(fallbackData.finishingServices);
    }

    if (!merged.quotes || merged.quotes.length === 0) {
        merged.quotes = deepClone(fallbackData.quotes);
    }

    // Normalize navigation links & homepage section ordering while keeping legacy DB overrides
    merged.navigation = resolveNavigationLinks(merged, { includeHidden: true });
    merged.homeSections = resolveHomeSections(merged, { includeDisabled: true });

    // Ensure action button targets & labels are complete even for legacy rows
    if (!merged.hero?.primaryButton) {
        merged.hero = {
            ...merged.hero,
            primaryButton: deepClone(fallbackData.hero.primaryButton),
        };
    }
    if (!merged.hero?.secondaryButton) {
        merged.hero = {
            ...merged.hero,
            secondaryButton: deepClone(fallbackData.hero.secondaryButton),
        };
    }
    if (merged.homeCTA && !merged.homeCTA.secondaryButton) {
        merged.homeCTA = {
            ...merged.homeCTA,
            secondaryButton: deepClone(fallbackData.homeCTA?.secondaryButton),
        };
    }
    if (merged.homeListings && !merged.homeListings.viewAllButton) {
        merged.homeListings = {
            ...merged.homeListings,
            viewAllButton: deepClone(fallbackData.homeListings?.viewAllButton),
        };
    }

    return merged;
};

const isMissingRpcError = (error: any): boolean => {
    const code = String(error?.code || '').toUpperCase();
    const msg = String(error?.message || '').toLowerCase();
    return (
        code === 'PGRST202' ||
        code === '42883' ||
        (msg.includes('merge_site_content') && (msg.includes('not find') || msg.includes('does not exist')))
    );
};

const broadcastContentUpdate = (updatedContent: SiteContent) => {
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(SITE_CONTENT_UPDATED_EVENT, { detail: updatedContent }));
        }
    } catch {
        // Ignore event dispatch failures in non-DOM environments
    }

    try {
        if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel(SITE_CONTENT_CHANNEL);
            channel.postMessage(updatedContent);
            channel.close();
        }
    } catch {
        // Ignore BroadcastChannel errors when unsupported
    }
};

export interface ContentServiceOptions {
    forceRefresh?: boolean;
    client?: any;
}

export const getContent = async (options?: ContentServiceOptions): Promise<SiteContent> => {
    const now = Date.now();
    const forceRefresh = Boolean(options?.forceRefresh);
    const customClient = options?.client;

    if (!forceRefresh && !customClient && cachedContent && (now - cachedContent.timestamp) < CACHE_TTL_MS) {
        return cachedContent.data;
    }

    if (!forceRefresh && !customClient && inFlightContentPromise) {
        return inFlightContentPromise;
    }

    const fetchPromise = (async () => {
        try {
            const readClient = customClient ?? supabasePublic;

            // Direct query to authoritative Supabase site_content table
            const { data: mainContent, error } = await readClient
                .from('site_content')
                .select('content')
                .eq('key', 'main_content')
                .maybeSingle();

            if (error) {
                console.warn('Supabase site_content query notice:', error.message);
                if (cachedContent) {
                    return cachedContent.data;
                }
                return normalizeSiteContent(null);
            }

            const normalizedContent = normalizeSiteContent(mainContent?.content);
            cachedContent = { data: normalizedContent, timestamp: Date.now() };
            return normalizedContent;
        } catch (err) {
            console.warn('Unexpected error in getContent, using fallback:', err);
            return cachedContent ? cachedContent.data : normalizeSiteContent(null);
        } finally {
            if (!forceRefresh && !customClient) {
                inFlightContentPromise = null;
            }
        }
    })();

    if (!forceRefresh && !customClient) {
        inFlightContentPromise = fetchPromise;
    }

    return fetchPromise;
};

export const updateContent = async (
    updates: Partial<SiteContent>,
    options?: { client?: any }
): Promise<SiteContent> => {
    requirePermission(Permission.MANAGE_SITE_CONTENT);

    if (!isPlainObject(updates) || Object.keys(updates).length === 0) {
        return getContent({ forceRefresh: true, client: options?.client });
    }

    const dbClient = options?.client ?? supabase;
    const sanitizedPatch = sanitizeContentPayload(updates);
    let savedRawContent: any = null;

    // 1. Authoritative persistence to Supabase FIRST (never mutate public cache or emit updates before DB succeeds)
    let usedFallbackUpsert = false;

    if (typeof dbClient.rpc === 'function') {
        const { data: rpcData, error: rpcError } = await dbClient.rpc('merge_site_content', {
            p_key: 'main_content',
            p_patch: sanitizedPatch,
        });

        if (!rpcError && rpcData) {
            savedRawContent = rpcData;
        } else if (rpcError && !isMissingRpcError(rpcError)) {
            console.error('Supabase merge_site_content RPC error:', rpcError.message);
            throw new Error(`Failed to save site content: ${rpcError.message}`);
        } else {
            usedFallbackUpsert = true;
        }
    } else {
        usedFallbackUpsert = true;
    }

    // Fallback when RPC migration hasn't been applied yet:
    // Read latest row directly from Supabase (bypassing local cache) -> deep merge -> upsert
    if (usedFallbackUpsert) {
        const { data: latestRow, error: readError } = await dbClient
            .from('site_content')
            .select('content')
            .eq('key', 'main_content')
            .maybeSingle();

        if (readError) {
            console.error('Supabase site_content pre-save read error:', readError.message);
            throw new Error(`Failed to save site content: ${readError.message}`);
        }

        const existingRaw = isPlainObject(latestRow?.content) ? latestRow.content : {};
        const mergedRaw = deepMergeContent(existingRaw, sanitizedPatch);

        const { data: upsertedRow, error: upsertError } = await dbClient
            .from('site_content')
            .upsert(
                {
                    key: 'main_content',
                    content: mergedRaw,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'key' }
            )
            .select('content')
            .single();

        if (upsertError) {
            console.error('Supabase site_content sync error:', upsertError.message);
            throw new Error(`Failed to save site content: ${upsertError.message}`);
        }

        savedRawContent = upsertedRow?.content ?? mergedRaw;
    }

    // 2. ONLY AFTER Supabase confirms success: normalize, update cache, and notify public UI
    const normalizedSaved = normalizeSiteContent(savedRawContent);
    cachedContent = { data: normalizedSaved, timestamp: Date.now() };
    broadcastContentUpdate(normalizedSaved);

    return normalizedSaved;
};

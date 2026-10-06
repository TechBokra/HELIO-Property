import { supabase } from '../lib/supabase';
import { Permission, type SiteContent } from '../types';
import { siteContentData as fallbackData } from '../data/content';
import { requirePermission } from './authGuard';


// In-memory cache & in-flight promise deduplication
let cachedContent: { data: SiteContent; timestamp: number } | null = null;
let inFlightContentPromise: Promise<SiteContent> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh in memory

export const invalidateContentCache = () => {
    cachedContent = null;
    inFlightContentPromise = null;
};

// Known Cloudinary CDN replacement for large legacy base64 slides and assets
const HELIOPOLIS_GATE_CDN = 'https://res.cloudinary.com/dwg0hr34g/image/upload/v1791191021/onlyhelio_content/asjvgr1hpcl2ewiff1oh.jpg';
const WHY_HELIOPOLIS_CDN_0 = 'https://res.cloudinary.com/dwg0hr34g/image/upload/v1791191815/onlyhelio_content/i06vyzy64ogqaa4nnt1m.jpg';
const WHY_HELIOPOLIS_CDN_1 = 'https://res.cloudinary.com/dwg0hr34g/image/upload/v1791191816/onlyhelio_content/n0vlochxlqhbhsgmcb9d.jpg';
const LOGO_CDN = 'https://res.cloudinary.com/dwg0hr34g/image/upload/v1791191828/onlyhelio_content/rpw2wpht2j1ktsear2dz.jpg';

/**
 * Sanitizes large base64 data URIs in content to prevent megabyte-scale payload overhead
 */
const sanitizeContentPayload = (content: any): any => {
    if (!content || typeof content !== 'object') return content;
    
    // Sanitize hero images if they contain huge data URIs
    if (content.hero?.images && Array.isArray(content.hero.images)) {
        content.hero.images = content.hero.images.map((img: any) => {
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
    if (content.whyNewHeliopolis?.images && Array.isArray(content.whyNewHeliopolis.images)) {
        const cdnList = [WHY_HELIOPOLIS_CDN_0, WHY_HELIOPOLIS_CDN_1];
        content.whyNewHeliopolis.images = content.whyNewHeliopolis.images.map((img: any, idx: number) => {
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
    if (typeof content.logoUrl === 'string' && content.logoUrl.startsWith('data:')) {
        content.logoUrl = LOGO_CDN;
    }

    return content;
};

export const getContent = async (): Promise<SiteContent> => {
    const now = Date.now();
    if (cachedContent && (now - cachedContent.timestamp) < CACHE_TTL_MS) {
        return cachedContent.data;
    }

    if (inFlightContentPromise) {
        return inFlightContentPromise;
    }

    inFlightContentPromise = (async () => {
        try {
            let baseContent: any = null;

            // Direct query to authoritative Supabase site_content table
            const { data: mainContent, error } = await supabase
                .from('site_content')
                .select('content')
                .eq('key', 'main_content')
                .maybeSingle();

            if (error) {
                console.warn('Supabase site_content query notice:', error.message);
                // Return cached data or fallback rather than throwing and crashing the UI
                if (cachedContent) {
                    return cachedContent.data;
                }
            } else if (mainContent?.content) {
                baseContent = sanitizeContentPayload(mainContent.content);
            }

            const sourceData = baseContent || fallbackData;

            // Deep merge safely with fallbackData so no keys are ever undefined
            const mergedContent: SiteContent = {
                ...fallbackData,
                ...sourceData,
                hero: { 
                    ...fallbackData.hero, 
                    ...(sourceData.hero || {}),
                    images: (sourceData.hero?.images && sourceData.hero.images.length > 0) 
                        ? sourceData.hero.images 
                        : fallbackData.hero.images
                },
                footer: { ...fallbackData.footer, ...(sourceData.footer || {}) },
                contactConfiguration: { ...fallbackData.contactConfiguration, ...(sourceData.contactConfiguration || {}) },
                services: { ...fallbackData.services, ...(sourceData.services || {}) },
                whyNewHeliopolis: { 
                    ...fallbackData.whyNewHeliopolis, 
                    ...(sourceData.whyNewHeliopolis || {}),
                    images: (sourceData.whyNewHeliopolis?.images && sourceData.whyNewHeliopolis.images.length > 0)
                        ? sourceData.whyNewHeliopolis.images
                        : fallbackData.whyNewHeliopolis.images
                },
                whyUs: { ...fallbackData.whyUs, ...(sourceData.whyUs || {}) },
                socialProof: { ...fallbackData.socialProof, ...(sourceData.socialProof || {}) },
                partners: { ...fallbackData.partners, ...(sourceData.partners || {}) },
                testimonials: { ...fallbackData.testimonials, ...(sourceData.testimonials || {}) },
                homeCTA: { ...fallbackData.homeCTA, ...(sourceData.homeCTA || {}) },
                homeListings: { ...fallbackData.homeListings, ...(sourceData.homeListings || {}) },
                finishingServices: (sourceData.finishingServices && sourceData.finishingServices.length > 0)
                    ? sourceData.finishingServices 
                    : fallbackData.finishingServices,
            };

            cachedContent = { data: mergedContent, timestamp: Date.now() };
            return mergedContent;
        } catch (err) {
            console.warn('Unexpected error in getContent, using fallback:', err);
            return cachedContent ? cachedContent.data : fallbackData;
        } finally {
            inFlightContentPromise = null;
        }
    })();

    return inFlightContentPromise;
};

export const updateContent = async (updates: Partial<SiteContent>): Promise<SiteContent> => {
    requirePermission(Permission.MANAGE_SITE_CONTENT);
    const current = await getContent();
    const newContent = { ...current, ...updates };

    invalidateContentCache();

    // 1. Broadcast in-memory event across components in the current tab
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('onlyhelio_content_updated', { detail: newContent }));
        }
    } catch {}

    // 2. Authoritative save to Supabase site_content
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'main_content', content: newContent });

    if (error) {
        console.error('Supabase site_content sync error:', error.message);
        throw new Error(`Failed to save site content: ${error.message}`);
    }

    cachedContent = { data: newContent, timestamp: Date.now() };
    return newContent;
};

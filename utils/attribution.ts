/**
 * ONLY HELIO — Marketing & Lead Attribution Engine
 * Preserves acquisition information:
 * - source (property_page, whatsapp, call, inquiry_form, contact_page)
 * - utm_source, utm_medium, utm_campaign, utm_term, utm_content
 * - referrer / referral
 * - landing_page
 * - property / page origin
 */

export interface LeadAttribution {
    source?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    referrer?: string;
    landingPage?: string;
    pageOrigin?: string;
    propertyId?: string;
    propertyTitle?: string;
    capturedAt?: string;
}

const STORAGE_KEY = 'onlyhelio_attribution_session';

/**
 * Initializes and persists attribution data from URL query params and referrer.
 * Should be called once on application mount.
 */
export const initAttribution = (): LeadAttribution => {
    if (typeof window === 'undefined') return {};

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const utmSource = urlParams.get('utm_source') || urlParams.get('source');
        const utmMedium = urlParams.get('utm_medium');
        const utmCampaign = urlParams.get('utm_campaign');
        const utmTerm = urlParams.get('utm_term');
        const utmContent = urlParams.get('utm_content');
        const refParam = urlParams.get('ref') || urlParams.get('referrer');

        const referrer = document.referrer || '';
        const currentPath = window.location.pathname;

        // Check if we already have attribution in session
        const existingRaw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
        let existing: LeadAttribution = {};
        if (existingRaw) {
            try {
                existing = JSON.parse(existingRaw);
            } catch {
                existing = {};
            }
        }

        // New attribution takes precedence if UTM parameters exist in current URL
        const hasNewUtm = Boolean(utmSource || utmCampaign || utmMedium);

        const updated: LeadAttribution = {
            utmSource: hasNewUtm ? (utmSource || undefined) : (existing.utmSource || (referrer ? getReferrerDomain(referrer) : 'direct')),
            utmMedium: hasNewUtm ? (utmMedium || undefined) : existing.utmMedium,
            utmCampaign: hasNewUtm ? (utmCampaign || undefined) : existing.utmCampaign,
            utmTerm: hasNewUtm ? (utmTerm || undefined) : existing.utmTerm,
            utmContent: hasNewUtm ? (utmContent || undefined) : existing.utmContent,
            referrer: hasNewUtm && refParam ? refParam : (existing.referrer || referrer || 'direct'),
            landingPage: existing.landingPage || currentPath,
            capturedAt: existing.capturedAt || new Date().toISOString(),
        };

        const json = JSON.stringify(updated);
        sessionStorage.setItem(STORAGE_KEY, json);
        localStorage.setItem(STORAGE_KEY, json);

        return updated;
    } catch (e) {
        console.error('Error initializing attribution:', e);
        return {};
    }
};

/**
 * Gets the current stored attribution enriched with any context data.
 */
export const getAttribution = (context?: {
    source?: string;
    propertyId?: string;
    propertyTitle?: string;
    pageOrigin?: string;
}): LeadAttribution => {
    if (typeof window === 'undefined') {
        return {
            source: context?.source || 'direct',
            propertyId: context?.propertyId,
            propertyTitle: context?.propertyTitle,
            pageOrigin: context?.pageOrigin,
        };
    }

    try {
        const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
        const stored: LeadAttribution = raw ? JSON.parse(raw) : {};

        return {
            ...stored,
            source: context?.source || stored.source || (context?.propertyId ? 'property_page' : 'inquiry_form'),
            propertyId: context?.propertyId || stored.propertyId,
            propertyTitle: context?.propertyTitle || stored.propertyTitle,
            pageOrigin: context?.pageOrigin || window.location.pathname,
        };
    } catch {
        return {
            source: context?.source || 'inquiry_form',
            propertyId: context?.propertyId,
            pageOrigin: typeof window !== 'undefined' ? window.location.pathname : '',
        };
    }
};

const getReferrerDomain = (url: string): string => {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace('www.', '');
    } catch {
        return url.slice(0, 50);
    }
};

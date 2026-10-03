import { supabase } from '../lib/supabase';
import type { SiteContent } from '../types';
import { siteContentData as fallbackData } from '../data/content';

const CONTENT_STORAGE_KEY = 'onlyhelio_site_content_override';

export const getContent = async (): Promise<SiteContent> => {
    let baseContent: any = null;

    // 1. Try local server persistence API first
    try {
        const res = await fetch('/api/site-content');
        if (res.ok) {
            const serverData = await res.json();
            if (serverData && typeof serverData === 'object' && Object.keys(serverData).length > 0) {
                baseContent = serverData;
            }
        }
    } catch (e) {
        // Server API not reachable in current context, continue to next source
    }

    // 2. If not from server, try Supabase site_content table
    if (!baseContent) {
        try {
            const { data: mainContent, error } = await supabase
                .from('site_content')
                .select('content')
                .eq('key', 'main_content')
                .single();

            if (!error && mainContent?.content) {
                baseContent = mainContent.content;
            }
        } catch (e) {
            // Supabase fetch note
        }
    }

    // 3. Check browser localStorage override if admin made local edits
    let localOverride: any = null;
    try {
        const stored = localStorage.getItem(CONTENT_STORAGE_KEY);
        if (stored) {
            localOverride = JSON.parse(stored);
        }
    } catch (e) {}

    const sourceData = localOverride || baseContent || fallbackData;

    // Merge properly with fallbackData so no keys are ever undefined
    const mergedContent: SiteContent = {
        ...fallbackData,
        ...sourceData,
        hero: { ...fallbackData.hero, ...(sourceData.hero || {}) },
        footer: { ...fallbackData.footer, ...(sourceData.footer || {}) },
        contactConfiguration: { ...fallbackData.contactConfiguration, ...(sourceData.contactConfiguration || {}) },
        finishingServices: sourceData.finishingServices !== undefined 
            ? sourceData.finishingServices 
            : fallbackData.finishingServices,
    };

    return mergedContent;
};

export const updateContent = async (updates: Partial<SiteContent>): Promise<SiteContent> => {
    const current = await getContent();
    const newContent = { ...current, ...updates };

    // 1. Save to localStorage for instant local availability
    try {
        localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(newContent));
    } catch (e) {}

    // 2. Save to persistent server API
    try {
        await fetch('/api/site-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newContent)
        });
    } catch (e) {
        console.warn('Server API content save warning:', e);
    }

    // 3. Attempt to save to Supabase site_content
    try {
        const { error } = await supabase
            .from('site_content')
            .upsert({ key: 'main_content', content: newContent });

        if (error) {
            console.warn('Supabase site_content sync note:', error.message);
        }
    } catch (e) {
        console.warn('Supabase background sync exception:', e);
    }

    return newContent;
};

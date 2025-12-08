
import { supabase } from '../lib/supabase';
import type { SiteContent } from '../types';
import { siteContentData as fallbackData } from '../data/content';

export const getContent = async (): Promise<SiteContent> => {
    try {
        // Fetch main content settings
        const { data: mainContent, error } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', 'main_content')
            .single();
        
        // Fetch banners specifically if stored separately
        const { data: bannersData } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', 'banners')
            .single();

        if (error || !mainContent) {
            console.warn("Supabase: fetching content failed, using fallback.", error);
            return JSON.parse(JSON.stringify(fallbackData));
        }

        const dbContent = mainContent.content;

        // Construct the full SiteContent object
        // We merge with fallback ONLY for structural safety, but DB values overwrite everything
        const mergedContent: SiteContent = {
            ...fallbackData, // Base structure
            ...dbContent,    // Overwrite with DB data
            
            // Explicitly handle nested objects to ensure partial DB updates don't break the app
            hero: { ...fallbackData.hero, ...(dbContent.hero || {}) },
            footer: { ...fallbackData.footer, ...(dbContent.footer || {}) },
            contactConfiguration: { ...fallbackData.contactConfiguration, ...(dbContent.contactConfiguration || {}) },
            
            // Ensure finishing services are pulled from DB if they exist
            finishingServices: dbContent.finishingServices?.length > 0 
                ? dbContent.finishingServices 
                : fallbackData.finishingServices,
                
            // Inject banners if they were fetched separately
            // banners: bannersData?.content || [] 
        };

        return mergedContent;

    } catch (e) {
        console.error("Failed to fetch content", e);
        return JSON.parse(JSON.stringify(fallbackData));
    }
};

export const updateContent = async (updates: Partial<SiteContent>): Promise<SiteContent> => {
    // 1. Get current content to ensure we don't overwrite with partial data
    const current = await getContent();
    
    // 2. Merge updates
    const newContent = { ...current, ...updates };
    
    // 3. Save back to Supabase
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'main_content', content: newContent });

    if (error) throw error;
    return newContent;
};

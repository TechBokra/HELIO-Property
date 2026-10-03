
import { supabase } from '../lib/supabase';
import type { SiteContent } from '../types';
import { siteContentData as fallbackData } from '../data/content';

export const getContent = async (): Promise<SiteContent> => {
    try {
        // محاولة جلب البيانات من Supabase
        const { data: mainContent, error } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', 'main_content')
            .single();

        if (error || !mainContent) {
            // سجل التحذير فقط في بيئة التطوير المحلية
            if (process.env.NODE_ENV === 'development' && !window.location.hostname.includes('vercel.app')) {
                console.warn("Supabase: Using local fallback content. (DB unreachable or empty)");
            }
            return JSON.parse(JSON.stringify(fallbackData));
        }

        const dbContent = mainContent.content;

        // دمج البيانات من القاعدة مع الهيكل الأساسي لضمان عدم وجود حقول ناقصة
        const mergedContent: SiteContent = {
            ...fallbackData, 
            ...dbContent,    
            hero: { ...fallbackData.hero, ...(dbContent.hero || {}) },
            footer: { ...fallbackData.footer, ...(dbContent.footer || {}) },
            contactConfiguration: { ...fallbackData.contactConfiguration, ...(dbContent.contactConfiguration || {}) },
            finishingServices: dbContent.finishingServices !== undefined 
                ? dbContent.finishingServices 
                : fallbackData.finishingServices,
        };

        return mergedContent;

    } catch (e) {
        // في حال حدوث خطأ فادح في الاتصال (Network Error)
        if (process.env.NODE_ENV === 'development') {
            console.error("Content Service Error:", e);
        }
        return JSON.parse(JSON.stringify(fallbackData));
    }
};

export const updateContent = async (updates: Partial<SiteContent>): Promise<SiteContent> => {
    const current = await getContent();
    const newContent = { ...current, ...updates };
    
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'main_content', content: newContent });

    if (error) throw error;
    return newContent;
};

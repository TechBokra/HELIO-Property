
import { supabase } from '../lib/supabase';
import type { Banner } from '../types';

// Banners are stored in 'site_content' table under key 'banners'
// This is a simple key-value storage pattern for lists that don't need heavy relational queries

let cachedBanners: { data: Banner[]; timestamp: number } | null = null;
let inFlightBannersPromise: Promise<Banner[]> | null = null;
const BANNERS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export const invalidateBannersCache = () => {
    cachedBanners = null;
    inFlightBannersPromise = null;
};

export const getAllBanners = async (): Promise<Banner[]> => {
    const now = Date.now();
    if (cachedBanners && (now - cachedBanners.timestamp) < BANNERS_CACHE_TTL) {
        return cachedBanners.data;
    }

    if (inFlightBannersPromise) {
        return inFlightBannersPromise;
    }

    inFlightBannersPromise = (async () => {
        try {
            const { data, error } = await supabase
                .from('site_content')
                .select('content')
                .eq('key', 'banners')
                .maybeSingle();
            
            if (error) {
                console.warn("Supabase notice fetching banners:", error.message);
                return cachedBanners ? cachedBanners.data : [];
            }
            
            const banners = Array.isArray(data?.content) ? (data.content as Banner[]) : [];
            cachedBanners = { data: banners, timestamp: Date.now() };
            return banners;
        } catch (e) {
            console.warn("Exception fetching banners, returning fallback:", e);
            return cachedBanners ? cachedBanners.data : [];
        } finally {
            inFlightBannersPromise = null;
        }
    })();

    return inFlightBannersPromise;
};

export const addBanner = async (banner: Omit<Banner, 'id'>): Promise<Banner> => {
    const banners = await getAllBanners();
    const newBanner: Banner = {
        ...banner,
        id: `banner-${Date.now()}`,
    };
    
    const newBanners = [newBanner, ...banners];
    
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'banners', content: newBanners });

    if (error) throw error;
    return newBanner;
};

export const updateBanner = async (bannerId: string, updates: Partial<Banner>): Promise<Banner | undefined> => {
    const banners = await getAllBanners();
    const index = banners.findIndex(b => b.id === bannerId);
    
    if (index === -1) return undefined;
    
    const updatedBanner = { ...banners[index], ...updates };
    banners[index] = updatedBanner;
    
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'banners', content: banners });

    if (error) throw error;
    return updatedBanner;
};

export const deleteBanner = async (bannerId: string): Promise<boolean> => {
    const banners = await getAllBanners();
    const filteredBanners = banners.filter(b => b.id !== bannerId);
    
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'banners', content: filteredBanners });

    return !error;
};


import { supabase } from '../lib/supabase';
import type { Banner } from '../types';

// Banners are stored in 'site_content' table under key 'banners'
// This is a simple key-value storage pattern for lists that don't need heavy relational queries

export const getAllBanners = async (): Promise<Banner[]> => {
    const { data, error } = await supabase
        .from('site_content')
        .select('content')
        .eq('key', 'banners')
        .single();
    
    if (error) {
        // If not found, return empty array
        return [];
    }
    
    return data.content as Banner[];
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

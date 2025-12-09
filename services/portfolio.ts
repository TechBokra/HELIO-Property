
import { supabase } from '../lib/supabase';
import type { PortfolioItem } from '../types';
import { portfolioData as fallbackPortfolio } from '../data/portfolio';

const mapPortfolioFromDb = (row: any): PortfolioItem => ({
    id: row.id,
    partnerId: row.partner_id,
    imageUrl: row.image_url,
    alt: row.title_en || 'Portfolio Item',
    title: { ar: row.title_ar, en: row.title_en },
    category: { ar: row.category_ar, en: row.category_en },
    price: row.price,
    dimensions: row.dimensions,
    availability: row.availability,
    createdAt: row.created_at
});

export const getAllPortfolioItems = async (): Promise<PortfolioItem[]> => {
    try {
        const { data, error } = await supabase.from('portfolio_items').select('*');
        if (error || !data || data.length === 0) {
            return fallbackPortfolio;
        }
        return data.map(mapPortfolioFromDb);
    } catch (e) {
        return fallbackPortfolio;
    }
};

export const getPortfolioByPartnerId = async (partnerId: string): Promise<PortfolioItem[]> => {
    try {
        const { data, error } = await supabase.from('portfolio_items').select('*').eq('partner_id', partnerId);
        if (error || !data || data.length === 0) {
            return fallbackPortfolio.filter(i => i.partnerId === partnerId);
        }
        return data.map(mapPortfolioFromDb);
    } catch (e) {
        return fallbackPortfolio.filter(i => i.partnerId === partnerId);
    }
};

export const addPortfolioItem = async (item: Omit<PortfolioItem, 'id'>): Promise<PortfolioItem> => {
    const dbPayload = {
        partner_id: item.partnerId,
        image_url: item.imageUrl,
        title_ar: item.title.ar,
        title_en: item.title.en,
        category_ar: item.category.ar,
        category_en: item.category.en,
        price: item.price,
        dimensions: item.dimensions,
        availability: item.availability
    };
    
    const { data, error } = await supabase.from('portfolio_items').insert(dbPayload).select().single();
    if (error) throw error;
    return mapPortfolioFromDb(data);
};

export const updatePortfolioItem = async (itemId: string, updates: Partial<PortfolioItem>): Promise<PortfolioItem | undefined> => {
    const dbUpdates: any = {};
    if (updates.title) { dbUpdates.title_ar = updates.title.ar; dbUpdates.title_en = updates.title.en; }
    if (updates.price) dbUpdates.price = updates.price;
    
    const { data, error } = await supabase.from('portfolio_items').update(dbUpdates).eq('id', itemId).select().single();
    if (error) return undefined;
    return mapPortfolioFromDb(data);
};

export const deletePortfolioItem = async (itemId: string): Promise<boolean> => {
    const { error } = await supabase.from('portfolio_items').delete().eq('id', itemId);
    return !error;
};

import { supabase } from '../lib/supabase';
import type { PortfolioItem } from '../types';

const mapPortfolioFromDb = (row: any): PortfolioItem => ({
    id: row.id,
    partnerId: row.partner_id,
    imageUrl: row.image_url,
    alt: row.title_en || 'Portfolio Item',
    title: { ar: row.title_ar, en: row.title_en },
    category: { ar: row.category_ar, en: row.category_en },
    price: row.price ? Number(row.price) : undefined,
    dimensions: row.dimensions,
    availability: row.availability,
    createdAt: row.created_at
});

export const getAllPortfolioItems = async (): Promise<PortfolioItem[]> => {
    const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching portfolio items from Supabase:', error);
        throw new Error(`Failed to load portfolio items: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return [];
    }

    return data.map(mapPortfolioFromDb);
};

export const getPortfolioByPartnerId = async (partnerId: string): Promise<PortfolioItem[]> => {
    const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching partner portfolio from Supabase:', error);
        throw new Error(`Failed to load partner portfolio items: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return [];
    }

    return data.map(mapPortfolioFromDb);
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
        availability: item.availability || 'Made to Order',
        created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
        .from('portfolio_items')
        .insert(dbPayload)
        .select()
        .single();

    if (error) {
        console.error('Error inserting portfolio item into Supabase:', error);
        throw new Error(`Failed to add portfolio item: ${error.message}`);
    }

    return mapPortfolioFromDb(data);
};

export const updatePortfolioItem = async (itemId: string, updates: Partial<PortfolioItem>): Promise<PortfolioItem | undefined> => {
    const dbUpdates: any = {};
    if (updates.title) { 
        dbUpdates.title_ar = updates.title.ar; 
        dbUpdates.title_en = updates.title.en; 
    }
    if (updates.category) {
        dbUpdates.category_ar = updates.category.ar;
        dbUpdates.category_en = updates.category.en;
    }
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.dimensions !== undefined) dbUpdates.dimensions = updates.dimensions;
    if (updates.availability !== undefined) dbUpdates.availability = updates.availability;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
    
    const { data, error } = await supabase
        .from('portfolio_items')
        .update(dbUpdates)
        .eq('id', itemId)
        .select()
        .single();

    if (error) {
        console.error('Error updating portfolio item in Supabase:', error);
        throw new Error(`Failed to update portfolio item: ${error.message}`);
    }

    return mapPortfolioFromDb(data);
};

export const deletePortfolioItem = async (itemId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', itemId);

    if (error) {
        console.error('Error deleting portfolio item from Supabase:', error);
        throw new Error(`Failed to delete portfolio item: ${error.message}`);
    }

    return true;
};

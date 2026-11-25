import { supabase, supabasePublic } from '../lib/supabase';
import type { PortfolioItem } from '../types';
import { resolveServiceReferenceCode } from '../utils/propertyFormShared';

const mapPortfolioFromDb = (row: any): PortfolioItem => ({
    id: row.id,
    partnerId: row.partner_id,
    categoryId: row.category_id || undefined,
    referenceNumber: resolveServiceReferenceCode('decoration', row.id),
    imageUrl: row.image_url,
    alt: row.title_en || row.title_ar || 'Portfolio Item',
    title: { ar: row.title_ar || '', en: row.title_en || '' },
    category: { ar: row.category_ar || '', en: row.category_en || '' },
    price: row.price !== undefined && row.price !== null ? Number(row.price) : undefined,
    dimensions: row.dimensions || undefined,
    availability: row.availability || undefined,
    createdAt: row.created_at
});

export const getAllPortfolioItems = async (options?: { client?: any; throwOnError?: boolean }): Promise<PortfolioItem[]> => {
    const readClient = options?.client || supabasePublic;
    const { data, error } = await readClient
        .from('portfolio_items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Notice fetching portfolio items from Supabase:', error.message || error);
        if (options?.throwOnError) {
            throw new Error(`Failed to fetch portfolio items: ${error.message}`);
        }
        return [];
    }

    return (data || []).map(mapPortfolioFromDb);
};

export const getPortfolioByPartnerId = async (partnerId: string, options?: { client?: any }): Promise<PortfolioItem[]> => {
    if (!partnerId) return [];
    const readClient = options?.client || supabasePublic;
    const { data, error } = await readClient
        .from('portfolio_items')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Notice fetching partner portfolio from Supabase:', error.message || error);
        return [];
    }

    return (data || []).map(mapPortfolioFromDb);
};

export const getPortfolioItemById = async (itemId: string, options?: { client?: any }): Promise<PortfolioItem | undefined> => {
    if (!itemId) return undefined;
    const readClient = options?.client || supabasePublic;
    const { data, error } = await readClient
        .from('portfolio_items')
        .select('*')
        .eq('id', itemId)
        .maybeSingle();

    if (error || !data) return undefined;
    return mapPortfolioFromDb(data);
};

export const addPortfolioItem = async (
    item: Omit<PortfolioItem, 'id'>,
    options?: { client?: any }
): Promise<PortfolioItem> => {
    const dbClient = options?.client || supabase;
    const dbPayload: any = {
        partner_id: item.partnerId,
        category_id: item.categoryId || null,
        image_url: item.imageUrl,
        title_ar: item.title.ar,
        title_en: item.title.en,
        category_ar: item.category?.ar || '',
        category_en: item.category?.en || '',
        price: item.price !== undefined && item.price !== null && item.price !== ('' as any) ? Number(item.price) : null,
        dimensions: item.dimensions || null,
        availability: item.availability || 'Made to Order',
        created_at: new Date().toISOString()
    };

    const { data, error } = await dbClient
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

export const updatePortfolioItem = async (
    itemId: string,
    updates: Partial<PortfolioItem>,
    options?: { client?: any }
): Promise<PortfolioItem | undefined> => {
    const dbClient = options?.client || supabase;
    const dbUpdates: any = {};
    if (updates.partnerId !== undefined) dbUpdates.partner_id = updates.partnerId;
    if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId || null;
    if (updates.title) {
        dbUpdates.title_ar = updates.title.ar;
        dbUpdates.title_en = updates.title.en;
    }
    if (updates.category) {
        dbUpdates.category_ar = updates.category.ar;
        dbUpdates.category_en = updates.category.en;
    }
    if (updates.price !== undefined) {
        dbUpdates.price = updates.price !== null && updates.price !== ('' as any) ? Number(updates.price) : null;
    }
    if (updates.dimensions !== undefined) dbUpdates.dimensions = updates.dimensions || null;
    if (updates.availability !== undefined) dbUpdates.availability = updates.availability;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;

    const { data, error } = await dbClient
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

export const deletePortfolioItem = async (itemId: string, options?: { client?: any }): Promise<boolean> => {
    const dbClient = options?.client || supabase;
    const { error } = await dbClient
        .from('portfolio_items')
        .delete()
        .eq('id', itemId);

    if (error) {
        console.error('Error deleting portfolio item from Supabase:', error);
        throw new Error(`Failed to delete portfolio item: ${error.message}`);
    }

    return true;
};

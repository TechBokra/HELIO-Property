import { supabase } from '../lib/supabase';
import type { FavoriteItem } from '../types';

export const fetchFavoritesFromDb = async (userId: string): Promise<FavoriteItem[]> => {
    if (!userId) return [];

    try {
        const { data, error } = await supabase
            .from('customer_favorites')
            .select('item_id, item_type')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch favorites from Supabase:', error.message);
            return [];
        }

        return (data || []).map(row => ({
            id: row.item_id,
            type: row.item_type as 'property' | 'service' | 'portfolio'
        }));
    } catch (err) {
        console.error('Network error fetching customer favorites:', err);
        return [];
    }
};

export const addFavoriteToDb = async (userId: string, itemId: string, itemType: string): Promise<boolean> => {
    if (!userId || !itemId) return false;

    try {
        const { error } = await supabase
            .from('customer_favorites')
            .upsert(
                {
                    user_id: userId,
                    item_id: itemId,
                    item_type: itemType,
                    created_at: new Date().toISOString()
                },
                { onConflict: 'user_id,item_id,item_type' }
            );

        if (error) {
            console.error('Failed to persist favorite to Supabase:', error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Network error adding favorite to Supabase:', err);
        return false;
    }
};

export const removeFavoriteFromDb = async (userId: string, itemId: string, itemType: string): Promise<boolean> => {
    if (!userId || !itemId) return false;

    try {
        const { error } = await supabase
            .from('customer_favorites')
            .delete()
            .eq('user_id', userId)
            .eq('item_id', itemId)
            .eq('item_type', itemType);

        if (error) {
            console.error('Failed to delete favorite from Supabase:', error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Network error removing favorite from Supabase:', err);
        return false;
    }
};

import { supabase } from '../lib/supabase';
import type { DecorationCategory } from '../types';

// Helper to map DB row to DecorationCategory
const mapCategoryFromDb = (row: any): DecorationCategory => ({
    id: row.id,
    name: { ar: row.name_ar, en: row.name_en },
    description: { ar: row.description_ar, en: row.description_en }
});

export const getDecorationCategories = async (): Promise<DecorationCategory[]> => {
    try {
        const { data, error } = await supabase
            .from('decoration_categories')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching decoration categories from Supabase:', error.message);
            return [];
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data.map(mapCategoryFromDb);
    } catch (err: any) {
        console.error('Exception loading decoration categories from Supabase:', err?.message);
        return [];
    }
};

export const addDecorationCategory = async (category: Omit<DecorationCategory, 'id'>): Promise<DecorationCategory> => {
    const dbPayload = {
        name_ar: category.name.ar,
        name_en: category.name.en,
        description_ar: category.description.ar,
        description_en: category.description.en,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('decoration_categories')
        .insert(dbPayload)
        .select()
        .single();

    if (error) {
        console.error('Error creating decoration category in Supabase:', error);
        throw new Error(`Failed to create decoration category: ${error.message}`);
    }

    return mapCategoryFromDb(data);
};

export const updateDecorationCategory = async (categoryId: string, updates: Partial<DecorationCategory>): Promise<DecorationCategory | undefined> => {
    const dbUpdates: any = {
        updated_at: new Date().toISOString()
    };
    if (updates.name) {
        dbUpdates.name_ar = updates.name.ar;
        dbUpdates.name_en = updates.name.en;
    }
    if (updates.description) {
        dbUpdates.description_ar = updates.description.ar;
        dbUpdates.description_en = updates.description.en;
    }

    const { data, error } = await supabase
        .from('decoration_categories')
        .update(dbUpdates)
        .eq('id', categoryId)
        .select()
        .single();

    if (error) {
        console.error('Error updating decoration category in Supabase:', error);
        throw new Error(`Failed to update decoration category: ${error.message}`);
    }

    return mapCategoryFromDb(data);
};

export const deleteDecorationCategory = async (categoryId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('decoration_categories')
        .delete()
        .eq('id', categoryId);

    if (error) {
        console.error('Error deleting decoration category in Supabase:', error);
        throw new Error(`Failed to delete decoration category: ${error.message}`);
    }

    return true;
};

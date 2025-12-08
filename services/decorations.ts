
import { supabase } from '../lib/supabase';
import type { DecorationCategory } from '../types';

// Helper to map DB row to DecorationCategory
const mapCategoryFromDb = (row: any): DecorationCategory => ({
    id: row.id,
    name: { ar: row.name_ar, en: row.name_en },
    description: { ar: row.description_ar, en: row.description_en }
});

export const getDecorationCategories = async (): Promise<DecorationCategory[]> => {
    const { data, error } = await supabase
        .from('decoration_categories')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data.map(mapCategoryFromDb);
};

export const addDecorationCategory = async (category: Omit<DecorationCategory, 'id'>): Promise<DecorationCategory> => {
    const dbPayload = {
        name_ar: category.name.ar,
        name_en: category.name.en,
        description_ar: category.description.ar,
        description_en: category.description.en,
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('decoration_categories')
        .insert(dbPayload)
        .select()
        .single();

    if (error) throw error;
    return mapCategoryFromDb(data);
};

export const updateDecorationCategory = async (categoryId: string, updates: Partial<DecorationCategory>): Promise<DecorationCategory | undefined> => {
    const dbUpdates: any = {};
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

    if (error) return undefined;
    return mapCategoryFromDb(data);
};

export const deleteDecorationCategory = async (categoryId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('decoration_categories')
        .delete()
        .eq('id', categoryId);

    return !error;
};

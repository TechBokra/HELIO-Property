
import { supabase } from '../lib/supabase';
import type { FilterOption } from '../types';

// Helper to map DB row to FilterOption
const mapOptionFromDb = (row: any): FilterOption => ({
    id: row.id,
    en: row.name_en,
    ar: row.name_ar,
    applicableTo: row.applicable_to || undefined
});

// --- Getters ---

export const getAllPropertyTypes = async (): Promise<FilterOption[]> => {
    const { data, error } = await supabase.from('property_types').select('*');
    if (error) throw error;
    return data.map(mapOptionFromDb);
};

export const getAllFinishingStatuses = async (): Promise<FilterOption[]> => {
    const { data, error } = await supabase.from('finishing_statuses').select('*');
    if (error) throw error;
    return data.map(mapOptionFromDb);
};

export const getAllAmenities = async (): Promise<FilterOption[]> => {
    const { data, error } = await supabase.from('amenities').select('*');
    if (error) throw error;
    return data.map(mapOptionFromDb);
};

// --- Mutations ---

export const addFilterOption = async (
    dataType: 'propertyType' | 'finishingStatus' | 'amenity', 
    item: Omit<FilterOption, 'id'>
): Promise<FilterOption> => {
    const tableName = 
        dataType === 'propertyType' ? 'property_types' : 
        dataType === 'finishingStatus' ? 'finishing_statuses' : 'amenities';

    const dbPayload = {
        name_en: item.en,
        name_ar: item.ar,
        applicable_to: item.applicableTo
    };

    const { data, error } = await supabase
        .from(tableName)
        .insert(dbPayload)
        .select()
        .single();

    if (error) throw error;
    return mapOptionFromDb(data);
};

export const updateFilterOption = async (
    dataType: 'propertyType' | 'finishingStatus' | 'amenity', 
    item: FilterOption
): Promise<FilterOption | null> => {
    const tableName = 
        dataType === 'propertyType' ? 'property_types' : 
        dataType === 'finishingStatus' ? 'finishing_statuses' : 'amenities';

    const dbUpdates = {
        name_en: item.en,
        name_ar: item.ar,
        applicable_to: item.applicableTo
    };

    const { data, error } = await supabase
        .from(tableName)
        .update(dbUpdates)
        .eq('id', item.id)
        .select()
        .single();

    if (error) return null;
    return mapOptionFromDb(data);
};

export const deleteFilterOption = async (
    dataType: 'propertyType' | 'finishingStatus' | 'amenity', 
    itemId: string
): Promise<boolean> => {
    const tableName = 
        dataType === 'propertyType' ? 'property_types' : 
        dataType === 'finishingStatus' ? 'finishing_statuses' : 'amenities';

    const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemId);

    return !error;
};

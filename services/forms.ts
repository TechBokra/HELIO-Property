
import { supabase } from '../lib/supabase';
import { Permission, type FormDefinition } from '../types';
import { formsData as fallbackForms } from '../data/forms';
import { requirePermission } from './authGuard';

export const getAllForms = async (): Promise<FormDefinition[]> => {
    try {
        const { data, error } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', 'forms_config')
            .single();
        
        if (error || !data) {
            // If table exists but key is missing, return fallback without warning
            return fallbackForms;
        }
        return data.content as FormDefinition[];
    } catch (e) {
        console.warn("Error fetching forms form DB, using fallback", e);
        return fallbackForms;
    }
};

export const getFormById = async (id: string): Promise<FormDefinition | undefined> => {
    const forms = await getAllForms();
    return forms.find(f => f.id === id);
};

export const getFormBySlug = async (slug: string): Promise<FormDefinition | undefined> => {
    const forms = await getAllForms();
    return forms.find(f => f.slug === slug);
};

export const saveForm = async (form: FormDefinition): Promise<FormDefinition> => {
    requirePermission(Permission.MANAGE_FORMS);
    const forms = await getAllForms();
    const index = forms.findIndex(f => f.id === form.id);
    const now = new Date().toISOString();
    
    let newForm: FormDefinition;
    let newFormsList = [...forms];
    
    if (index > -1) {
        // Update existing
        newForm = { ...form, updatedAt: now };
        newFormsList[index] = newForm;
    } else {
        // Create new
        newForm = { ...form, id: form.id || `form-${Date.now()}`, createdAt: now, updatedAt: now };
        newFormsList.push(newForm);
    }
    
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'forms_config', content: newFormsList });

    if (error) throw error;
    return newForm;
};

export const deleteForm = async (id: string): Promise<boolean> => {
    requirePermission(Permission.MANAGE_FORMS);
    let forms = await getAllForms();
    const initialLength = forms.length;
    forms = forms.filter(f => f.id !== id);
    
    if (forms.length === initialLength) return false;

    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'forms_config', content: forms });

    return !error;
};

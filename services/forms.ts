
import { supabase } from '../lib/supabase';
import { formsData as initialData } from '../data/forms';
import type { FormDefinition } from '../types';

export const getAllForms = async (): Promise<FormDefinition[]> => {
    const { data, error } = await supabase
        .from('site_content')
        .select('content')
        .eq('key', 'forms_config')
        .single();
    
    if (error || !data) return initialData;
    return data.content as FormDefinition[];
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
    const forms = await getAllForms();
    const index = forms.findIndex(f => f.id === form.id);
    const now = new Date().toISOString();
    
    let newForm: FormDefinition;
    
    if (index > -1) {
        // Update existing
        newForm = { ...form, updatedAt: now };
        forms[index] = newForm;
    } else {
        // Create new
        newForm = { ...form, id: `form-${Date.now()}`, createdAt: now, updatedAt: now };
        forms.push(newForm);
    }
    
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'forms_config', content: forms });

    if (error) throw error;
    return newForm;
};

export const deleteForm = async (id: string): Promise<boolean> => {
    let forms = await getAllForms();
    const initialLength = forms.length;
    forms = forms.filter(f => f.id !== id);
    
    if (forms.length === initialLength) return false;

    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'forms_config', content: forms });

    return !error;
};

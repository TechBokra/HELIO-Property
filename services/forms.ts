
import { formsData as initialData } from '../data/forms';
import type { FormDefinition } from '../types';

let formsData: FormDefinition[] = [...initialData];
const SIMULATED_DELAY = 300;

export const getAllForms = (): Promise<FormDefinition[]> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve([...formsData]), SIMULATED_DELAY);
    });
};

export const getFormById = (id: string): Promise<FormDefinition | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(formsData.find(f => f.id === id)), SIMULATED_DELAY);
    });
};

export const getFormBySlug = (slug: string): Promise<FormDefinition | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(formsData.find(f => f.slug === slug)), SIMULATED_DELAY);
    });
};

export const saveForm = (form: FormDefinition): Promise<FormDefinition> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const index = formsData.findIndex(f => f.id === form.id);
            const now = new Date().toISOString();
            
            if (index > -1) {
                // Update existing
                formsData[index] = { ...form, updatedAt: now };
                resolve(formsData[index]);
            } else {
                // Create new
                const newForm = { ...form, id: `form-${Date.now()}`, createdAt: now, updatedAt: now };
                formsData.push(newForm);
                resolve(newForm);
            }
        }, SIMULATED_DELAY);
    });
};

export const deleteForm = (id: string): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const initialLength = formsData.length;
            formsData = formsData.filter(f => f.id !== id);
            resolve(formsData.length < initialLength);
        }, SIMULATED_DELAY);
    });
};

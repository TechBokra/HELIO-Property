
import { supabase } from '../lib/supabase';
import type { Project } from '../types';

const mapProjectFromDb = (row: any): Project => {
    const features = typeof row.features === 'string' ? JSON.parse(row.features) : row.features || [];
    return {
        id: row.id,
        partnerId: row.partner_id,
        name: { ar: row.name_ar, en: row.name_en },
        description: { ar: row.description_ar, en: row.description_en },
        imageUrl: row.image_url,
        createdAt: row.created_at,
        features: features,
        imageUrl_small: row.image_url,
        imageUrl_medium: row.image_url,
        imageUrl_large: row.image_url
    };
};

// In-memory cache for high-frequency navigation
let cachedProjects: { data: Project[]; timestamp: number } | null = null;
let inFlightProjectsPromise: Promise<Project[]> | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const invalidateProjectsCache = () => {
    cachedProjects = null;
    inFlightProjectsPromise = null;
};

export const getAllProjects = async (): Promise<Project[]> => {
    const now = Date.now();
    if (cachedProjects && (now - cachedProjects.timestamp) < CACHE_TTL_MS) {
        return cachedProjects.data;
    }

    if (inFlightProjectsPromise) {
        return inFlightProjectsPromise;
    }

    inFlightProjectsPromise = (async () => {
        try {
            const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
            if (error || !data || data.length === 0) {
                return [];
            }
            const mapped = data.map(mapProjectFromDb);
            cachedProjects = { data: mapped, timestamp: Date.now() };
            return mapped;
        } catch (e) {
            return [];
        } finally {
            inFlightProjectsPromise = null;
        }
    })();

    return inFlightProjectsPromise;
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
    try {
        const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
        if (error || !data) {
             return undefined;
        }
        return mapProjectFromDb(data);
    } catch (e) {
        return undefined;
    }
};

export const getProjectsByPartnerId = async (partnerId: string): Promise<Project[]> => {
    try {
        const { data, error } = await supabase.from('projects').select('*').eq('partner_id', partnerId);
        if (error || !data || data.length === 0) {
            return [];
        }
        return data.map(mapProjectFromDb);
    } catch (e) {
        return [];
    }
};

export const addProject = async (project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
    const dbPayload = {
        partner_id: project.partnerId,
        name_ar: project.name.ar,
        name_en: project.name.en,
        description_ar: project.description.ar,
        description_en: project.description.en,
        image_url: project.imageUrl,
        features: JSON.stringify(project.features)
    };
    
    const { data, error } = await supabase.from('projects').insert(dbPayload).select().single();
    if (error) throw error;
    invalidateProjectsCache();
    return mapProjectFromDb(data);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project | undefined> => {
    const dbUpdates: any = {};
    if (updates.name) {
        dbUpdates.name_ar = updates.name.ar;
        dbUpdates.name_en = updates.name.en;
    }
    if (updates.description) {
        dbUpdates.description_ar = updates.description.ar;
        dbUpdates.description_en = updates.description.en;
    }
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
    if (updates.features) dbUpdates.features = JSON.stringify(updates.features);

    const { data, error } = await supabase.from('projects').update(dbUpdates).eq('id', projectId).select().single();
    if (error) return undefined;
    invalidateProjectsCache();
    return mapProjectFromDb(data);
};

export const deleteProject = async (projectId: string): Promise<boolean> => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (!error) invalidateProjectsCache();
    return !error;
};

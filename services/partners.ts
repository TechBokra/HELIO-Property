
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Role, type Partner, type PartnerStatus, type PartnerRequest, type AdminPartner, type SubscriptionPlan, type PartnerType } from '../types';
import { mapPartnerTypeToRole } from '../data/permissions';

// --- HELPER: Isolated Client ---
// We create a temporary client for registration actions to prevent 
// the main 'supabase' client (used by the Admin) from switching sessions 
// when a new user is signed up.
const getTemporaryClient = () => {
    const getEnv = () => {
        try { return (import.meta as any).env || {}; } catch { return {}; }
    };
    const env = getEnv();
    const supabaseUrl = env.VITE_SUPABASE_URL || 'https://xyyvgpchkznznwbxbgrp.supabase.co';
    const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eXZncGNoa3puem53YnhiZ3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTI1MDksImV4cCI6MjA4MTAyODUwOX0.1oRRd_bm3Ug9zXVR5Ae2xelGt0aN6uMP2rKpUu2AGVM';
    
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
};

// Mapper to convert DB row to Partner object
export const mapPartnerFromDb = (row: any): Partner | AdminPartner => {
    const contactMethods = typeof row.contact_methods === 'string' 
        ? JSON.parse(row.contact_methods) 
        : row.contact_methods || { whatsapp: { enabled: false }, phone: { enabled: false }, form: { enabled: true } };

    const resolvedRole = mapPartnerTypeToRole(row.type, row.role);

    const ADMIN_AVATAR_CDN = 'https://res.cloudinary.com/dwg0hr34g/image/upload/v1791191962/onlyhelio_partners/eegvag9kenl9efztmbhi.png';
    const resolvedImageUrl = (typeof row.image_url === 'string' && row.image_url.startsWith('data:'))
        ? ADMIN_AVATAR_CDN
        : row.image_url || (resolvedRole === Role.SUPER_ADMIN ? 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=75&w=400&auto=format&fit=crop' : 'https://via.placeholder.com/150');

    return {
        id: row.id,
        email: row.email,
        imageUrl: resolvedImageUrl,
        type: row.type || (resolvedRole === Role.SUPER_ADMIN ? 'admin' : 'customer'),
        status: row.status || 'active',
        subscriptionPlan: row.subscription_plan || (resolvedRole === Role.SUPER_ADMIN ? 'enterprise' : 'basic'),
        displayType: row.display_type || 'standard',
        role: resolvedRole,
        name: row.name_en || row.name_ar || (resolvedRole === Role.SUPER_ADMIN ? 'Super Admin' : 'User'),
        description: row.description_en || '',
        nameAr: row.name_ar || row.name_en || (resolvedRole === Role.SUPER_ADMIN ? 'المدير العام' : 'مستخدم'),
        descriptionAr: row.description_ar || '',
        contactMethods,
        subscriptionEndDate: row.subscription_end_date,
        parentId: row.parent_id,
        createdAt: row.created_at
    };
};

// In-memory cache for partners during navigation
let cachedPartners: { data: Partner[]; timestamp: number } | null = null;
let inFlightPartnersPromise: Promise<Partner[]> | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const invalidatePartnersCache = () => {
    cachedPartners = null;
    inFlightPartnersPromise = null;
};

export const getAllPartners = async (): Promise<Partner[]> => {
    const now = Date.now();
    if (cachedPartners && (now - cachedPartners.timestamp) < CACHE_TTL_MS) {
        return cachedPartners.data;
    }

    if (inFlightPartnersPromise) {
        return inFlightPartnersPromise;
    }

    inFlightPartnersPromise = (async () => {
        try {
            const { data, error } = await supabase
                .from('partners')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Error fetching partners from Supabase:', error.message);
                if (cachedPartners) {
                    return cachedPartners.data;
                }
                throw new Error(`Failed to load partners: ${error.message}`);
            }

            const mapped = (data || []).map(mapPartnerFromDb);
            cachedPartners = { data: mapped, timestamp: Date.now() };
            return mapped;
        } catch (err) {
            if (cachedPartners) {
                return cachedPartners.data;
            }
            throw err;
        } finally {
            inFlightPartnersPromise = null;
        }
    })();

    return inFlightPartnersPromise;
};

export const getAllPartnersForAdmin = async (): Promise<AdminPartner[]> => {
    const partners = await getAllPartners();
    return partners as AdminPartner[];
};

export const getPartnerById = async (id: string): Promise<Partner | undefined> => {
    const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return undefined;
        console.error('Error fetching partner by ID:', error);
        throw new Error(`Failed to fetch partner: ${error.message}`);
    }

    return data ? mapPartnerFromDb(data) : undefined;
};

export const getPartnerByEmail = async (email: string): Promise<Partner | undefined> => {
    const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return undefined;
        console.error('Error fetching partner by email:', error);
        throw new Error(`Failed to fetch partner: ${error.message}`);
    }

    return data ? mapPartnerFromDb(data) : undefined;
};

// Self-healing function for missing profiles (P0.1 Customer Hardening)
export const createProfileForExistingUser = async (user: any): Promise<Partner> => {
    const rawType = user.user_metadata?.type || 'customer';
    const rawRole = user.user_metadata?.role || 'customer';
    const type: PartnerType = rawType;
    const role: Role = mapPartnerTypeToRole(type, rawRole);

    const dbPayload = {
        id: user.id,
        email: user.email,
        type: type,
        role: role,
        status: 'active',
        subscription_plan: 'basic',
        display_type: 'standard',
        image_url: user.user_metadata?.avatar_url || 'https://via.placeholder.com/150',
        name_ar: user.user_metadata?.name || (user.email?.split('@')[0] || 'عميل'),
        name_en: user.user_metadata?.name || (user.email?.split('@')[0] || 'Customer'),
        description_ar: 'حساب مستخدم في منصة أونلي هيليو',
        description_en: 'User account on ONLY HELIO platform',
        contact_methods: { 
            whatsapp: { enabled: false, number: '' },
            phone: { enabled: false, number: user.user_metadata?.phone || '' },
            form: { enabled: true }
        }
    };

    const { data, error } = await supabase.from('partners').upsert(dbPayload).select().single();
    
    if (error) {
        console.error("Failed to create customer profile for existing user:", error);
        throw error;
    }
    return mapPartnerFromDb(data) as Partner;
};

export const addPartner = async (request: PartnerRequest, password?: string): Promise<Partner> => {
    // Use Temporary Client to avoid logging out the current admin
    const tempSupabase = getTemporaryClient();

    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: request.contactEmail,
        password: password || 'tempPass123!', 
        options: {
            data: {
                name: request.companyName,
                type: request.companyType
            }
        }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Auth user creation failed");

    const newPartnerId = authData.user.id;
    
    const dbPayload = {
        id: newPartnerId,
        email: request.contactEmail,
        type: request.companyType,
        status: 'active',
        subscription_plan: request.subscriptionPlan,
        display_type: 'standard',
        image_url: request.logo || 'https://via.placeholder.com/150',
        name_ar: request.companyName, 
        name_en: request.companyName,
        description_ar: request.description,
        description_en: request.description,
        contact_methods: { 
            whatsapp: { enabled: false, number: '' },
            phone: { enabled: true, number: request.contactPhone },
            form: { enabled: true }
        }
    };

    const { data, error } = await supabase.from('partners').upsert(dbPayload).select().single();
    
    if (error) throw error;
    return mapPartnerFromDb(data);
};

export const addInternalUser = async (userData: any): Promise<AdminPartner> => {
    const tempSupabase = getTemporaryClient();

    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: userData.email,
        password: userData.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Auth user creation failed");

    const newId = authData.user.id;

    const dbPayload = {
        id: newId,
        email: userData.email,
        type: userData.type,
        status: 'active',
        subscription_plan: 'basic',
        name_ar: userData.nameAr,
        name_en: userData.name,
        image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto.format&fit=crop'
    };

    const { data, error } = await supabase.from('partners').upsert(dbPayload).select().single();
    if (error) throw error;
    return mapPartnerFromDb(data) as AdminPartner;
};

export const updatePartner = async (id: string, updates: any): Promise<boolean> => {
    const dbUpdates: any = {};
    if (updates.nameAr) dbUpdates.name_ar = updates.nameAr;
    if (updates.nameEn) dbUpdates.name_en = updates.nameEn;
    if (updates.name) dbUpdates.name_en = updates.name; 
    if (updates.descriptionAr) dbUpdates.description_ar = updates.descriptionAr;
    if (updates.descriptionEn) dbUpdates.description_en = updates.descriptionEn;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.contactMethods) dbUpdates.contact_methods = updates.contactMethods;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.type) dbUpdates.type = updates.type;

    if (updates.password) {
        const { error: authError } = await supabase.auth.updateUser({ password: updates.password });
        if (authError) console.warn("Password update failed (likely permission issue):", authError.message);
    }

    const { error } = await supabase.from('partners').update(dbUpdates).eq('id', id);
    if (!error) invalidatePartnersCache();
    return !error;
};

export const updatePartnerStatus = async (id: string, status: PartnerStatus): Promise<boolean> => {
    const { error } = await supabase.from('partners').update({ status }).eq('id', id);
    if (!error) invalidatePartnersCache();
    return !error;
};

export const updatePartnerAdmin = async (id: string, updates: any): Promise<boolean> => {
    return updatePartner(id, updates);
};

export const upgradePartnerPlan = async (id: string, newPlan: SubscriptionPlan): Promise<boolean> => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    const { error } = await supabase.from('partners').update({ 
        subscription_plan: newPlan,
        subscription_end_date: nextYear.toISOString()
    }).eq('id', id);
    
    if (!error) invalidatePartnersCache();
    return !error;
};

export const deletePartner = async (userId: string): Promise<boolean> => {
    const { error } = await supabase.from('partners').delete().eq('id', userId);
    if (!error) invalidatePartnersCache();
    return !error;
};

export const getTeamMembers = async (parentId: string): Promise<AdminPartner[]> => {
    const { data, error } = await supabase.from('partners').select('*').eq('parent_id', parentId);
    if (error) throw error;
    return data.map(mapPartnerFromDb) as AdminPartner[];
};

export const addTeamMember = async (parentId: string, memberData: any): Promise<Partner> => {
    const tempSupabase = getTemporaryClient();

    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: memberData.email,
        password: memberData.password,
    });
    
    if (authError) throw authError;

    const newId = authData.user!.id;
    
    const dbPayload = {
        id: newId,
        parent_id: parentId,
        email: memberData.email,
        type: memberData.type, // Inherit type usually, or set as 'agency' etc
        status: 'active',
        subscription_plan: 'basic',
        name_en: memberData.name,
        name_ar: memberData.name,
        image_url: 'https://via.placeholder.com/150',
    };
    
    const { data, error } = await supabase.from('partners').insert(dbPayload).select().single();
    if (error) throw error;
    return mapPartnerFromDb(data);
};

export const updateTeamMember = updatePartner;
export const deleteTeamMember = deletePartner;
export const updateUser = updatePartner;

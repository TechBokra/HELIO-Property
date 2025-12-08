
import { supabase } from '../lib/supabase';
import type { Partner, PartnerStatus, PartnerRequest, AdminPartner, SubscriptionPlan } from '../types';
import { mapPartnerTypeToRole } from '../data/permissions';

// Mapper to convert DB row to Partner object
const mapPartnerFromDb = (row: any): Partner | AdminPartner => {
    const contactMethods = typeof row.contact_methods === 'string' 
        ? JSON.parse(row.contact_methods) 
        : row.contact_methods || { whatsapp: { enabled: false }, phone: { enabled: false }, form: { enabled: true } };

    return {
        id: row.id,
        email: row.email,
        imageUrl: row.image_url,
        type: row.type,
        status: row.status,
        subscriptionPlan: row.subscription_plan,
        displayType: row.display_type,
        role: mapPartnerTypeToRole(row.type),
        name: row.name_en, // English name as default name
        description: row.description_en, // English desc as default
        nameAr: row.name_ar,
        descriptionAr: row.description_ar,
        contactMethods,
        subscriptionEndDate: row.subscription_end_date,
        parentId: row.parent_id,
        createdAt: row.created_at
    };
};

export const getAllPartners = async (): Promise<Partner[]> => {
    const { data, error } = await supabase.from('partners').select('*');
    if (error) throw error;
    return data.map(mapPartnerFromDb);
};

export const getAllPartnersForAdmin = async (): Promise<AdminPartner[]> => {
    const { data, error } = await supabase.from('partners').select('*');
    if (error) throw error;
    return data.map(mapPartnerFromDb) as AdminPartner[];
};

export const getPartnerById = async (id: string): Promise<Partner | undefined> => {
    const { data, error } = await supabase.from('partners').select('*').eq('id', id).single();
    if (error) return undefined;
    return mapPartnerFromDb(data);
};

export const getPartnerByEmail = async (email: string): Promise<Partner | undefined> => {
    const { data, error } = await supabase.from('partners').select('*').eq('email', email).single();
    if (error) return undefined;
    return mapPartnerFromDb(data);
};

export const addPartner = async (request: PartnerRequest, password?: string): Promise<Partner> => {
    const newPartnerId = request.companyName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    
    const dbPayload = {
        id: newPartnerId,
        email: request.contactEmail,
        password: password || 'password123',
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

    const { data, error } = await supabase.from('partners').insert(dbPayload).select().single();
    if (error) throw error;
    return mapPartnerFromDb(data);
};

export const addInternalUser = async (userData: any): Promise<AdminPartner> => {
    const newId = `user-${Date.now()}`;
    const dbPayload = {
        id: newId,
        email: userData.email,
        password: userData.password,
        type: userData.type,
        status: 'active',
        subscription_plan: 'basic',
        name_ar: userData.nameAr,
        name_en: userData.name,
        image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto.format&fit=crop'
    };

    const { data, error } = await supabase.from('partners').insert(dbPayload).select().single();
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
    if (updates.password) dbUpdates.password = updates.password;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.type) dbUpdates.type = updates.type;

    const { error } = await supabase.from('partners').update(dbUpdates).eq('id', id);
    return !error;
};

export const updatePartnerStatus = async (id: string, status: PartnerStatus): Promise<boolean> => {
    const { error } = await supabase.from('partners').update({ status }).eq('id', id);
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
    
    return !error;
};

export const deletePartner = async (userId: string): Promise<boolean> => {
    const { error } = await supabase.from('partners').delete().eq('id', userId);
    return !error;
};

export const getTeamMembers = async (parentId: string): Promise<AdminPartner[]> => {
    const { data, error } = await supabase.from('partners').select('*').eq('parent_id', parentId);
    if (error) throw error;
    return data.map(mapPartnerFromDb) as AdminPartner[];
};

export const addTeamMember = async (parentId: string, memberData: any): Promise<Partner> => {
    const newId = `sub-${Date.now()}`;
    const dbPayload = {
        id: newId,
        parent_id: parentId,
        email: memberData.email,
        password: memberData.password,
        type: memberData.type,
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

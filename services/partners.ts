
import { supabase, supabasePublic, getSupabaseClientConfig } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Role, Permission, type Partner, type PartnerStatus, type PartnerRequest, type AdminPartner, type SubscriptionPlan, type PartnerType } from '../types';
import { mapPartnerTypeToRole } from '../data/permissions';
import { requirePermission, requireAnyPermission } from './authGuard';
import { partnersData } from '../data/partners';
import { partners as enPartnerLocales } from '../locales/en/partners';
import { partners as arPartnerLocales } from '../locales/ar/partners';
import { isNeonCatalogEnabled } from '../utils/catalogSource';

// Helper to construct complete fallback Partner objects
export const getFallbackPartners = (): Partner[] => {
    return partnersData.map(p => {
        const enInfo = (enPartnerLocales.partnerInfo as any)[p.id];
        const arInfo = (arPartnerLocales.partnerInfo as any)[p.id];
        const resolvedRole = mapPartnerTypeToRole(p.type as any, (p as any).role);
        return {
            id: p.id,
            email: p.email,
            imageUrl: p.imageUrl,
            type: p.type as any,
            status: p.status,
            subscriptionPlan: p.subscriptionPlan,
            displayType: p.displayType,
            role: resolvedRole,
            name: enInfo?.name || p.id,
            description: enInfo?.description || '',
            nameAr: arInfo?.name || enInfo?.name || p.id,
            descriptionAr: arInfo?.description || '',
            contactMethods: p.contactMethods || { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
            subscriptionEndDate: p.subscriptionEndDate,
            parentId: p.parentId,
            createdAt: p.createdAt,
            allowedCities: (p as any).allowedCities || (resolvedRole === Role.SUPER_ADMIN ? ['*'] : ['heliopolis', 'shorouk', 'badr'])
        };
    });
};

// --- HELPER: Isolated Client ---
// We create a temporary client for registration actions to prevent 
// the main 'supabase' client (used by the Admin) from switching sessions 
// when a new user is signed up.
const getTemporaryClient = () => {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseClientConfig();
    
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

    const explicitCities: string[] = Array.isArray(row.allowed_cities)
        ? row.allowed_cities.map((c: any) => String(c).trim()).filter(Boolean)
        : [];
    const legacyCities: string[] = Array.isArray(contactMethods?._allowedCities)
        ? contactMethods._allowedCities.map((c: any) => String(c).trim()).filter(Boolean)
        : [];

    const rawAllowedCities: string[] =
        resolvedRole === Role.SUPER_ADMIN
            ? ['*']
            : explicitCities.length > 0
                ? (explicitCities.length === 1 &&
                    explicitCities[0] === 'heliopolis' &&
                    legacyCities.length > 0 &&
                    (legacyCities.length > 1 || legacyCities[0] !== 'heliopolis'))
                    ? Array.from(new Set<string>(legacyCities))
                    : Array.from(new Set<string>(explicitCities))
                : legacyCities.length > 0
                    ? Array.from(new Set<string>(legacyCities))
                    : ['heliopolis'];

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
        createdAt: row.created_at,
        allowedCities: rawAllowedCities
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

export const getAllPartners = async (options?: { client?: any }): Promise<Partner[]> => {
    const useCache = !options?.client;
    const now = Date.now();
    if (useCache && cachedPartners && (now - cachedPartners.timestamp) < CACHE_TTL_MS) {
        return cachedPartners.data;
    }

    if (useCache && inFlightPartnersPromise) {
        return inFlightPartnersPromise;
    }

    const fetchPromise = (async (): Promise<Partner[]> => {
        try {
            const client = options?.client || supabasePublic;
            const { data, error } = await client
                .from('partners')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Notice fetching partners from Supabase, using fallback:', error.message || error);
                const fallback = useCache && cachedPartners ? cachedPartners.data : getFallbackPartners();
                return fallback;
            }

            if (!data || data.length === 0) {
                const fallback = useCache && cachedPartners ? cachedPartners.data : getFallbackPartners();
                return fallback;
            }

            const mapped = (data || []).map(mapPartnerFromDb);
            if (useCache) {
                cachedPartners = { data: mapped, timestamp: Date.now() };
            }
            return mapped;
        } catch (err: any) {
            console.warn('Network or fetch error fetching partners, using fallback:', err?.message || err);
            const fallback = useCache && cachedPartners ? cachedPartners.data : getFallbackPartners();
            return fallback;
        } finally {
            if (useCache) {
                inFlightPartnersPromise = null;
            }
        }
    })();

    if (useCache) {
        inFlightPartnersPromise = fetchPromise;
    }

    return fetchPromise;
};

export const getAllPartnersForAdmin = async (): Promise<AdminPartner[]> => {
    const partners = await getAllPartners();
    return partners as AdminPartner[];
};

export const getPartnerById = async (id: string, options?: { client?: any }): Promise<Partner | undefined> => {
    try {
        const client = options?.client || supabasePublic;
        const { data, error } = await client
            .from('partners')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.warn('Notice fetching partner by ID from Supabase, checking fallback:', error.message || error);
            return getFallbackPartners().find(p => p.id === id);
        }

        if (data) return mapPartnerFromDb(data);
        return getFallbackPartners().find(p => p.id === id);
    } catch {
        return getFallbackPartners().find(p => p.id === id);
    }
};

export const getPublicPartners = async (options?: { fetchImpl?: typeof fetch; client?: any }): Promise<AdminPartner[]> => {
    if (!options?.client && isNeonCatalogEnabled()) {
        const fetchFn = options?.fetchImpl || (typeof fetch === 'function' ? fetch : undefined);
        if (!fetchFn) {
            throw new Error('Neon catalog partners endpoint is unreachable.');
        }
        const res = await fetchFn('/api/catalog/partners', {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload || !Array.isArray(payload.partners)) {
            throw new Error(payload?.error || `Failed to load partners from Neon catalog (HTTP ${res.status}).`);
        }
        return payload.partners.map(mapPartnerFromDb) as AdminPartner[];
    }

    return (await getAllPartners(options)) as AdminPartner[];
};

export const getPublicPartnerById = async (
    id: string,
    options?: { fetchImpl?: typeof fetch; client?: any }
): Promise<Partner | undefined> => {
    if (!id) return undefined;

    if (!options?.client && isNeonCatalogEnabled()) {
        const fetchFn = options?.fetchImpl || (typeof fetch === 'function' ? fetch : undefined);
        if (!fetchFn) {
            throw new Error('Neon catalog partner endpoint is unreachable.');
        }
        const res = await fetchFn(`/api/catalog/partners/${encodeURIComponent(id)}`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });
        if (res.status === 404) {
            return undefined;
        }
        const payload = await res.json().catch(() => null);
        if (!res.ok || !payload?.partner) {
            throw new Error(payload?.error || `Failed to load partner from Neon catalog (HTTP ${res.status}).`);
        }
        return mapPartnerFromDb(payload.partner);
    }

    return getPartnerById(id, options);
};

export const getPartnerByEmail = async (email: string): Promise<Partner | undefined> => {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error } = await supabasePublic
            .from('partners')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

        if (error) {
            console.warn('Notice fetching partner by email from Supabase, checking fallback:', error.message || error);
            return getFallbackPartners().find(p => p.email.toLowerCase() === cleanEmail);
        }

        if (data) return mapPartnerFromDb(data);
        return getFallbackPartners().find(p => p.email.toLowerCase() === cleanEmail);
    } catch {
        const cleanEmail = email.trim().toLowerCase();
        return getFallbackPartners().find(p => p.email.toLowerCase() === cleanEmail);
    }
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

const isMissingAllowedCitiesColError = (err: any): boolean => {
    const msg = `${err?.message || ''} ${err?.details || ''}`.toLowerCase();
    return (
        (err?.code === '42703' || err?.code === 'PGRST204' || msg.includes('schema cache')) &&
        msg.includes('allowed_cities')
    );
};

export const addPartner = async (
    request: PartnerRequest,
    password?: string,
    options?: { client?: any }
): Promise<Partner> => {
    let newPartnerId: string;
    const dbClient = options?.client || supabase;

    if (options?.client && (request as any).id && !String((request as any).id).startsWith('req-')) {
        newPartnerId = (request as any).id;
    } else {
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
        newPartnerId = authData.user.id;
    }

    const allowedCities =
        Array.isArray(request.allowedCities) && request.allowedCities.length > 0
            ? Array.from(new Set(request.allowedCities))
            : [request.cityId || 'heliopolis'];

    const dbPayload: any = {
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
        allowed_cities: allowedCities,
        contact_methods: {
            whatsapp: { enabled: false, number: '' },
            phone: { enabled: true, number: request.contactPhone },
            form: { enabled: true },
            _allowedCities: allowedCities,
        }
    };

    let { data, error } = await dbClient.from('partners').upsert(dbPayload).select().single();
    if (error && isMissingAllowedCitiesColError(error)) {
        const { allowed_cities: _omit, ...fallbackPayload } = dbPayload;
        const retry = await dbClient.from('partners').upsert(fallbackPayload).select().single();
        data = retry.data;
        error = retry.error;
    }

    if (error) throw error;
    invalidatePartnersCache();
    return mapPartnerFromDb(data);
};

export const addInternalUser = async (userData: any, options?: { client?: any }): Promise<AdminPartner> => {
    requirePermission(Permission.MANAGE_USERS);
    const dbClient = options?.client || supabase;
    let newId: string;

    if (options?.client && userData.id) {
        newId = userData.id;
    } else {
        const tempSupabase = getTemporaryClient();
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
            email: userData.email,
            password: userData.password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Auth user creation failed");
        newId = authData.user.id;
    }

    const resolvedRole = mapPartnerTypeToRole(userData.type, userData.role || userData.type);
    const allowedCities =
        resolvedRole === Role.SUPER_ADMIN
            ? ['*']
            : Array.isArray(userData.allowedCities) && userData.allowedCities.length > 0
                ? Array.from(new Set(userData.allowedCities))
                : ['heliopolis'];

    const dbPayload: any = {
        id: newId,
        email: userData.email,
        type: userData.type,
        role: resolvedRole,
        status: 'active',
        subscription_plan: 'basic',
        name_ar: userData.nameAr,
        name_en: userData.name,
        allowed_cities: allowedCities,
        image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto=format&fit=crop',
        contact_methods: {
            whatsapp: { enabled: false, number: '' },
            phone: { enabled: false, number: '' },
            form: { enabled: true },
            _allowedCities: allowedCities
        }
    };

    let { data, error } = await dbClient.from('partners').upsert(dbPayload).select().single();
    if (error && isMissingAllowedCitiesColError(error)) {
        const { allowed_cities: _omit, ...fallbackPayload } = dbPayload;
        const retry = await dbClient.from('partners').upsert(fallbackPayload).select().single();
        data = retry.data;
        error = retry.error;
    }
    if (error) throw error;
    invalidatePartnersCache();
    return mapPartnerFromDb(data) as AdminPartner;
};

export const updatePartner = async (
    id: string,
    updates: any,
    options?: { client?: any; throwOnError?: boolean }
): Promise<boolean> => {
    const dbClient = options?.client || supabase;
    const dbUpdates: any = {};
    if (updates.nameAr !== undefined) dbUpdates.name_ar = updates.nameAr;
    if (updates.nameEn !== undefined) dbUpdates.name_en = updates.nameEn;
    if (updates.name !== undefined) dbUpdates.name_en = updates.name;
    if (updates.descriptionAr !== undefined) dbUpdates.description_ar = updates.descriptionAr;
    if (updates.descriptionEn !== undefined) dbUpdates.description_en = updates.descriptionEn;
    if (updates.description !== undefined && updates.descriptionEn === undefined) {
        dbUpdates.description_en = updates.description;
    }
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.subscriptionPlan !== undefined) dbUpdates.subscription_plan = updates.subscriptionPlan;
    if (updates.displayType !== undefined) dbUpdates.display_type = updates.displayType;

    if (updates.allowedCities !== undefined) {
        dbUpdates.allowed_cities = Array.isArray(updates.allowedCities) && updates.allowedCities.length > 0
            ? Array.from(new Set(updates.allowedCities))
            : ['heliopolis'];
    }

    if (updates.contactMethods !== undefined || updates.allowedCities !== undefined) {
        let baseContact = updates.contactMethods;
        if (!baseContact) {
            const { data: existingRow } = await dbClient
                .from('partners')
                .select('contact_methods')
                .eq('id', id)
                .maybeSingle();
            const existingRaw = existingRow?.contact_methods;
            const parsed = typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw;
            baseContact = parsed && typeof parsed === 'object'
                ? parsed
                : { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } };
        }
        dbUpdates.contact_methods = updates.allowedCities !== undefined
            ? { ...baseContact, _allowedCities: dbUpdates.allowed_cities }
            : baseContact;
    }

    if (updates.email) dbUpdates.email = updates.email;
    if (updates.type) {
        dbUpdates.type = updates.type;
        dbUpdates.role = mapPartnerTypeToRole(updates.type, updates.role || updates.type);
    } else if (updates.role) {
        dbUpdates.role = mapPartnerTypeToRole(undefined, updates.role);
    }

    let { error } = await dbClient.from('partners').update(dbUpdates).eq('id', id);
    if (error && isMissingAllowedCitiesColError(error)) {
        const { allowed_cities: _omit, ...fallbackUpdates } = dbUpdates;
        const retry = await dbClient.from('partners').update(fallbackUpdates).eq('id', id);
        error = retry.error;
    }

    if (error) {
        if (options?.throwOnError) {
            throw new Error(error.message || 'تعذر حفظ تحديثات الشريك');
        }
        return false;
    }

    invalidatePartnersCache();
    return true;
};

export const updatePartnerStatus = async (id: string, status: PartnerStatus): Promise<boolean> => {
    requireAnyPermission([Permission.VERIFY_PARTNERS, Permission.SUSPEND_PARTNERS, Permission.MANAGE_ALL_PARTNERS]);
    const { error } = await supabase.from('partners').update({ status }).eq('id', id);
    if (!error) invalidatePartnersCache();
    return !error;
};

export const updatePartnerAdmin = async (id: string, updates: any): Promise<boolean> => {
    requirePermission(Permission.MANAGE_ALL_PARTNERS);
    return updatePartner(id, updates);
};

export const upgradePartnerPlan = async (id: string, newPlan: SubscriptionPlan): Promise<boolean> => {
    requireAnyPermission([Permission.MANAGE_PLANS, Permission.MANAGE_ALL_PARTNERS, Permission.MANAGE_OWN_SUBSCRIPTION]);
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
    requireAnyPermission([Permission.MANAGE_ALL_PARTNERS, Permission.MANAGE_USERS]);
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

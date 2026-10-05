import { supabase } from '../lib/supabase';
import { getAllPartners, getPartnerById } from './partners'; 
import { getAllProjects, getProjectById } from './projects';
import type { Property, PropertyFiltersType, Partner, Project, PropertyHistoryEntry } from '../types';
import { filterProperties } from '../utils/propertyFilters';

export const generatePropertyReference = (id: string): string => {
    if (!id) return 'HEL-0001';
    const clean = id.replace(/[^a-zA-Z0-9]/g, '');
    const suffix = clean.slice(-5).toUpperCase() || '1001';
    return `HEL-${suffix}`;
};

export const generatePropertySlug = (titleEn: string, id: string): string => {
    const baseSlug = (titleEn || 'property')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const shortId = (id || '').slice(0, 8);
    return `${baseSlug}-${shortId}`;
};

/**
 * Audit history retrieval from Supabase (single source of truth)
 */
export const getPropertyHistory = async (propertyId: string): Promise<PropertyHistoryEntry[]> => {
    if (!propertyId) return [];
    try {
        // First try the dedicated property_history table
        const { data, error } = await supabase
            .from('property_history')
            .select('*')
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
            return data.map((row: any) => ({
                id: row.id,
                propertyId: row.property_id,
                changedBy: row.changed_by,
                changedAt: row.created_at,
                createdAt: row.created_at,
                changeType: row.change_type,
                field: row.field_name,
                fieldName: row.field_name,
                oldValue: row.old_value,
                newValue: row.new_value,
                note: row.note
            }));
        }

        // Secondary database fallback: check embedded audit log in property installments_info._meta
        const { data: propData } = await supabase
            .from('properties')
            .select('installments_info')
            .eq('id', propertyId)
            .maybeSingle();

        if (propData?.installments_info) {
            const raw = typeof propData.installments_info === 'string'
                ? JSON.parse(propData.installments_info)
                : propData.installments_info;
            if (raw?._meta?.history && Array.isArray(raw._meta.history)) {
                return raw._meta.history;
            }
        }

        return [];
    } catch (e) {
        console.warn("Failed to retrieve property history from Supabase:", e);
        return [];
    }
};

/**
 * Record property history in Supabase (persists across refreshes, devices, and logins)
 */
export const recordPropertyHistory = async (entry: Omit<PropertyHistoryEntry, 'id' | 'changedAt'>): Promise<void> => {
    try {
        const now = new Date().toISOString();
        const historyId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const changeType = entry.changeType || entry.field || 'update';
        const fieldName = entry.fieldName || entry.field || 'general';

        const historyRow = {
            id: historyId,
            property_id: entry.propertyId,
            changed_by: entry.changedBy || 'system',
            change_type: changeType,
            field_name: fieldName,
            old_value: entry.oldValue,
            new_value: entry.newValue,
            note: entry.note || '',
            created_at: now
        };

        // 1. Insert into property_history table
        try {
            await supabase.from('property_history').insert(historyRow);
        } catch {
            // Table may be pending migration in some environments
        }

        // 2. Also append to the property's installments_info._meta.history in Supabase for guaranteed persistence
        try {
            const { data: propData } = await supabase
                .from('properties')
                .select('installments_info')
                .eq('id', entry.propertyId)
                .maybeSingle();

            if (propData) {
                const rawInst = typeof propData.installments_info === 'string'
                    ? JSON.parse(propData.installments_info)
                    : propData.installments_info || {};
                const existingMeta = rawInst._meta || {};
                const existingHist = Array.isArray(existingMeta.history) ? existingMeta.history : [];

                const newHistEntry: PropertyHistoryEntry = {
                    id: historyId,
                    propertyId: entry.propertyId,
                    changedBy: entry.changedBy,
                    changedAt: now,
                    createdAt: now,
                    changeType,
                    field: fieldName,
                    fieldName,
                    oldValue: entry.oldValue,
                    newValue: entry.newValue,
                    note: entry.note
                };

                const updatedMeta = {
                    ...existingMeta,
                    history: [newHistEntry, ...existingHist].slice(0, 100)
                };

                await supabase.from('properties').update({
                    installments_info: { ...rawInst, _meta: updatedMeta }
                }).eq('id', entry.propertyId);
            }
        } catch (innerErr) {
            console.warn("Could not embed history into property row in Supabase:", innerErr);
        }
    } catch (e) {
        console.error("Failed to record property history:", e);
    }
};

/**
 * Transforms Supabase database row into canonical Property interface
 */
const mapPropertyFromDb = (row: any): Property => {
    const amenities = typeof row.amenities === 'string' ? JSON.parse(row.amenities) : row.amenities || { ar: [], en: [] };
    const location = typeof row.location === 'string' ? JSON.parse(row.location) : row.location || { lat: 0, lng: 0 };
    const installmentsRaw = typeof row.installments_info === 'string' ? JSON.parse(row.installments_info) : row.installments_info;
    const meta = installmentsRaw?._meta || {};

    const priceNumeric = Number(row.price) || 0;
    const price = {
        en: `EGP ${priceNumeric.toLocaleString('en-US')}`,
        ar: `${priceNumeric.toLocaleString('ar-EG')} ج.م`
    };

    const isVerified = row.is_verified === true || meta.verificationStatus === 'verified' || row.verification_status === 'verified';
    const availabilityStatus = row.availability_status || meta.availabilityStatus || (row.listing_status === 'sold' ? 'sold' : 'available');
    const publicationStatus = row.publication_status || meta.publicationStatus || (row.listing_status === 'draft' ? 'draft' : (row.listing_status === 'inactive' ? 'archived' : 'published'));
    const verificationStatus = isVerified ? 'verified' : (row.verification_status || meta.verificationStatus || 'pending');

    return {
        id: row.id,
        referenceNumber: row.reference_number || meta.referenceNumber || generatePropertyReference(row.id),
        slug: row.slug || meta.slug || generatePropertySlug(row.title_en, row.id),
        partnerId: row.partner_id,
        projectId: row.project_id,
        imageUrl: row.main_image,
        gallery: row.gallery || [],
        
        title: { ar: row.title_ar, en: row.title_en },
        description: { ar: row.description_ar, en: row.description_en },
        address: { ar: row.address_ar, en: row.address_en },
        
        status: { 
            en: (row.status === 'For Rent' || row.status === 'rent') ? 'For Rent' : 'For Sale', 
            ar: (row.status === 'For Rent' || row.status === 'rent') ? 'إيجار' : 'للبيع' 
        },
        type: {
            en: row.type,
            ar: row.type === 'Apartment' ? 'شقة' : row.type === 'Villa' ? 'فيلا' : row.type === 'Commercial' ? 'تجاري' : 'أرض'
        },
        finishingStatus: row.finishing_status ? {
            en: row.finishing_status,
            ar: row.finishing_status 
        } : undefined,

        price: price,
        priceNumeric: priceNumeric,
        area: Number(row.area) || 0,
        beds: row.beds,
        baths: row.baths,
        floor: row.floor,
        
        amenities: amenities,
        location: location,
        
        isInCompound: row.is_in_compound,
        installmentsAvailable: row.installments_available,
        realEstateFinanceAvailable: row.finance_available,
        
        delivery: {
            isImmediate: row.delivery_immediate,
            date: row.delivery_date
        },
        installments: installmentsRaw ? {
            downPayment: installmentsRaw.downPayment || 0,
            monthlyInstallment: installmentsRaw.monthlyInstallment || 0,
            years: installmentsRaw.years || 0
        } : undefined,
        
        listingStatus: row.listing_status || 'active',
        publicationStatus: publicationStatus,
        availabilityStatus: availabilityStatus,
        verificationStatus: verificationStatus,
        
        listingStartDate: row.listing_start_date,
        contactMethod: row.contact_method,
        ownerPhone: row.owner_phone,

        sourceType: row.source_type || meta.sourceType || 'partner_direct',
        sourceRequestId: row.source_request_id || meta.sourceRequestId,
        verifiedAt: row.verified_at || meta.verifiedAt || (isVerified ? row.updated_at || row.created_at : undefined),
        lastVerifiedAt: row.last_verified_at || meta.lastVerifiedAt || (isVerified ? row.updated_at : undefined),
        priceUpdatedAt: row.price_updated_at || meta.priceUpdatedAt || row.updated_at || row.created_at,
        lastPriceConfirmedAt: row.last_price_confirmed_at || meta.lastPriceConfirmedAt || row.updated_at,
        lastAvailabilityConfirmedAt: row.last_availability_confirmed_at || meta.lastAvailabilityConfirmedAt || row.updated_at,
        createdBy: row.created_by || meta.createdBy,
        updatedBy: row.updated_by || meta.updatedBy,
        history: meta.history || [],

        imageUrl_small: row.main_image, 
        imageUrl_medium: row.main_image,
        imageUrl_large: row.main_image,
    };
};

/**
 * Hydrates partner & project details in batch
 */
/**
 * Hydrates partner & project details efficiently using cached catalogs
 */
const hydratePropertiesBatch = async (properties: Property[]): Promise<Property[]> => {
    if (properties.length === 0) return [];

    try {
        const partnerIds = new Set(properties.map(p => p.partnerId).filter(Boolean));
        const projectIds = new Set(properties.map(p => p.projectId).filter(Boolean));

        const [allPartners, allProjects] = await Promise.all([
            partnerIds.size > 0 ? getAllPartners().catch(() => []) : Promise.resolve([]),
            projectIds.size > 0 ? getAllProjects().catch(() => []) : Promise.resolve([])
        ]);

        const partnerMap = new Map<string, Partner>();
        allPartners.forEach(p => partnerMap.set(p.id, p));

        const projectMap = new Map<string, Project>();
        allProjects.forEach(p => projectMap.set(p.id, p));

        return properties.map(prop => {
            const partner = partnerMap.get(prop.partnerId);
            const project = prop.projectId ? projectMap.get(prop.projectId) : undefined;

            return {
                ...prop,
                partnerName: partner?.name,
                partnerImageUrl: partner?.imageUrl,
                projectName: project ? project.name : undefined,
            };
        });

    } catch (e) {
        console.warn("Non-blocking property hydration notice:", e);
        return properties;
    }
};

// In-memory cache & deduplication for properties
let cachedAllProperties: { data: Property[]; timestamp: number } | null = null;
let inFlightAllPropertiesPromise: Promise<Property[]> | null = null;

let cachedPublicProperties: { data: Property[]; timestamp: number } | null = null;
let inFlightPublicPropertiesPromise: Promise<Property[]> | null = null;

const PROPERTIES_CACHE_TTL = 90 * 1000; // 90 seconds in-memory cache

export const invalidatePropertiesCache = () => {
    cachedAllProperties = null;
    inFlightAllPropertiesPromise = null;
    cachedPublicProperties = null;
    inFlightPublicPropertiesPromise = null;
};

/**
 * Fetches all properties for Admin management
 */
export const getAllProperties = async (): Promise<Property[]> => {
    const now = Date.now();
    if (cachedAllProperties && (now - cachedAllProperties.timestamp) < PROPERTIES_CACHE_TTL) {
        return cachedAllProperties.data;
    }

    if (inFlightAllPropertiesPromise) {
        return inFlightAllPropertiesPromise;
    }

    inFlightAllPropertiesPromise = (async () => {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.warn("Supabase notice in getAllProperties:", error.message);
                if (cachedAllProperties) {
                    return cachedAllProperties.data;
                }
                throw new Error(`Failed to fetch properties: ${error.message}`);
            }

            if (!data || data.length === 0) {
                return [];
            }

            const rawProperties = data.map(mapPropertyFromDb);
            const hydrated = await hydratePropertiesBatch(rawProperties);
            cachedAllProperties = { data: hydrated, timestamp: Date.now() };
            return hydrated;
        } catch (e) {
            if (cachedAllProperties) {
                return cachedAllProperties.data;
            }
            throw e;
        } finally {
            inFlightAllPropertiesPromise = null;
        }
    })();

    return inFlightAllPropertiesPromise;
};

/**
 * Fetches publicly visible properties (active or sold listings, never drafts or archived)
 */
export const getProperties = async (): Promise<Property[]> => {
    const now = Date.now();
    if (cachedPublicProperties && (now - cachedPublicProperties.timestamp) < PROPERTIES_CACHE_TTL) {
        return cachedPublicProperties.data;
    }

    if (inFlightPublicPropertiesPromise) {
        return inFlightPublicPropertiesPromise;
    }

    inFlightPublicPropertiesPromise = (async () => {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .in('listing_status', ['active', 'sold'])
                .order('created_at', { ascending: false });

            if (error) {
                console.warn("Supabase notice in getProperties:", error.message);
                if (cachedPublicProperties) {
                    return cachedPublicProperties.data;
                }
                throw new Error(`Failed to get public properties: ${error.message}`);
            }

            if (!data || data.length === 0) {
                return [];
            }

            const rawProperties = data.map(mapPropertyFromDb);
            const hydrated = await hydratePropertiesBatch(rawProperties);
            cachedPublicProperties = { data: hydrated, timestamp: Date.now() };
            return hydrated;
        } catch (e) {
            if (cachedPublicProperties) {
                return cachedPublicProperties.data;
            }
            throw e;
        } finally {
            inFlightPublicPropertiesPromise = null;
        }
    })();

    return inFlightPublicPropertiesPromise;
};

/**
 * Fetches properties belonging strictly to a specific partner (enforcing partner isolation)
 */
export const getPropertiesByPartnerId = async (partnerId: string): Promise<Property[]> => {
    if (!partnerId) return [];
    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase error in getPropertiesByPartnerId:", error);
        throw new Error(`Failed to get partner properties: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return [];
    }

    const rawProperties = data.map(mapPropertyFromDb);
    return hydratePropertiesBatch(rawProperties);
};

/**
 * Fetches properties belonging to a specific development project
 */
export const getPropertiesByProjectId = async (projectId: string): Promise<Property[]> => {
    if (!projectId) return [];
    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Supabase error in getPropertiesByProjectId:", error);
        throw new Error(`Failed to get project properties: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return [];
    }

    const rawProperties = data.map(mapPropertyFromDb);
    return hydratePropertiesBatch(rawProperties);
};

/**
 * Fetches single property by ID with fast targeted hydration
 */
export const getPropertyById = async (id: string): Promise<Property | undefined> => {
    if (!id) return undefined;
    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error("Supabase error in getPropertyById:", error);
        throw new Error(`Failed to load property: ${error.message}`);
    }

    if (!data) {
        return undefined;
    }

    const rawProp = mapPropertyFromDb(data);

    // Fast-path targeted hydration: only load the specific partner and project
    try {
        const [partner, project] = await Promise.all([
            rawProp.partnerId ? getPartnerById(rawProp.partnerId).catch(() => undefined) : Promise.resolve(undefined),
            rawProp.projectId ? getProjectById(rawProp.projectId).catch(() => undefined) : Promise.resolve(undefined)
        ]);
        rawProp.partnerName = partner?.name;
        rawProp.partnerImageUrl = partner?.imageUrl;
        rawProp.projectName = project?.name;
    } catch (e) {
        console.warn("Non-blocking property hydration warning:", e);
    }

    return rawProp;
};

/**
 * Paginated property filtering for public marketplace
 */
export const getPaginatedProperties = async (options: {
  page: number;
  limit: number;
  filters: PropertyFiltersType;
  disablePagination?: boolean;
}): Promise<{ properties: Property[]; total: number }> => {
    const allProps = await getProperties();
    const filtered = filterProperties(allProps, options.filters);
    
    const total = filtered.length;
    if (options.disablePagination) {
        return { properties: filtered, total };
    }

    const start = (options.page - 1) * options.limit;
    const end = start + options.limit;
    return { properties: filtered.slice(start, end), total };
};

/**
 * Maps frontend Property to database payload, embedding canonical business metadata safely
 */
const mapPropertyToDbPayload = (property: Partial<Property>, existingMeta: Record<string, any> = {}) => {
    const payload: any = {};
    
    if (property.partnerId) payload.partner_id = property.partnerId;
    if (property.projectId) payload.project_id = property.projectId;
    if (property.imageUrl) payload.main_image = property.imageUrl;
    if (property.gallery) payload.gallery = property.gallery;
    
    if (property.title) {
        payload.title_ar = property.title.ar;
        payload.title_en = property.title.en;
    }
    if (property.description) {
        payload.description_ar = property.description.ar;
        payload.description_en = property.description.en;
    }
    if (property.address) {
        payload.address_ar = property.address.ar;
        payload.address_en = property.address.en;
    }
    
    if (property.priceNumeric !== undefined) payload.price = property.priceNumeric;
    if (property.area !== undefined) payload.area = property.area;
    
    if (property.type) payload.type = property.type.en;
    if (property.status) payload.status = property.status.en;
    if (property.finishingStatus) payload.finishing_status = property.finishingStatus.en;
    
    if (property.beds !== undefined) payload.beds = property.beds;
    if (property.baths !== undefined) payload.baths = property.baths;
    if (property.floor !== undefined) payload.floor = property.floor;
    
    if (property.amenities) payload.amenities = property.amenities; 
    if (property.location) payload.location = property.location; 
    
    if (property.isInCompound !== undefined) payload.is_in_compound = property.isInCompound;
    if (property.installmentsAvailable !== undefined) payload.installments_available = property.installmentsAvailable;
    if (property.realEstateFinanceAvailable !== undefined) payload.finance_available = property.realEstateFinanceAvailable;
    
    if (property.delivery) {
        payload.delivery_immediate = property.delivery.isImmediate;
        payload.delivery_date = property.delivery.date;
    }
    
    if (property.listingStatus) payload.listing_status = property.listingStatus;
    if (property.contactMethod) payload.contact_method = property.contactMethod;
    if (property.ownerPhone !== undefined) payload.owner_phone = property.ownerPhone;
    if (property.listingStartDate) payload.listing_start_date = property.listingStartDate;
    if (property.listingEndDate) payload.listing_end_date = property.listingEndDate;

    if (property.verificationStatus !== undefined) {
        payload.is_verified = property.verificationStatus === 'verified';
    }

    // Prepare unified business metadata to be persisted in installments_info._meta
    const baseInstallments = property.installments || existingMeta.installments || {};
    const updatedMeta = {
        ...existingMeta,
        referenceNumber: property.referenceNumber || existingMeta.referenceNumber,
        slug: property.slug || existingMeta.slug,
        sourceType: property.sourceType || existingMeta.sourceType,
        sourceRequestId: property.sourceRequestId || existingMeta.sourceRequestId,
        publicationStatus: property.publicationStatus || existingMeta.publicationStatus,
        availabilityStatus: property.availabilityStatus || existingMeta.availabilityStatus,
        verificationStatus: property.verificationStatus || existingMeta.verificationStatus,
        verifiedAt: property.verifiedAt || existingMeta.verifiedAt,
        priceUpdatedAt: property.priceUpdatedAt || existingMeta.priceUpdatedAt,
        lastPriceConfirmedAt: property.lastPriceConfirmedAt || existingMeta.lastPriceConfirmedAt,
        lastAvailabilityConfirmedAt: property.lastAvailabilityConfirmedAt || existingMeta.lastAvailabilityConfirmedAt,
        createdBy: property.createdBy || existingMeta.createdBy,
        updatedBy: property.updatedBy || existingMeta.updatedBy,
        history: property.history || existingMeta.history || []
    };

    payload.installments_info = {
        ...baseInstallments,
        _meta: updatedMeta
    };

    return payload;
};

/**
 * Creates new property and persists all canonical business state in Supabase
 */
export const addProperty = async (property: Omit<Property, 'id' | 'partnerName' | 'partnerImageUrl'>): Promise<Property> => {
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });

    const now = new Date().toISOString();
    const referenceNumber = property.referenceNumber || generatePropertyReference(id);
    const slug = property.slug || generatePropertySlug(property.title?.en || '', id);

    const initialHistoryEntry: PropertyHistoryEntry = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `hist-${Date.now()}`,
        propertyId: id,
        changedBy: property.partnerId || 'system',
        changedAt: now,
        createdAt: now,
        changeType: 'creation',
        field: 'creation',
        fieldName: 'creation',
        oldValue: null,
        newValue: { title: property.title?.en, price: property.priceNumeric, status: property.listingStatus },
        note: 'Property created'
    };

    const initialMeta = {
        referenceNumber,
        slug,
        verificationStatus: property.verificationStatus || 'pending',
        availabilityStatus: property.availabilityStatus || 'available',
        publicationStatus: property.publicationStatus || (property.listingStatus === 'draft' ? 'draft' : 'published'),
        priceUpdatedAt: now,
        lastPriceConfirmedAt: now,
        lastAvailabilityConfirmedAt: now,
        verifiedAt: property.verificationStatus === 'verified' ? now : undefined,
        sourceType: property.sourceType || 'partner_direct',
        sourceRequestId: property.sourceRequestId,
        createdBy: property.createdBy || property.partnerId,
        history: [initialHistoryEntry]
    };

    const dbPayload = {
        id,
        ...mapPropertyToDbPayload(property, initialMeta),
        created_at: now,
        updated_at: now
    };
    
    try {
        const { data, error } = await supabase.from('properties').insert(dbPayload).select().single();
        if (error) {
            console.error("Supabase property insert error:", error);
            throw error;
        }

        // Try direct insert to property_history table
        try {
            await supabase.from('property_history').insert({
                id: initialHistoryEntry.id,
                property_id: id,
                changed_by: initialHistoryEntry.changedBy,
                change_type: 'creation',
                field_name: 'creation',
                old_value: null,
                new_value: initialHistoryEntry.newValue,
                note: initialHistoryEntry.note,
                created_at: now
            });
        } catch {
            // Table may be pending migration
        }

        invalidatePropertiesCache();
        return mapPropertyFromDb(data);
    } catch (e) {
        console.error("Failed to insert property into Supabase:", e);
        throw e;
    }
};

/**
 * Updates existing property and records database-backed audit log
 */
export const updateProperty = async (propertyId: string, updates: Partial<Property>): Promise<Property | undefined> => {
    const now = new Date().toISOString();
    const existing = await getPropertyById(propertyId).catch(() => undefined);
    
    // Existing metadata from the property itself (persisted in Supabase)
    const existingMeta = (existing as any)?.installments_info?._meta || {
        referenceNumber: existing?.referenceNumber,
        slug: existing?.slug,
        sourceType: existing?.sourceType,
        sourceRequestId: existing?.sourceRequestId,
        publicationStatus: existing?.publicationStatus,
        availabilityStatus: existing?.availabilityStatus,
        verificationStatus: existing?.verificationStatus,
        verifiedAt: existing?.verifiedAt,
        priceUpdatedAt: existing?.priceUpdatedAt,
        lastPriceConfirmedAt: existing?.lastPriceConfirmedAt,
        lastAvailabilityConfirmedAt: existing?.lastAvailabilityConfirmedAt,
        createdBy: existing?.createdBy,
        updatedBy: existing?.updatedBy,
        history: existing?.history || []
    };

    // Calculate metadata updates
    const metaUpdates: Record<string, any> = { ...existingMeta };
    if (updates.verificationStatus) {
        metaUpdates.verificationStatus = updates.verificationStatus;
        if (updates.verificationStatus === 'verified') {
            metaUpdates.verifiedAt = now;
            metaUpdates.lastVerifiedAt = now;
        }
    }
    if (updates.availabilityStatus) {
        metaUpdates.availabilityStatus = updates.availabilityStatus;
        metaUpdates.lastAvailabilityConfirmedAt = now;
    }
    if (updates.publicationStatus) {
        metaUpdates.publicationStatus = updates.publicationStatus;
    }
    if (updates.priceNumeric !== undefined && existing?.priceNumeric !== updates.priceNumeric) {
        metaUpdates.priceUpdatedAt = now;
        metaUpdates.lastPriceConfirmedAt = now;
    }
    if (updates.sourceType) metaUpdates.sourceType = updates.sourceType;
    if (updates.sourceRequestId) metaUpdates.sourceRequestId = updates.sourceRequestId;
    if (updates.referenceNumber) metaUpdates.referenceNumber = updates.referenceNumber;
    if (updates.slug) metaUpdates.slug = updates.slug;
    if (updates.updatedBy) metaUpdates.updatedBy = updates.updatedBy;

    // Track audit entries
    const historyEntries: PropertyHistoryEntry[] = [];
    if (existing) {
        if (updates.priceNumeric !== undefined && updates.priceNumeric !== existing.priceNumeric) {
            historyEntries.push({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `hist-${Date.now()}-1`,
                propertyId,
                changedBy: updates.updatedBy || updates.partnerId || 'admin',
                changedAt: now,
                createdAt: now,
                changeType: 'price',
                field: 'price',
                fieldName: 'price',
                oldValue: existing.priceNumeric,
                newValue: updates.priceNumeric,
                note: `Price updated from ${existing.priceNumeric} to ${updates.priceNumeric}`
            });
        }
        if (updates.availabilityStatus !== undefined && updates.availabilityStatus !== existing.availabilityStatus) {
            historyEntries.push({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `hist-${Date.now()}-2`,
                propertyId,
                changedBy: updates.updatedBy || updates.partnerId || 'admin',
                changedAt: now,
                createdAt: now,
                changeType: 'availability',
                field: 'availability',
                fieldName: 'availability',
                oldValue: existing.availabilityStatus || 'available',
                newValue: updates.availabilityStatus,
                note: `Availability changed to ${updates.availabilityStatus}`
            });
        }
        if (updates.verificationStatus !== undefined && updates.verificationStatus !== existing.verificationStatus) {
            historyEntries.push({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `hist-${Date.now()}-3`,
                propertyId,
                changedBy: updates.updatedBy || 'admin',
                changedAt: now,
                createdAt: now,
                changeType: 'verification',
                field: 'verification',
                fieldName: 'verification',
                oldValue: existing.verificationStatus || 'pending',
                newValue: updates.verificationStatus,
                note: `Verification status changed to ${updates.verificationStatus}`
            });
        }
        if (updates.listingStatus !== undefined && updates.listingStatus !== existing.listingStatus) {
            historyEntries.push({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `hist-${Date.now()}-4`,
                propertyId,
                changedBy: updates.updatedBy || updates.partnerId || 'admin',
                changedAt: now,
                createdAt: now,
                changeType: 'publication',
                field: 'publication',
                fieldName: 'publication',
                oldValue: existing.listingStatus,
                newValue: updates.listingStatus,
                note: `Listing status changed to ${updates.listingStatus}`
            });
        }
    }

    if (historyEntries.length > 0) {
        metaUpdates.history = [...historyEntries, ...(existingMeta.history || [])].slice(0, 100);
        // Persist history entries to property_history table
        historyEntries.forEach(async (h) => {
            try {
                await supabase.from('property_history').insert({
                    id: h.id,
                    property_id: h.propertyId,
                    changed_by: h.changedBy,
                    change_type: h.changeType,
                    field_name: h.fieldName,
                    old_value: h.oldValue,
                    new_value: h.newValue,
                    note: h.note,
                    created_at: h.createdAt
                });
            } catch {
                // Table might be pending schema reload
            }
        });
    }

    const dbUpdates = {
        ...mapPropertyToDbPayload(updates, metaUpdates),
        updated_at: now
    };
    
    try {
        const { data, error } = await supabase.from('properties').update(dbUpdates).eq('id', propertyId).select().single();
        if (error) {
            console.error("Supabase update error:", error);
            throw error;
        }
        invalidatePropertiesCache();
        return mapPropertyFromDb(data);
    } catch (e) {
        console.error("Error updating property in Supabase:", e);
        throw e;
    }
};

/**
 * Deletes property from Supabase
 */
export const deleteProperty = async (propertyId: string): Promise<boolean> => {
    const { error } = await supabase.from('properties').delete().eq('id', propertyId);
    if (error) {
        console.error("Error deleting property:", error);
        return false;
    }
    invalidatePropertiesCache();
    return true;
};

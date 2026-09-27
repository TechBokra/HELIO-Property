
import { supabase } from '../lib/supabase';
import { getAllPartners } from './partners'; 
import { getAllProjects } from './projects';
import type { Property, PropertyFiltersType, Partner, Project, PropertyHistoryEntry } from '../types';
import { filterProperties } from '../utils/propertyFilters';
import { propertiesData as fallbackProperties } from '../data/properties';

const PROPERTY_HISTORY_KEY = 'onlyhelio_property_history';
const PROPERTY_META_KEY = 'onlyhelio_property_meta';

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

export const getPropertyHistory = (propertyId: string): PropertyHistoryEntry[] => {
    try {
        if (typeof window === 'undefined') return [];
        const raw = localStorage.getItem(PROPERTY_HISTORY_KEY);
        if (!raw) return [];
        const all: PropertyHistoryEntry[] = JSON.parse(raw);
        return all.filter(h => h.propertyId === propertyId);
    } catch {
        return [];
    }
};

export const recordPropertyHistory = (entry: Omit<PropertyHistoryEntry, 'id' | 'changedAt'>): void => {
    try {
        if (typeof window === 'undefined') return;
        const raw = localStorage.getItem(PROPERTY_HISTORY_KEY);
        const all: PropertyHistoryEntry[] = raw ? JSON.parse(raw) : [];
        const newEntry: PropertyHistoryEntry = {
            ...entry,
            id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            changedAt: new Date().toISOString()
        };
        all.unshift(newEntry);
        localStorage.setItem(PROPERTY_HISTORY_KEY, JSON.stringify(all.slice(0, 500)));
    } catch (e) {
        console.error("Failed to record property history:", e);
    }
};

const getLocalPropertyMeta = (propertyId: string) => {
    try {
        if (typeof window === 'undefined') return {};
        const raw = localStorage.getItem(`${PROPERTY_META_KEY}_${propertyId}`);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

const setLocalPropertyMeta = (propertyId: string, meta: Record<string, any>) => {
    try {
        if (typeof window === 'undefined') return;
        const existing = getLocalPropertyMeta(propertyId);
        localStorage.setItem(`${PROPERTY_META_KEY}_${propertyId}`, JSON.stringify({ ...existing, ...meta }));
    } catch (e) {
        console.error("Failed to save property meta:", e);
    }
};

const mapPropertyFromDb = (row: any): Property => {
    const amenities = typeof row.amenities === 'string' ? JSON.parse(row.amenities) : row.amenities || { ar: [], en: [] };
    const location = typeof row.location === 'string' ? JSON.parse(row.location) : row.location || { lat: 0, lng: 0 };
    const installments = typeof row.installments_info === 'string' ? JSON.parse(row.installments_info) : row.installments_info;

    const priceNumeric = Number(row.price);
    const price = {
        en: `EGP ${priceNumeric.toLocaleString('en-US')}`,
        ar: `${priceNumeric.toLocaleString('ar-EG')} ج.م`
    };

    const localMeta = getLocalPropertyMeta(row.id);
    const isVerified = row.is_verified === true || localMeta.verificationStatus === 'verified' || row.verification_status === 'verified';
    const availabilityStatus = localMeta.availabilityStatus || row.availability_status || (row.listing_status === 'sold' ? 'sold' : 'available');
    const verificationStatus = isVerified ? 'verified' : (localMeta.verificationStatus || row.verification_status || 'pending');

    return {
        id: row.id,
        referenceNumber: localMeta.referenceNumber || row.reference_number || generatePropertyReference(row.id),
        slug: localMeta.slug || row.slug || generatePropertySlug(row.title_en, row.id),
        partnerId: row.partner_id,
        projectId: row.project_id,
        imageUrl: row.main_image,
        gallery: row.gallery || [],
        
        title: { ar: row.title_ar, en: row.title_en },
        description: { ar: row.description_ar, en: row.description_en },
        address: { ar: row.address_ar, en: row.address_en },
        
        status: { 
            en: row.status as any, 
            ar: row.status === 'For Sale' ? 'للبيع' : 'إيجار' 
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
        area: Number(row.area),
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
        installments: installments,
        
        listingStatus: row.listing_status || 'active',
        publicationStatus: row.listing_status === 'draft' ? 'draft' : row.listing_status === 'inactive' ? 'archived' : 'published',
        listingStartDate: row.listing_start_date,
        contactMethod: row.contact_method,
        ownerPhone: row.owner_phone,

        sourceType: localMeta.sourceType || row.source_type || 'partner_direct',
        verificationStatus: verificationStatus,
        verifiedAt: localMeta.verifiedAt || row.verified_at || (isVerified ? row.updated_at || row.created_at || '2024-09-15' : undefined),
        lastVerifiedAt: localMeta.lastVerifiedAt || row.last_verified_at || (isVerified ? row.updated_at : undefined),
        priceUpdatedAt: localMeta.priceUpdatedAt || row.price_updated_at || row.updated_at || row.created_at || '2024-09-20',
        lastPriceConfirmedAt: localMeta.lastPriceConfirmedAt || localMeta.priceUpdatedAt || row.updated_at,
        availabilityStatus: availabilityStatus,
        lastAvailabilityConfirmedAt: localMeta.lastAvailabilityConfirmedAt || row.updated_at,

        imageUrl_small: row.main_image, 
        imageUrl_medium: row.main_image,
        imageUrl_large: row.main_image,
    };
};

// Optimization: Batch hydration to avoid N+1 requests
const hydratePropertiesBatch = async (properties: Property[]): Promise<Property[]> => {
    if (properties.length === 0) return [];

    try {
        const [allPartners, allProjects] = await Promise.all([
            getAllPartners().catch(e => { console.error("Failed to fetch partners", e); return []; }),
            getAllProjects().catch(e => { console.error("Failed to fetch projects", e); return []; })
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
                verificationStatus: prop.verificationStatus || 'verified',
                verifiedAt: prop.verifiedAt || prop.listingStartDate || '2024-09-18',
                priceUpdatedAt: prop.priceUpdatedAt || '2024-09-22',
                availabilityStatus: prop.availabilityStatus || 'available',
                sourceType: prop.sourceType || 'developer'
            };
        });

    } catch (e) {
        console.error("Error hydrating properties:", e);
        return properties;
    }
};

export const getAllProperties = async (): Promise<Property[]> => {
    try {
        const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
        
        if (error || !data || data.length === 0) {
            // Fallback to local data if DB is empty or fails
            return hydratePropertiesBatch(fallbackProperties);
        }
        const rawProperties = data.map(mapPropertyFromDb);
        return hydratePropertiesBatch(rawProperties);
    } catch (e) {
        return hydratePropertiesBatch(fallbackProperties);
    }
};

export const getProperties = async (): Promise<Property[]> => {
    try {
        const { data, error } = await supabase.from('properties').select('*').eq('listing_status', 'active');
        if (error || !data || data.length === 0) {
            return hydratePropertiesBatch(fallbackProperties.filter(p => p.listingStatus === 'active'));
        }
        const rawProperties = data.map(mapPropertyFromDb);
        return hydratePropertiesBatch(rawProperties);
    } catch (e) {
        return hydratePropertiesBatch(fallbackProperties.filter(p => p.listingStatus === 'active'));
    }
};

export const getPropertiesByPartnerId = async (partnerId: string): Promise<Property[]> => {
    try {
        const { data, error } = await supabase.from('properties').select('*').eq('partner_id', partnerId);
        if (error || !data || data.length === 0) {
            return hydratePropertiesBatch(fallbackProperties.filter(p => p.partnerId === partnerId));
        }
        const rawProperties = data.map(mapPropertyFromDb);
        return hydratePropertiesBatch(rawProperties);
    } catch (e) {
        return hydratePropertiesBatch(fallbackProperties.filter(p => p.partnerId === partnerId));
    }
};

export const getPropertiesByProjectId = async (projectId: string): Promise<Property[]> => {
    try {
        const { data, error } = await supabase.from('properties').select('*').eq('project_id', projectId);
        if (error || !data || data.length === 0) {
            return hydratePropertiesBatch(fallbackProperties.filter(p => p.projectId === projectId));
        }
        const rawProperties = data.map(mapPropertyFromDb);
        return hydratePropertiesBatch(rawProperties);
    } catch (e) {
        return hydratePropertiesBatch(fallbackProperties.filter(p => p.projectId === projectId));
    }
};

export const getPropertyById = async (id: string): Promise<Property | undefined> => {
    try {
        const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
        if (error || !data) {
            const fallback = fallbackProperties.find(p => p.id === id);
            return fallback ? (await hydratePropertiesBatch([fallback]))[0] : undefined;
        }
        const rawProp = mapPropertyFromDb(data);
        const hydratedArray = await hydratePropertiesBatch([rawProp]);
        return hydratedArray[0];
    } catch (e) {
        const fallback = fallbackProperties.find(p => p.id === id);
        return fallback ? (await hydratePropertiesBatch([fallback]))[0] : undefined;
    }
};

export const getPaginatedProperties = async (options: {
  page: number;
  limit: number;
  filters: PropertyFiltersType;
  disablePagination?: boolean;
}): Promise<{ properties: Property[]; total: number }> => {
    // In a real production app, filtering should be done on the DB side (Supabase).
    // For this implementation, we fetch all and filter in memory to support complex JSON logic easier, 
    // but in a high-scale app, this should be refactored to SQL queries.
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

const mapPropertyToDbPayload = (property: Partial<Property>) => {
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
    
    if (property.installments) payload.installments_info = property.installments;
    
    if (property.listingStatus) payload.listing_status = property.listingStatus;
    if (property.contactMethod) payload.contact_method = property.contactMethod;
    if (property.ownerPhone !== undefined) payload.owner_phone = property.ownerPhone;
    if (property.listingStartDate) payload.listing_start_date = property.listingStartDate;
    if (property.listingEndDate) payload.listing_end_date = property.listingEndDate;

    if (property.verificationStatus !== undefined) {
        payload.is_verified = property.verificationStatus === 'verified';
    }

    return payload;
};

export const addProperty = async (property: Omit<Property, 'id' | 'partnerName' | 'partnerImageUrl'>): Promise<Property> => {
    // Generate valid RFC-4122 UUID for PostgreSQL compatibility
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });

    const now = new Date().toISOString();
    const referenceNumber = property.referenceNumber || generatePropertyReference(id);
    const slug = property.slug || generatePropertySlug(property.title?.en || '', id);

    setLocalPropertyMeta(id, {
        referenceNumber,
        slug,
        verificationStatus: property.verificationStatus || 'pending',
        availabilityStatus: property.availabilityStatus || 'available',
        priceUpdatedAt: now,
        lastPriceConfirmedAt: now,
        lastAvailabilityConfirmedAt: now,
        verifiedAt: property.verificationStatus === 'verified' ? now : undefined,
        sourceType: property.sourceType || 'partner_direct'
    });

    recordPropertyHistory({
        propertyId: id,
        changedBy: property.partnerId || 'system',
        field: 'creation',
        oldValue: null,
        newValue: { title: property.title?.en, price: property.priceNumeric, status: property.listingStatus },
        note: 'Property created'
    });

    const dbPayload = {
        id,
        ...mapPropertyToDbPayload(property),
        created_at: now,
        updated_at: now
    };
    
    try {
        const { data, error } = await supabase.from('properties').insert(dbPayload).select().single();
        if (error) {
            console.error("Supabase property insert error, using local fallback persistence:", error);
            const localProp: Property = {
                ...property,
                id,
                referenceNumber,
                slug,
                verificationStatus: property.verificationStatus || 'pending',
                availabilityStatus: property.availabilityStatus || 'available',
                priceUpdatedAt: now,
                listingStartDate: property.listingStartDate || now,
                imageUrl_small: property.imageUrl,
                imageUrl_medium: property.imageUrl,
                imageUrl_large: property.imageUrl,
            };
            return localProp;
        }
        return mapPropertyFromDb(data);
    } catch (e) {
        console.error("Failed to insert property into Supabase:", e);
        const localProp: Property = {
            ...property,
            id,
            referenceNumber,
            slug,
            verificationStatus: property.verificationStatus || 'pending',
            availabilityStatus: property.availabilityStatus || 'available',
            priceUpdatedAt: now,
            listingStartDate: property.listingStartDate || now,
            imageUrl_small: property.imageUrl,
            imageUrl_medium: property.imageUrl,
            imageUrl_large: property.imageUrl,
        };
        return localProp;
    }
};

export const updateProperty = async (propertyId: string, updates: Partial<Property>): Promise<Property | undefined> => {
    const now = new Date().toISOString();
    const existing = await getPropertyById(propertyId).catch(() => undefined);
    
    // Save metadata locally
    const metaUpdates: Record<string, any> = {};
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
    if (updates.priceNumeric !== undefined && existing?.priceNumeric !== updates.priceNumeric) {
        metaUpdates.priceUpdatedAt = now;
        metaUpdates.lastPriceConfirmedAt = now;
    }
    if (updates.sourceType) metaUpdates.sourceType = updates.sourceType;
    if (updates.referenceNumber) metaUpdates.referenceNumber = updates.referenceNumber;
    if (updates.slug) metaUpdates.slug = updates.slug;

    if (Object.keys(metaUpdates).length > 0) {
        setLocalPropertyMeta(propertyId, metaUpdates);
    }

    // Record audit history entries
    if (existing) {
        if (updates.priceNumeric !== undefined && updates.priceNumeric !== existing.priceNumeric) {
            recordPropertyHistory({
                propertyId,
                changedBy: updates.partnerId || 'admin',
                field: 'price',
                oldValue: existing.priceNumeric,
                newValue: updates.priceNumeric,
                note: `Price updated from ${existing.priceNumeric} to ${updates.priceNumeric}`
            });
        }
        if (updates.availabilityStatus !== undefined && updates.availabilityStatus !== existing.availabilityStatus) {
            recordPropertyHistory({
                propertyId,
                changedBy: updates.partnerId || 'admin',
                field: 'availability',
                oldValue: existing.availabilityStatus || 'available',
                newValue: updates.availabilityStatus,
                note: `Availability changed to ${updates.availabilityStatus}`
            });
        }
        if (updates.verificationStatus !== undefined && updates.verificationStatus !== existing.verificationStatus) {
            recordPropertyHistory({
                propertyId,
                changedBy: 'admin',
                field: 'verification',
                oldValue: existing.verificationStatus || 'pending',
                newValue: updates.verificationStatus,
                note: `Verification status changed to ${updates.verificationStatus}`
            });
        }
        if (updates.listingStatus !== undefined && updates.listingStatus !== existing.listingStatus) {
            recordPropertyHistory({
                propertyId,
                changedBy: updates.partnerId || 'admin',
                field: 'publication',
                oldValue: existing.listingStatus,
                newValue: updates.listingStatus,
                note: `Listing status changed to ${updates.listingStatus}`
            });
        }
    }

    const dbUpdates = {
        ...mapPropertyToDbPayload(updates),
        updated_at: now
    };
    
    try {
        const { data, error } = await supabase.from('properties').update(dbUpdates).eq('id', propertyId).select().single();
        if (error) {
            console.warn("Supabase update returned error (possibly RLS or missing columns), persisting locally:", error);
            if (existing) {
                return { ...existing, ...updates, ...metaUpdates };
            }
            return undefined;
        }
        return mapPropertyFromDb(data);
    } catch (e) {
        console.error("Error updating property in Supabase:", e);
        if (existing) {
            return { ...existing, ...updates, ...metaUpdates };
        }
        return undefined;
    }
};

export const deleteProperty = async (propertyId: string): Promise<boolean> => {
    const { error } = await supabase.from('properties').delete().eq('id', propertyId);
    if (error) {
        console.error("Error deleting property:", error);
        return false;
    }
    return true;
};

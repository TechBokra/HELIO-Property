import { supabase } from '../lib/supabase';
import { getAllPartners } from './partners'; 
import { getAllProjects } from './projects';
import type { Property, PropertyFiltersType, Partner, Project } from '../types';
import { filterProperties } from '../utils/propertyFilters';

const mapPropertyFromDb = (row: any): Property => {
    const amenities = typeof row.amenities === 'string' ? JSON.parse(row.amenities) : row.amenities || { ar: [], en: [] };
    const location = typeof row.location === 'string' ? JSON.parse(row.location) : row.location || { lat: 0, lng: 0 };
    const installments = typeof row.installments_info === 'string' ? JSON.parse(row.installments_info) : row.installments_info;

    const priceNumeric = Number(row.price);
    const price = {
        en: `EGP ${priceNumeric.toLocaleString('en-US')}`,
        ar: `${priceNumeric.toLocaleString('ar-EG')} ج.م`
    };

    return {
        id: row.id,
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
        
        listingStatus: row.listing_status,
        listingStartDate: row.listing_start_date,
        contactMethod: row.contact_method,
        ownerPhone: row.owner_phone,

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
                projectName: project ? project.name : undefined
            };
        });

    } catch (e) {
        console.error("Error hydrating properties:", e);
        return properties;
    }
};

export const getAllProperties = async (): Promise<Property[]> => {
    const { data, error } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error("Error fetching all properties:", error);
        return [];
    }
    const rawProperties = data.map(mapPropertyFromDb);
    return hydratePropertiesBatch(rawProperties);
};

export const getProperties = async (): Promise<Property[]> => {
    const { data, error } = await supabase.from('properties').select('*').eq('listing_status', 'active');
    if (error) {
        console.error("Error fetching active properties:", error);
        return [];
    }
    const rawProperties = data.map(mapPropertyFromDb);
    return hydratePropertiesBatch(rawProperties);
};

export const getPropertiesByPartnerId = async (partnerId: string): Promise<Property[]> => {
    const { data, error } = await supabase.from('properties').select('*').eq('partner_id', partnerId);
    if (error) {
        console.error(`Error fetching properties for partner ${partnerId}:`, error);
        return [];
    }
    const rawProperties = data.map(mapPropertyFromDb);
    return hydratePropertiesBatch(rawProperties);
};

export const getPropertiesByProjectId = async (projectId: string): Promise<Property[]> => {
    const { data, error } = await supabase.from('properties').select('*').eq('project_id', projectId);
    if (error) {
         console.error(`Error fetching properties for project ${projectId}:`, error);
         return [];
    }
    const rawProperties = data.map(mapPropertyFromDb);
    return hydratePropertiesBatch(rawProperties);
};

export const getPropertyById = async (id: string): Promise<Property | undefined> => {
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
    if (error) return undefined;
    const rawProp = mapPropertyFromDb(data);
    const hydratedArray = await hydratePropertiesBatch([rawProp]);
    return hydratedArray[0];
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
    if (property.ownerPhone) payload.owner_phone = property.ownerPhone;
    if (property.listingStartDate) payload.listing_start_date = property.listingStartDate;
    if (property.listingEndDate) payload.listing_end_date = property.listingEndDate;

    return payload;
};

export const addProperty = async (property: Omit<Property, 'id' | 'partnerName' | 'partnerImageUrl'>): Promise<Property> => {
    const id = `prop-${Date.now()}`;
    const dbPayload = {
        id,
        ...mapPropertyToDbPayload(property),
        created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase.from('properties').insert(dbPayload).select().single();
    if (error) throw error;
    return mapPropertyFromDb(data);
};

export const updateProperty = async (propertyId: string, updates: Partial<Property>): Promise<Property | undefined> => {
    const dbUpdates = mapPropertyToDbPayload(updates);
    
    const { data, error } = await supabase.from('properties').update(dbUpdates).eq('id', propertyId).select().single();
    if (error) {
        console.error("Error updating property:", error);
        return undefined;
    }
    return mapPropertyFromDb(data);
};

export const deleteProperty = async (propertyId: string): Promise<boolean> => {
    const { error } = await supabase.from('properties').delete().eq('id', propertyId);
    if (error) {
        console.error("Error deleting property:", error);
        return false;
    }
    return true;
};
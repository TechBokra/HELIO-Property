
import { supabase } from '../lib/supabase';
import { getPartnerById } from './partners';
import { getProjectById } from './projects';
import type { Property, PropertyFiltersType } from '../types';
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

const hydrateProperty = async (prop: Property): Promise<Property> => {
    const partner = await getPartnerById(prop.partnerId);
    let projectName = undefined;
    if (prop.projectId) {
        const project = await getProjectById(prop.projectId);
        if (project) projectName = project.name;
    }
    
    return {
        ...prop,
        partnerName: partner?.name,
        partnerImageUrl: partner?.imageUrl,
        projectName: projectName
    };
};

export const getAllProperties = async (): Promise<Property[]> => {
    const { data, error } = await supabase.from('properties').select('*');
    if (error) throw error;
    const props = data.map(mapPropertyFromDb);
    return Promise.all(props.map(hydrateProperty));
};

export const getProperties = async (): Promise<Property[]> => {
    const { data, error } = await supabase.from('properties').select('*').eq('listing_status', 'active');
    if (error) throw error;
    const props = data.map(mapPropertyFromDb);
    return Promise.all(props.map(hydrateProperty));
};

export const getPropertiesByPartnerId = async (partnerId: string): Promise<Property[]> => {
    const { data, error } = await supabase.from('properties').select('*').eq('partner_id', partnerId);
    if (error) throw error;
    return data.map(mapPropertyFromDb);
};

export const getPropertiesByProjectId = async (projectId: string): Promise<Property[]> => {
    const { data, error } = await supabase.from('properties').select('*').eq('project_id', projectId);
    if (error) throw error;
    return data.map(mapPropertyFromDb);
};

export const getPropertyById = async (id: string): Promise<Property | undefined> => {
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
    if (error) return undefined;
    const prop = mapPropertyFromDb(data);
    return hydrateProperty(prop);
};

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

export const addProperty = async (property: Omit<Property, 'id' | 'partnerName' | 'partnerImageUrl'>): Promise<Property> => {
    const dbPayload = {
        partner_id: property.partnerId,
        project_id: property.projectId,
        main_image: property.imageUrl,
        gallery: property.gallery,
        title_ar: property.title.ar,
        title_en: property.title.en,
        description_ar: property.description.ar,
        description_en: property.description.en,
        address_ar: property.address.ar,
        address_en: property.address.en,
        price: property.priceNumeric,
        area: property.area,
        type: property.type.en,
        status: property.status.en,
        finishing_status: property.finishingStatus?.en,
        beds: property.beds,
        baths: property.baths,
        floor: property.floor,
        amenities: JSON.stringify(property.amenities), 
        location: JSON.stringify(property.location),   
        is_in_compound: property.isInCompound,
        installments_available: property.installmentsAvailable,
        finance_available: property.realEstateFinanceAvailable,
        delivery_immediate: property.delivery.isImmediate,
        delivery_date: property.delivery.date,
        installments_info: JSON.stringify(property.installments),
        listing_status: property.listingStatus,
        contact_method: property.contactMethod,
        owner_phone: property.ownerPhone,
        listing_start_date: new Date().toISOString()
    };
    
    const { data, error } = await supabase.from('properties').insert(dbPayload).select().single();
    if (error) throw error;
    return mapPropertyFromDb(data);
};

export const updateProperty = async (propertyId: string, updates: Partial<Property>): Promise<Property | undefined> => {
    const dbUpdates: any = {};
    if (updates.listingStatus) dbUpdates.listing_status = updates.listingStatus;
    if (updates.title) { dbUpdates.title_ar = updates.title.ar; dbUpdates.title_en = updates.title.en; }
    
    const { data, error } = await supabase.from('properties').update(dbUpdates).eq('id', propertyId).select().single();
    if (error) return undefined;
    return mapPropertyFromDb(data);
};

export const deleteProperty = async (propertyId: string): Promise<boolean> => {
    const { error } = await supabase.from('properties').delete().eq('id', propertyId);
    return !error;
};

import { supabase, supabasePublic } from '../lib/supabase';
import { getAllPartners, getPartnerById } from './partners';
import { getAllProjects, getProjectById } from './projects';
import {
    Permission,
    type Property,
    type PropertyFiltersType,
    type Partner,
    type Project,
    type PropertyHistoryEntry,
    type PublicationStatus,
} from '../types';
import { filterProperties } from '../utils/propertyFilters';
import { isPropertyPubliclyVisible } from '../utils/propertyUtils';
import { isDemoModeEnabled } from '../utils/demoMode';
import { propertiesData } from '../data/properties';
import { requireAnyPermission } from './authGuard';
import { useAuthStore } from '../store/useAuthStore';

export interface PropertyQueryOptions {
    cityId?: string;
    publicOnly?: boolean;
    forceRefresh?: boolean;
    client?: any;
}

const getReadClient = (overrideClient?: any, preferPublicClient = false) => {
    if (overrideClient) return overrideClient;
    if (preferPublicClient) return supabasePublic;
    try {
        const user = useAuthStore.getState().currentUser;
        if (user && !user.isDemo) {
            return supabase;
        }
    } catch {
        // Ignore outside browser runtime
    }
    return supabasePublic;
};

const parsePropertyQueryOptions = (cityIdOrOptions?: string | PropertyQueryOptions | unknown): PropertyQueryOptions => {
    if (typeof cityIdOrOptions === 'string') {
        return { cityId: cityIdOrOptions };
    }
    if (
        cityIdOrOptions &&
        typeof cityIdOrOptions === 'object' &&
        ('cityId' in cityIdOrOptions ||
            'publicOnly' in cityIdOrOptions ||
            'forceRefresh' in cityIdOrOptions ||
            'client' in cityIdOrOptions)
    ) {
        return cityIdOrOptions as PropertyQueryOptions;
    }
    return {};
};

const isMissingColumnError = (error: any, columnName: string): boolean => {
    if (!error) return false;
    const code = String(error.code || '');
    const msg = String(error.message || '').toLowerCase();
    return (code === '42703' || code === 'PGRST204') && msg.includes(columnName.toLowerCase());
};

const OPTIONAL_PROPERTY_MIGRATION_COLUMNS = ['city_id', 'source_request_id'] as const;

const stripMissingOptionalColumns = (
    payload: Record<string, any>,
    error: any
): Record<string, any> | null => {
    let stripped = false;
    const next = { ...payload };
    for (const col of OPTIONAL_PROPERTY_MIGRATION_COLUMNS) {
        if (col in next && isMissingColumnError(error, col)) {
            delete next[col];
            stripped = true;
        }
    }
    return stripped ? next : null;
};

const derivePublicationStatusForListing = (listingStatus: string | undefined): PublicationStatus | undefined => {
    if (!listingStatus) return undefined;
    if (listingStatus === 'draft') return 'draft';
    if (listingStatus === 'inactive') return 'archived';
    if (listingStatus === 'active' || listingStatus === 'sold') return 'published';
    return undefined;
};

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
                note: row.note,
            }));
        }

        const { data: propData } = await supabase
            .from('properties')
            .select('installments_info')
            .eq('id', propertyId)
            .maybeSingle();

        if (propData?.installments_info) {
            const raw =
                typeof propData.installments_info === 'string'
                    ? JSON.parse(propData.installments_info)
                    : propData.installments_info;
            if (raw?._meta?.history && Array.isArray(raw._meta.history)) {
                return raw._meta.history;
            }
        }

        return [];
    } catch (e) {
        console.warn('Failed to retrieve property history from Supabase:', e);
        return [];
    }
};

/**
 * Record property history in Supabase (persists across refreshes, devices, and logins)
 */
export const recordPropertyHistory = async (entry: Omit<PropertyHistoryEntry, 'id' | 'changedAt'>): Promise<void> => {
    try {
        const now = new Date().toISOString();
        const historyId =
            typeof crypto !== 'undefined' && crypto.randomUUID
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
            created_at: now,
        };

        try {
            await supabase.from('property_history').insert(historyRow);
        } catch {
            // Table may be pending migration in some environments
        }

        try {
            const { data: propData } = await supabase
                .from('properties')
                .select('installments_info')
                .eq('id', entry.propertyId)
                .maybeSingle();

            if (propData) {
                const rawInst =
                    typeof propData.installments_info === 'string'
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
                    note: entry.note,
                };

                const updatedMeta = {
                    ...existingMeta,
                    history: [newHistEntry, ...existingHist].slice(0, 100),
                };

                await supabase
                    .from('properties')
                    .update({
                        installments_info: { ...rawInst, _meta: updatedMeta },
                    })
                    .eq('id', entry.propertyId);
            }
        } catch (innerErr) {
            console.warn('Could not embed history into property row in Supabase:', innerErr);
        }
    } catch (e) {
        console.error('Failed to record property history:', e);
    }
};

/**
 * Transforms Supabase database row into canonical Property interface
 */
export const mapPropertyFromDb = (row: any): Property => {
    let amenities = { ar: [], en: [] };
    try {
        amenities = typeof row.amenities === 'string' ? JSON.parse(row.amenities) : row.amenities || { ar: [], en: [] };
    } catch {
        amenities = { ar: [], en: [] };
    }

    let location = { lat: 0, lng: 0 };
    try {
        location = typeof row.location === 'string' ? JSON.parse(row.location) : row.location || { lat: 0, lng: 0 };
    } catch {
        location = { lat: 0, lng: 0 };
    }

    let installmentsRaw: any = null;
    try {
        installmentsRaw =
            typeof row.installments_info === 'string' ? JSON.parse(row.installments_info) : row.installments_info;
    } catch {
        installmentsRaw = null;
    }

    let gallery: string[] = [];
    if (Array.isArray(row.gallery)) {
        gallery = row.gallery;
    } else if (typeof row.gallery === 'string') {
        try {
            const parsed = JSON.parse(row.gallery);
            gallery = Array.isArray(parsed) ? parsed : [];
        } catch {
            gallery = [];
        }
    }

    const meta = installmentsRaw?._meta || {};

    const priceNumeric = Number(row.price) || 0;
    const price = {
        en: `EGP ${priceNumeric.toLocaleString('en-US')}`,
        ar: `${priceNumeric.toLocaleString('ar-EG')} ج.م`,
    };

    const listingStatus = row.listing_status || 'active';
    const isVerified =
        row.is_verified === true || meta.verificationStatus === 'verified' || row.verification_status === 'verified';
    const availabilityStatus =
        row.availability_status || meta.availabilityStatus || (listingStatus === 'sold' ? 'sold' : 'available');

    // Keep publicationStatus aligned with authoritative listing_status so hiding a previously
    // published listing cannot leave a stale 'published' status in _meta.
    const rawExplicitPub = row.publication_status || meta.publicationStatus;
    const publicationStatus: PublicationStatus =
        listingStatus === 'draft'
            ? rawExplicitPub === 'pending_review' || rawExplicitPub === 'rejected'
                ? rawExplicitPub
                : 'draft'
            : listingStatus === 'inactive'
                ? 'archived'
                : rawExplicitPub && rawExplicitPub !== 'draft' && rawExplicitPub !== 'archived'
                    ? rawExplicitPub
                    : 'published';

    const verificationStatus = isVerified ? 'verified' : row.verification_status || meta.verificationStatus || 'pending';

    return {
        id: row.id,
        referenceNumber: row.reference_number || meta.referenceNumber || generatePropertyReference(row.id),
        slug: row.slug || meta.slug || generatePropertySlug(row.title_en, row.id),
        partnerId: row.partner_id,
        projectId: row.project_id || undefined,
        imageUrl: row.main_image || '',
        gallery,

        title: {
            ar: row.title_ar || row.title_en || '',
            en: row.title_en || row.title_ar || '',
        },
        description: {
            ar: row.description_ar || row.description_en || '',
            en: row.description_en || row.description_ar || '',
        },
        address: {
            ar: row.address_ar || row.address_en || '',
            en: row.address_en || row.address_ar || '',
        },

        status: {
            en: row.status === 'For Rent' || row.status === 'rent' ? 'For Rent' : 'For Sale',
            ar: row.status === 'For Rent' || row.status === 'rent' ? 'إيجار' : 'للبيع',
        },
        type: {
            en: row.type || 'Apartment',
            ar:
                row.type === 'Apartment'
                    ? 'شقة'
                    : row.type === 'Villa'
                        ? 'فيلا'
                        : row.type === 'Commercial'
                            ? 'تجاري'
                            : 'أرض',
        },
        finishingStatus: row.finishing_status
            ? {
                  en: row.finishing_status,
                  ar: row.finishing_status,
              }
            : undefined,

        price,
        priceNumeric,
        area: Number(row.area) || 0,
        beds: row.beds ?? 0,
        baths: row.baths ?? 0,
        floor: row.floor,

        amenities: {
            ar: Array.isArray(amenities?.ar) ? amenities.ar : [],
            en: Array.isArray(amenities?.en) ? amenities.en : [],
        },
        location: {
            lat: Number(location?.lat) || 0,
            lng: Number(location?.lng) || 0,
        },

        isInCompound: Boolean(row.is_in_compound),
        installmentsAvailable: Boolean(row.installments_available),
        realEstateFinanceAvailable: Boolean(row.finance_available),

        delivery: {
            isImmediate: Boolean(row.delivery_immediate),
            date: row.delivery_date,
        },
        installments: installmentsRaw
            ? {
                  downPayment: installmentsRaw.downPayment || 0,
                  monthlyInstallment: installmentsRaw.monthlyInstallment || 0,
                  years: installmentsRaw.years || 0,
              }
            : undefined,

        listingStatus,
        publicationStatus,
        availabilityStatus,
        verificationStatus,

        listingStartDate: row.listing_start_date || row.created_at,
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
        createdAt: row.created_at || row.listing_start_date,
        updatedAt: row.updated_at,
        history: meta.history || [],

        imageUrl_small: row.main_image || '',
        imageUrl_medium: row.main_image || '',
        imageUrl_large: row.main_image || '',
        cityId: row.city_id || meta.cityId || 'heliopolis',
    };
};

export const filterPropertiesByCity = (properties: Property[], cityId?: string): Property[] => {
    if (!cityId || cityId === 'all' || cityId === 'hub') return properties;
    const normalized = cityId.trim().toLowerCase();
    return properties.filter((prop) => (prop.cityId || 'heliopolis').toLowerCase() === normalized);
};

/**
 * Hydrates partner & project details efficiently without masking property errors.
 */
const hydratePropertiesBatch = async (properties: Property[], options?: { client?: any }): Promise<Property[]> => {
    if (properties.length === 0) return [];

    try {
        const partnerIds = new Set(properties.map((p) => p.partnerId).filter(Boolean));
        const projectIds = new Set(properties.map((p) => p.projectId).filter(Boolean));

        const [allPartners, allProjects] = await Promise.all([
            partnerIds.size > 0 ? getAllPartners({ client: options?.client }).catch(() => []) : Promise.resolve([]),
            projectIds.size > 0 ? getAllProjects({ client: options?.client }).catch(() => []) : Promise.resolve([]),
        ]);

        const partnerMap = new Map<string, Partner>();
        allPartners.forEach((p) => partnerMap.set(p.id, p));

        const projectMap = new Map<string, Project>();
        allProjects.forEach((p) => projectMap.set(p.id, p));

        return properties.map((prop) => {
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
        console.warn('Non-blocking property hydration notice:', e);
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
 * Fetches all properties for Admin / Partner operational dashboards (includes drafts & hidden).
 */
export const getAllProperties = async (cityIdOrOptions?: string | PropertyQueryOptions | unknown): Promise<Property[]> => {
    const opts = parsePropertyQueryOptions(cityIdOrOptions);
    const cityId = opts.cityId;

    if (isDemoModeEnabled() && !opts.client) {
        return filterPropertiesByCity(propertiesData, cityId);
    }

    const useCache = !opts.client && !opts.forceRefresh;
    const now = Date.now();
    if (useCache && cachedAllProperties && now - cachedAllProperties.timestamp < PROPERTIES_CACHE_TTL) {
        return filterPropertiesByCity(cachedAllProperties.data, cityId);
    }

    const executeFetch = async (): Promise<Property[]> => {
        const dbClient = getReadClient(opts.client, false);
        const { data, error } = await dbClient
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message || 'Failed to fetch properties from database.');
        }

        const rawProperties = (data || []).map(mapPropertyFromDb);
        const hydrated = await hydratePropertiesBatch(rawProperties, { client: opts.client });
        if (!opts.client) {
            cachedAllProperties = { data: hydrated, timestamp: Date.now() };
        }
        return hydrated;
    };

    if (!opts.client && !opts.forceRefresh) {
        if (inFlightAllPropertiesPromise) {
            const list = await inFlightAllPropertiesPromise;
            return filterPropertiesByCity(list, cityId);
        }

        inFlightAllPropertiesPromise = executeFetch().finally(() => {
            inFlightAllPropertiesPromise = null;
        });

        const result = await inFlightAllPropertiesPromise;
        return filterPropertiesByCity(result, cityId);
    }

    const result = await executeFetch();
    return filterPropertiesByCity(result, cityId);
};

/**
 * Fetches publicly visible properties strictly enforcing the unified public visibility rule
 * (active or sold published listings; never drafts, inactive, archived, pending_review, or rejected).
 */
export const getProperties = async (cityIdOrOptions?: string | PropertyQueryOptions | unknown): Promise<Property[]> => {
    const opts = parsePropertyQueryOptions(cityIdOrOptions);
    const cityId = opts.cityId;

    if (isDemoModeEnabled() && !opts.client) {
        return filterPropertiesByCity(
            propertiesData.filter((p) => isPropertyPubliclyVisible(p, { includeSold: true })),
            cityId
        );
    }

    const useCache = !opts.client && !opts.forceRefresh;
    const now = Date.now();
    if (useCache && cachedPublicProperties && now - cachedPublicProperties.timestamp < PROPERTIES_CACHE_TTL) {
        return filterPropertiesByCity(cachedPublicProperties.data, cityId);
    }

    const executeFetch = async (): Promise<Property[]> => {
        const dbClient = getReadClient(opts.client, true);
        const { data, error } = await dbClient
            .from('properties')
            .select('*')
            .in('listing_status', ['active', 'sold'])
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message || 'Failed to fetch public properties from database.');
        }

        const rawProperties: Property[] = (data || [])
            .map(mapPropertyFromDb)
            .filter((p: Property) => isPropertyPubliclyVisible(p, { includeSold: true }));
        const hydrated = await hydratePropertiesBatch(rawProperties, { client: opts.client });
        if (!opts.client) {
            cachedPublicProperties = { data: hydrated, timestamp: Date.now() };
        }
        return hydrated;
    };

    if (!opts.client && !opts.forceRefresh) {
        if (inFlightPublicPropertiesPromise) {
            const list = await inFlightPublicPropertiesPromise;
            return filterPropertiesByCity(list, cityId);
        }

        inFlightPublicPropertiesPromise = executeFetch().finally(() => {
            inFlightPublicPropertiesPromise = null;
        });

        const result = await inFlightPublicPropertiesPromise;
        return filterPropertiesByCity(result, cityId);
    }

    const result = await executeFetch();
    return filterPropertiesByCity(result, cityId);
};

/**
 * Fetches properties belonging to a specific partner.
 * - With `{ publicOnly: true }` (used on public PartnerProfilePage): returns only publicly visible listings.
 * - With `{ publicOnly: false }` (default for Partner Dashboard): returns all partner properties including drafts.
 */
export const getPropertiesByPartnerId = async (
    partnerId: string,
    options?: { publicOnly?: boolean; client?: any }
): Promise<Property[]> => {
    if (!partnerId) return [];
    const publicOnly = options?.publicOnly ?? false;

    if (isDemoModeEnabled() && !options?.client) {
        const demoProps = propertiesData.filter((p) => p.partnerId === partnerId);
        return publicOnly ? demoProps.filter((p) => isPropertyPubliclyVisible(p, { includeSold: true })) : demoProps;
    }

    const dbClient = getReadClient(options?.client, publicOnly);
    let query = dbClient.from('properties').select('*').eq('partner_id', partnerId);
    if (publicOnly) {
        query = query.in('listing_status', ['active', 'sold']);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message || 'Failed to get partner properties from database.');
    }

    const mapped: Property[] = (data || []).map(mapPropertyFromDb);
    const scoped = publicOnly ? mapped.filter((p: Property) => isPropertyPubliclyVisible(p, { includeSold: true })) : mapped;
    return hydratePropertiesBatch(scoped, { client: options?.client });
};

export const getPublicPropertiesByPartnerId = async (
    partnerId: string,
    options?: { client?: any }
): Promise<Property[]> => {
    return getPropertiesByPartnerId(partnerId, { publicOnly: true, client: options?.client });
};

/**
 * Fetches properties linked to a specific project.
 * Defaults to `publicOnly: true` for public project showcase views.
 */
export const getPropertiesByProjectId = async (
    projectId: string,
    options?: { publicOnly?: boolean; client?: any }
): Promise<Property[]> => {
    if (!projectId) return [];
    const publicOnly = options?.publicOnly ?? true;

    if (isDemoModeEnabled() && !options?.client) {
        const demoProps = propertiesData.filter((p) => p.projectId === projectId);
        return publicOnly ? demoProps.filter((p) => isPropertyPubliclyVisible(p, { includeSold: true })) : demoProps;
    }

    const dbClient = getReadClient(options?.client, publicOnly);
    let query = dbClient.from('properties').select('*').eq('project_id', projectId);
    if (publicOnly) {
        query = query.in('listing_status', ['active', 'sold']);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message || 'Failed to get project properties from database.');
    }

    const mapped: Property[] = (data || []).map(mapPropertyFromDb);
    const scoped = publicOnly ? mapped.filter((p: Property) => isPropertyPubliclyVisible(p, { includeSold: true })) : mapped;
    return hydratePropertiesBatch(scoped, { client: options?.client });
};

/**
 * Fetches single property by ID with fast targeted hydration.
 * Uses the authenticated client when a user session is active so authorized
 * partners and admins can review unpublished/draft properties under RLS.
 */
export const getPropertyById = async (
    id: string,
    options?: { client?: any }
): Promise<Property | undefined> => {
    if (!id) return undefined;

    if (isDemoModeEnabled() && !options?.client) {
        return propertiesData.find((p) => p.id === id);
    }

    const dbClient = getReadClient(options?.client, false);
    const { data, error } = await dbClient.from('properties').select('*').eq('id', id).maybeSingle();

    if (error) {
        throw new Error(error.message || 'Failed to fetch property from database.');
    }

    if (!data) {
        return undefined;
    }

    const rawProp = mapPropertyFromDb(data);
    try {
        const [partner, project] = await Promise.all([
            rawProp.partnerId
                ? getPartnerById(rawProp.partnerId, { client: options?.client }).catch(() => undefined)
                : Promise.resolve(undefined),
            rawProp.projectId
                ? getProjectById(rawProp.projectId, { client: options?.client }).catch(() => undefined)
                : Promise.resolve(undefined),
        ]);
        rawProp.partnerName = partner?.name;
        rawProp.partnerImageUrl = partner?.imageUrl;
        rawProp.projectName = project?.name;
    } catch (e) {
        console.warn('Non-blocking property hydration warning:', e);
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
    cityId?: string;
    client?: any;
}): Promise<{ properties: Property[]; total: number }> => {
    const allProps = await getProperties({ cityId: options.cityId, client: options.client });
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
 * Looks up an existing property linked to a specific source listing request ID
 * (supports both top-level `source_request_id` column and legacy `_meta.sourceRequestId` JSONB).
 */
export const getPropertyBySourceRequestId = async (
    sourceRequestId: string,
    options?: { client?: any }
): Promise<Property | undefined> => {
    if (!sourceRequestId) return undefined;

    if (isDemoModeEnabled() && !options?.client) {
        return propertiesData.find((p) => p.sourceRequestId === sourceRequestId);
    }

    const dbClient = getReadClient(options?.client, false);
    const { data, error } = await dbClient
        .from('properties')
        .select('*')
        .eq('source_request_id', sourceRequestId)
        .maybeSingle();

    if (!error && data) {
        const hydrated = await hydratePropertiesBatch([mapPropertyFromDb(data)], { client: options?.client });
        return hydrated[0];
    }

    if (error && !isMissingColumnError(error, 'source_request_id')) {
        throw new Error(error.message || 'Failed to look up property by source request ID.');
    }

    // Fallback when `source_request_id` column is absent or legacy row stored link inside `_meta.sourceRequestId`
    const { data: rows, error: listError } = await dbClient
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

    if (listError) {
        throw new Error(listError.message || 'Failed to scan properties for source request link.');
    }

    const matched = (rows || []).map(mapPropertyFromDb).find((p: Property) => p.sourceRequestId === sourceRequestId);
    if (!matched) return undefined;
    const hydrated = await hydratePropertiesBatch([matched], { client: options?.client });
    return hydrated[0];
};

/**
 * Maps frontend Property to database payload, embedding canonical business metadata safely
 */
const mapPropertyToDbPayload = (property: Partial<Property>, existingMeta: Record<string, any> = {}) => {
    const payload: any = {};

    if (property.partnerId) payload.partner_id = property.partnerId;
    if ('projectId' in property) {
        payload.project_id = property.projectId ? property.projectId : null;
    }
    if (property.imageUrl !== undefined) payload.main_image = property.imageUrl;
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
    if (property.cityId) payload.city_id = property.cityId;
    if (property.sourceRequestId) payload.source_request_id = property.sourceRequestId;

    if (property.verificationStatus !== undefined) {
        payload.is_verified = property.verificationStatus === 'verified';
    }

    const derivedPubStatus =
        property.publicationStatus || derivePublicationStatusForListing(property.listingStatus);

    const baseInstallments = property.installments || existingMeta.installments || {};
    const updatedMeta = {
        ...existingMeta,
        cityId: property.cityId || existingMeta.cityId || 'heliopolis',
        referenceNumber: property.referenceNumber || existingMeta.referenceNumber,
        slug: property.slug || existingMeta.slug,
        sourceType: property.sourceType || existingMeta.sourceType,
        sourceRequestId: property.sourceRequestId || existingMeta.sourceRequestId,
        publicationStatus: derivedPubStatus || existingMeta.publicationStatus,
        availabilityStatus: property.availabilityStatus || existingMeta.availabilityStatus,
        verificationStatus: property.verificationStatus || existingMeta.verificationStatus,
        verifiedAt: property.verifiedAt || existingMeta.verifiedAt,
        priceUpdatedAt: property.priceUpdatedAt || existingMeta.priceUpdatedAt,
        lastPriceConfirmedAt: property.lastPriceConfirmedAt || existingMeta.lastPriceConfirmedAt,
        lastAvailabilityConfirmedAt: property.lastAvailabilityConfirmedAt || existingMeta.lastAvailabilityConfirmedAt,
        createdBy: property.createdBy || existingMeta.createdBy,
        updatedBy: property.updatedBy || existingMeta.updatedBy,
        history: property.history || existingMeta.history || [],
    };

    payload.installments_info = {
        ...baseInstallments,
        _meta: updatedMeta,
    };

    return payload;
};

/**
 * Creates new property and persists all canonical business state in Supabase
 */
export const addProperty = async (
    property: Omit<Property, 'id' | 'partnerName' | 'partnerImageUrl'>,
    options?: { client?: any }
): Promise<Property> => {
    requireAnyPermission([
        Permission.MANAGE_ALL_PROPERTIES,
        Permission.MANAGE_PLATFORM_PROPERTIES,
        Permission.MANAGE_MARKET_PROPERTIES,
        Permission.MANAGE_OWN_PROPERTIES,
    ]);

    const dbClient = options?.client || supabase;
    const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                  const r = (Math.random() * 16) | 0;
                  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
              });

    const now = new Date().toISOString();
    const referenceNumber = property.referenceNumber || generatePropertyReference(id);
    const slug = property.slug || generatePropertySlug(property.title?.en || '', id);

    const initialHistoryEntry: PropertyHistoryEntry = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist-${Date.now()}`,
        propertyId: id,
        changedBy: property.partnerId || 'system',
        changedAt: now,
        createdAt: now,
        changeType: 'creation',
        field: 'creation',
        fieldName: 'creation',
        oldValue: null,
        newValue: { title: property.title?.en, price: property.priceNumeric, status: property.listingStatus },
        note: 'Property created',
    };

    const initialMeta = {
        cityId: property.cityId || 'heliopolis',
        referenceNumber,
        slug,
        verificationStatus: property.verificationStatus || 'pending',
        availabilityStatus: property.availabilityStatus || 'available',
        publicationStatus:
            property.publicationStatus ||
            derivePublicationStatusForListing(property.listingStatus) ||
            'published',
        priceUpdatedAt: now,
        lastPriceConfirmedAt: now,
        lastAvailabilityConfirmedAt: now,
        verifiedAt: property.verificationStatus === 'verified' ? now : undefined,
        sourceType: property.sourceType || 'partner_direct',
        sourceRequestId: property.sourceRequestId,
        createdBy: property.createdBy || property.partnerId,
        history: [initialHistoryEntry],
    };

    const dbPayload: Record<string, any> = {
        id,
        ...mapPropertyToDbPayload(property, initialMeta),
        listing_start_date: property.listingStartDate || now,
        created_at: now,
        updated_at: now,
    };

    let currentInsertPayload = dbPayload;
    let { data, error } = await dbClient.from('properties').insert(currentInsertPayload).select().single();
    for (let attempt = 0; attempt < 2 && error; attempt++) {
        const nextPayload = stripMissingOptionalColumns(currentInsertPayload, error);
        if (!nextPayload) break;
        currentInsertPayload = nextPayload;
        const retry = await dbClient.from('properties').insert(currentInsertPayload).select().single();
        data = retry.data;
        error = retry.error;
    }

    if (error) {
        console.error('Supabase property insert error:', error);
        throw error;
    }

    try {
        await dbClient.from('property_history').insert({
            id: initialHistoryEntry.id,
            property_id: id,
            changed_by: initialHistoryEntry.changedBy,
            change_type: 'creation',
            field_name: 'creation',
            old_value: null,
            new_value: initialHistoryEntry.newValue,
            note: initialHistoryEntry.note,
            created_at: now,
        });
    } catch {
        // Table may be pending migration
    }

    invalidatePropertiesCache();
    return mapPropertyFromDb(data);
};

/**
 * Updates existing property and records database-backed audit log
 */
export const updateProperty = async (
    propertyId: string,
    updates: Partial<Property>,
    options?: { client?: any }
): Promise<Property | undefined> => {
    requireAnyPermission([
        Permission.MANAGE_ALL_PROPERTIES,
        Permission.MANAGE_PLATFORM_PROPERTIES,
        Permission.MANAGE_MARKET_PROPERTIES,
        Permission.MANAGE_OWN_PROPERTIES,
    ]);

    const dbClient = options?.client || supabase;
    const now = new Date().toISOString();
    const existing = await getPropertyById(propertyId, { client: options?.client }).catch(() => undefined);

    const existingMeta = (existing as any)?.installments_info?._meta || {
        cityId: existing?.cityId,
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
        history: existing?.history || [],
    };

    const metaUpdates: Record<string, any> = { ...existingMeta };
    if (updates.cityId) {
        metaUpdates.cityId = updates.cityId;
    }
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

    const nextPublicationStatus =
        updates.publicationStatus || derivePublicationStatusForListing(updates.listingStatus);
    if (nextPublicationStatus) {
        metaUpdates.publicationStatus = nextPublicationStatus;
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

    const historyEntries: PropertyHistoryEntry[] = [];
    if (existing) {
        if (updates.priceNumeric !== undefined && updates.priceNumeric !== existing.priceNumeric) {
            historyEntries.push({
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist-${Date.now()}-1`,
                propertyId,
                changedBy: updates.updatedBy || updates.partnerId || 'admin',
                changedAt: now,
                createdAt: now,
                changeType: 'price',
                field: 'price',
                fieldName: 'price',
                oldValue: existing.priceNumeric,
                newValue: updates.priceNumeric,
                note: `Price updated from ${existing.priceNumeric} to ${updates.priceNumeric}`,
            });
        }
        if (updates.availabilityStatus !== undefined && updates.availabilityStatus !== existing.availabilityStatus) {
            historyEntries.push({
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist-${Date.now()}-2`,
                propertyId,
                changedBy: updates.updatedBy || updates.partnerId || 'admin',
                changedAt: now,
                createdAt: now,
                changeType: 'availability',
                field: 'availability',
                fieldName: 'availability',
                oldValue: existing.availabilityStatus || 'available',
                newValue: updates.availabilityStatus,
                note: `Availability changed to ${updates.availabilityStatus}`,
            });
        }
        if (updates.verificationStatus !== undefined && updates.verificationStatus !== existing.verificationStatus) {
            historyEntries.push({
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist-${Date.now()}-3`,
                propertyId,
                changedBy: updates.updatedBy || 'admin',
                changedAt: now,
                createdAt: now,
                changeType: 'verification',
                field: 'verification',
                fieldName: 'verification',
                oldValue: existing.verificationStatus || 'pending',
                newValue: updates.verificationStatus,
                note: `Verification status changed to ${updates.verificationStatus}`,
            });
        }
        if (updates.listingStatus !== undefined && updates.listingStatus !== existing.listingStatus) {
            historyEntries.push({
                id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `hist-${Date.now()}-4`,
                propertyId,
                changedBy: updates.updatedBy || updates.partnerId || 'admin',
                changedAt: now,
                createdAt: now,
                changeType: 'publication',
                field: 'publication',
                fieldName: 'publication',
                oldValue: existing.listingStatus,
                newValue: updates.listingStatus,
                note: `Listing status changed to ${updates.listingStatus}`,
            });
        }
    }

    if (historyEntries.length > 0) {
        metaUpdates.history = [...historyEntries, ...(existingMeta.history || [])].slice(0, 100);
        historyEntries.forEach(async (h) => {
            try {
                await dbClient.from('property_history').insert({
                    id: h.id,
                    property_id: h.propertyId,
                    changed_by: h.changedBy,
                    change_type: h.changeType,
                    field_name: h.fieldName,
                    old_value: h.oldValue,
                    new_value: h.newValue,
                    note: h.note,
                    created_at: h.createdAt,
                });
            } catch {
                // Table might be pending schema reload
            }
        });
    }

    const dbUpdates: Record<string, any> = {
        ...mapPropertyToDbPayload(updates, metaUpdates),
        updated_at: now,
    };

    let currentUpdatePayload = dbUpdates;
    let { data, error } = await dbClient.from('properties').update(currentUpdatePayload).eq('id', propertyId).select().single();
    for (let attempt = 0; attempt < 2 && error; attempt++) {
        const nextPayload = stripMissingOptionalColumns(currentUpdatePayload, error);
        if (!nextPayload) break;
        currentUpdatePayload = nextPayload;
        const retry = await dbClient.from('properties').update(currentUpdatePayload).eq('id', propertyId).select().single();
        data = retry.data;
        error = retry.error;
    }

    if (error) {
        console.error('Supabase update error:', error);
        throw error;
    }
    invalidatePropertiesCache();
    return mapPropertyFromDb(data);
};

/**
 * Deletes property from Supabase
 */
export const deleteProperty = async (propertyId: string, options?: { client?: any }): Promise<boolean> => {
    requireAnyPermission([
        Permission.MANAGE_ALL_PROPERTIES,
        Permission.ARCHIVE_PROPERTIES,
        Permission.MANAGE_OWN_PROPERTIES,
    ]);

    const dbClient = options?.client || supabase;
    const { error } = await dbClient.from('properties').delete().eq('id', propertyId);
    if (error) {
        console.error('Error deleting property:', error);
        return false;
    }
    invalidatePropertiesCache();
    return true;
};

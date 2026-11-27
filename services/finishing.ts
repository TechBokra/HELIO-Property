import { supabase, supabasePublic } from '../lib/supabase';
import { 
    FinishingService, 
    FinishingPricingTier, 
    FinishingPricingModel, 
    AdminPartner,
    Role,
    Permission,
    FinishingCategoryDefinition,
    PartnerFinishingCapability,
    FinishingQuote,
    FinishingQuoteStatus,
    QuoteScopeItem,
    FinishingRequestHistoryEntry,
    FinishingProjectMilestone,
    FinishingMilestoneStatus,
    MilestonePaymentStatus,
    FinishingEstimateBreakdown,
    FinishingPropertyType,
    ExecutionAttachment
} from '../types';
import { getContent } from './content';
import { updateLead } from './leads';
import { requireAnyPermission } from './authGuard';
import { siteContentData as fallbackData } from '../data/content';
import { resolveServiceReferenceCode } from '../utils/propertyFormShared';

export const PLATFORM_FINISHING_MANAGER_ID = '3e554896-eee8-4545-9c7f-0a79a4c1a9f1';

const isUuidString = (val?: string): boolean =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

const toDeterministicUuid = (seed: string): string => {
    const hash32 = (str: string, init: number) => {
        let h = init >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return (h >>> 0).toString(16).padStart(8, '0');
    };
    const p1 = hash32(`a:${seed}`, 0x811c9dc5);
    const p2 = hash32(`b:${seed}`, 0x9e3779b9);
    const p3 = hash32(`c:${seed}`, 0x85ebca6b);
    const p4 = hash32(`d:${seed}`, 0xc2b2ae35);
    const hex = `${p1}${p2}${p3}${p4}`;
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const isMissingTableError = (error: any): boolean => {
    const code = String(error?.code || '').toUpperCase();
    const msg = String(error?.message || '').toLowerCase();
    return (
        code === '42P01' ||
        code === 'PGRST205' ||
        (msg.includes('finishing_services') && (msg.includes('does not exist') || msg.includes('could not find')))
    );
};

// Canonical Categories Catalog (P1)
export const FINISHING_CATEGORIES: FinishingCategoryDefinition[] = [
    {
        id: 'turnkey',
        name: { ar: 'تشطيب كامل وتسليم مفتاح', en: 'Turnkey Full Execution' },
        description: { 
            ar: 'تولي مسؤولية التنفيذ بالكامل من التأسيس حتى التشطيب النهائي والديكور مع ضمان الجودة وتسليم المفتاح.',
            en: 'End-to-end full execution from MEP rough-ins to final luxury handover with certified engineering warranty.'
        },
        iconName: 'BuildingOfficeIcon',
        typicalPricingModel: 'per_sqm',
        warrantyMonths: 24,
        avgDeliveryDays: 90
    },
    {
        id: 'architectural',
        name: { ar: 'تصميم معماري وثلاثي الأبعاد (3D)', en: '3D Architectural & Interior Design' },
        description: { 
            ar: 'تصميمات داخلية واقعية وتوزيع فراغات ومخططات تنفيذية تفصيلية للكهرباء والسباكة والأسقف قبل البدء.',
            en: 'Photorealistic 3D interior design, spatial planning, and comprehensive executive MEP blueprints.'
        },
        iconName: 'PaintBrushIcon',
        typicalPricingModel: 'fixed_package',
        warrantyMonths: 12,
        avgDeliveryDays: 21
    },
    {
        id: 'commercial',
        name: { ar: 'تشطيب تجاري وإداري وطبي', en: 'Commercial, Office & Medical Fit-outs' },
        description: { 
            ar: 'تشطيب المحلات التجارية، المكاتب الإدارية، والعيادات الطبية وفق كودات السلامة والمواصفات القياسية.',
            en: 'Turnkey fit-outs for retail shops, corporate offices, and medical clinics compliant with safety codes.'
        },
        iconName: 'BriefcaseIcon',
        typicalPricingModel: 'per_sqm',
        warrantyMonths: 24,
        avgDeliveryDays: 60
    },
    {
        id: 'renovation',
        name: { ar: 'ترميم وتجديد وتعديل معماري', en: 'Renovation & Remodeling' },
        description: { 
            ar: 'تحديث الشقق القديمة، تعديل الجدران وتوسيع الفراغات، واستبدال شبكات السباكة والكهرباء بالكامل.',
            en: 'Complete remodeling, structural wall reconfigurations, and total MEP infrastructure renewals.'
        },
        iconName: 'WrenchScrewdriverIcon',
        typicalPricingModel: 'custom_quote',
        warrantyMonths: 18,
        avgDeliveryDays: 45
    },
    {
        id: 'smart_home',
        name: { ar: 'منازل ذكية وأتمتة وصوتيات', en: 'Smart Home Automation & AV' },
        description: { 
            ar: 'أنظمة التحكم بالإضاءة، التكييف، الستائر، الكاميرات الصوتيات الموزعة بأحدث تقنيات الـ IoT.',
            en: 'Integrated smart lighting, climate control, automated shades, surveillance, and multi-room audio.'
        },
        iconName: 'CpuChipIcon',
        typicalPricingModel: 'fixed_package',
        warrantyMonths: 36,
        avgDeliveryDays: 14
    },
    {
        id: 'mep_specialized',
        name: { ar: 'تأسيس وأعمال كهروميكانيكية متخصصة', en: 'Specialized MEP Engineering' },
        description: { 
            ar: 'أعمال تأسيس السباكة الثقيلة، لوحات الكهرباء، العزل المائي والحراري، وأنظمة التكييف المركزي.',
            en: 'Heavy MEP rough-ins, electrical distribution panels, waterproofing, and HVAC systems.'
        },
        iconName: 'CogIcon',
        typicalPricingModel: 'per_sqm',
        warrantyMonths: 60,
        avgDeliveryDays: 30
    }
];

// Geographic Service Areas in East & Greater Cairo
export const FINISHING_SERVICE_AREAS = [
    { id: 'new_heliopolis', name: { ar: 'هليوبوليس الجديدة', en: 'New Heliopolis' } },
    { id: 'el_shorouk', name: { ar: 'مدينة الشروق', en: 'El Shorouk City' } },
    { id: 'new_cairo', name: { ar: 'القاهرة الجديدة والتجمع', en: 'New Cairo & 5th Settlement' } },
    { id: 'madinaty', name: { ar: 'مدينتي', en: 'Madinaty' } },
    { id: 'mostakbal_city', name: { ar: 'مستقبل سيتي', en: 'Mostakbal City' } },
    { id: 'badr_city', name: { ar: 'مدينة بدر', en: 'Badr City' } },
    { id: 'new_capital', name: { ar: 'العاصمة الإدارية الجديدة', en: 'New Administrative Capital' } }
];

export const getFinishingCategories = (): FinishingCategoryDefinition[] => FINISHING_CATEGORIES;

export const getFinishingCategoryById = (id: string): FinishingCategoryDefinition | undefined => {
    return FINISHING_CATEGORIES.find(c => c.id === id);
};

// Normalizer to ensure every finishing service follows the canonical decoupled pricing model
export const normalizeFinishingService = (raw: any, index: number = 0): FinishingService => {
    const rawTiers = Array.isArray(raw.pricingTiers) ? raw.pricingTiers : [];
    
    // Deduce pricing model from tiers or explicit field
    let model: FinishingPricingModel = raw.pricingModel || 'fixed_package';
    if (!raw.pricingModel) {
        const hasPerMeter = rawTiers.some((t: any) => 
            t.areaRange?.ar?.includes('متر') || 
            t.areaRange?.en?.toLowerCase().includes('meter') ||
            t.unitType?.ar?.includes('المتر') ||
            t.unitType?.en?.toLowerCase().includes('meter')
        );
        if (hasPerMeter) {
            model = 'per_sqm';
        }
    }

    const normalizedTiers: FinishingPricingTier[] = rawTiers.map((t: any, tIdx: number) => ({
        id: t.id || `tier-${index + 1}-${tIdx + 1}`,
        unitType: {
            ar: t.unitType?.ar || 'باقة',
            en: t.unitType?.en || 'Package'
        },
        areaRange: {
            ar: t.areaRange?.ar || '',
            en: t.areaRange?.en || ''
        },
        price: Number(t.price) || 0,
        priceModel: t.priceModel || model,
        description: t.description || undefined
    }));

    // Find base price as minimum positive tier price or provided basePrice
    const lowestTierPrice = normalizedTiers.reduce((min, t) => {
        if (t.price > 0 && t.price < min) return t.price;
        return min;
    }, Infinity);

    const basePrice = raw.basePrice !== undefined 
        ? Number(raw.basePrice) 
        : (lowestTierPrice === Infinity ? 0 : lowestTierPrice);

    const serviceId = raw.id || `finishing-srv-${index + 1}`;
    return {
        id: serviceId,
        referenceNumber: raw.referenceNumber || resolveServiceReferenceCode('finishing', serviceId),
        title: {
            ar: raw.title?.ar || 'خدمة تشطيب',
            en: raw.title?.en || 'Finishing Service'
        },
        description: {
            ar: raw.description?.ar || '',
            en: raw.description?.en || ''
        },
        category: raw.category || (model === 'per_sqm' ? 'turnkey' : 'consultation'),
        pricingModel: model,
        basePrice: basePrice,
        currency: raw.currency || 'EGP',
        pricingTiers: normalizedTiers,
        features: Array.isArray(raw.features) ? raw.features : [
            { ar: 'إشراف هندسي معتمد', en: 'Certified engineering supervision', included: true },
            { ar: 'ضمان تعاقدي معتمد على الأعمال', en: 'Contractual warranty on works', included: true },
            { ar: 'التزام كامل بالجدول الزمني المحدد', en: 'Strict commitment to milestone timeline', included: true }
        ],
        isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
        displayOrder: raw.displayOrder !== undefined ? Number(raw.displayOrder) : index,
        targetPartnerId: raw.targetPartnerId || undefined,
        imageUrl: raw.imageUrl || undefined,
        createdAt: raw.createdAt || raw.created_at,
        updatedAt: raw.updatedAt || raw.updated_at
    };
};

const mapRowToService = (row: any): FinishingService => ({
    id: row.id,
    referenceNumber: resolveServiceReferenceCode('finishing', row.id),
    title: {
        en: row.title_en,
        ar: row.title_ar
    },
    description: {
        en: row.description_en || '',
        ar: row.description_ar || ''
    },
    category: row.category || 'turnkey',
    pricingModel: (row.pricing_model || 'fixed_package') as FinishingPricingModel,
    basePrice: Number(row.base_price) || 0,
    currency: row.currency || 'EGP',
    pricingTiers: Array.isArray(row.pricing_tiers) ? row.pricing_tiers : [],
    features: Array.isArray(row.features) ? row.features : [],
    isActive: row.is_active ?? true,
    displayOrder: row.display_order ?? 0,
    targetPartnerId: row.target_partner_id || undefined,
    imageUrl: row.image_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

/**
 * Get canonical finishing services from Supabase
 * Uses public.finishing_services as authoritative catalog; transitions from site_content if table is empty/unmigrated.
 */
let cachedFinishingServices: { data: FinishingService[]; includeInactive: boolean; timestamp: number } | null = null;
let inFlightFinishingPromises: Partial<Record<'all' | 'active', Promise<FinishingService[]>>> = {};
const FINISHING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const invalidateFinishingServicesCache = () => {
    cachedFinishingServices = null;
    inFlightFinishingPromises = {};
};

export interface GetFinishingServicesOptions {
    includeInactive?: boolean;
    forceRefresh?: boolean;
    client?: any;
    allowLegacyFallback?: boolean;
}

export const getFinishingServices = async (
    options?: GetFinishingServicesOptions
): Promise<FinishingService[]> => {
    const includeInactive = Boolean(options?.includeInactive);
    const forceRefresh = Boolean(options?.forceRefresh);
    const customClient = options?.client;
    const cacheKey = includeInactive ? 'all' : 'active';
    const now = Date.now();

    if (
        !forceRefresh &&
        !customClient &&
        cachedFinishingServices &&
        cachedFinishingServices.includeInactive === includeInactive &&
        (now - cachedFinishingServices.timestamp) < FINISHING_CACHE_TTL
    ) {
        return cachedFinishingServices.data;
    }

    if (!forceRefresh && !customClient && inFlightFinishingPromises[cacheKey]) {
        return inFlightFinishingPromises[cacheKey]!;
    }

    const fetchPromise = (async (): Promise<FinishingService[]> => {
        try {
            const readClient = customClient || (includeInactive ? supabase : supabasePublic);
            const { data, error } = await readClient
                .from('finishing_services')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) {
                if (!isMissingTableError(error)) {
                    throw new Error(`Failed to load finishing services: ${error.message || 'Database query error'}`);
                }
            } else if (data && data.length > 0) {
                const mapped: FinishingService[] = data
                    .map(mapRowToService)
                    .sort((a: FinishingService, b: FinishingService) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
                const filtered = includeInactive ? mapped : mapped.filter((s: FinishingService) => s.isActive !== false);
                if (!customClient) {
                    cachedFinishingServices = { data: filtered, includeInactive, timestamp: Date.now() };
                }
                return filtered;
            } else {
                // Table returned 0 rows: check if catalog exists with all rows inactive (under anon RLS)
                if (!includeInactive && typeof readClient.rpc === 'function') {
                    try {
                        const { data: catalogExists } = await readClient.rpc('finishing_catalog_exists');
                        if (catalogExists === true) {
                            if (!customClient) {
                                cachedFinishingServices = { data: [], includeInactive, timestamp: Date.now() };
                            }
                            return [];
                        }
                    } catch {
                        // RPC not yet deployed; proceed to legacy transition check
                    }
                }
            }

            if (options?.allowLegacyFallback === false) {
                return [];
            }

            // Transition / fallback from legacy site_content.finishingServices or canonical seed
            const siteContent = await getContent({ forceRefresh, client: customClient });
            const rawServices = (siteContent?.finishingServices && siteContent.finishingServices.length > 0)
                ? siteContent.finishingServices
                : (fallbackData.finishingServices || []);

            const mappedLegacy = rawServices.map((s: any, idx: number) => normalizeFinishingService(s, idx));
            const filteredLegacy = includeInactive ? mappedLegacy : mappedLegacy.filter(s => s.isActive !== false);
            if (!customClient) {
                cachedFinishingServices = { data: filteredLegacy, includeInactive, timestamp: Date.now() };
            }
            return filteredLegacy;
        } finally {
            if (!forceRefresh && !customClient) {
                delete inFlightFinishingPromises[cacheKey];
            }
        }
    })();

    if (!forceRefresh && !customClient) {
        inFlightFinishingPromises[cacheKey] = fetchPromise;
    }

    return fetchPromise;
};

/**
 * Get a specific finishing service by ID
 */
export const getFinishingServiceById = async (
    id: string,
    options?: GetFinishingServicesOptions
): Promise<FinishingService | undefined> => {
    const all = await getFinishingServices({ ...options, includeInactive: options?.includeInactive ?? true });
    return all.find(s => s.id === id);
};

/**
 * Save / Update canonical finishing services in public.finishing_services
 */
export const saveFinishingServices = async (
    services: FinishingService[],
    options?: { client?: any }
): Promise<FinishingService[]> => {
    if (!options?.client) {
        requireAnyPermission([
            Permission.MANAGE_PLATFORM_FINISHING_PACKAGES,
            Permission.MANAGE_SITE_CONTENT,
        ]);
    }

    const dbClient = options?.client || supabase;
    const nowIso = new Date().toISOString();

    const normalized = services.map((s, idx) => {
        const base = normalizeFinishingService({ ...s, displayOrder: s.displayOrder ?? idx + 1 }, idx);
        const authoritativeId = isUuidString(base.id) ? base.id : toDeterministicUuid(base.id || `fs-${idx + 1}`);
        return {
            ...base,
            id: authoritativeId,
            referenceNumber: resolveServiceReferenceCode('finishing', authoritativeId),
        };
    });

    const { data: existingRows, error: existingErr } = await dbClient
        .from('finishing_services')
        .select('id');

    if (existingErr) {
        throw new Error(`Failed to verify existing finishing services: ${existingErr.message}`);
    }

    const nextIdSet = new Set(normalized.map(s => s.id));
    const removedIds = (existingRows || [])
        .map((r: any) => r.id)
        .filter((id: string) => id && !nextIdSet.has(id));

    if (removedIds.length > 0) {
        const { error: deleteErr } = await dbClient
            .from('finishing_services')
            .delete()
            .in('id', removedIds);
        if (deleteErr) {
            throw new Error(`Failed to delete removed finishing services: ${deleteErr.message}`);
        }
    }

    if (normalized.length > 0) {
        const rows = normalized.map((s, idx) => ({
            id: s.id,
            title_en: s.title.en,
            title_ar: s.title.ar,
            description_en: s.description.en || '',
            description_ar: s.description.ar || '',
            category: s.category || 'turnkey',
            pricing_model: s.pricingModel,
            base_price: Number(s.basePrice) || 0,
            currency: s.currency || 'EGP',
            pricing_tiers: s.pricingTiers || [],
            features: s.features || [],
            is_active: s.isActive !== false,
            display_order: Number.isFinite(Number(s.displayOrder)) ? Number(s.displayOrder) : idx + 1,
            target_partner_id: isUuidString(s.targetPartnerId) ? s.targetPartnerId : null,
            image_url: s.imageUrl || null,
            updated_at: nowIso,
        }));

        const { data: savedRows, error: upsertErr } = await dbClient
            .from('finishing_services')
            .upsert(rows, { onConflict: 'id' })
            .select('*');

        if (upsertErr) {
            throw new Error(`Failed to save finishing services: ${upsertErr.message}`);
        }

        invalidateFinishingServicesCache();
        if (savedRows && savedRows.length > 0) {
            return savedRows
                .map(mapRowToService)
                .sort((a: FinishingService, b: FinishingService) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
        }
    } else {
        invalidateFinishingServicesCache();
    }

    return normalized;
};

export const deleteFinishingService = async (
    id: string,
    options?: { client?: any }
): Promise<boolean> => {
    if (!options?.client) {
        requireAnyPermission([
            Permission.MANAGE_PLATFORM_FINISHING_PACKAGES,
            Permission.MANAGE_SITE_CONTENT,
        ]);
    }
    const dbClient = options?.client || supabase;
    const { error } = await dbClient
        .from('finishing_services')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Failed to delete finishing service: ${error.message}`);
    }

    invalidateFinishingServicesCache();
    return true;
};

/**
 * Fetch verified finishing partners from Supabase with their capabilities
 */
export const getFinishingPartners = async (): Promise<AdminPartner[]> => {
    try {
        const { data, error } = await supabase
            .from('partners')
            .select('*')
            .eq('type', 'finishing')
            .eq('status', 'active');

        if (!error && data && data.length > 0) {
            return data.map(p => ({
                id: p.id,
                name: p.name_en,
                nameAr: p.name_ar,
                email: p.email,
                type: 'finishing',
                role: Role.FINISHING_PARTNER,
                status: 'active',
                description: p.description_en,
                descriptionAr: p.description_ar,
                imageUrl: p.logo_url || p.image_url || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=75&w=600&auto=format&fit=crop',
                subscriptionPlan: p.subscription_plan || 'professional',
                displayType: p.display_type || 'featured',
                contactMethods: p.contact_methods || { form: { enabled: true } },
                phone: p.phone,
                whatsapp: p.whatsapp,
                verified: p.is_verified === true,
                createdAt: p.created_at,
                profileKind: p.profile_kind === 'engineer' ? 'engineer' : 'company'
            }));
        }
    } catch (e) {
        console.error('Error fetching finishing partners:', e);
    }

    return [];
};

/**
 * Transparent, rule-based cost calculation for finishing packages (No pseudo-AI)
 */
export const calculateEstimatedCost = (
    service: FinishingService,
    tier: FinishingPricingTier,
    areaSqm?: number
): {
    totalCost: number;
    isEstimate: boolean;
    breakdownText: { ar: string; en: string };
} => {
    if (tier.priceModel === 'per_sqm') {
        const area = areaSqm && areaSqm > 0 ? areaSqm : 100;
        const total = tier.price * area;
        return {
            totalCost: total,
            isEstimate: !areaSqm,
            breakdownText: {
                ar: `${tier.price.toLocaleString()} ج.م × ${area} م²`,
                en: `${tier.price.toLocaleString()} EGP × ${area} m²`
            }
        };
    }

    return {
        totalCost: tier.price,
        isEstimate: false,
        breakdownText: {
            ar: `سعر الباقة الثابت (${tier.unitType.ar})`,
            en: `Fixed Package Rate (${tier.unitType.en})`
        }
    };
};

/* =========================================================================
   P1: PARTNER SERVICE CAPABILITIES & SERVICE AREAS
   ========================================================================= */

const LOCAL_STORAGE_CAPABILITIES_KEY = 'onlyhelio_partner_capabilities';

export const getPartnerCapabilities = async (partnerId: string): Promise<PartnerFinishingCapability> => {
    try {
        const { data, error } = await supabase
            .from('partner_capabilities')
            .select('*')
            .eq('partner_id', partnerId)
            .maybeSingle();

        if (!error && data) {
            return {
                id: data.id,
                partnerId: data.partner_id,
                categories: data.categories || [],
                serviceAreas: data.service_areas || [],
                minBudget: Number(data.min_budget) || 0,
                maxBudget: data.max_budget ? Number(data.max_budget) : undefined,
                turnkeyCapacity: data.turnkey_capacity || 0,
                warrantyYears: data.warranty_years || 0,
                hasInHouseArchitects: data.has_in_house_architects === true,
                isVerifiedContractor: data.is_verified_contractor === true,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        }
    } catch {
        // Fall through
    }

    // No stored capability profile: return an empty profile (never invent capabilities)
    return {
        partnerId,
        categories: [],
        serviceAreas: [],
        minBudget: 0,
        turnkeyCapacity: 0,
        warrantyYears: 0,
        hasInHouseArchitects: false,
        isVerifiedContractor: false
    };
};

export const savePartnerCapabilities = async (cap: PartnerFinishingCapability): Promise<PartnerFinishingCapability> => {
    try {
        const row = {
            partner_id: cap.partnerId,
            categories: cap.categories,
            service_areas: cap.serviceAreas,
            min_budget: cap.minBudget,
            max_budget: cap.maxBudget,
            turnkey_capacity: cap.turnkeyCapacity,
            warranty_years: cap.warrantyYears,
            has_in_house_architects: cap.hasInHouseArchitects,
            is_verified_contractor: cap.isVerifiedContractor,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('partner_capabilities')
            .upsert(row, { onConflict: 'partner_id' })
            .select()
            .single();

        if (!error && data) {
            return {
                ...cap,
                id: data.id,
                updatedAt: data.updated_at
            };
        }
    } catch {
        // Fallback
    }

    return cap;
};

/* =========================================================================
   P1: FINISHING QUOTES & BIDS
   ========================================================================= */

export const getQuotesByRequestId = async (requestId: string): Promise<FinishingQuote[]> => {
    // DAT-01: Supabase is the sole authoritative store; no localStorage quote merging or synthetic fallbacks
    try {
        const { data, error } = await supabase
            .from('finishing_quotes')
            .select('*')
            .eq('request_id', requestId)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Notice fetching quotes from Supabase:', error.message);
            return [];
        }

        if (!data) return [];

    return data.map((q: any) => ({
        id: q.id,
        requestId: q.request_id,
        partnerId: q.partner_id,
        partnerName: q.partner_name,
        totalPrice: Number(q.total_price),
        pricePerSqm: q.price_per_sqm ? Number(q.price_per_sqm) : undefined,
        currency: q.currency || 'EGP',
        executionTimelineDays: q.execution_timeline_days,
        warrantyMonths: q.warranty_months,
        scopeItems: Array.isArray(q.scope_items) ? q.scope_items : [],
        termsAndConditions: q.terms_and_conditions,
        status: q.status as FinishingQuoteStatus,
        notes: q.notes,
        createdAt: q.created_at,
        updatedAt: q.updated_at
    }));
    } catch {
        return [];
    }
};

export const submitFinishingQuote = async (
    quoteData: Omit<FinishingQuote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FinishingQuote> => {
    // P1.3: Validate commercial integrity
    if (!quoteData.totalPrice || quoteData.totalPrice <= 0) {
        throw new Error('Total quote price must be greater than zero.');
    }
    if (!quoteData.executionTimelineDays || quoteData.executionTimelineDays <= 0) {
        throw new Error('Execution timeline must be at least 1 day.');
    }

    if (quoteData.scopeItems && quoteData.scopeItems.length > 0) {
        const scopeSum = quoteData.scopeItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
        if (Math.abs(scopeSum - quoteData.totalPrice) > 1) {
            throw new Error(
                `Commercial total mismatch: Quote total (${quoteData.totalPrice.toLocaleString()} EGP) must equal the sum of scope items (${scopeSum.toLocaleString()} EGP).`
            );
        }
    }

    const row = {
        request_id: quoteData.requestId,
        partner_id: quoteData.partnerId,
        partner_name: quoteData.partnerName,
        total_price: quoteData.totalPrice,
        price_per_sqm: quoteData.pricePerSqm,
        currency: quoteData.currency || 'EGP',
        execution_timeline_days: quoteData.executionTimelineDays,
        warranty_months: quoteData.warrantyMonths,
        scope_items: quoteData.scopeItems,
        terms_and_conditions: quoteData.termsAndConditions,
        status: quoteData.status || 'submitted',
        notes: quoteData.notes
    };

    // DAT-01: Insert directly to Supabase as authoritative source
    const { data, error } = await supabase
        .from('finishing_quotes')
        .insert(row)
        .select()
        .single();

    if (error) {
        console.error('Error submitting finishing quote to Supabase:', error);
        throw new Error(`Failed to submit quote: ${error.message}`);
    }

    const newQuote: FinishingQuote = {
        id: data.id,
        requestId: data.request_id,
        partnerId: data.partner_id,
        partnerName: data.partner_name,
        totalPrice: Number(data.total_price),
        pricePerSqm: data.price_per_sqm ? Number(data.price_per_sqm) : undefined,
        currency: data.currency || 'EGP',
        executionTimelineDays: data.execution_timeline_days,
        warrantyMonths: data.warranty_months,
        scopeItems: Array.isArray(data.scope_items) ? data.scope_items : [],
        termsAndConditions: data.terms_and_conditions,
        status: data.status as FinishingQuoteStatus,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };

    // Record in Finishing Request History
    await recordFinishingRequestHistory({
        requestId: quoteData.requestId,
        actionType: 'quote_submitted',
        changedBy: quoteData.partnerName,
        newValue: {
            quoteId: newQuote.id,
            partnerId: quoteData.partnerId,
            totalPrice: quoteData.totalPrice,
            timelineDays: quoteData.executionTimelineDays
        },
        note: `عطاء جديد مقدم من ${quoteData.partnerName} بقيمة ${quoteData.totalPrice.toLocaleString()} ${quoteData.currency || 'EGP'}`
    });

    return newQuote;
};

export const acceptQuoteAndAward = async (
    quoteId: string,
    requestId: string,
    adminUserId: string,
    contractorName: string
): Promise<void> => {
    // 1. P0.3: Call Atomic Database RPC Transaction
    const { error: rpcError } = await supabase.rpc('accept_finishing_quote', {
        p_quote_id: quoteId,
        p_request_id: requestId,
        p_client_name: adminUserId || 'العميل'
    });

    if (rpcError) {
        console.error('RPC accept_finishing_quote returned error:', rpcError);
        throw new Error(`Failed to award finishing quote: ${rpcError.message}`);
    }
};

/* =========================================================================
   P1: FINISHING REQUEST AUDIT TRAIL & HISTORY
   ========================================================================= */

export const getFinishingRequestHistory = async (requestId: string): Promise<FinishingRequestHistoryEntry[]> => {
    const { data, error } = await supabase
        .from('finishing_request_history')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch finishing request history from Supabase:', error);
        throw new Error(`Failed to fetch request history from database: ${error.message}`);
    }

    return (data || []).map((h: any) => ({
        id: h.id,
        requestId: h.request_id,
        actionType: h.action_type,
        changedBy: h.changed_by,
        oldValue: h.old_value,
        newValue: h.new_value,
        note: h.note,
        createdAt: h.created_at
    }));
};

export const recordFinishingRequestHistory = async (
    entry: Omit<FinishingRequestHistoryEntry, 'id' | 'createdAt'>
): Promise<FinishingRequestHistoryEntry> => {
    const now = new Date().toISOString();
    const row = {
        request_id: entry.requestId,
        action_type: entry.actionType,
        changed_by: entry.changedBy,
        old_value: entry.oldValue || null,
        new_value: entry.newValue || null,
        note: entry.note || null,
        created_at: now
    };

    const { data, error } = await supabase
        .from('finishing_request_history')
        .insert(row)
        .select()
        .single();

    if (error || !data) {
        console.error('Error inserting finishing history to Supabase:', error);
        throw new Error(`Failed to record history entry: ${error?.message || 'Unknown database error'}`);
    }

    return {
        id: data.id,
        requestId: data.request_id,
        actionType: data.action_type,
        changedBy: data.changed_by,
        oldValue: data.old_value,
        newValue: data.new_value,
        note: data.note,
        createdAt: data.created_at
    };
};

// ==========================================
// Project Execution Milestones (P2)
// ==========================================

export const getProjectMilestones = async (
    requestId: string,
    isCustomerView: boolean = false
): Promise<FinishingProjectMilestone[]> => {
    if (isCustomerView) {
        // P1.4: Query customer-facing view which strictly excludes internal_notes
        const { data, error } = await supabase
            .from('customer_milestones_view')
            .select('*')
            .eq('request_id', requestId)
            .order('stage_number', { ascending: true });

        if (error) {
            console.error('Failed to fetch customer milestones from Supabase:', error);
            throw new Error(`Failed to fetch milestones from database: ${error.message}`);
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            requestId: row.request_id,
            stageNumber: row.stage_number,
            title: { ar: row.title_ar, en: row.title_en },
            description: { ar: row.description_ar || '', en: row.description_en || '' },
            targetDays: row.target_days || 15,
            status: row.status as FinishingMilestoneStatus,
            progressPercentage: Number(row.progress_percentage) || 0,
            paymentPercentage: Number(row.payment_percentage) || 0,
            paymentStatus: row.payment_status as MilestonePaymentStatus,
            customerNotes: row.customer_notes || undefined,
            inspectorNotes: row.customer_notes || undefined, // legacy compat
            completedAt: row.completed_at || undefined,
            updatedAt: row.updated_at
        }));
    }

    // Platform Staff / Partner view (includes internal_notes)
    const { data, error } = await supabase
        .from('finishing_milestones')
        .select('*')
        .eq('request_id', requestId)
        .order('stage_number', { ascending: true });

    if (error) {
        console.error('Failed to fetch project milestones from Supabase:', error);
        throw new Error(`Failed to fetch milestones from database: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        requestId: row.request_id,
        stageNumber: row.stage_number,
        title: { ar: row.title_ar, en: row.title_en },
        description: { ar: row.description_ar || '', en: row.description_en || '' },
        targetDays: row.target_days || 15,
        status: row.status as FinishingMilestoneStatus,
        progressPercentage: Number(row.progress_percentage) || 0,
        paymentPercentage: Number(row.payment_percentage) || 0,
        paymentStatus: row.payment_status as MilestonePaymentStatus,
        customerNotes: row.customer_notes || undefined,
        internalNotes: row.internal_notes || undefined,
        inspectorNotes: row.inspector_notes || row.customer_notes || undefined,
        completedAt: row.completed_at || undefined,
        updatedAt: row.updated_at
    }));
};

export const updateProjectMilestone = async (
    requestId: string,
    milestoneId: string,
    updates: Partial<FinishingProjectMilestone>,
    userLabel: string = 'Platform Finishing Engineer'
): Promise<FinishingProjectMilestone> => {
    const now = new Date().toISOString();
    const progress = updates.progressPercentage !== undefined 
        ? Math.max(0, Math.min(100, updates.progressPercentage)) 
        : undefined;

    const dbUpdates: any = {
        updated_at: now
    };
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (progress !== undefined) dbUpdates.progress_percentage = progress;
    if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.paymentPercentage !== undefined) dbUpdates.payment_percentage = updates.paymentPercentage;
    if (updates.customerNotes !== undefined) dbUpdates.customer_notes = updates.customerNotes;
    if (updates.internalNotes !== undefined) dbUpdates.internal_notes = updates.internalNotes;
    if (updates.inspectorNotes !== undefined) dbUpdates.inspector_notes = updates.inspectorNotes;
    if (updates.status === 'completed') {
        dbUpdates.completed_at = now;
        dbUpdates.progress_percentage = 100;
    }

    const { data, error } = await supabase
        .from('finishing_milestones')
        .update(dbUpdates)
        .eq('id', milestoneId)
        .eq('request_id', requestId)
        .select()
        .single();

    if (error) {
        console.error('Failed to update Supabase milestone:', error);
        throw new Error(`Failed to update milestone in database: ${error.message}`);
    }

    const updated: FinishingProjectMilestone = {
        id: data.id,
        requestId: data.request_id,
        stageNumber: data.stage_number,
        title: { ar: data.title_ar, en: data.title_en },
        description: { ar: data.description_ar || '', en: data.description_en || '' },
        targetDays: data.target_days,
        status: data.status,
        progressPercentage: data.progress_percentage,
        paymentPercentage: data.payment_percentage,
        paymentStatus: data.payment_status,
        customerNotes: data.customer_notes,
        internalNotes: data.internal_notes,
        inspectorNotes: data.inspector_notes,
        completedAt: data.completed_at,
        updatedAt: data.updated_at
    };

    // Record audit event in Supabase history
    await recordFinishingRequestHistory({
        requestId,
        actionType: 'milestone_updated',
        changedBy: userLabel,
        newValue: {
            milestoneId,
            stageNumber: updated.stageNumber,
            title: updated.title.ar,
            status: updated.status,
            progress: updated.progressPercentage,
            paymentStatus: updated.paymentStatus
        },
        note: `تحديث مرحلة "${updated.title.ar}": إنجاز ${updated.progressPercentage}% (${updated.status})`
    });

    return updated;
};

// ==========================================
// P1.5: Secure Execution Attachments Service
// ==========================================

export const getExecutionAttachments = async (
    requestId: string,
    milestoneId?: string
): Promise<ExecutionAttachment[]> => {
    let query = supabase
        .from('execution_attachments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

    if (milestoneId) {
        query = query.eq('milestone_id', milestoneId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Failed to fetch execution attachments from Supabase:', error);
        throw new Error(`Failed to fetch attachments from database: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        requestId: row.request_id,
        milestoneId: row.milestone_id || undefined,
        uploaderId: row.uploader_id,
        fileUrl: row.file_url,
        fileName: row.file_name,
        fileSize: row.file_size || undefined,
        fileType: row.file_type,
        category: row.category,
        isInternal: row.is_internal || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
};

export const addExecutionAttachment = async (
    payload: Omit<ExecutionAttachment, 'id' | 'createdAt' | 'updatedAt' | 'uploaderId'>
): Promise<ExecutionAttachment> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
        throw new Error('Authentication required to upload execution attachments.');
    }

    const dbRow = {
        request_id: payload.requestId,
        milestone_id: payload.milestoneId || null,
        uploader_id: session.user.id,
        file_url: payload.fileUrl,
        file_name: payload.fileName,
        file_size: payload.fileSize || null,
        file_type: payload.fileType || 'photo',
        category: payload.category || 'milestone_evidence',
        is_internal: payload.isInternal || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('execution_attachments')
        .insert(dbRow)
        .select()
        .single();

    if (error || !data) {
        console.error('Failed to create execution attachment record in database:', error);
        throw new Error(`Failed to save attachment metadata: ${error?.message || 'Database error'}`);
    }

    return {
        id: data.id,
        requestId: data.request_id,
        milestoneId: data.milestone_id || undefined,
        uploaderId: data.uploader_id,
        fileUrl: data.file_url,
        fileName: data.file_name,
        fileSize: data.file_size || undefined,
        fileType: data.file_type,
        category: data.category,
        isInternal: data.is_internal,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

export const clientAcceptQuote = async (
    requestId: string,
    quoteId: string,
    clientName: string = 'العميل'
): Promise<{ success: boolean; winningQuote?: FinishingQuote; error?: string }> => {
    const quotes = await getQuotesByRequestId(requestId);
    const targetQuote = quotes.find(q => q.id === quoteId);
    if (!targetQuote) return { success: false, error: 'Quote not found' };

    try {
        // P0.3: Call atomic acceptQuoteAndAward
        await acceptQuoteAndAward(quoteId, requestId, clientName, targetQuote.partnerName);

        // Fetch refreshed milestones from database
        await getProjectMilestones(requestId);

        return { success: true, winningQuote: targetQuote };
    } catch (err: any) {
        console.error('Error in clientAcceptQuote:', err);
        return { success: false, error: err.message || 'Failed to award quote in database' };
    }
};

// ==========================================
// Interactive Finishing Cost Estimator Engine
// ==========================================

export interface EstimatorTierConfig {
    id: string;
    name: { ar: string; en: string };
    tagline: { ar: string; en: string };
    pricePerSqm: number;
    badge: string;
    warrantyYears: number;
    avgDaysPer100Sqm: number;
    description: { ar: string; en: string };
}

export const ESTIMATOR_TIERS: EstimatorTierConfig[] = [
    {
        id: 'economy',
        name: { ar: 'باقة التوفير الهندسية', en: 'Economy Value Package' },
        tagline: { ar: 'جودة متوازنة وتأسيس هندسي معتمد بأقل تكلفة', en: 'Solid engineering MEP basics at smart budget' },
        pricePerSqm: 2600,
        badge: 'الأوفر تكلفة',
        warrantyYears: 3,
        avgDaysPer100Sqm: 45,
        description: {
            ar: 'تأسيس سباكة وكهرباء معتمد مع سيراميك فرز أول ودهانات سايبس أو جي إل سي وأبواب جاهزة.',
            en: 'Certified plumbing & wiring, 1st grade ceramic tiles, GLC paints, standard doors.'
        }
    },
    {
        id: 'super_lux',
        name: { ar: 'باقة سوبر لوكس الحديثة', en: 'Modern Super Lux Package' },
        tagline: { ar: 'الخيار الأكثر طلباً بتشطيب عصري وماركات موثوقة', en: 'Most popular choice with modern design & trusted brands' },
        pricePerSqm: 4100,
        badge: 'الأكثر طلباً',
        warrantyYears: 5,
        avgDaysPer100Sqm: 60,
        description: {
            ar: 'تأسيس الشريف وباناسونيك، بورسلين ريسبشن مستورد، أسقف جبس بورد، دهانات جوتن، وأطقم حمامات ديورافيت/ايديال.',
            en: 'El-Sherif & Panasonic MEP, imported porcelain reception, gypsum ceilings, Jotun paints, Duravit/Ideal bath fixtures.'
        }
    },
    {
        id: 'ultra_deluxe',
        name: { ar: 'باقة ألترا ديلوكس الفاخرة', en: 'Ultra Deluxe Luxury Package' },
        tagline: { ar: 'تصميم فندقي متكامل، ديكورات جدارية ورخام طبيعي', en: 'Hotel-grade finishes, custom millwork & marble' },
        pricePerSqm: 6200,
        badge: 'فخامة هندسية',
        warrantyYears: 7,
        avgDaysPer100Sqm: 75,
        description: {
            ar: 'تصميم داخلي 3D، تجاليد خشبية وبديل رخام، شبابيك جامبو دبل عازل للصوت، إضاءة مغناطيسية مخفية (Magnetic Track).',
            en: 'Full 3D interior design, wood paneling, Jumbo double-glazed acoustics, magnetic track lighting.'
        }
    },
    {
        id: 'luxury_vip',
        name: { ar: 'باقة القصور والسمارت هوم VIP', en: 'Royal Smart VIP Package' },
        tagline: { ar: 'أتمتة ذكية شاملة، رخام إسباني وتكييف كونسيلد', en: 'Complete smart home automation, Spanish marble & concealed HVAC' },
        pricePerSqm: 8900,
        badge: 'القمة الفاخرة',
        warrantyYears: 10,
        avgDaysPer100Sqm: 90,
        description: {
            ar: 'رخام كرارة / إمبرادور، نظام ذكي كامل (أليكسا وكنترول إضاءة وتكييف)، ساوند سيستم داخلي، وأبواب خشب ماسيف مصفحة.',
            en: 'Carrara marble, full Zigbee/KNX smart automation, multi-room sound, massive armored solid wood doors.'
        }
    }
];

export const calculateDetailedFinishingEstimate = (params: {
    area: number;
    tierId: string;
    bedrooms: number;
    bathrooms: number;
    style: string;
    propertyType?: FinishingPropertyType;
    villaFloors?: number;
    addons?: {
        smartHome?: boolean;
        acPrep?: boolean;
        soundproofing?: boolean;
        woodPanels?: boolean;
        facadeRoofPrep?: boolean;
        staircaseMarble?: boolean;
        landscapeLighting?: boolean;
        elevatorPrep?: boolean;
    };
}): FinishingEstimateBreakdown => {
    const isVilla = params.propertyType === 'villa';
    const tier = ESTIMATOR_TIERS.find(t => t.id === params.tierId) || ESTIMATOR_TIERS[1];
    
    // Scale safe area: Villas can reach 2000m²; apartments up to 800m²
    const minArea = isVilla ? 120 : 50;
    const maxArea = isVilla ? 2000 : 800;
    const safeArea = Math.max(minArea, Math.min(params.area || (isVilla ? 450 : 140), maxArea));
    const floors = isVilla ? Math.max(1, Math.min(5, params.villaFloors || 3)) : 1;

    // Villa structural and engineering baseline factor:
    // Multi-floor vertical risers, roof weatherproofing, external envelope, scaffolding & logistics
    const propertyTypeMultiplier = isVilla ? 1.08 : 1.0;
    
    // Base unit multiplier for extra wet areas (bathrooms require heavier plumbing & porcelain)
    const extraBathroomFactor = Math.max(0, (params.bathrooms || 1) - 1) * 18000;
    
    // Multi-story vertical MEP risers and structural floor distribution factor for villas
    const multiFloorFactor = isVilla && floors > 2 ? (floors - 2) * 28000 : 0;
    
    const baseCost = (safeArea * (tier.pricePerSqm * propertyTypeMultiplier)) + extraBathroomFactor + multiFloorFactor;

    // Addons cost calculation
    let addonsTotal = 0;
    const appliedAddons: string[] = [];

    if (params.addons?.smartHome) {
        const smartCost = safeArea * (isVilla ? 520 : 450) + (isVilla ? 30000 : 15000);
        addonsTotal += smartCost;
        appliedAddons.push(isVilla ? 'Smart Villa KNX / IoT Automation' : 'Smart Home Automation');
    }
    if (params.addons?.acPrep) {
        const acCost = (params.bedrooms + (isVilla ? floors * 2 : 1)) * 7500;
        addonsTotal += acCost;
        appliedAddons.push(isVilla ? 'Concealed & Multi-VRF AC Pre-installation' : 'Concealed AC Pre-installation');
    }
    if (params.addons?.soundproofing) {
        const soundCost = safeArea * 300;
        addonsTotal += soundCost;
        appliedAddons.push('Acoustic & Thermal Insulation');
    }
    if (params.addons?.woodPanels) {
        const woodCost = safeArea * 380;
        addonsTotal += woodCost;
        appliedAddons.push('Decorative Wood & Fluted Wall Cladding');
    }

    // Villa-specific engineering add-ons
    if (isVilla && params.addons?.facadeRoofPrep) {
        const facadeRoofCost = Math.round(safeArea * 460);
        addonsTotal += facadeRoofCost;
        appliedAddons.push('Exterior Facade Coating & Roof Weatherproofing');
    }
    if (isVilla && params.addons?.staircaseMarble) {
        const stairsCost = floors * 35000;
        addonsTotal += stairsCost;
        appliedAddons.push('Internal Marble Staircase & Forged Balustrades');
    }
    if (isVilla && params.addons?.landscapeLighting) {
        const landscapeCost = 45000;
        addonsTotal += landscapeCost;
        appliedAddons.push('Garden Landscape Lighting & Boundary Drainage');
    }
    if (isVilla && params.addons?.elevatorPrep) {
        const elevatorCost = 65000;
        addonsTotal += elevatorCost;
        appliedAddons.push('Hydraulic Home Elevator Shaft Rough-in');
    }

    const totalEstimatedCost = Math.round(baseCost + addonsTotal);
    const effectivePricePerSqm = Math.round(totalEstimatedCost / safeArea);

    // Trade breakdown percentages based on property typology:
    let mepCost: number;
    let flooringMasonryCost: number;
    let carpentryAluminumCost: number;
    let paintsDecorCost: number;
    let supervisionWarrantyCost: number;
    let villaStructureCost: number | undefined;

    if (isVilla) {
        // Villa distribution: 22% MEP, 26% Floors & Marble, 18% Doors & Exterior Glazing, 14% Paints, 10% Facade/Roof/Stairs, 10% Engineering Supervision
        mepCost = Math.round(totalEstimatedCost * 0.22);
        flooringMasonryCost = Math.round(totalEstimatedCost * 0.26);
        carpentryAluminumCost = Math.round(totalEstimatedCost * 0.18);
        paintsDecorCost = Math.round(totalEstimatedCost * 0.14);
        villaStructureCost = Math.round(totalEstimatedCost * 0.10);
        supervisionWarrantyCost = Math.round(totalEstimatedCost * 0.10);
    } else {
        // Standard apartment distribution: 25% MEP, 30% Floors & Plaster, 20% Carpentry & Aluminum, 15% Paints, 10% Supervision
        mepCost = Math.round(totalEstimatedCost * 0.25);
        flooringMasonryCost = Math.round(totalEstimatedCost * 0.30);
        carpentryAluminumCost = Math.round(totalEstimatedCost * 0.20);
        paintsDecorCost = Math.round(totalEstimatedCost * 0.15);
        supervisionWarrantyCost = Math.round(totalEstimatedCost * 0.10);
    }

    // Realistic delivery time based on volume & floor staging
    const baseDays = Math.round((safeArea / 100) * tier.avgDaysPer100Sqm);
    const estimatedDays = isVilla 
        ? Math.max(75, Math.round(baseDays * 1.15)) 
        : Math.max(30, baseDays);

    return {
        area: safeArea,
        tier: tier.id,
        tierName: tier.name,
        pricePerSqm: effectivePricePerSqm,
        totalEstimatedCost,
        mepCost,
        flooringMasonryCost,
        carpentryAluminumCost,
        paintsDecorCost,
        supervisionWarrantyCost,
        villaStructureCost,
        estimatedDays,
        propertyType: params.propertyType || 'apartment',
        villaFloors: isVilla ? floors : undefined,
        specs: {
            bedrooms: params.bedrooms || (isVilla ? 5 : 3),
            bathrooms: params.bathrooms || (isVilla ? 4 : 2),
            style: params.style || 'modern',
            addons: appliedAddons,
            propertyType: params.propertyType || 'apartment',
            villaFloors: isVilla ? floors : undefined
        }
    };
};

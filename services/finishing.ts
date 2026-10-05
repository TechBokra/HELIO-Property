import { supabase } from '../lib/supabase';
import { 
    FinishingService, 
    FinishingPricingTier, 
    FinishingPricingModel, 
    AdminPartner,
    Role,
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
import { getContent, updateContent } from './content';
import { updateLead } from './leads';
import { siteContentData as fallbackData } from '../data/content';

export const PLATFORM_FINISHING_MANAGER_ID = '3e554896-eee8-4545-9c7f-0a79a4c1a9f1';

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

    return {
        id: raw.id || `finishing-srv-${index + 1}`,
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
        createdAt: raw.createdAt || raw.created_at,
        updatedAt: raw.updatedAt || raw.updated_at
    };
};

const mapRowToService = (row: any): FinishingService => ({
    id: row.id,
    title: {
        en: row.title_en,
        ar: row.title_ar
    },
    description: {
        en: row.description_en || '',
        ar: row.description_ar || ''
    },
    category: row.category,
    pricingModel: row.pricing_model as FinishingPricingModel,
    basePrice: Number(row.base_price) || 0,
    currency: row.currency || 'EGP',
    pricingTiers: Array.isArray(row.pricing_tiers) ? row.pricing_tiers : [],
    features: Array.isArray(row.features) ? row.features : [],
    isActive: row.is_active ?? true,
    displayOrder: row.display_order ?? 0,
    targetPartnerId: row.target_partner_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

/**
 * Get canonical finishing services from Supabase
 * Prioritizes live public.finishing_services table, falls back to Supabase site_content
 */
// In-memory cache for finishing services
let cachedFinishingServices: { data: FinishingService[]; timestamp: number } | null = null;
let inFlightFinishingPromise: Promise<FinishingService[]> | null = null;
let finishingTableChecked = false;
let finishingTableExists = false;
const FINISHING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const invalidateFinishingServicesCache = () => {
    cachedFinishingServices = null;
    inFlightFinishingPromise = null;
};

export const getFinishingServices = async (): Promise<FinishingService[]> => {
    const now = Date.now();
    if (cachedFinishingServices && (now - cachedFinishingServices.timestamp) < FINISHING_CACHE_TTL) {
        return cachedFinishingServices.data;
    }

    if (inFlightFinishingPromise) {
        return inFlightFinishingPromise;
    }

    inFlightFinishingPromise = (async () => {
        try {
            // 1. Try public.finishing_services table if not already known to be missing
            if (!finishingTableChecked || finishingTableExists) {
                try {
                    const { data, error } = await supabase
                        .from('finishing_services')
                        .select('*')
                        .order('display_order', { ascending: true });

                    finishingTableChecked = true;
                    if (!error && data && data.length > 0) {
                        finishingTableExists = true;
                        const mapped = data.map(mapRowToService);
                        cachedFinishingServices = { data: mapped, timestamp: Date.now() };
                        return mapped;
                    } else if (error) {
                        finishingTableExists = false;
                    }
                } catch {
                    finishingTableChecked = true;
                    finishingTableExists = false;
                }
            }

            // 2. Fall through to Supabase site_content
            const siteContent = await getContent();
            const rawServices = siteContent?.finishingServices || [];
            if (rawServices.length > 0) {
                const mapped = rawServices.map((s: any, idx: number) => normalizeFinishingService(s, idx));
                cachedFinishingServices = { data: mapped, timestamp: Date.now() };
                return mapped;
            }

            // 3. Fall through to canonical fallback data
            const fallbackServices = (fallbackData.finishingServices || []).map((s: any, idx: number) => 
                normalizeFinishingService(s, idx)
            );
            cachedFinishingServices = { data: fallbackServices, timestamp: Date.now() };
            return fallbackServices;
        } finally {
            inFlightFinishingPromise = null;
        }
    })();

    return inFlightFinishingPromise;
};

/**
 * Get a specific finishing service by ID
 */
export const getFinishingServiceById = async (id: string): Promise<FinishingService | undefined> => {
    const all = await getFinishingServices();
    return all.find(s => s.id === id);
};

/**
 * Save / Update canonical finishing services in Supabase
 */
export const saveFinishingServices = async (services: FinishingService[]): Promise<FinishingService[]> => {
    const normalized = services.map((s, idx) => normalizeFinishingService(s, idx));

    // Try saving directly to table if available
    try {
        const rows = normalized.map(s => ({
            id: s.id.startsWith('finishing-srv-') ? undefined : s.id,
            title_en: s.title.en,
            title_ar: s.title.ar,
            description_en: s.description.en,
            description_ar: s.description.ar,
            category: s.category || 'turnkey',
            pricing_model: s.pricingModel,
            base_price: s.basePrice || 0,
            currency: s.currency || 'EGP',
            pricing_tiers: s.pricingTiers,
            features: s.features || [],
            is_active: s.isActive ?? true,
            display_order: s.displayOrder ?? 0,
            target_partner_id: s.targetPartnerId || null
        }));

        await supabase.from('finishing_services').upsert(rows);
    } catch {
        // Ignore table error if migration is pending
    }

    // Always synchronize into Supabase site_content for instant availability
    await updateContent({ finishingServices: normalized });
    return normalized;
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
                verified: p.is_verified ?? true,
                rating: 4.9,
                projectsCompleted: 24,
                createdAt: p.created_at,
                // Partner capability flags
                capabilities: {
                    turnkey: true,
                    interiorDesign: true,
                    commercial: p.name_en?.toLowerCase().includes('elite') || p.name_en?.toLowerCase().includes('touch'),
                    renovation: true
                }
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
                categories: data.categories || ['turnkey', 'architectural'],
                serviceAreas: data.service_areas || ['new_heliopolis', 'el_shorouk', 'new_cairo'],
                minBudget: Number(data.min_budget) || 100000,
                maxBudget: data.max_budget ? Number(data.max_budget) : undefined,
                turnkeyCapacity: data.turnkey_capacity || 5,
                warrantyYears: data.warranty_years || 2,
                hasInHouseArchitects: data.has_in_house_architects ?? true,
                isVerifiedContractor: data.is_verified_contractor ?? true,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        }
    } catch {
        // Fall through
    }

    // Default capability profile for finishing partner
    return {
        partnerId,
        categories: ['turnkey', 'architectural', 'renovation'],
        serviceAreas: ['new_heliopolis', 'el_shorouk', 'new_cairo', 'madinaty'],
        minBudget: 150000,
        turnkeyCapacity: 4,
        warrantyYears: 2,
        hasInHouseArchitects: true,
        isVerifiedContractor: true
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
    const { data, error } = await supabase
        .from('finishing_quotes')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching quotes from Supabase:', error);
        throw new Error(`Failed to load quotes: ${error.message}`);
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

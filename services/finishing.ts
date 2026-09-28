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
    FinishingEstimateBreakdown
} from '../types';
import { getContent, updateContent } from './content';
import { updateLead } from './leads';

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
export const getFinishingServices = async (): Promise<FinishingService[]> => {
    try {
        const { data, error } = await supabase
            .from('finishing_services')
            .select('*')
            .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
            return data.map(mapRowToService);
        }
    } catch {
        // Table not ready or unavailable, fall through to site_content
    }

    // Live Supabase site_content
    try {
        const siteContent = await getContent();
        const rawServices = siteContent?.finishingServices || [];
        if (rawServices.length > 0) {
            return rawServices.map((s: any, idx: number) => normalizeFinishingService(s, idx));
        }
    } catch (e) {
        console.error('Error fetching finishing services from site content:', e);
    }

    return [];
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

const LOCAL_STORAGE_QUOTES_KEY = 'onlyhelio_finishing_quotes';

const getLocalQuotes = (): FinishingQuote[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_QUOTES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveLocalQuotes = (quotes: FinishingQuote[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(LOCAL_STORAGE_QUOTES_KEY, JSON.stringify(quotes));
    } catch (e) {
        console.error('Error saving local quotes:', e);
    }
};

export const getQuotesByRequestId = async (requestId: string): Promise<FinishingQuote[]> => {
    let cloudQuotes: FinishingQuote[] = [];
    try {
        const { data, error } = await supabase
            .from('finishing_quotes')
            .select('*')
            .eq('request_id', requestId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            cloudQuotes = data.map((q: any) => ({
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
        }
    } catch {
        // Fall through
    }

    const localQuotes = getLocalQuotes().filter(q => q.requestId === requestId);
    const quoteMap = new Map<string, FinishingQuote>();
    localQuotes.forEach(q => quoteMap.set(q.id, q));
    cloudQuotes.forEach(q => quoteMap.set(q.id, q));

    return Array.from(quoteMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

export const submitFinishingQuote = async (
    quoteData: Omit<FinishingQuote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FinishingQuote> => {
    const id = `quote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newQuote: FinishingQuote = {
        ...quoteData,
        id,
        createdAt: now,
        updatedAt: now
    };

    try {
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
            notes: quoteData.notes,
            created_at: now,
            updated_at: now
        };

        const { data, error } = await supabase
            .from('finishing_quotes')
            .insert(row)
            .select()
            .single();

        if (!error && data) {
            newQuote.id = data.id;
        }
    } catch {
        // Save locally
    }

    const existing = getLocalQuotes();
    existing.unshift(newQuote);
    saveLocalQuotes(existing);

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
    // 1. Mark accepted quote
    try {
        await supabase
            .from('finishing_quotes')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', quoteId);

        // 2. Reject other quotes for this request
        await supabase
            .from('finishing_quotes')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('request_id', requestId)
            .neq('id', quoteId);
    } catch {
        // Fallback local update
    }

    const local = getLocalQuotes();
    const updatedLocal = local.map(q => {
        if (q.requestId === requestId) {
            return {
                ...q,
                status: (q.id === quoteId ? 'accepted' : 'rejected') as FinishingQuoteStatus,
                updatedAt: new Date().toISOString()
            };
        }
        return q;
    });
    saveLocalQuotes(updatedLocal);

    // 3. Update Request status to in-progress
    await updateLead(requestId, { status: 'in-progress' });

    // 4. Record history
    await recordFinishingRequestHistory({
        requestId,
        actionType: 'quote_accepted',
        changedBy: adminUserId,
        newValue: { quoteId, awardedTo: contractorName },
        note: `تم اعتماد عرض المقاولة المقدم من ${contractorName} وترسية المشروع وبدء التنفيذ.`
    });
};

/* =========================================================================
   P1: FINISHING REQUEST AUDIT TRAIL & HISTORY
   ========================================================================= */

const LOCAL_STORAGE_HISTORY_KEY = 'onlyhelio_finishing_history';

const getLocalHistory = (): FinishingRequestHistoryEntry[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const getFinishingRequestHistory = async (requestId: string): Promise<FinishingRequestHistoryEntry[]> => {
    let cloudHistory: FinishingRequestHistoryEntry[] = [];
    try {
        const { data, error } = await supabase
            .from('finishing_request_history')
            .select('*')
            .eq('request_id', requestId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            cloudHistory = data.map((h: any) => ({
                id: h.id,
                requestId: h.request_id,
                actionType: h.action_type,
                changedBy: h.changed_by,
                oldValue: h.old_value,
                newValue: h.new_value,
                note: h.note,
                createdAt: h.created_at
            }));
        }
    } catch {
        // Fall through
    }

    const local = getLocalHistory().filter(h => h.requestId === requestId);
    const histMap = new Map<string, FinishingRequestHistoryEntry>();
    local.forEach(h => histMap.set(h.id, h));
    cloudHistory.forEach(h => histMap.set(h.id, h));

    return Array.from(histMap.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
};

export const recordFinishingRequestHistory = async (
    entry: Omit<FinishingRequestHistoryEntry, 'id' | 'createdAt'>
): Promise<FinishingRequestHistoryEntry> => {
    const id = `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newEntry: FinishingRequestHistoryEntry = {
        ...entry,
        id,
        createdAt: now
    };

    try {
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

        if (!error && data) {
            newEntry.id = data.id;
        }
    } catch {
        // Fallback local
    }

    if (typeof window !== 'undefined') {
        try {
            const existing = getLocalHistory();
            existing.push(newEntry);
            localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(existing.slice(-300)));
        } catch (e) {
            console.error('Error saving local history entry:', e);
        }
    }

    return newEntry;
};

// ==========================================
// Project Execution Milestones (P2)
// ==========================================

export const LOCAL_STORAGE_MILESTONES_KEY = 'onlyhelio_finishing_milestones';

export const DEFAULT_PROJECT_MILESTONES_TEMPLATE: Omit<FinishingProjectMilestone, 'id' | 'requestId' | 'updatedAt'>[] = [
    {
        stageNumber: 1,
        title: {
            ar: 'المخططات المعمارية والتصميم ثلاثي الأبعاد والرسومات التنفيذية',
            en: '3D Design & Executive MEP Blueprints'
        },
        description: {
            ar: 'معاينة الموقع ورفع المقاسات الدقيقة، إعداد التصميمات المعمارية 3D واعتماد توزيع الفرش والإنارة وشبكات السباكة والتكييف.',
            en: 'Site survey, 3D visualization, approval of space layout, lighting fixtures, and plumbing/HVAC rough-in schematics.'
        },
        targetDays: 14,
        status: 'in_progress',
        progressPercentage: 60,
        paymentPercentage: 15,
        paymentStatus: 'paid',
        inspectorNotes: 'تم اعتماد المخطط المعماري وتوزيع الكهرباء من قبل المهندس المشرف والعميل.'
    },
    {
        stageNumber: 2,
        title: {
            ar: 'أعمال التأسيس الكهروميكانيكية والعزل المائي والحراري',
            en: 'MEP Rough-ins, Plumbing & Waterproofing'
        },
        description: {
            ar: 'تكسير وتمديد مواسير السباكة (بي بي آر معتمد)، شبكة الكهرباء وخراطيم التيار الخفيف، وعزل أرضيات الحمامات والمطابخ واختبار الضغط.',
            en: 'Plumbing rough-ins with certified pipes, electrical conduits, wet-area waterproofing, and pressure testing.'
        },
        targetDays: 25,
        status: 'pending',
        progressPercentage: 0,
        paymentPercentage: 25,
        paymentStatus: 'due',
        inspectorNotes: 'بانتظار توريد مواسير الصرف والتغذية واختبار شركة التأمين والضمان.'
    },
    {
        stageNumber: 3,
        title: {
            ar: 'أعمال المحارة، الجبس بورد وتوريد وتركيب البورسلين/السيراميك',
            en: 'Plastering, Drywall & Porcelain Installation'
        },
        description: {
            ar: 'استرباع الزوايا والبؤج والأوتار، محارة الجدران، تركيب أسقف الجبس بورد المقاوم للرطوبة، وتبليط الأرضيات والحوائط بالليزر.',
            en: 'Wall plastering with precision guides, moisture-resistant drywall ceilings, and laser-aligned porcelain tile installation.'
        },
        targetDays: 25,
        status: 'pending',
        progressPercentage: 0,
        paymentPercentage: 25,
        paymentStatus: 'pending'
    },
    {
        stageNumber: 4,
        title: {
            ar: 'التشطيبات النهائية، النجارة، الألوميتال، الدهانات والإضاءة',
            en: 'Finishes, Carpentry, Aluminum & Final Paints'
        },
        description: {
            ar: 'سحب المعجون وتطبيق دهانات جوتن الفاخرة، تركيب الأبواب الداخلية وشبابيك الألوميتال الجامبو، وتركيب مفاتيح الكهرباء ووحدات الإضاءة.',
            en: 'Premium wall putty & paint coats, luxury internal doors, double-glazed aluminum windows, and final fixtures.'
        },
        targetDays: 20,
        status: 'pending',
        progressPercentage: 0,
        paymentPercentage: 25,
        paymentStatus: 'pending'
    },
    {
        stageNumber: 5,
        title: {
            ar: 'الفحص الهندسي النهائي، مراجعة الملاحظات وتسليم شهادة الضمان',
            en: 'Snag List Audit, Final Handover & Warranty Certificate'
        },
        description: {
            ar: 'فحص شامل لكافة بنود المشروع وقائمة الملاحظات (Snag List)، نظافة عميقة للموقع، وتسليم المفتاح وشهادة الضمان المعتمدة.',
            en: 'Comprehensive engineering quality inspection, snag-list clearance, deep post-construction cleaning, and warranty handover.'
        },
        targetDays: 7,
        status: 'pending',
        progressPercentage: 0,
        paymentPercentage: 10,
        paymentStatus: 'pending'
    }
];

const getLocalMilestones = (): FinishingProjectMilestone[] => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_MILESTONES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalMilestones = (milestones: FinishingProjectMilestone[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(LOCAL_STORAGE_MILESTONES_KEY, JSON.stringify(milestones));
    } catch (e) {
        console.error('Error saving local milestones:', e);
    }
};

export const getProjectMilestones = async (requestId: string): Promise<FinishingProjectMilestone[]> => {
    const all = getLocalMilestones();
    const existing = all.filter(m => m.requestId === requestId);

    if (existing.length > 0) {
        return existing.sort((a, b) => a.stageNumber - b.stageNumber);
    }

    // Auto-generate standard 5 milestones for this project
    const now = new Date().toISOString();
    const generated: FinishingProjectMilestone[] = DEFAULT_PROJECT_MILESTONES_TEMPLATE.map((template, idx) => ({
        ...template,
        id: `ms-${requestId}-${idx + 1}`,
        requestId,
        updatedAt: now
    }));

    const updatedAll = [...all, ...generated];
    saveLocalMilestones(updatedAll);
    return generated;
};

export const updateProjectMilestone = async (
    requestId: string,
    milestoneId: string,
    updates: Partial<FinishingProjectMilestone>,
    userLabel: string = 'Platform Finishing Engineer'
): Promise<FinishingProjectMilestone | null> => {
    const all = getLocalMilestones();
    const index = all.findIndex(m => m.id === milestoneId && m.requestId === requestId);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const updated: FinishingProjectMilestone = {
        ...all[index],
        ...updates,
        updatedAt: now,
        ...(updates.status === 'completed' && !all[index].completedAt ? { completedAt: now, progressPercentage: 100 } : {})
    };

    all[index] = updated;
    saveLocalMilestones(all);

    // Record in history audit
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

export const clientAcceptQuote = async (
    requestId: string,
    quoteId: string,
    clientName: string = 'العميل'
): Promise<{ success: boolean; winningQuote?: FinishingQuote }> => {
    const quotes = await getQuotesByRequestId(requestId);
    const targetQuote = quotes.find(q => q.id === quoteId);
    if (!targetQuote) return { success: false };

    // Update quote statuses
    for (const q of quotes) {
        const isTarget = q.id === quoteId;
        await updateFinishingQuote(q.id, {
            status: isTarget ? 'accepted' : 'rejected'
        });
    }

    // Update lead status
    await updateLead(requestId, {
        status: 'in_progress',
        assignedTo: targetQuote.partnerId,
        partnerId: targetQuote.partnerId
    });

    // Initialize milestones
    await getProjectMilestones(requestId);

    // Audit log
    await recordFinishingRequestHistory({
        requestId,
        actionType: 'quote_accepted',
        changedBy: clientName,
        newValue: {
            quoteId,
            partnerId: targetQuote.partnerId,
            partnerName: targetQuote.partnerName,
            totalPrice: targetQuote.totalPrice,
            timelineDays: targetQuote.executionTimelineDays
        },
        note: `تم اعتماد عرض المقاول (${targetQuote.partnerName}) بمبلغ إجمالي ${targetQuote.totalPrice.toLocaleString()} ${targetQuote.currency} والبدء في تنفيذ المشروع.`
    });

    return { success: true, winningQuote: targetQuote };
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
    addons?: {
        smartHome?: boolean;
        acPrep?: boolean;
        soundproofing?: boolean;
        woodPanels?: boolean;
    };
}): FinishingEstimateBreakdown => {
    const tier = ESTIMATOR_TIERS.find(t => t.id === params.tierId) || ESTIMATOR_TIERS[1];
    const safeArea = Math.max(50, Math.min(params.area || 120, 1000));
    
    // Base unit multiplier for extra wet areas (bathrooms require heavier plumbing & porcelain)
    const extraBathroomFactor = Math.max(0, (params.bathrooms || 1) - 1) * 18000;
    const baseCost = (safeArea * tier.pricePerSqm) + extraBathroomFactor;

    // Addons cost calculation
    let addonsTotal = 0;
    const appliedAddons: string[] = [];

    if (params.addons?.smartHome) {
        const smartCost = safeArea * 450 + 15000;
        addonsTotal += smartCost;
        appliedAddons.push('Smart Home Automation');
    }
    if (params.addons?.acPrep) {
        const acCost = (params.bedrooms + 1) * 7500;
        addonsTotal += acCost;
        appliedAddons.push('Concealed AC Pre-installation');
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

    const totalEstimatedCost = Math.round(baseCost + addonsTotal);
    const effectivePricePerSqm = Math.round(totalEstimatedCost / safeArea);

    // Standard engineering breakdown percentages
    const mepCost = Math.round(totalEstimatedCost * 0.25);
    const flooringMasonryCost = Math.round(totalEstimatedCost * 0.30);
    const carpentryAluminumCost = Math.round(totalEstimatedCost * 0.20);
    const paintsDecorCost = Math.round(totalEstimatedCost * 0.15);
    const supervisionWarrantyCost = Math.round(totalEstimatedCost * 0.10);

    const estimatedDays = Math.round((safeArea / 100) * tier.avgDaysPer100Sqm);

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
        estimatedDays: Math.max(30, estimatedDays),
        specs: {
            bedrooms: params.bedrooms || 3,
            bathrooms: params.bathrooms || 2,
            style: params.style || 'modern',
            addons: appliedAddons
        }
    };
};

/**
 * Finishing Marketplace data layer.
 *
 * The platform lists independent engineers and finishing companies. Each partner
 * owns its services (one per category). A service becomes public only after a
 * finishing admin approves it. Database RLS (migration 20261128) is the source of
 * truth for who can read or change what; this module only shapes the data.
 */
import { supabase, supabasePublic } from '../lib/supabase';
import type {
    FinishingDirectoryEntry,
    FinishingMarketCategory,
    FinishingPricingDisplay,
    FinishingProviderKind,
    FinishingProviderSummary,
    FinishingServiceApprovalStatus,
    PartnerFinishingService,
} from '../types';

const PRICING_DISPLAYS: FinishingPricingDisplay[] = ['on_request', 'starting_from', 'per_sqm', 'fixed'];
const APPROVAL_STATUSES: FinishingServiceApprovalStatus[] = ['pending', 'approved', 'rejected', 'disabled'];

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export const mapFinishingCategory = (row: any): FinishingMarketCategory => ({
    id: String(row.id),
    name: { ar: str(row.name_ar), en: str(row.name_en) || str(row.name_ar) },
    description: { ar: str(row.description_ar), en: str(row.description_en) },
    displayOrder: Number(row.display_order) || 0,
    isVisible: row.is_visible !== false,
});

export const mapPartnerFinishingService = (row: any): PartnerFinishingService => {
    const pricingDisplay = PRICING_DISPLAYS.includes(row.pricing_display) ? row.pricing_display : 'on_request';
    const approvalStatus = APPROVAL_STATUSES.includes(row.approval_status) ? row.approval_status : 'pending';
    const rawPrice = row.price_from === null || row.price_from === undefined ? null : Number(row.price_from);
    return {
        id: String(row.id),
        partnerId: String(row.partner_id),
        categoryId: String(row.category_id),
        title: { ar: str(row.title_ar), en: str(row.title_en) },
        description: { ar: str(row.description_ar), en: str(row.description_en) },
        scope: { ar: str(row.scope_ar), en: str(row.scope_en) },
        pricingDisplay,
        priceFrom: rawPrice !== null && Number.isFinite(rawPrice) ? rawPrice : null,
        currency: str(row.currency) || 'EGP',
        isListed: row.is_listed !== false,
        approvalStatus,
        adminNote: row.admin_note ?? null,
        reviewedAt: row.reviewed_at ?? null,
        displayOrder: Number(row.display_order) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

export const mapFinishingProvider = (row: any): FinishingProviderSummary => {
    const allowed: string[] = Array.isArray(row?.allowed_cities)
        ? row.allowed_cities.map((c: unknown) => String(c).trim()).filter((c: string) => c && c !== '*')
        : [];
    const kind: FinishingProviderKind = row?.profile_kind === 'engineer' ? 'engineer' : 'company';
    return {
        id: String(row?.id),
        name: { ar: str(row?.name_ar) || str(row?.name_en), en: str(row?.name_en) || str(row?.name_ar) },
        description: { ar: str(row?.description_ar), en: str(row?.description_en) },
        imageUrl: typeof row?.image_url === 'string' && !row.image_url.startsWith('data:') ? row.image_url : undefined,
        profileKind: kind,
        servedCities: allowed,
    };
};

/** Serialises the editable, partner-owned part of a service. Review fields are never sent. */
export const toPartnerServiceRow = (service: Partial<PartnerFinishingService> & { partnerId: string; categoryId: string }) => {
    const pricingDisplay: FinishingPricingDisplay = service.pricingDisplay && PRICING_DISPLAYS.includes(service.pricingDisplay)
        ? service.pricingDisplay
        : 'on_request';
    const price = service.priceFrom === null || service.priceFrom === undefined ? null : Number(service.priceFrom);
    if (pricingDisplay !== 'on_request' && (price === null || !Number.isFinite(price) || price < 0)) {
        throw new Error('A valid price is required for the selected pricing display.');
    }
    return {
        partner_id: service.partnerId,
        category_id: service.categoryId,
        title_ar: service.title?.ar?.trim() || '',
        title_en: service.title?.en?.trim() || '',
        description_ar: service.description?.ar?.trim() || '',
        description_en: service.description?.en?.trim() || '',
        scope_ar: service.scope?.ar?.trim() || '',
        scope_en: service.scope?.en?.trim() || '',
        pricing_display: pricingDisplay,
        price_from: pricingDisplay === 'on_request' ? null : price,
        currency: service.currency || 'EGP',
        is_listed: service.isListed !== false,
    };
};

/** Groups approved public services by category, preserving category order. */
export const groupDirectoryByCategory = (
    categories: FinishingMarketCategory[],
    entries: FinishingDirectoryEntry[]
): { category: FinishingMarketCategory; entries: FinishingDirectoryEntry[] }[] => {
    return [...categories]
        .filter((c) => c.isVisible)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((category) => ({
            category,
            entries: entries
                .filter((e) => e.service.categoryId === category.id)
                .sort((a, b) => a.service.displayOrder - b.service.displayOrder || a.provider.name.en.localeCompare(b.provider.name.en)),
        }));
};

// -------------------------------------------------------------------------
// Public reads
// -------------------------------------------------------------------------

export const getFinishingMarketCategories = async (options?: { includeHidden?: boolean }): Promise<FinishingMarketCategory[]> => {
    const client = options?.includeHidden ? supabase : supabasePublic;
    let query = client.from('finishing_categories').select('*').order('display_order', { ascending: true });
    if (!options?.includeHidden) query = query.eq('is_visible', true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(mapFinishingCategory);
};

const PUBLIC_SERVICE_SELECT = '*, partner:partners!partner_finishing_services_partner_id_fkey(*)';

const toDirectoryEntries = (rows: any[]): FinishingDirectoryEntry[] =>
    rows
        .filter((row) => row?.partner && row.partner.status === 'active')
        .map((row) => ({ provider: mapFinishingProvider(row.partner), service: mapPartnerFinishingService(row) }));

/** Approved + listed services of active providers (RLS enforces this too). */
export const getFinishingDirectory = async (): Promise<FinishingDirectoryEntry[]> => {
    const { data, error } = await supabasePublic
        .from('partner_finishing_services')
        .select(PUBLIC_SERVICE_SELECT)
        .eq('approval_status', 'approved')
        .eq('is_listed', true)
        .order('display_order', { ascending: true });
    if (error) throw new Error(error.message);
    return toDirectoryEntries(data || []);
};

export const getPublicPartnerFinishingServices = async (partnerId: string): Promise<PartnerFinishingService[]> => {
    if (!partnerId) return [];
    const { data, error } = await supabasePublic
        .from('partner_finishing_services')
        .select('*')
        .eq('partner_id', partnerId)
        .eq('approval_status', 'approved')
        .eq('is_listed', true)
        .order('display_order', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(mapPartnerFinishingService);
};

// -------------------------------------------------------------------------
// Partner self-service
// -------------------------------------------------------------------------

export const getMyFinishingServices = async (partnerId: string): Promise<PartnerFinishingService[]> => {
    if (!partnerId) return [];
    const { data, error } = await supabase
        .from('partner_finishing_services')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(mapPartnerFinishingService);
};

/** Creates or updates the partner's service in a category. New services start as pending (enforced in DB). */
export const saveMyFinishingService = async (
    service: Partial<PartnerFinishingService> & { partnerId: string; categoryId: string }
): Promise<PartnerFinishingService> => {
    const row = toPartnerServiceRow(service);
    const request = service.id
        ? supabase.from('partner_finishing_services').update(row).eq('id', service.id).select('*').single()
        : supabase.from('partner_finishing_services').insert(row).select('*').single();
    const { data, error } = await request;
    if (error) throw new Error(error.message);
    return mapPartnerFinishingService(data);
};

export const deleteMyFinishingService = async (serviceId: string): Promise<void> => {
    const { error } = await supabase.from('partner_finishing_services').delete().eq('id', serviceId);
    if (error) throw new Error(error.message);
};

// -------------------------------------------------------------------------
// Admin
// -------------------------------------------------------------------------

export interface AdminFinishingServiceRow {
    service: PartnerFinishingService;
    provider: FinishingProviderSummary & { status?: string };
}

export const getAllPartnerFinishingServices = async (): Promise<AdminFinishingServiceRow[]> => {
    const { data, error } = await supabase
        .from('partner_finishing_services')
        .select(PUBLIC_SERVICE_SELECT)
        .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => ({
        service: mapPartnerFinishingService(row),
        provider: { ...mapFinishingProvider(row.partner || { id: row.partner_id }), status: row.partner?.status },
    }));
};

export const reviewPartnerFinishingService = async (
    serviceId: string,
    approvalStatus: FinishingServiceApprovalStatus,
    adminNote?: string
): Promise<PartnerFinishingService> => {
    if (!APPROVAL_STATUSES.includes(approvalStatus)) throw new Error('Invalid approval status');
    const { data, error } = await supabase
        .from('partner_finishing_services')
        .update({ approval_status: approvalStatus, admin_note: adminNote?.trim() || null })
        .eq('id', serviceId)
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return mapPartnerFinishingService(data);
};

export const saveFinishingMarketCategory = async (category: FinishingMarketCategory): Promise<FinishingMarketCategory> => {
    const { data, error } = await supabase
        .from('finishing_categories')
        .update({
            name_ar: category.name.ar.trim(),
            name_en: category.name.en.trim(),
            description_ar: category.description.ar.trim(),
            description_en: category.description.en.trim(),
            display_order: category.displayOrder,
            is_visible: category.isVisible,
            updated_at: new Date().toISOString(),
        })
        .eq('id', category.id)
        .select('*')
        .single();
    if (error) throw new Error(error.message);
    return mapFinishingCategory(data);
};

export const updatePartnerProfileKind = async (partnerId: string, kind: FinishingProviderKind): Promise<void> => {
    const { error } = await supabase.from('partners').update({ profile_kind: kind }).eq('id', partnerId);
    if (error) throw new Error(error.message);
};

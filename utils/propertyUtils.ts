import { Role, Permission, type Property, type Partner } from '../types';
import { canUserAccessCity } from './cityScope';

const HIDDEN_PUBLICATION_STATUSES = new Set([
    'draft',
    'pending_review',
    'rejected',
    'archived',
]);

const AUTHORIZED_DRAFT_REVIEW_ROLES = new Set<string>([
    Role.SUPER_ADMIN,
    Role.LISTINGS_MANAGER,
    Role.REAL_ESTATE_MARKET_MANAGER,
    Role.PLATFORM_REAL_ESTATE_MANAGER,
]);

const AUTHORIZED_DRAFT_REVIEW_PERMISSIONS = new Set<Permission>([
    Permission.MANAGE_ALL_PROPERTIES,
    Permission.MANAGE_PLATFORM_PROPERTIES,
    Permission.MANAGE_MARKET_PROPERTIES,
]);

/**
 * Unified public visibility rule for properties across Home, Catalog List,
 * Property Details, Project pages, and Partner Profile.
 *
 * - Unpublished/hidden states ('draft', 'inactive', 'pending_review', 'rejected', 'archived')
 *   are NEVER visible to the public.
 * - By default ('includeSold: true'), both 'active' and 'sold' published listings
 *   are publicly visible in catalog/details/project/partner views.
 * - With 'includeSold: false' (e.g., Home latest available listings), only 'active'
 *   published listings are included.
 */
export const isPropertyPubliclyVisible = (
    property: Property | null | undefined,
    options?: { includeSold?: boolean }
): boolean => {
    if (!property) return false;

    const includeSold = options?.includeSold ?? true;
    const listingStatus = property.listingStatus;
    const publicationStatus = property.publicationStatus;

    if (publicationStatus && HIDDEN_PUBLICATION_STATUSES.has(publicationStatus)) {
        return false;
    }

    if (includeSold) {
        return listingStatus === 'active' || listingStatus === 'sold';
    }

    return listingStatus === 'active';
};

export const isListingActive = (p: Property): boolean => {
    return isPropertyPubliclyVisible(p, { includeSold: false });
};

/**
 * Determines whether the current authenticated actor is allowed to review an
 * unpublished / hidden property (draft, inactive, pending_review, etc.).
 */
export const canReviewPropertyDraft = (
    property: Property | null | undefined,
    user: Partner | null | undefined
): boolean => {
    if (!property || !user) return false;
    if (user.status && user.status !== 'active') return false;

    if (user.id && property.partnerId && user.id === property.partnerId) {
        return true;
    }

    const hasRolePrivilege = Boolean(user.role && AUTHORIZED_DRAFT_REVIEW_ROLES.has(user.role));
    const hasCustomPermission = Array.isArray(user.customPermissions)
        && user.customPermissions.some((perm) => AUTHORIZED_DRAFT_REVIEW_PERMISSIONS.has(perm));

    if (!hasRolePrivilege && !hasCustomPermission) {
        return false;
    }

    return canUserAccessCity(user, property.cityId || 'heliopolis');
};

export const canUserViewPropertyDetails = (
    property: Property | null | undefined,
    user: Partner | null | undefined
): boolean => {
    return isPropertyPubliclyVisible(property, { includeSold: true }) || canReviewPropertyDraft(property, user);
};

export const isCommercial = (property: Property): boolean => {
    return property.type?.en === 'Commercial';
};

export interface SanitizedPropertyReadError {
    diagnosticCode: string;
    category: 'network' | 'timeout' | 'permission' | 'schema' | 'query' | 'unknown';
    visitorTitle: string;
    visitorMessage: string;
}

/**
 * Sanitizes property catalog read errors for public UI and diagnostic reporting:
 * strips internal Supabase/PostgreSQL/table/column/URL details and emits a stable
 * opaque diagnostic code alongside a clear visitor message.
 */
export const sanitizePropertyReadError = (
    error: unknown,
    language: 'ar' | 'en' = 'ar'
): SanitizedPropertyReadError => {
    const errObj = error as { code?: unknown; status?: unknown; message?: unknown; name?: unknown } | null | undefined;
    const rawCode = errObj?.code ? String(errObj.code).trim().toUpperCase() : '';
    const httpStatus = typeof errObj?.status === 'number' ? errObj.status : undefined;
    const rawMsg = errObj?.message ? String(errObj.message) : typeof error === 'string' ? error : '';
    const errName = errObj?.name ? String(errObj.name) : '';

    let category: SanitizedPropertyReadError['category'] = 'unknown';
    let diagnosticCode = 'PROP-UNK-99';

    if (
        /failed to fetch|networkerror|fetch failed|load failed|err_network|network request failed/i.test(rawMsg)
    ) {
        category = 'network';
        diagnosticCode = 'PROP-NET-01';
    } else if (
        errName === 'AbortError' ||
        rawCode === '57014' ||
        /timeout|timed out|statement timeout|aborted/i.test(rawMsg)
    ) {
        category = 'timeout';
        diagnosticCode = 'PROP-TMO-02';
    } else if (
        rawCode === '42501' ||
        httpStatus === 401 ||
        httpStatus === 403 ||
        /permission denied|row-level security|not authorized|jwt|unauthorized|forbidden/i.test(rawMsg)
    ) {
        category = 'permission';
        diagnosticCode = 'PROP-AUTH-03';
    } else if (
        rawCode === '42703' ||
        rawCode === '42P01' ||
        rawCode === 'PGRST204' ||
        rawCode === 'PGRST205' ||
        /does not exist|schema cache|could not find the table|could not find the.*column/i.test(rawMsg)
    ) {
        category = 'schema';
        diagnosticCode = 'PROP-SCH-04';
    } else if (rawCode || (httpStatus && httpStatus >= 400) || rawMsg) {
        category = 'query';
        diagnosticCode = 'PROP-QRY-05';
    }

    const visitorTitle = language === 'ar'
        ? 'حدث خطأ أثناء تحميل العقارات'
        : 'Unable to load properties';

    let visitorMessage: string;
    if (category === 'network') {
        visitorMessage = language === 'ar'
            ? `تعذر الاتصال بالخادم حالياً. يرجى التحقق من اتصال الإنترنت ثم إعادة المحاولة. (رمز التشخيص: ${diagnosticCode})`
            : `Unable to reach the server right now. Please check your internet connection and try again. (Diagnostic code: ${diagnosticCode})`;
    } else if (category === 'timeout') {
        visitorMessage = language === 'ar'
            ? `استغرق تحميل قائمة العقارات وقتاً أطول من المعتاد. يرجى إعادة المحاولة. (رمز التشخيص: ${diagnosticCode})`
            : `Loading the property catalog took longer than expected. Please try again. (Diagnostic code: ${diagnosticCode})`;
    } else {
        visitorMessage = language === 'ar'
            ? `تعذر عرض قائمة العقارات مؤقتاً بسبب مشكلة فنية. يرجى إعادة المحاولة بعد قليل. (رمز التشخيص: ${diagnosticCode})`
            : `The property catalog is temporarily unavailable due to a technical issue. Please try again shortly. (Diagnostic code: ${diagnosticCode})`;
    }

    return {
        diagnosticCode,
        category,
        visitorTitle,
        visitorMessage,
    };
};
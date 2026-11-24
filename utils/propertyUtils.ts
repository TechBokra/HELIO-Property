import { Role, Permission, type Property, type Partner } from '../types';

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

    if (user.role && AUTHORIZED_DRAFT_REVIEW_ROLES.has(user.role)) {
        return true;
    }

    if (Array.isArray(user.customPermissions)) {
        return user.customPermissions.some((perm) => AUTHORIZED_DRAFT_REVIEW_PERMISSIONS.has(perm));
    }

    return false;
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
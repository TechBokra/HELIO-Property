/**
 * One human-readable reference for a request, used everywhere (customer, provider, admin)
 * and identical to the reference the database puts in notifications:
 * 'REQ-' + first 8 hex digits of the UUID, upper-case.
 */
export const formatRequestReference = (id?: string | null): string => {
    if (!id) return '';
    return `REQ-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
};

export const isDirectProviderRequest = (payload?: { requestChannel?: string } | null): boolean =>
    payload?.requestChannel === 'direct_provider';

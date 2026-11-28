import type { Partner, PropertyFiltersType } from '../types';
import { getCatalogDataSource, type CatalogDataSource } from './catalogSource';
import { isDemoModeEnabled } from './demoMode';

export type PropertyDataSource = CatalogDataSource | 'demo';

export const getEffectivePropertySource = (): PropertyDataSource => {
    if (isDemoModeEnabled()) return 'demo';
    return getCatalogDataSource();
};

export const normalizePropertyCityKey = (cityId?: string | null): string => {
    if (!cityId || cityId === 'all' || cityId === 'hub') return 'all';
    const normalized = cityId.trim().toLowerCase();
    return normalized || 'all';
};

export const getPropertyUserScopeKey = (
    user?: Pick<Partner, 'id' | 'role' | 'isDemo'> | null
): string => {
    if (!user?.id) return 'guest';
    return `${user.isDemo ? 'demo' : 'auth'}:${user.id}:${user.role || 'unknown'}`;
};

export const normalizePropertyFiltersForKey = (
    filters?: Partial<PropertyFiltersType>
) => ({
    status: filters?.status || 'all',
    type: filters?.type || 'all',
    query: (filters?.query || '').trim(),
    minPrice: filters?.minPrice || '',
    maxPrice: filters?.maxPrice || '',
    project: filters?.project || 'all',
    finishing: filters?.finishing || 'all',
    installments: filters?.installments || 'all',
    realEstateFinance: filters?.realEstateFinance || 'all',
    floor: filters?.floor || '',
    compound: filters?.compound || 'all',
    delivery: filters?.delivery || 'all',
    amenities: Array.isArray(filters?.amenities)
        ? [...filters.amenities].filter(Boolean).sort()
        : [],
    beds: filters?.beds || '',
    baths: filters?.baths || '',
});

const resolveUserScope = (
    user?: Pick<Partner, 'id' | 'role' | 'isDemo'> | string | null
): string => (typeof user === 'string' ? user : getPropertyUserScopeKey(user));

export const propertyQueryKeys = {
    all: ['properties'] as const,

    // Public catalog lists (source + city + filter/page scoped)
    publicRoot: () => ['properties', 'public'] as const,
    publicLists: () => ['properties', 'public', 'list'] as const,
    publicList: (
        cityId?: string | null,
        source: PropertyDataSource = getEffectivePropertySource()
    ) => ['properties', 'public', 'list', source, normalizePropertyCityKey(cityId)] as const,

    publicLatest: (cityId?: string | null, limit = 4, source: PropertyDataSource = getEffectivePropertySource()) =>
        ['properties', 'public', 'list', source, normalizePropertyCityKey(cityId), 'latest', limit] as const,

    publicPaginatedRoot: () => ['properties', 'public', 'paginated'] as const,
    publicPaginated: (params: {
        cityId?: string | null;
        page: number;
        filters?: Partial<PropertyFiltersType>;
        source?: PropertyDataSource;
    }) =>
        [
            'properties',
            'public',
            'paginated',
            params.source ?? getEffectivePropertySource(),
            normalizePropertyCityKey(params.cityId),
            Number.isFinite(params.page) && params.page > 0 ? params.page : 1,
            normalizePropertyFiltersForKey(params.filters),
        ] as const,

    projectPublicRoot: () => ['properties', 'public', 'project'] as const,
    projectPublic: (
        projectId?: string | null,
        source: PropertyDataSource = getEffectivePropertySource()
    ) => ['properties', 'public', 'project', source, projectId || ''] as const,

    partnerPublicRoot: () => ['properties', 'public', 'partner'] as const,
    partnerPublic: (
        partnerId?: string | null,
        source: PropertyDataSource = getEffectivePropertySource()
    ) => ['properties', 'public', 'partner', source, partnerId || ''] as const,

    // Property details: strictly isolated across visitor public view, authorized review/preview, and edit form
    detailRoot: () => ['properties', 'detail'] as const,
    publicDetailRoot: () => ['properties', 'detail', 'public'] as const,
    publicDetail: (
        propertyId?: string | null,
        source: PropertyDataSource = getEffectivePropertySource()
    ) => ['properties', 'detail', 'public', source, propertyId || ''] as const,

    reviewDetailRoot: () => ['properties', 'detail', 'review'] as const,
    reviewDetail: (
        propertyId?: string | null,
        user?: Pick<Partner, 'id' | 'role' | 'isDemo'> | string | null,
        source: PropertyDataSource = getEffectivePropertySource()
    ) => ['properties', 'detail', 'review', source, resolveUserScope(user), propertyId || ''] as const,

    editDetailRoot: () => ['properties', 'detail', 'edit'] as const,
    editDetail: (
        propertyId?: string | null,
        user?: Pick<Partner, 'id' | 'role' | 'isDemo'> | string | null,
        source: PropertyDataSource = getEffectivePropertySource()
    ) => ['properties', 'detail', 'edit', source, resolveUserScope(user), propertyId || ''] as const,

    // Authenticated / operational property queries (user + source scoped for RLS isolation)
    operationalRoot: () => ['properties', 'operational'] as const,
    operationalAllRoot: () => ['properties', 'operational', 'all'] as const,
    operationalAll: (
        user?: Pick<Partner, 'id' | 'role' | 'isDemo'> | string | null,
        source: PropertyDataSource = getEffectivePropertySource()
    ) => ['properties', 'operational', 'all', source, resolveUserScope(user)] as const,

    partnerAllRoot: () => ['properties', 'operational', 'partner'] as const,
    partnerAll: (
        partnerId?: string | null,
        user?: Pick<Partner, 'id' | 'role' | 'isDemo'> | string | null,
        source: PropertyDataSource = getEffectivePropertySource()
    ) => ['properties', 'operational', 'partner', source, resolveUserScope(user), partnerId || ''] as const,
};

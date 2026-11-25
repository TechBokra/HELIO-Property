import { Role, type CityPortalConfig, type Partner, type User } from '../types';

export const resolveLegacyAllowedCities = (user?: Partial<Partner> | Partial<User> | null): string[] => {
    if (!user) return ['heliopolis'];
    if (user.role === Role.SUPER_ADMIN) return ['*'];

    const explicit = Array.isArray(user.allowedCities)
        ? user.allowedCities.map((c) => String(c).trim()).filter(Boolean)
        : [];
    const legacy = Array.isArray(user.contactMethods?._allowedCities)
        ? user.contactMethods._allowedCities.map((c) => String(c).trim()).filter(Boolean)
        : [];

    if (explicit.length > 0) {
        if (explicit.length === 1 && explicit[0] === 'heliopolis' && legacy.length > 0) {
            const legacyDifferent = legacy.length > 1 || legacy[0] !== 'heliopolis';
            if (legacyDifferent) {
                return Array.from(new Set(legacy));
            }
        }
        return Array.from(new Set(explicit));
    }

    if (legacy.length > 0) {
        return Array.from(new Set(legacy));
    }

    return ['heliopolis'];
};

export const isGlobalCityAdmin = (user?: Partial<Partner> | Partial<User> | null): boolean => {
    if (!user) return false;
    if (user.role === Role.SUPER_ADMIN) return true;
    return resolveLegacyAllowedCities(user).includes('*');
};

export const getUserAllowedCityIds = (user?: Partial<Partner> | Partial<User> | null): string[] => {
    return resolveLegacyAllowedCities(user);
};

export const canUserAccessCity = (
    user: Partial<Partner> | Partial<User> | null | undefined,
    targetCityId?: string | null
): boolean => {
    if (!user) return false;
    if (isGlobalCityAdmin(user)) return true;
    if (!targetCityId || targetCityId === 'all' || targetCityId === 'hub') {
        return false;
    }
    return getUserAllowedCityIds(user).includes(targetCityId);
};

export const getAccessibleCitiesForUser = (
    cities: CityPortalConfig[],
    user?: Partial<Partner> | Partial<User> | null
): CityPortalConfig[] => {
    if (!Array.isArray(cities) || cities.length === 0) return [];
    if (!user) return [];
    if (isGlobalCityAdmin(user)) return cities;

    const allowed = new Set(getUserAllowedCityIds(user));
    const filtered = cities.filter((c) => allowed.has(c.id));
    return filtered.length > 0 ? filtered : cities.filter((c) => c.id === 'heliopolis');
};

export const resolveAdminDefaultScope = (
    user?: Partial<Partner> | Partial<User> | null,
    currentScope?: string
): string => {
    if (isGlobalCityAdmin(user)) {
        return currentScope || 'all';
    }
    const allowed = getUserAllowedCityIds(user).filter((id) => id !== '*');
    if (currentScope && currentScope !== 'all' && allowed.includes(currentScope)) {
        return currentScope;
    }
    return allowed[0] || 'heliopolis';
};

export const getRecordCityId = (record: any): string => {
    return String(record?.cityId || record?.payload?.cityId || 'heliopolis');
};

export const filterRecordsByCityScope = <T extends Record<string, any>>(
    records: T[],
    adminCityScope: string,
    user?: Partial<Partner> | Partial<User> | null
): T[] => {
    if (!Array.isArray(records)) return [];
    const global = isGlobalCityAdmin(user);
    const allowedSet = new Set(getUserAllowedCityIds(user));

    return records.filter((item) => {
        const recordCity = getRecordCityId(item);
        if (!global && !allowedSet.has(recordCity)) {
            return false;
        }
        if (adminCityScope && adminCityScope !== 'all' && adminCityScope !== 'hub') {
            return recordCity === adminCityScope;
        }
        return true;
    });
};

export const partnerMatchesCityScope = (
    partner: Partial<Partner>,
    adminCityScope: string,
    viewer?: Partial<Partner> | Partial<User> | null
): boolean => {
    const partnerScope = resolveLegacyAllowedCities(partner);
    const viewerIsGlobal = isGlobalCityAdmin(viewer);
    const viewerAllowed = new Set(getUserAllowedCityIds(viewer));

    const visibleToViewer =
        viewerIsGlobal ||
        partnerScope.includes('*') ||
        partnerScope.some((city) => viewerAllowed.has(city));

    if (!visibleToViewer) return false;

    if (!adminCityScope || adminCityScope === 'all' || adminCityScope === 'hub') {
        return true;
    }

    return partnerScope.includes('*') || partnerScope.includes(adminCityScope);
};

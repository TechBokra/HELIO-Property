import { create } from 'zustand';
import type { AdminPartner, CityPortalConfig, Partner } from '../types';
import { INITIAL_CITIES, resolveCityFromEnvironment } from '../data/cities';
import {
    createCity as createCityInDb,
    getAllCities as fetchCitiesFromDb,
    toggleCityActive as toggleCityActiveInDb,
    updateCity as updateCityInDb,
    type CreateCityInput,
} from '../services/cities';
import { resolveAdminDefaultScope } from '../utils/cityScope';

interface CityStoreState {
    cities: CityPortalConfig[];
    portalMode: 'hub' | 'city';
    activeCityId: string;
    adminCityScope: 'all' | string;
    unavailableCity: CityPortalConfig | null;
    unavailableSlug: string | null;
    isLoading: boolean;
    isLoaded: boolean;
    error: string | null;
    loadCities: (options?: { client?: any; throwOnError?: boolean }) => Promise<CityPortalConfig[]>;
    syncFromLocation: (hostname?: string, search?: string) => void;
    switchToHub: () => void;
    switchToCity: (citySlug: string) => void;
    setAdminCityScope: (scope: 'all' | string) => void;
    syncAdminScopeForUser: (user?: Partial<Partner> | Partial<AdminPartner> | null) => void;
    addCity: (city: CreateCityInput | CityPortalConfig, options?: { client?: any }) => Promise<CityPortalConfig>;
    updateCity: (cityId: string, updates: Partial<CityPortalConfig>, options?: { client?: any }) => Promise<CityPortalConfig>;
    toggleCityActive: (cityId: string, options?: { client?: any }) => Promise<CityPortalConfig>;
    clearError: () => void;
    getActiveCity: () => CityPortalConfig;
}

const getInitialResolution = () => {
    if (typeof window !== 'undefined' && window.location) {
        return resolveCityFromEnvironment(window.location.hostname, window.location.search, INITIAL_CITIES);
    }
    return { portalMode: 'city' as const, cityId: 'heliopolis' };
};

const updateBrowserUrlCityParam = (cityValue: string) => {
    if (typeof window === 'undefined' || !window.history || !window.location) return;
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('city', cityValue);
        window.history.replaceState({}, '', url.toString());
    } catch {
        // Ignore URL update errors in non-standard environments
    }
};

const initial = getInitialResolution();

export const useCityStore = create<CityStoreState>((set, get) => ({
    cities: INITIAL_CITIES,
    portalMode: initial.portalMode,
    activeCityId: initial.cityId,
    adminCityScope: 'all',
    unavailableCity: initial.unavailableCity || null,
    unavailableSlug: initial.unavailableSlug || null,
    isLoading: false,
    isLoaded: false,
    error: null,

    clearError: () => set({ error: null }),

    loadCities: async (options = {}) => {
        set({ isLoading: true, error: null });
        try {
            const loaded = await fetchCitiesFromDb({
                client: options.client,
                includeInactive: true,
                throwOnError: options.throwOnError ?? false,
            });
            set((state) => {
                const resolved =
                    typeof window !== 'undefined' && window.location
                        ? resolveCityFromEnvironment(window.location.hostname, window.location.search, loaded)
                        : {
                              portalMode: state.portalMode,
                              cityId: state.activeCityId,
                          };
                return {
                    cities: loaded,
                    portalMode: resolved.portalMode,
                    activeCityId: resolved.cityId,
                    unavailableCity: resolved.unavailableCity || null,
                    unavailableSlug: resolved.unavailableSlug || null,
                    isLoading: false,
                    isLoaded: true,
                };
            });
            return loaded;
        } catch (err: any) {
            const message = err?.message || 'فشل تحميل قائمة المدن';
            set({ isLoading: false, error: message });
            if (options.throwOnError) {
                throw err;
            }
            return get().cities;
        }
    },

    syncFromLocation: (hostname?: string, search?: string) => {
        const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
        const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
        const resolved = resolveCityFromEnvironment(host, query, get().cities);
        set({
            portalMode: resolved.portalMode,
            activeCityId: resolved.cityId,
            unavailableCity: resolved.unavailableCity || null,
            unavailableSlug: resolved.unavailableSlug || null,
        });
    },

    switchToHub: () => {
        updateBrowserUrlCityParam('hub');
        set({
            portalMode: 'hub',
            unavailableCity: null,
            unavailableSlug: null,
        });
    },

    switchToCity: (citySlug: string) => {
        const normalized = citySlug.trim().toLowerCase();
        const cities = get().cities;
        const found = cities.find(
            (c) => c.slug.toLowerCase() === normalized || c.id.toLowerCase() === normalized
        );
        if (found && !found.isActive) {
            updateBrowserUrlCityParam(found.slug);
            set({
                portalMode: 'city',
                activeCityId: found.id,
                unavailableCity: found,
                unavailableSlug: found.slug,
            });
            return;
        }
        const firstActive = cities.find((c) => c.isActive)?.id || 'heliopolis';
        const targetId = found ? found.id : firstActive;
        updateBrowserUrlCityParam(targetId);
        set({
            portalMode: 'city',
            activeCityId: targetId,
            unavailableCity: null,
            unavailableSlug: null,
        });
    },

    setAdminCityScope: (scope: 'all' | string) => {
        set({ adminCityScope: scope });
    },

    syncAdminScopeForUser: (user) => {
        const currentScope = get().adminCityScope;
        const nextScope = user ? resolveAdminDefaultScope(user, currentScope) : 'all';
        set({ adminCityScope: nextScope });
    },

    addCity: async (cityInput, options = {}) => {
        set({ error: null });
        try {
            const saved = await createCityInDb(cityInput as CreateCityInput, options);
            set((state) => ({
                cities: [...state.cities.filter((c) => c.id !== saved.id), saved],
            }));
            return saved;
        } catch (err: any) {
            const message = err?.message || 'تعذر حفظ المدينة الجديدة';
            set({ error: message });
            throw err;
        }
    },

    updateCity: async (cityId: string, updates: Partial<CityPortalConfig>, options = {}) => {
        set({ error: null });
        try {
            const updated = await updateCityInDb(cityId, updates, options);
            set((state) => {
                const nextCities = state.cities.map((c) => (c.id === cityId ? updated : c));
                const nextUnavailable =
                    state.activeCityId === cityId && updated.isActive === false
                        ? updated
                        : state.activeCityId === cityId && updated.isActive
                            ? null
                            : state.unavailableCity;
                return {
                    cities: nextCities,
                    unavailableCity: nextUnavailable,
                    unavailableSlug: nextUnavailable ? nextUnavailable.slug : null,
                };
            });
            return updated;
        } catch (err: any) {
            const message = err?.message || 'تعذر تحديث بيانات المدينة';
            set({ error: message });
            throw err;
        }
    },

    toggleCityActive: async (cityId: string, options = {}) => {
        const existing = get().cities.find((c) => c.id === cityId);
        if (!existing) {
            throw new Error('المدينة المطلوبة غير موجودة');
        }
        const nextActive = !existing.isActive;
        set({ error: null });
        try {
            const updated = await toggleCityActiveInDb(cityId, nextActive, options);
            set((state) => {
                const nextCities = state.cities.map((c) => (c.id === cityId ? updated : c));
                const activeAffected = state.activeCityId === cityId && state.portalMode === 'city';
                return {
                    cities: nextCities,
                    unavailableCity: activeAffected && !updated.isActive ? updated : activeAffected ? null : state.unavailableCity,
                    unavailableSlug: activeAffected && !updated.isActive ? updated.slug : activeAffected ? null : state.unavailableSlug,
                };
            });
            return updated;
        } catch (err: any) {
            const message = err?.message || 'تعذر تغيير حالة تفعيل المدينة';
            set({ error: message });
            throw err;
        }
    },

    getActiveCity: () => {
        const state = get();
        return state.cities.find((c) => c.id === state.activeCityId) || state.cities[0];
    },
}));

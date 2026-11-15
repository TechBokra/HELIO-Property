import { create } from 'zustand';
import type { CityPortalConfig } from '../types';
import { INITIAL_CITIES, resolveCityFromEnvironment } from '../data/cities';

interface CityStoreState {
    cities: CityPortalConfig[];
    portalMode: 'hub' | 'city';
    activeCityId: string;
    adminCityScope: 'all' | string;
    syncFromLocation: (hostname?: string, search?: string) => void;
    switchToHub: () => void;
    switchToCity: (citySlug: string) => void;
    setAdminCityScope: (scope: 'all' | string) => void;
    addCity: (city: CityPortalConfig) => void;
    updateCity: (cityId: string, updates: Partial<CityPortalConfig>) => void;
    toggleCityActive: (cityId: string) => void;
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

    syncFromLocation: (hostname?: string, search?: string) => {
        const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
        const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
        const resolved = resolveCityFromEnvironment(host, query, get().cities);
        set({
            portalMode: resolved.portalMode,
            activeCityId: resolved.cityId,
        });
    },

    switchToHub: () => {
        updateBrowserUrlCityParam('hub');
        set({ portalMode: 'hub' });
    },

    switchToCity: (citySlug: string) => {
        const normalized = citySlug.trim().toLowerCase();
        const found = get().cities.find((c) => c.slug.toLowerCase() === normalized || c.id.toLowerCase() === normalized);
        const targetId = found ? found.id : 'heliopolis';
        updateBrowserUrlCityParam(targetId);
        set({
            portalMode: 'city',
            activeCityId: targetId,
        });
    },

    setAdminCityScope: (scope: 'all' | string) => {
        set({ adminCityScope: scope });
    },

    addCity: (city: CityPortalConfig) => {
        set((state) => {
            if (state.cities.some((c) => c.id === city.id || c.slug === city.slug)) {
                return state;
            }
            return {
                cities: [...state.cities, city],
            };
        });
    },

    updateCity: (cityId: string, updates: Partial<CityPortalConfig>) => {
        set((state) => ({
            cities: state.cities.map((c) => (c.id === cityId ? { ...c, ...updates } : c)),
        }));
    },

    toggleCityActive: (cityId: string) => {
        set((state) => ({
            cities: state.cities.map((c) => (c.id === cityId ? { ...c, isActive: !c.isActive } : c)),
        }));
    },

    getActiveCity: () => {
        const state = get();
        return state.cities.find((c) => c.id === state.activeCityId) || state.cities[0];
    },
}));

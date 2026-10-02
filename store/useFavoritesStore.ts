import { create } from 'zustand';
import { FavoriteItem } from '../types';
import { fetchFavoritesFromDb, addFavoriteToDb, removeFavoriteFromDb } from '../services/favorites';
import { supabase } from '../lib/supabase';

const GUEST_STORAGE_KEY = 'onlyhelio-guest-favorites';

const getGuestFavorites = (): FavoriteItem[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(GUEST_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const setGuestFavorites = (favs: FavoriteItem[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(favs));
    } catch (e) {
        console.warn('Failed to save guest favorites to localStorage:', e);
    }
};

interface FavoritesState {
    favorites: FavoriteItem[];
    isLoading: boolean;
    isAuthenticated: boolean;
    
    // Actions
    toggleFavorite: (id: string, type: 'property' | 'service' | 'portfolio') => Promise<void>;
    isFavorite: (id: string, type: 'property' | 'service' | 'portfolio') => boolean;
    syncWithCloud: (userId?: string) => Promise<void>;
    clearAuthenticatedFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
    // Initialize with guest favorites if unauthenticated
    favorites: getGuestFavorites(),
    isLoading: false,
    isAuthenticated: false,

    toggleFavorite: async (id, type) => {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        const currentFavorites = get().favorites;
        const exists = currentFavorites.some(f => f.id === id && f.type === type);

        if (userId) {
            // AUTHENTICATED USER: Supabase is the canonical source of truth
            // 1. Optimistic UI update
            const nextFavorites = exists 
                ? currentFavorites.filter(f => !(f.id === id && f.type === type))
                : [...currentFavorites, { id, type }];
            
            set({ favorites: nextFavorites, isAuthenticated: true });

            // 2. Persist to Supabase cloud
            const success = exists 
                ? await removeFavoriteFromDb(userId, id, type)
                : await addFavoriteToDb(userId, id, type);

            // 3. Rollback on failure
            if (!success) {
                set({ favorites: currentFavorites });
                console.error(`Failed to update favorite [${type}:${id}] in Supabase. Rolled back.`);
                throw new Error('Failed to update favorite in cloud database.');
            }
        } else {
            // GUEST USER: Temporary localStorage only
            const nextFavorites = exists
                ? currentFavorites.filter(f => !(f.id === id && f.type === type))
                : [...currentFavorites, { id, type }];
            
            setGuestFavorites(nextFavorites);
            set({ favorites: nextFavorites, isAuthenticated: false });
        }
    },

    isFavorite: (id, type) => {
        const state = get();
        return state.favorites.some(fav => fav.id === id && fav.type === type);
    },

    syncWithCloud: async (explicitUserId?: string) => {
        try {
            let userId = explicitUserId;
            if (!userId) {
                const { data: { session } } = await supabase.auth.getSession();
                userId = session?.user?.id;
            }

            if (!userId) {
                // Anonymous guest: load guest favorites
                set({ 
                    favorites: getGuestFavorites(), 
                    isAuthenticated: false, 
                    isLoading: false 
                });
                return;
            }

            set({ isLoading: true });
            
            // Supabase is CANONICAL: fetch cloud state
            const cloudFavorites = await fetchFavoritesFromDb(userId);

            // Directly REPLACE authenticated favorites with cloud state
            // (NO localStorage merge, NO auto-upload of stale local items)
            set({
                favorites: cloudFavorites,
                isAuthenticated: true,
                isLoading: false
            });
        } catch (err) {
            console.error('Error during cloud favorites sync:', err);
            set({ isLoading: false });
        }
    },

    clearAuthenticatedFavorites: () => {
        // Clear authenticated state on logout and revert cleanly to guest store
        set({
            favorites: getGuestFavorites(),
            isAuthenticated: false,
            isLoading: false
        });
    }
}));

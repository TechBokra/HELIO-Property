import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FavoriteItem } from '../types';
import { fetchFavoritesFromDb, addFavoriteToDb, removeFavoriteFromDb } from '../services/favorites';
import { supabase } from '../lib/supabase';

interface FavoritesState {
    favorites: FavoriteItem[];
    isLoading: boolean;
    
    // Actions
    toggleFavorite: (id: string, type: 'property' | 'service' | 'portfolio') => Promise<void>;
    isFavorite: (id: string, type: 'property' | 'service' | 'portfolio') => boolean;
    syncWithCloud: (userId?: string) => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            favorites: [],
            isLoading: false,

            toggleFavorite: async (id, type) => {
                const current = get().favorites;
                const existingIndex = current.findIndex(fav => fav.id === id && fav.type === type);
                const isCurrentlyFavorite = existingIndex > -1;

                // Optimistic local state update
                if (isCurrentlyFavorite) {
                    set({ favorites: current.filter((_, index) => index !== existingIndex) });
                } else {
                    set({ favorites: [...current, { id, type }] });
                }

                // Cloud persistence if user is authenticated
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const userId = session?.user?.id;
                    if (userId) {
                        if (isCurrentlyFavorite) {
                            await removeFavoriteFromDb(userId, id, type);
                        } else {
                            await addFavoriteToDb(userId, id, type);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to sync favorite with cloud:', e);
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

                    if (!userId) return;

                    set({ isLoading: true });
                    const cloudFavorites = await fetchFavoritesFromDb(userId);

                    if (cloudFavorites && cloudFavorites.length > 0) {
                        // Merge cloud favorites with any existing local favorites
                        const currentLocal = get().favorites;
                        const mergedMap = new Map<string, FavoriteItem>();
                        
                        // Add local first
                        currentLocal.forEach(item => mergedMap.set(`${item.id}_${item.type}`, item));
                        // Overwrite/add cloud
                        cloudFavorites.forEach(item => mergedMap.set(`${item.id}_${item.type}`, item));

                        set({ favorites: Array.from(mergedMap.values()), isLoading: false });
                    } else {
                        // If no cloud favorites but local ones exist, sync local ones up to cloud
                        const localOnly = get().favorites;
                        if (localOnly.length > 0 && userId) {
                            for (const item of localOnly) {
                                await addFavoriteToDb(userId, item.id, item.type);
                            }
                        }
                        set({ isLoading: false });
                    }
                } catch (err) {
                    console.warn('Error during cloud favorites sync:', err);
                    set({ isLoading: false });
                }
            }
        }),
        {
            name: 'onlyhelio-favorites-v2',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

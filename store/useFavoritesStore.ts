import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FavoriteItem } from '../types';

interface FavoritesState {
    favorites: FavoriteItem[];
    
    // Actions
    toggleFavorite: (id: string, type: 'property' | 'service' | 'portfolio') => void;
    isFavorite: (id: string, type: 'property' | 'service' | 'portfolio') => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            favorites: [],

            toggleFavorite: (id, type) => {
                set((state) => {
                    const existingIndex = state.favorites.findIndex(fav => fav.id === id && fav.type === type);
                    if (existingIndex > -1) {
                        return { favorites: state.favorites.filter((_, index) => index !== existingIndex) };
                    } else {
                        return { favorites: [...state.favorites, { id, type }] };
                    }
                });
            },

            isFavorite: (id, type) => {
                const state = get();
                return state.favorites.some(fav => fav.id === id && fav.type === type);
            }
        }),
        {
            name: 'onlyhelio-favorites-v2',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

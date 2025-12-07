import React, { ReactNode } from 'react';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { FavoriteItem } from '../../types';

// -----------------------------------------------------------------------------
// MIGRATION NOTE:
// Migrated to Zustand (store/useFavoritesStore.ts).
// This file acts as an adapter for existing components.
// -----------------------------------------------------------------------------

interface FavoritesContextType {
    favorites: FavoriteItem[];
    isFavorite: (id: string, type: 'property' | 'service' | 'portfolio') => boolean;
    toggleFavorite: (id: string, type: 'property' | 'service' | 'portfolio') => void;
}

export const FavoritesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    return <>{children}</>;
};

export const useFavorites = (): FavoritesContextType => {
    const store = useFavoritesStore();
    
    return {
        favorites: store.favorites,
        isFavorite: store.isFavorite,
        toggleFavorite: store.toggleFavorite
    };
};

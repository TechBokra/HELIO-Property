
import { useQuery } from '@tanstack/react-query';
import { getDecorationCategories } from '../services/decorations';

export const useDecorationCategories = () => {
    return useQuery({
        queryKey: ['decorationCategories'],
        queryFn: getDecorationCategories,
        staleTime: Infinity, // This data is fairly static
    });
};
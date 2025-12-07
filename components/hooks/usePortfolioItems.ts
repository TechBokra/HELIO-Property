import { useQuery } from '@tanstack/react-query';
import { getAllPortfolioItems } from '../../services/portfolio';

export const usePortfolioItems = () => {
    return useQuery({
        queryKey: ['allPortfolioItems'],
        queryFn: getAllPortfolioItems,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
};

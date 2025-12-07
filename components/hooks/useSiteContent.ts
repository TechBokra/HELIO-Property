import { useQuery } from '@tanstack/react-query';
import { getContent } from '../../services/content';

export const useSiteContent = () => {
    return useQuery({
        queryKey: ['siteContent'],
        queryFn: getContent,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
};

import { useQuery } from '@tanstack/react-query';
import { getAllPartnersForAdmin } from '../../services/partners';

export const usePartners = () => {
    return useQuery({
        queryKey: ['allPartnersAdmin'],
        queryFn: getAllPartnersForAdmin,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
};

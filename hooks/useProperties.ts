
import { useQuery } from '@tanstack/react-query';
import { getAllProperties } from '../services/properties';

export const useProperties = () => {
    return useQuery({
        queryKey: ['allProperties'],
        queryFn: getAllProperties,
        staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    });
};
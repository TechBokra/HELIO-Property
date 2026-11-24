import { useQuery } from '@tanstack/react-query';
import { getProperties } from '../services/properties';
import { useCityStore } from '../store/useCityStore';

export const useProperties = (cityOverride?: string) => {
    const activeCityId = useCityStore((s) => s.activeCityId);
    const targetCity = cityOverride ?? activeCityId;
    return useQuery({
        queryKey: ['properties', targetCity],
        queryFn: () => getProperties(targetCity),
        staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    });
};
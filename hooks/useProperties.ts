import { useQuery } from '@tanstack/react-query';
import { getProperties } from '../services/properties';
import { useCityStore } from '../store/useCityStore';
import { getEffectivePropertySource, propertyQueryKeys } from '../utils/propertyQueryKeys';

export const useProperties = (cityOverride?: string) => {
    const activeCityId = useCityStore((s) => s.activeCityId);
    const targetCity = cityOverride ?? activeCityId;
    const source = getEffectivePropertySource();
    return useQuery({
        queryKey: propertyQueryKeys.publicList(targetCity, source),
        queryFn: () => getProperties(targetCity),
        staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    });
};
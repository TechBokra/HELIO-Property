import { useMemo, useCallback } from 'react';
import type { PartnerType, SubscriptionPlan, Property, Project, PortfolioItem } from '../types';
import { useAuth } from '../components/auth/AuthContext';
import { getPlanLimit } from '../utils/subscriptionUtils';
import { useQuery } from '@tanstack/react-query';
// FIX: Corrected import paths for services from the non-existent `api` directory to `services`.
import { getAllProperties } from '../services/properties';
import { getAllProjects } from '../services/projects';
import { getAllPortfolioItems } from '../services/portfolio';

type UsageType = 'properties' | 'projects' | 'units' | 'portfolio';

export const useSubscriptionUsage = (usageType: UsageType) => {
    const { currentUser } = useAuth();
    
    const { 
        data: allProperties, 
        isLoading: isLoadingProperties, 
        isError: isErrorProperties,
        refetch: refetchProperties 
    } = useQuery({ queryKey: ['allProperties'], queryFn: getAllProperties, enabled: !!currentUser });

    const { 
        data: allProjects, 
        isLoading: isLoadingProjects, 
        isError: isErrorProjects,
        refetch: refetchProjects 
    } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects, enabled: !!currentUser });

    const { 
        data: allPortfolioItems, 
        isLoading: isLoadingPortfolio, 
        isError: isErrorPortfolio,
        refetch: refetchPortfolio 
    } = useQuery({ queryKey: ['allPortfolioItems'], queryFn: getAllPortfolioItems, enabled: !!currentUser });

    const isLoading = isLoadingProperties || isLoadingProjects || isLoadingPortfolio;
    const isError = isErrorProperties || isErrorProjects || isErrorPortfolio;

    const refetchAll = useCallback(() => {
        refetchProperties();
        refetchProjects();
        refetchPortfolio();
    }, [refetchProperties, refetchProjects, refetchPortfolio]);

    const data = useMemo(() => {
        if (!currentUser || isLoading) return [];
        switch (usageType) {
            case 'properties':
            case 'units': // units are properties for a developer
                // FIX: Explicitly type the parameter in the filter callback to resolve type inference issues.
                return (allProperties || []).filter((p: Property) => p.partnerId === currentUser.id);
            case 'projects':
                // FIX: Explicitly type the parameter in the filter callback to resolve type inference issues.
                return (allProjects || []).filter((p: Project) => p.partnerId === currentUser.id);
            case 'portfolio':
                // FIX: Explicitly type the parameter in the filter callback to resolve type inference issues.
                return (allPortfolioItems || []).filter((p: PortfolioItem) => p.partnerId === currentUser.id);
            default:
                return [];
        }
    }, [allProperties, allProjects, allPortfolioItems, currentUser, usageType, isLoading]);

    const usageCount = useMemo(() => data.length, [data]);

    const limit = useMemo(() => {
        if (!currentUser || !('type' in currentUser)) return Infinity;
        return getPlanLimit(currentUser.type, currentUser.subscriptionPlan, usageType);
    }, [currentUser, usageType]);

    const isLimitReached = useMemo(() => {
        if (limit === Infinity) return false;
        return usageCount >= limit;
    }, [usageCount, limit]);

    return {
        data: data as (Property[] | Project[] | PortfolioItem[]),
        isLoading,
        isError,
        usageCount,
        limit,
        isLimitReached,
        refetch: refetchAll,
    };
};
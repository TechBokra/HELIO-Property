import type { QueryClient } from '@tanstack/react-query';
import { invalidatePropertiesCache } from '../services/properties';
import { propertyQueryKeys } from './propertyQueryKeys';

export interface PropertyInvalidationContext {
    propertyId?: string;
    projectId?: string;
    previousProjectId?: string;
    partnerId?: string;
    previousPartnerId?: string;
}

export const invalidateAllPropertyQueries = (
    queryClient: QueryClient,
    context?: PropertyInvalidationContext
) => {
    // Always clear the service-layer memory cache & bump generation first so refetches read fresh DB data.
    invalidatePropertiesCache();

    queryClient.invalidateQueries({ queryKey: propertyQueryKeys.publicLists() });
    queryClient.invalidateQueries({ queryKey: propertyQueryKeys.publicPaginatedRoot() });
    queryClient.invalidateQueries({ queryKey: propertyQueryKeys.operationalAllRoot() });

    if (context?.propertyId) {
        queryClient.invalidateQueries({
            queryKey: propertyQueryKeys.detailRoot(),
            predicate: (query) => query.queryKey[query.queryKey.length - 1] === context.propertyId,
        });
    } else {
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.detailRoot() });
    }

    const projectIds = Array.from(
        new Set([context?.projectId, context?.previousProjectId].filter((id): id is string => Boolean(id)))
    );
    if (projectIds.length > 0) {
        queryClient.invalidateQueries({
            queryKey: propertyQueryKeys.projectPublicRoot(),
            predicate: (query) => projectIds.includes(String(query.queryKey[query.queryKey.length - 1] || '')),
        });
    } else {
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.projectPublicRoot() });
    }

    const partnerIds = Array.from(
        new Set([context?.partnerId, context?.previousPartnerId].filter((id): id is string => Boolean(id)))
    );
    if (partnerIds.length > 0) {
        queryClient.invalidateQueries({
            queryKey: propertyQueryKeys.partnerPublicRoot(),
            predicate: (query) => partnerIds.includes(String(query.queryKey[query.queryKey.length - 1] || '')),
        });
        queryClient.invalidateQueries({
            queryKey: propertyQueryKeys.partnerAllRoot(),
            predicate: (query) => partnerIds.includes(String(query.queryKey[query.queryKey.length - 1] || '')),
        });
    } else {
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.partnerPublicRoot() });
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.partnerAllRoot() });
    }
};

export const invalidateAllProjectQueries = (
    queryClient: QueryClient,
    projectId?: string
) => {
    queryClient.invalidateQueries({ queryKey: ['allProjects'] });
    queryClient.invalidateQueries({ queryKey: ['publicProjects'] });
    queryClient.invalidateQueries({ queryKey: ['project'] });
    queryClient.invalidateQueries({ queryKey: ['publicProject'] });
    if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        queryClient.invalidateQueries({ queryKey: [`project-${projectId}`] });
        queryClient.invalidateQueries({ queryKey: ['publicProject', projectId] });
    }
};

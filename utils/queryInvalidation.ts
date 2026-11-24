import type { QueryClient } from '@tanstack/react-query';

export const invalidateAllPropertyQueries = (
    queryClient: QueryClient,
    context?: { propertyId?: string; projectId?: string; partnerId?: string }
) => {
    queryClient.invalidateQueries({ queryKey: ['allProperties'] });
    queryClient.invalidateQueries({ queryKey: ['allPropertiesAdmin'] });
    queryClient.invalidateQueries({ queryKey: ['allPropertiesAnalytics'] });
    queryClient.invalidateQueries({ queryKey: ['properties'] });
    queryClient.invalidateQueries({ queryKey: ['all-dashboard-properties'] });
    queryClient.invalidateQueries({ queryKey: ['partnerProperties'] });
    queryClient.invalidateQueries({ queryKey: ['project-properties'] });
    queryClient.invalidateQueries({ queryKey: ['property'] });

    if (context?.propertyId) {
        queryClient.invalidateQueries({ queryKey: ['property', context.propertyId] });
        queryClient.invalidateQueries({ queryKey: [`property-${context.propertyId}`] });
    }
    if (context?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['project-properties', context.projectId] });
        queryClient.invalidateQueries({ queryKey: [`project-properties-${context.projectId}`] });
    }
    if (context?.partnerId) {
        queryClient.invalidateQueries({ queryKey: ['partnerProperties', context.partnerId] });
        queryClient.invalidateQueries({ queryKey: [`partnerProperties-${context.partnerId}`] });
        queryClient.invalidateQueries({ queryKey: [`partner-properties-${context.partnerId}`] });
    }
};

export const invalidateAllProjectQueries = (
    queryClient: QueryClient,
    projectId?: string
) => {
    queryClient.invalidateQueries({ queryKey: ['allProjects'] });
    queryClient.invalidateQueries({ queryKey: ['project'] });
    queryClient.invalidateQueries({ queryKey: ['project-properties'] });
    if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        queryClient.invalidateQueries({ queryKey: [`project-${projectId}`] });
        queryClient.invalidateQueries({ queryKey: ['project-properties', projectId] });
        queryClient.invalidateQueries({ queryKey: [`project-properties-${projectId}`] });
    }
};

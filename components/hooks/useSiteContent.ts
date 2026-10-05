import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getContent } from '../../services/content';
import { siteContentData as fallbackData } from '../../data/content';

export const useSiteContent = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
        const handleContentUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                queryClient.setQueryData(['siteContent'], customEvent.detail);
            }
        };

        window.addEventListener('onlyhelio_content_updated', handleContentUpdate);
        return () => {
            window.removeEventListener('onlyhelio_content_updated', handleContentUpdate);
        };
    }, [queryClient]);

    return useQuery({
        queryKey: ['siteContent'],
        queryFn: getContent,
        placeholderData: fallbackData,
        staleTime: 1000 * 60 * 5, // 5 minutes cache; instant sync via custom event on mutation
    });
};

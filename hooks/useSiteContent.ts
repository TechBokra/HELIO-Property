import React, { createContext, useContext, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getContent,
    SITE_CONTENT_CHANNEL,
    SITE_CONTENT_UPDATED_EVENT,
} from '../services/content';
import { siteContentData as fallbackData } from '../data/content';
import type { SiteContent } from '../types';

const SiteContentOverrideContext = createContext<SiteContent | null>(null);

export const SiteContentOverrideProvider: React.FC<{
    value: SiteContent;
    children: React.ReactNode;
}> = ({ value, children }) => {
    return React.createElement(SiteContentOverrideContext.Provider, { value }, children);
};

export const useIsSiteContentPreview = (): boolean => {
    return useContext(SiteContentOverrideContext) !== null;
};

export const useSiteContent = () => {
    const queryClient = useQueryClient();
    const previewOverride = useContext(SiteContentOverrideContext);

    useEffect(() => {
        if (previewOverride) return;

        const handleContentUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                queryClient.setQueryData(['siteContent'], customEvent.detail);
            }
        };

        window.addEventListener(SITE_CONTENT_UPDATED_EVENT, handleContentUpdate);

        let channel: BroadcastChannel | null = null;
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                channel = new BroadcastChannel(SITE_CONTENT_CHANNEL);
                channel.onmessage = (event) => {
                    if (event.data) {
                        queryClient.setQueryData(['siteContent'], event.data);
                    }
                };
            }
        } catch {
            channel = null;
        }

        return () => {
            window.removeEventListener(SITE_CONTENT_UPDATED_EVENT, handleContentUpdate);
            if (channel) {
                try {
                    channel.close();
                } catch {
                    // Ignore close errors
                }
            }
        };
    }, [queryClient, previewOverride]);

    const queryResult = useQuery({
        queryKey: ['siteContent'],
        queryFn: () => getContent(),
        placeholderData: fallbackData,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes; instant sync via confirmed-save events
        enabled: !previewOverride,
    });

    if (previewOverride) {
        return {
            ...queryResult,
            data: previewOverride,
            isLoading: false,
            isError: false,
        };
    }

    return queryResult;
};
import { supabase } from '../lib/supabase';

export type AnalyticsEventType = 
    | 'property_view' 
    | 'whatsapp_click' 
    | 'call_click' 
    | 'inquiry_submit' 
    | 'search_performed' 
    | 'filter_applied';

export interface AnalyticsEvent {
    id?: string;
    eventType: AnalyticsEventType;
    propertyId?: string;
    partnerId?: string;
    metadata?: Record<string, any>;
    createdAt?: string;
}

const LOCAL_STORAGE_KEY = 'onlyhelio_analytics_events';

// In-memory queue with local persistence fallback
export const getLocalEvents = (): AnalyticsEvent[] => {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveLocalEvent = (event: AnalyticsEvent) => {
    try {
        const existing = getLocalEvents();
        existing.push(event);
        // keep last 500 events
        const trimmed = existing.slice(-500);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.error('Error saving local analytics event:', e);
    }
};

export const trackEvent = async (
    eventType: AnalyticsEventType, 
    data: { propertyId?: string; partnerId?: string; metadata?: Record<string, any> } = {}
) => {
    const event: AnalyticsEvent = {
        eventType,
        propertyId: data.propertyId,
        partnerId: data.partnerId,
        metadata: {
            ...data.metadata,
            url: typeof window !== 'undefined' ? window.location.pathname : '',
            referrer: typeof document !== 'undefined' ? document.referrer : '',
            timestamp: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
    };

    // Save locally first for instant metrics
    saveLocalEvent(event);

    // Persist to Supabase if available
    try {
        await supabase.from('analytics_events').insert({
            event_type: event.eventType,
            property_id: event.propertyId,
            partner_id: event.partnerId,
            metadata: event.metadata,
            created_at: event.createdAt,
        });
    } catch {
        // Fallback silently if table or network is unavailable
    }
};

export const trackPropertyView = (propertyId: string, partnerId?: string) => {
    trackEvent('property_view', { propertyId, partnerId });
};

export const trackWhatsAppClick = (propertyId: string, partnerId?: string) => {
    trackEvent('whatsapp_click', { propertyId, partnerId });
};

export const trackCallClick = (propertyId: string, partnerId?: string) => {
    trackEvent('call_click', { propertyId, partnerId });
};

export const trackInquirySubmit = (propertyId: string, partnerId?: string) => {
    trackEvent('inquiry_submit', { propertyId, partnerId });
};

export interface CommercialKPIs {
    totalListings: number;
    activeListings: number;
    newLeadsCount: number;
    contactedRate: number;
    viewingRate: number;
    conversionRate: number;
    whatsAppClicks: number;
    callClicks: number;
    propertyViews: number;
    activePartnersCount: number;
}

export const getCommercialKPIs = (
    properties: any[] = [], 
    leads: any[] = [], 
    partners: any[] = []
): CommercialKPIs => {
    const events = getLocalEvents();
    const whatsAppClicks = events.filter(e => e.eventType === 'whatsapp_click').length;
    const callClicks = events.filter(e => e.eventType === 'call_click').length;
    const propertyViews = events.filter(e => e.eventType === 'property_view').length;

    const totalListings = properties.length;
    const activeListings = properties.filter(p => p.listingStatus === 'active').length;
    const newLeadsCount = leads.length;

    const contactedLeads = leads.filter(l => l.status === 'contacted' || l.status === 'site-visit' || l.status === 'quoted' || l.status === 'completed');
    const viewingLeads = leads.filter(l => l.status === 'site-visit' || l.status === 'completed');
    const wonLeads = leads.filter(l => l.status === 'completed' || (l as any).leadQuality === 'won');

    const contactedRate = newLeadsCount > 0 ? Math.round((contactedLeads.length / newLeadsCount) * 100) : 0;
    const viewingRate = newLeadsCount > 0 ? Math.round((viewingLeads.length / newLeadsCount) * 100) : 0;
    const conversionRate = newLeadsCount > 0 ? Math.round((wonLeads.length / newLeadsCount) * 100) : 0;

    const activePartnersCount = partners.filter(p => p.status === 'active' || p.status === 'approved').length;

    return {
        totalListings,
        activeListings,
        newLeadsCount,
        contactedRate,
        viewingRate,
        conversionRate,
        whatsAppClicks,
        callClicks,
        propertyViews,
        activePartnersCount,
    };
};

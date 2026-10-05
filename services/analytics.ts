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

const getSessionId = (): string => {
    try {
        let sid = sessionStorage.getItem('onlyhelio_session_id');
        if (!sid) {
            sid = 'sid_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
            sessionStorage.setItem('onlyhelio_session_id', sid);
        }
        return sid;
    } catch {
        return 'anonymous_session';
    }
};

export const trackEvent = async (
    eventType: AnalyticsEventType, 
    data: { propertyId?: string; partnerId?: string; metadata?: Record<string, any> } = {}
) => {
    const sessionId = getSessionId();
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

    // Client-side instant buffer (non-authoritative)
    saveLocalEvent(event);

    // Primary: Persist to Supabase analytics_events table
    try {
        const { error } = await supabase.from('analytics_events').insert({
            event_type: event.eventType,
            property_id: event.propertyId || null,
            partner_id: event.partnerId || null,
            session_id: sessionId,
            metadata: event.metadata,
            created_at: event.createdAt,
        });

        if (error) {
            console.warn('Analytics event Supabase insert warning:', error.message);
        }
    } catch (err: any) {
        console.warn('Analytics event insert failed (non-blocking):', err?.message);
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

export interface AnalyticsCounts {
    whatsAppClicks: number;
    callClicks: number;
    propertyViews: number;
    inquirySubmits: number;
}

export const getAnalyticsEventCounts = async (): Promise<AnalyticsCounts> => {
    try {
        const { data, error } = await supabase
            .from('analytics_events')
            .select('event_type');

        if (!error && Array.isArray(data)) {
            return {
                whatsAppClicks: data.filter(e => e.event_type === 'whatsapp_click').length,
                callClicks: data.filter(e => e.event_type === 'call_click').length,
                propertyViews: data.filter(e => e.event_type === 'property_view').length,
                inquirySubmits: data.filter(e => e.event_type === 'inquiry_submit' || e.event_type === 'property_inquiry').length
            };
        }
    } catch (err) {
        console.warn('Failed to query analytics_events table:', err);
    }

    // Graceful fallback to client events buffer
    const local = getLocalEvents();
    return {
        whatsAppClicks: local.filter(e => e.eventType === 'whatsapp_click').length,
        callClicks: local.filter(e => e.eventType === 'call_click').length,
        propertyViews: local.filter(e => e.eventType === 'property_view').length,
        inquirySubmits: local.filter(e => e.eventType === 'inquiry_submit').length
    };
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
    partners: any[] = [],
    serverCounts?: AnalyticsCounts
): CommercialKPIs => {
    const localEvents = getLocalEvents();
    
    // Server counts are authoritative if provided
    const whatsAppClicks = serverCounts 
        ? serverCounts.whatsAppClicks 
        : localEvents.filter(e => e.eventType === 'whatsapp_click').length;
        
    const callClicks = serverCounts 
        ? serverCounts.callClicks 
        : localEvents.filter(e => e.eventType === 'call_click').length;
        
    const propertyViews = serverCounts 
        ? serverCounts.propertyViews 
        : localEvents.filter(e => e.eventType === 'property_view').length;

    const totalListings = properties.length;
    const activeListings = properties.filter(p => p.listingStatus === 'active' || p.status?.en === 'For Sale' || p.status?.en === 'For Rent').length;
    const newLeadsCount = leads.length;

    const contactedLeads = leads.filter(l => l.status === 'contacted' || l.status === 'site-visit' || l.status === 'quoted' || l.status === 'completed' || l.status === 'in-progress');
    const viewingLeads = leads.filter(l => l.status === 'site-visit' || l.status === 'completed');
    const wonLeads = leads.filter(l => l.status === 'completed' || l.status === 'closed' || (l as any).leadQuality === 'won');

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

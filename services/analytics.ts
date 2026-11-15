import { supabase } from '../lib/supabase';
import { Permission } from '../types';
import { requireAnyPermission } from './authGuard';

export type AnalyticsEventType =
    | 'property_view'
    | 'whatsapp_click'
    | 'call_click'
    | 'inquiry_submit'
    | 'property_inquiry'
    | 'search_performed'
    | 'filter_applied'
    | 'finishing_service_view'
    | 'finishing_request'
    | 'share_click';

export interface AnalyticsEvent {
    id?: string;
    eventType: AnalyticsEventType;
    propertyId?: string;
    partnerId?: string;
    metadata?: Record<string, any>;
    createdAt?: string;
}

const ALLOWED_ANALYTICS_EVENTS: ReadonlySet<AnalyticsEventType> = new Set([
    'property_view',
    'whatsapp_click',
    'call_click',
    'inquiry_submit',
    'property_inquiry',
    'search_performed',
    'filter_applied',
    'finishing_service_view',
    'finishing_request',
    'share_click',
]);

const getSessionId = (): string => {
    try {
        let sid = sessionStorage.getItem('onlyhelio_session_id');
        if (!sid) {
            const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
                : Math.random().toString(36).substring(2, 12);
            sid = `sid_${randomPart}_${Date.now()}`;
            sessionStorage.setItem('onlyhelio_session_id', sid);
        }
        return sid;
    } catch {
        return 'anonymous_session';
    }
};

export const trackEvent = async (
    eventType: AnalyticsEventType,
    data: { propertyId?: string; partnerId?: string; metadata?: Record<string, any> } = {},
    options: { client?: any } = {}
) => {
    if (!ALLOWED_ANALYTICS_EVENTS.has(eventType)) {
        return;
    }

    const dbClient = options.client || supabase;
    const sessionId = getSessionId();
    const createdAt = new Date().toISOString();
    const metadata = {
        ...data.metadata,
        url: typeof window !== 'undefined' ? window.location.pathname : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        timestamp: createdAt,
    };

    try {
        const { error } = await dbClient.from('analytics_events').insert({
            event_type: eventType,
            property_id: data.propertyId || null,
            partner_id: data.partnerId || null,
            session_id: sessionId,
            metadata,
            created_at: createdAt,
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

export const getAnalyticsEventCounts = async (
    options: { client?: any } = {}
): Promise<AnalyticsCounts> => {
    requireAnyPermission([Permission.VIEW_ANALYTICS, Permission.VIEW_ADMIN_DASHBOARD]);

    const dbClient = options.client || supabase;
    const { data, error } = await dbClient
        .from('analytics_events')
        .select('event_type');

    if (error) {
        console.error('Failed to query analytics_events table:', error.message);
        throw new Error(`Failed to load analytics counts: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    return {
        whatsAppClicks: rows.filter((e: any) => e.event_type === 'whatsapp_click').length,
        callClicks: rows.filter((e: any) => e.event_type === 'call_click').length,
        propertyViews: rows.filter((e: any) => e.event_type === 'property_view').length,
        inquirySubmits: rows.filter((e: any) => e.event_type === 'inquiry_submit' || e.event_type === 'property_inquiry').length
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
    // Strictly use authoritative server counts (zero localStorage fallback)
    const whatsAppClicks = serverCounts?.whatsAppClicks ?? 0;
    const callClicks = serverCounts?.callClicks ?? 0;
    const propertyViews = serverCounts?.propertyViews ?? 0;

    const totalListings = properties.length;
    const activeListings = properties.filter(p => p.listingStatus === 'active' || p.status?.en === 'For Sale' || p.status?.en === 'For Rent').length;
    const newLeadsCount = leads.length;

    const contactedLeads = leads.filter(l => ['contacted', 'site-visit', 'quoted', 'completed', 'in-progress'].includes(l.status));
    const viewingLeads = leads.filter(l => ['site-visit', 'completed'].includes(l.status));
    const wonLeads = leads.filter(l => ['completed', 'closed'].includes(l.status) || (l as any).leadQuality === 'won');

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

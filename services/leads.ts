import { supabase } from '../lib/supabase';
import type { Lead, LeadMessage } from '../types';
import { addNotification } from './notifications';
import { getAttribution } from '../utils/attribution';

const LOCAL_STORAGE_LEADS_KEY = 'onlyhelio_persisted_leads';

// Memory cache for non-browser environments (tests, SSR)
let memoryLeads: Lead[] = [];

export const getLocalLeads = (): Lead[] => {
    if (typeof window === 'undefined') return memoryLeads;
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_LEADS_KEY);
        return raw ? JSON.parse(raw) : memoryLeads;
    } catch {
        return memoryLeads;
    }
};

const saveLocalLead = (lead: Lead) => {
    if (typeof window === 'undefined') {
        const idx = memoryLeads.findIndex(l => l.id === lead.id);
        if (idx >= 0) memoryLeads[idx] = lead;
        else memoryLeads.unshift(lead);
        return;
    }
    try {
        const existing = getLocalLeads();
        const index = existing.findIndex(l => l.id === lead.id);
        if (index >= 0) {
            existing[index] = lead;
        } else {
            existing.unshift(lead);
        }
        localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(existing.slice(0, 500)));
    } catch (e) {
        console.error('Error saving local lead:', e);
    }
};

const mapLeadFromDb = (row: any, messages: any[] = []): Lead => {
    const payload = row.payload || {};
    return {
        id: row.id,
        // The listing partner who owns the property or lead
        partnerId: payload.partnerId || row.assigned_to,
        managerId: payload.managerId,
        propertyId: payload.propertyId,
        serviceType: payload.serviceType || 'general',
        customerName: row.requester_name || payload.customerName || 'Anonymous',
        customerPhone: row.requester_phone || payload.customerPhone || '',
        contactTime: payload.contactTime,
        serviceTitle: payload.serviceTitle || 'Inquiry',
        customerNotes: payload.customerNotes,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        assignedTo: row.assigned_to,
        messages: messages.map(msg => ({
            id: msg.id,
            sender: msg.sender,
            senderId: msg.sender_id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.created_at
        })),
        // Extra payload fields
        referenceImage: payload.referenceImage,
        itemCategory: payload.itemCategory,
        dimensions: payload.dimensions,
        // Lead Marketing & Conversion Attribution
        source: payload.source || 'inquiry_form',
        utmSource: payload.utmSource || payload.utm_source,
        utmCampaign: payload.utmCampaign || payload.utm_campaign,
        utmMedium: payload.utmMedium || payload.utm_medium,
        utmTerm: payload.utmTerm || payload.utm_term,
        utmContent: payload.utmContent || payload.utm_content,
        referrer: payload.referrer || payload.referral,
        landingPage: payload.landingPage || payload.landing_page,
        pageOrigin: payload.pageOrigin || payload.page_origin,
        leadQuality: payload.leadQuality || (row.status === 'completed' ? 'won' : row.status === 'site-visit' ? 'viewing' : row.status === 'contacted' ? 'contacted' : 'new'),
    };
};

export const getAllLeads = async (): Promise<Lead[]> => {
    let cloudLeads: Lead[] = [];
    try {
        const { data: leadsData, error } = await supabase
            .from('requests')
            .select('*')
            .eq('type', 'LEAD')
            .order('created_at', { ascending: false });

        if (!error && leadsData) {
            const leadIds = leadsData.map(l => l.id);
            let messagesData: any[] = [];
            if (leadIds.length > 0) {
                const { data: msgs } = await supabase
                    .from('request_messages')
                    .select('*')
                    .in('request_id', leadIds)
                    .order('created_at', { ascending: true });
                messagesData = msgs || [];
            }

            cloudLeads = leadsData.map(lead => {
                const msgs = messagesData.filter(m => m.request_id === lead.id);
                return mapLeadFromDb(lead, msgs);
            });
        }
    } catch {
        // Fallback to local
    }

    const local = getLocalLeads();
    const mergedMap = new Map<string, Lead>();
    local.forEach(l => mergedMap.set(l.id, l));
    cloudLeads.forEach(l => mergedMap.set(l.id, l));

    return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

const isValidUUID = (id?: string): boolean => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export const getLeadsByPartnerId = async (partnerId: string): Promise<Lead[]> => {
    const isUuid = isValidUUID(partnerId);
    let partnerCloudLeads: Lead[] = [];

    try {
        let query = supabase.from('requests').select('*').eq('type', 'LEAD');
        if (isUuid) {
            query = query.or(`assigned_to.eq.${partnerId},payload->>partnerId.eq.${partnerId}`);
        } else {
            query = query.filter('payload->>partnerId', 'eq', partnerId);
        }

        const { data: leadsData, error } = await query.order('created_at', { ascending: false });
        if (!error && leadsData) {
            partnerCloudLeads = leadsData.map(lead => mapLeadFromDb(lead, []));
        }
    } catch {
        // Fallback to local
    }

    const localMatching = getLocalLeads().filter(
        l => l.partnerId === partnerId || l.assignedTo === partnerId
    );

    const mergedMap = new Map<string, Lead>();
    localMatching.forEach(l => mergedMap.set(l.id, l));
    partnerCloudLeads.forEach(l => mergedMap.set(l.id, l));

    return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

export const getLeadById = async (leadId: string): Promise<Lead | undefined> => {
    try {
        const { data: leadData, error } = await supabase
            .from('requests')
            .select('*')
            .eq('id', leadId)
            .single();

        if (!error && leadData) {
            const { data: messagesData } = await supabase
                .from('request_messages')
                .select('*')
                .eq('request_id', leadId)
                .order('created_at', { ascending: true });

            return mapLeadFromDb(leadData, messagesData || []);
        }
    } catch {
        // Fallback to local
    }

    return getLocalLeads().find(l => l.id === leadId);
};

export const addLead = async (leadData: Omit<Lead, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'messages'>): Promise<Lead> => {
    // Lead Routing Logic:
    // If a property-specific partnerId exists, route directly to that listing partner.
    // If assignedTo is explicitly set, honor it.
    // Otherwise fallback to managerId or general pool.
    const routedPartner = leadData.partnerId || leadData.assignedTo || leadData.managerId;
    const dbAssignedTo = isValidUUID(routedPartner) ? routedPartner : null;
    
    // Enrich with marketing attribution
    const currentAttribution = getAttribution({
        source: leadData.source,
        propertyId: leadData.propertyId,
        pageOrigin: leadData.pageOrigin,
    });

    const dbPayload = {
        type: 'LEAD',
        status: 'new',
        requester_name: leadData.customerName,
        requester_phone: leadData.customerPhone,
        assigned_to: dbAssignedTo,
        // Store structured flat and attribution data in the JSONB payload
        payload: {
            serviceType: leadData.serviceType || 'property',
            serviceTitle: leadData.serviceTitle,
            contactTime: leadData.contactTime,
            customerNotes: leadData.customerNotes,
            partnerId: leadData.partnerId,
            managerId: leadData.managerId,
            propertyId: leadData.propertyId,
            referenceImage: leadData.referenceImage,
            itemCategory: leadData.itemCategory,
            dimensions: leadData.dimensions,
            // Attribution Preserved in DB
            source: leadData.source || currentAttribution.source || 'inquiry_form',
            utmSource: leadData.utmSource || currentAttribution.utmSource,
            utmCampaign: leadData.utmCampaign || currentAttribution.utmCampaign,
            utmMedium: leadData.utmMedium || currentAttribution.utmMedium,
            utmTerm: leadData.utmTerm || currentAttribution.utmTerm,
            utmContent: leadData.utmContent || currentAttribution.utmContent,
            referrer: leadData.referrer || currentAttribution.referrer,
            landingPage: leadData.landingPage || currentAttribution.landingPage,
            pageOrigin: leadData.pageOrigin || currentAttribution.pageOrigin,
            leadQuality: leadData.leadQuality || 'new',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    let lead: Lead | null = null;

    try {
        const { data, error } = await supabase
            .from('requests')
            .insert(dbPayload)
            .select()
            .single();

        if (!error && data) {
            lead = mapLeadFromDb(data, []);
        }
    } catch {
        // Fallback
    }

    if (!lead) {
        lead = {
            id: 'lead-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            partnerId: leadData.partnerId || leadData.assignedTo || 'partner-1',
            managerId: leadData.managerId,
            propertyId: leadData.propertyId,
            serviceType: leadData.serviceType || 'property',
            customerName: leadData.customerName,
            customerPhone: leadData.customerPhone,
            contactTime: leadData.contactTime,
            serviceTitle: leadData.serviceTitle,
            customerNotes: leadData.customerNotes,
            status: 'new',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assignedTo: dbAssignedTo || leadData.partnerId,
            messages: [],
            referenceImage: leadData.referenceImage,
            itemCategory: leadData.itemCategory,
            dimensions: leadData.dimensions,
            source: leadData.source || currentAttribution.source || 'inquiry_form',
            utmSource: leadData.utmSource || currentAttribution.utmSource,
            utmCampaign: leadData.utmCampaign || currentAttribution.utmCampaign,
            utmMedium: leadData.utmMedium || currentAttribution.utmMedium,
            utmTerm: leadData.utmTerm || currentAttribution.utmTerm,
            utmContent: leadData.utmContent || currentAttribution.utmContent,
            referrer: leadData.referrer || currentAttribution.referrer,
            landingPage: leadData.landingPage || currentAttribution.landingPage,
            pageOrigin: leadData.pageOrigin || currentAttribution.pageOrigin,
            leadQuality: 'new',
        };
    }

    saveLocalLead(lead);

    // Notification (only if assigned partner is a valid DB partner UUID)
    if (dbAssignedTo) {
        try {
            const link = lead.managerId 
                ? (lead.serviceType === 'finishing' ? '/admin/platform-finishing/requests' : '/admin/platform-decorations/requests')
                : '/dashboard/leads';

            await addNotification({
                userId: dbAssignedTo,
                message: {
                    ar: `طلب عميل جديد: ${lead.serviceTitle}`,
                    en: `New Client Lead: ${lead.serviceTitle}`,
                },
                link: link,
            });
        } catch {
            // Notification failed gracefully without blocking lead creation
        }
    }

    return lead;
};

export const updateLead = async (leadId: string, updates: Partial<Lead>): Promise<Lead | undefined> => {
    let updatedLead: Lead | undefined;

    try {
        const dbUpdates: any = {};
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.assignedTo) dbUpdates.assigned_to = updates.assignedTo;
        dbUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('requests')
            .update(dbUpdates)
            .eq('id', leadId)
            .select()
            .single();

        if (!error && data) {
            updatedLead = mapLeadFromDb(data, []);
        }
    } catch {
        // Fallback to local
    }

    const local = getLocalLeads();
    const idx = local.findIndex(l => l.id === leadId);
    if (idx >= 0) {
        local[idx] = {
            ...local[idx],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(local));
            } catch {}
        } else {
            memoryLeads = local;
        }
        if (!updatedLead) updatedLead = local[idx];
    } else if (updatedLead) {
        saveLocalLead(updatedLead);
    }

    return updatedLead;
};

// Aliases
export const deleteLead = async (id: string) => {
    try {
        await supabase.from('requests').delete().eq('id', id);
    } catch {}

    const local = getLocalLeads().filter(l => l.id !== id);
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(local));
        } catch {}
    } else {
        memoryLeads = local;
    }
    return true;
};

export const addMessageToLead = async (leadId: string, messageData: Omit<LeadMessage, 'id' | 'timestamp'>) => {
    try {
        await supabase.from('request_messages').insert({
            request_id: leadId,
            sender: messageData.sender,
            sender_id: messageData.senderId,
            type: messageData.type,
            content: messageData.content,
            created_at: new Date().toISOString()
        });
        await supabase.from('requests').update({ updated_at: new Date().toISOString() }).eq('id', leadId);
    } catch {}

    const lead = await getLeadById(leadId);
    if (lead) {
        const newMsg: LeadMessage = {
            id: 'msg-' + Date.now(),
            sender: messageData.sender,
            senderId: messageData.senderId,
            type: messageData.type,
            content: messageData.content,
            timestamp: new Date().toISOString()
        };
        lead.messages = [...(lead.messages || []), newMsg];
        saveLocalLead(lead);
    }
};

import { supabase } from '../lib/supabase';
import type { Lead, LeadMessage } from '../types';
import { addNotification } from './notifications';
import { getAttribution } from '../utils/attribution';
import { evaluateRoutingRules } from './routingRules';

const mapLeadFromDb = (row: any, messages: any[] = []): Lead => {
    const payload = row.payload || {};
    return {
        id: row.id,
        // The listing partner who owns the property or lead
        partnerId: payload.partnerId || row.assigned_to,
        managerId: payload.managerId,
        propertyId: payload.propertyId,
        propertyTitle: payload.propertyTitle,
        tierDetails: payload.tierDetails,
        pricingModel: payload.pricingModel,
        estimatedCost: payload.estimatedCost,
        serviceType: payload.serviceType || 'general',
        customerName: row.requester_name || payload.customerName || 'Anonymous',
        customerPhone: row.requester_phone || payload.customerPhone || '',
        contactTime: payload.contactTime,
        serviceTitle: payload.serviceTitle || 'Inquiry',
        customerNotes: payload.customerNotes,
        status: row.status,
        designStage: payload.designStage,
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
    // P1.3: Supabase is the sole authoritative store; no localStorage merging or ghost leads
    const { data: leadsData, error: leadsError } = await supabase
        .from('requests')
        .select('*')
        .eq('type', 'LEAD')
        .order('created_at', { ascending: false });

    if (leadsError) {
        console.error('Error fetching leads from Supabase:', leadsError);
        throw new Error(`Failed to load leads: ${leadsError.message}`);
    }

    if (!leadsData || leadsData.length === 0) {
        return [];
    }

    const leadIds = leadsData.map(l => l.id);
    let messagesData: any[] = [];
    if (leadIds.length > 0) {
        const { data: msgs, error: msgsError } = await supabase
            .from('request_messages')
            .select('*')
            .in('request_id', leadIds)
            .order('created_at', { ascending: true });
        
        if (!msgsError && msgs) {
            messagesData = msgs;
        }
    }

    return leadsData.map(lead => {
        const msgs = messagesData.filter(m => m.request_id === lead.id);
        return mapLeadFromDb(lead, msgs);
    });
};

const isValidUUID = (id?: string): boolean => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

export const getLeadsByPartnerId = async (partnerId: string): Promise<Lead[]> => {
    // P0.4: Query partner_leads_view to enforce database-level PII masking for unassigned leads
    const isUuid = isValidUUID(partnerId);
    let query = supabase.from('partner_leads_view').select('*').eq('type', 'LEAD');
    
    if (isUuid) {
        query = query.or(`assigned_to.eq.${partnerId},payload->>partnerId.eq.${partnerId}`);
    } else {
        query = query.filter('payload->>partnerId', 'eq', partnerId);
    }

    const { data: leadsData, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching partner leads:', error);
        throw new Error(`Failed to load partner leads: ${error.message}`);
    }

    if (!leadsData) return [];

    return leadsData.map(lead => mapLeadFromDb(lead, []));
};

export const getLeadById = async (leadId: string): Promise<Lead | undefined> => {
    const { data: leadData, error } = await supabase
        .from('requests')
        .select('*')
        .eq('id', leadId)
        .single();

    if (error || !leadData) {
        return undefined;
    }

    const { data: messagesData } = await supabase
        .from('request_messages')
        .select('*')
        .eq('request_id', leadId)
        .order('created_at', { ascending: true });

    return mapLeadFromDb(leadData, messagesData || []);
};

export const addLead = async (leadData: Omit<Lead, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'messages'>): Promise<Lead> => {
    // P1.2: Evaluate Automated Routing Rules if routed partner is not explicitly set
    let routedPartner = leadData.partnerId || leadData.assignedTo || leadData.managerId;
    
    // Enrich with marketing attribution
    const currentAttribution = getAttribution({
        source: leadData.source,
        propertyId: leadData.propertyId,
        pageOrigin: leadData.pageOrigin,
    });

    const payloadObj: any = {
        serviceType: leadData.serviceType || 'property',
        serviceTitle: leadData.serviceTitle,
        contactTime: leadData.contactTime,
        customerNotes: leadData.customerNotes,
        partnerId: routedPartner,
        managerId: leadData.managerId,
        propertyId: leadData.propertyId,
        propertyTitle: leadData.propertyTitle,
        tierDetails: (leadData as any).tierDetails,
        pricingModel: (leadData as any).pricingModel,
        estimatedCost: (leadData as any).estimatedCost,
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
        leadQuality: leadData.leadQuality || 'new',
    };

    // If partner not explicitly resolved, evaluate active routing rules
    if (!routedPartner || !isValidUUID(routedPartner)) {
        const matchedAssignee = await evaluateRoutingRules({
            type: 'LEAD',
            payload: payloadObj,
            requesterInfo: { name: leadData.customerName, phone: leadData.customerPhone }
        });
        if (matchedAssignee) {
            routedPartner = matchedAssignee;
        }
    }

    // Default manager fallbacks if still unassigned
    const PLATFORM_FINISHING_MANAGER = '3e554896-eee8-4545-9c7f-0a79a4c1a9f1';
    const DECORATION_MANAGER = 'f476c295-e80a-41ca-a63b-61ff2f579f71';
    if (!routedPartner || !isValidUUID(routedPartner)) {
        if (leadData.serviceType === 'finishing') {
            routedPartner = PLATFORM_FINISHING_MANAGER;
        } else if (leadData.serviceType === 'decorations' || leadData.serviceType === 'decoration') {
            routedPartner = DECORATION_MANAGER;
        }
    }

    const dbAssignedTo = isValidUUID(routedPartner) ? routedPartner : null;
    payloadObj.partnerId = routedPartner;

    // P0.3: Derive authoritative authenticated customer identity
    const { data: { session } } = await supabase.auth.getSession();
    const authUser = session?.user;
    const customerId = authUser?.id || (leadData.customerId && isValidUUID(leadData.customerId) ? leadData.customerId : null);
    const authoritativeEmail = authUser?.email || leadData.customerEmail || null;

    payloadObj.requesterInfo = {
        name: leadData.customerName,
        phone: leadData.customerPhone,
        email: authoritativeEmail || undefined,
        customerId: customerId || undefined
    };

    const dbPayload: any = {
        type: 'LEAD',
        status: 'new',
        customer_id: customerId,
        requester_name: leadData.customerName,
        requester_phone: leadData.customerPhone,
        requester_email: authoritativeEmail,
        assigned_to: dbAssignedTo,
        payload: payloadObj,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // P1.3: Database is authoritative; fail loudly on error
    const { data, error } = await supabase
        .from('requests')
        .insert(dbPayload)
        .select()
        .single();

    if (error || !data) {
        console.error('Error inserting lead to Supabase:', error);
        throw new Error(`Failed to create lead in database: ${error?.message || 'Unknown database error'}`);
    }

    const lead = mapLeadFromDb(data, []);

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
            // Non-blocking notification
        }
    }

    return lead;
};

export const updateLead = async (leadId: string, updates: Partial<Lead>): Promise<Lead | undefined> => {
    // P0.2 & P1.3: Propagate database errors; no silent localStorage fallback
    const dbUpdates: any = {
        updated_at: new Date().toISOString()
    };
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.assignedTo) dbUpdates.assigned_to = updates.assignedTo;

    // If payload attributes changed, merge with current payload
    const { data: currentReq, error: fetchErr } = await supabase
        .from('requests')
        .select('payload')
        .eq('id', leadId)
        .single();

    if (!fetchErr && currentReq) {
        const mergedPayload = { ...(currentReq.payload || {}) };
        if (updates.status) mergedPayload.status = updates.status;
        if (updates.designStage !== undefined) mergedPayload.designStage = updates.designStage;
        if (updates.customerNotes !== undefined) mergedPayload.customerNotes = updates.customerNotes;
        if (updates.contactTime !== undefined) mergedPayload.contactTime = updates.contactTime;
        if (updates.partnerId !== undefined) mergedPayload.partnerId = updates.partnerId;
        if (updates.assignedTo !== undefined) mergedPayload.assignedTo = updates.assignedTo;
        dbUpdates.payload = mergedPayload;
    }

    const { data, error } = await supabase
        .from('requests')
        .update(dbUpdates)
        .eq('id', leadId)
        .select()
        .single();

    if (error) {
        console.error('Failed to update lead in database:', error);
        throw new Error(`Failed to update lead: ${error.message}`);
    }

    return mapLeadFromDb(data, []);
};

export const deleteLead = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('requests').delete().eq('id', id);
    if (error) {
        console.error('Failed to delete lead from database:', error);
        throw new Error(`Failed to delete lead: ${error.message}`);
    }
    return true;
};

export const addMessageToLead = async (leadId: string, messageData: Omit<LeadMessage, 'id' | 'timestamp'>) => {
    // P0.1: Insert into request_messages protected by RLS
    const { error } = await supabase.from('request_messages').insert({
        request_id: leadId,
        sender: messageData.sender,
        sender_id: messageData.senderId,
        type: messageData.type,
        content: messageData.content,
        created_at: new Date().toISOString()
    });

    if (error) {
        console.error('Failed to insert message into database:', error);
        throw new Error(`Failed to send message: ${error.message}`);
    }

    await supabase.from('requests').update({ updated_at: new Date().toISOString() }).eq('id', leadId);
    return getLeadById(leadId);
};

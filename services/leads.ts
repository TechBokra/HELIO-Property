
import { supabase } from '../lib/supabase';
import type { Lead, LeadMessage } from '../types';
import { addNotification } from './notifications';

const mapLeadFromDb = (row: any, messages: any[] = []): Lead => ({
    id: row.id,
    partnerId: row.assigned_to || row.payload.partnerId, // Fallback to payload if assigned_to is generic
    managerId: row.payload.managerId,
    propertyId: row.payload.propertyId,
    serviceType: row.payload.serviceType || 'general',
    customerName: row.requester_name,
    customerPhone: row.requester_phone,
    contactTime: row.payload.contactTime,
    serviceTitle: row.payload.serviceTitle,
    customerNotes: row.payload.customerNotes,
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
    referenceImage: row.payload.referenceImage,
    itemCategory: row.payload.itemCategory,
    dimensions: row.payload.dimensions,
});

export const getAllLeads = async (): Promise<Lead[]> => {
    // 1. Fetch requests of type LEAD
    const { data: leadsData, error } = await supabase
        .from('requests')
        .select('*')
        .eq('type', 'LEAD')
        .order('created_at', { ascending: false });

    if (error) throw error;

    // 2. Fetch messages for these leads (Optimized: In a real app, fetch only when needed or join)
    // For now, we'll fetch all messages for simplicity or fetch on demand in detailed view.
    // Let's fetch messages for the leads we got.
    const leadIds = leadsData.map(l => l.id);
    const { data: messagesData } = await supabase
        .from('request_messages')
        .select('*')
        .in('request_id', leadIds)
        .order('created_at', { ascending: true });

    return leadsData.map(lead => {
        const msgs = messagesData?.filter(m => m.request_id === lead.id) || [];
        return mapLeadFromDb(lead, msgs);
    });
};

export const getLeadsByPartnerId = async (partnerId: string): Promise<Lead[]> => {
    const { data: leadsData, error } = await supabase
        .from('requests')
        .select('*')
        .eq('type', 'LEAD')
        .eq('assigned_to', partnerId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    
    // We assume messages are fetched inside component or here if needed
    return leadsData.map(lead => mapLeadFromDb(lead, []));
};

export const getLeadById = async (leadId: string): Promise<Lead | undefined> => {
    const { data: leadData, error } = await supabase
        .from('requests')
        .select('*')
        .eq('id', leadId)
        .single();

    if (error) return undefined;

    const { data: messagesData } = await supabase
        .from('request_messages')
        .select('*')
        .eq('request_id', leadId)
        .order('created_at', { ascending: true });

    return mapLeadFromDb(leadData, messagesData || []);
};

export const addLead = async (leadData: Omit<Lead, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'messages'>): Promise<Lead> => {
    const dbPayload = {
        type: 'LEAD',
        status: 'new',
        requester_name: leadData.customerName,
        requester_phone: leadData.customerPhone,
        assigned_to: leadData.assignedTo || leadData.managerId || leadData.partnerId,
        // Store the rest of the flat structure in the JSONB payload
        payload: {
            serviceType: leadData.serviceType,
            serviceTitle: leadData.serviceTitle,
            contactTime: leadData.contactTime,
            customerNotes: leadData.customerNotes,
            partnerId: leadData.partnerId,
            managerId: leadData.managerId,
            propertyId: leadData.propertyId,
            referenceImage: leadData.referenceImage,
            itemCategory: leadData.itemCategory,
            dimensions: leadData.dimensions
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('requests')
        .insert(dbPayload)
        .select()
        .single();

    if (error) throw error;
    
    const lead = mapLeadFromDb(data, []);

    // Notification
    if (lead.assignedTo) {
        const link = lead.managerId 
            ? (lead.serviceType === 'finishing' ? '/admin/platform-finishing/requests' : '/admin/platform-decorations/requests')
            : '/dashboard/leads';

        await addNotification({
            userId: lead.assignedTo,
            message: {
                ar: `طلب عميل جديد: ${lead.serviceTitle}`,
                en: `New Client Lead: ${lead.serviceTitle}`,
            },
            link: link,
        });
    }

    return lead;
};

export const updateLead = async (leadId: string, updates: Partial<Lead>): Promise<Lead | undefined> => {
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.assignedTo) dbUpdates.assigned_to = updates.assignedTo;
    
    // If we need to update deep JSON properties, we need to fetch, merge, and save.
    // For simple status updates, the above is enough.
    
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('requests')
        .update(dbUpdates)
        .eq('id', leadId)
        .select()
        .single();

    if (error) return undefined;
    return mapLeadFromDb(data, []);
};

// Aliases
export const deleteLead = async (id: string) => {
    const { error } = await supabase.from('requests').delete().eq('id', id);
    return !error;
};

// Note: addMessageToLead is now imported from services/requests to avoid circular dependency issues
// or implemented here directly accessing the table
export const addMessageToLead = async (leadId: string, messageData: Omit<LeadMessage, 'id' | 'timestamp'>) => {
     const { error } = await supabase.from('request_messages').insert({
        request_id: leadId,
        sender: messageData.sender,
        sender_id: messageData.senderId,
        type: messageData.type,
        content: messageData.content,
        created_at: new Date().toISOString()
    });
    if (error) throw error;
    
    // Update timestamp
    await supabase.from('requests').update({ updated_at: new Date().toISOString() }).eq('id', leadId);
};


import { supabase } from '../lib/supabase';
import { RequestType, Role, Permission } from '../types';
import type { Request, Lead, LeadMessage, RequestHistoryEntry } from '../types';
import { addNotification } from './notifications';
import { requireAnyPermission } from './authGuard';
import { getPartnerById } from './partners';
import { addLead } from './leads';
import { evaluateRoutingRules } from './routingRules';

// Helper to map DB row to Request object
const mapRequestFromDb = (row: any): Request => ({
    id: row.id,
    type: row.type as RequestType,
    status: row.status,
    customerId: row.customer_id,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    requesterInfo: {
        name: row.requester_name,
        phone: row.requester_phone,
        email: row.requester_email,
        customerId: row.customer_id,
    },
    payload: row.payload || {},
    assignedToName: row.assigned_to // Will need hydration if name is needed
});

export const getAllRequests = async (): Promise<Request[]> => {
    const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapRequestFromDb);
};

export const getMyCustomerRequests = async (customerEmail: string): Promise<Request[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;
    const userEmail = session?.user?.email || customerEmail;

    if (!currentUserId && !userEmail) return [];

    let query = supabase.from('requests').select('*');

    if (currentUserId && userEmail) {
        query = query.or(`customer_id.eq.${currentUserId},requester_email.eq.${userEmail},payload->requesterInfo->>email.eq.${userEmail}`);
    } else if (currentUserId) {
        query = query.eq('customer_id', currentUserId);
    } else {
        query = query.or(`requester_email.eq.${userEmail},payload->requesterInfo->>email.eq.${userEmail}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error querying customer requests:', error);
        throw new Error(`Failed to load requests: ${error.message}`);
    }

    return (data || []).map(mapRequestFromDb);
};

export const getPartnerLeads = async (partnerId: string): Promise<Request[]> => {
    // P0.4: Query database view with PII masking for unassigned requests
    const { data, error } = await supabase
        .from('partner_leads_view')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error querying partner_leads_view:', error);
        throw new Error(`Failed to load partner leads: ${error.message}`);
    }

    return (data || []).map(mapRequestFromDb);
};

export const getRequestHistory = async (requestId: string): Promise<RequestHistoryEntry[]> => {
    // P1.1: Query database-backed audit history
    const { data, error } = await supabase
        .from('request_history')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching request history:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: row.id,
        requestId: row.request_id,
        actorId: row.actor_id,
        actorName: row.actor_name,
        actorRole: row.actor_role,
        action: row.action,
        oldStatus: row.old_status,
        newStatus: row.new_status,
        oldAssignedTo: row.old_assigned_to,
        newAssignedTo: row.new_assigned_to,
        metadata: row.metadata || {},
        note: row.note,
        createdAt: row.created_at
    }));
};


export const getRequestById = async (id: string): Promise<Request | undefined> => {
    const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return undefined;
    return mapRequestFromDb(data);
};

export const addRequest = async (type: RequestType, data: Omit<Request, 'id' | 'type' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Request> => {
    
    // DELEGATION: If it's a LEAD, delegate to addLead service which handles extra logic
    if (type === RequestType.LEAD) {
        const payload = data.payload as any;
        const lead = await addLead({
            serviceType: payload.serviceType,
            serviceTitle: payload.serviceTitle,
            customerName: data.requesterInfo.name,
            customerPhone: data.requesterInfo.phone,
            customerNotes: payload.customerNotes,
            contactTime: payload.contactTime,
            partnerId: payload.partnerId,
            managerId: payload.managerId,
            propertyId: payload.propertyId,
            referenceImage: payload.referenceImage,
            // Pass through other payload data
            ...payload
        });
        
        // Return a Request wrapper
        return {
            id: lead.id,
            type: RequestType.LEAD,
            status: 'new',
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
            requesterInfo: data.requesterInfo,
            payload: lead
        };
    }

    // LISTING REQUEST MAPPING: Ensure flat dynamic form data is structured correctly
    let finalPayload = data.payload;
    if (type === RequestType.PROPERTY_LISTING_REQUEST) {
        // If propertyDetails is missing (flat data from DynamicForm), construct it
        const p = data.payload as any;
        if (!p.propertyDetails) {
             const propertyDetails = {
                purpose: { en: 'For Sale', ar: 'للبيع' }, // Default, typically set in flow
                title: { ar: p.title?.ar || 'عقار جديد', en: p.title?.en || 'New Property' },
                description: { ar: p['description.ar'], en: p['description.en'] },
                propertyType: { en: p.propertyType, ar: p.propertyType }, // Ideally map from ID
                finishingStatus: { en: p.finishingStatus, ar: p.finishingStatus },
                area: p.area,
                price: p.price,
                bedrooms: p.beds,
                bathrooms: p.baths,
                floor: p.floor,
                address: p.address,
                location: p.location, // {lat, lng} if present
                isInCompound: p.isInCompound === 'yes',
                hasInstallments: p.hasInstallments === 'yes',
                realEstateFinanceAvailable: p.realEstateFinanceAvailable === 'yes',
                deliveryType: p.deliveryType,
                deliveryMonth: p.deliveryMonth,
                deliveryYear: p.deliveryYear,
                amenities: p.amenities,
                contactMethod: p.contactMethod,
                ownerPhone: p.ownerPhone
            };
            
            finalPayload = {
                ...p,
                propertyDetails,
                // Ensure top level props are clean
                cooperationType: p.cooperationType || 'commission', 
                contactTime: p.contactTime,
                images: p.images || []
            };
        }
    }

    // P0.3: Derive authoritative authenticated customer identity
    const { data: { session } } = await supabase.auth.getSession();
    const authUser = session?.user;
    const customerId = authUser?.id || data.customerId || undefined;
    const authoritativeEmail = authUser?.email || data.requesterInfo.email || undefined;

    const enrichedRequesterInfo = {
        ...data.requesterInfo,
        email: authoritativeEmail,
        customerId: customerId
    };

    const enrichedPayload = {
        ...(finalPayload || {}),
        requesterInfo: enrichedRequesterInfo
    };

    // Prepare payload for DB
    const dbPayload: any = {
        type,
        status: 'new',
        customer_id: customerId || null,
        requester_name: data.requesterInfo.name,
        requester_phone: data.requesterInfo.phone,
        requester_email: authoritativeEmail || null,
        assigned_to: data.assignedTo,
        payload: enrichedPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // P1.2: Connect Automated Routing Rules
    if (!dbPayload.assigned_to) {
        const matchedAssignee = await evaluateRoutingRules({
            type,
            payload: finalPayload,
            requesterInfo: data.requesterInfo
        });
        if (matchedAssignee) {
            dbPayload.assigned_to = matchedAssignee;
        }
    }

    // Fallback switch if no rule matched
    if (!dbPayload.assigned_to) {
        switch(type) {
            case RequestType.PARTNER_APPLICATION:
                dbPayload.assigned_to = 'd31a10be-aa1a-4039-96e3-ced2fc763f2f'; // partner_relations_manager
                break;
            case RequestType.PROPERTY_LISTING_REQUEST:
                dbPayload.assigned_to = '0a497a3e-c563-4996-af33-cb7bdb435632'; // listings_manager
                break;
            case RequestType.PROPERTY_INQUIRY:
            case RequestType.CONTACT_MESSAGE:
            default:
                dbPayload.assigned_to = '45b6ecf3-7e58-4a1a-993f-9b1e75cfd5bf'; // customer_relations_manager
                break;
        }
    }

    const { data: newReq, error } = await supabase
        .from('requests')
        .insert(dbPayload)
        .select()
        .single();

    if (error) {
        console.error('Error inserting request to Supabase:', error);
        throw new Error(`Failed to create request: ${error.message}`);
    }
    
    const request = mapRequestFromDb(newReq);

    // Notification Logic
    if (request.assignedTo) {
        const link = `/admin/requests`; 
        await addNotification({
            userId: request.assignedTo,
            message: {
                ar: `لديك طلب جديد من "${data.requesterInfo.name}".`,
                en: `New ${type.toLowerCase().replace(/_/g, ' ')} from "${data.requesterInfo.name}".`,
            },
            link: link,
        });
    }

    return request;
};

export const updateRequest = async (id: string, updates: Partial<Request>): Promise<Request | undefined> => {
    requireAnyPermission([
        Permission.MANAGE_REQUESTS, 
        Permission.MANAGE_LEADS, 
        Permission.ASSIGN_REQUESTS, 
        Permission.ASSIGN_LEADS, 
        Permission.MANAGE_PROPERTY_REQUESTS, 
        Permission.MANAGE_PROPERTY_INQUIRIES, 
        Permission.MANAGE_CONTACT_REQUESTS, 
        Permission.MANAGE_PARTNER_REQUESTS, 
        Permission.MANAGE_PLATFORM_PROPERTY_LEADS, 
        Permission.MANAGE_PLATFORM_FINISHING_LEADS, 
        Permission.MANAGE_DECORATIONS_LEADS
    ]);

    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.assignedTo) dbUpdates.assigned_to = updates.assignedTo;
    if (updates.payload) dbUpdates.payload = updates.payload;
    
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('requests')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating request in Supabase:', error);
        throw new Error(`Failed to update request: ${error.message}`);
    }

    return mapRequestFromDb(data);
};

export const deleteRequest = async (id: string): Promise<boolean> => {
    requireAnyPermission([Permission.MANAGE_REQUESTS, Permission.MANAGE_LEADS]);
    // Cascade delete handles messages if configured in DB, otherwise we might need manual cleanup
    const { error } = await supabase.from('requests').delete().eq('id', id);
    return !error;
};

export const addMessageToLead = async (requestId: string, messageData: Omit<LeadMessage, 'id' | 'timestamp'>): Promise<Request | undefined> => {
    const { error } = await supabase.from('request_messages').insert({
        request_id: requestId,
        sender: messageData.sender,
        sender_id: messageData.senderId,
        type: messageData.type,
        content: messageData.content,
        created_at: new Date().toISOString()
    });

    if (error) throw error;
    
    // Update the request's updated_at timestamp
    await updateRequest(requestId, { updatedAt: new Date().toISOString() });
    
    return getRequestById(requestId);
};

export const getRequestMessages = async (requestId: string): Promise<LeadMessage[]> => {
    const { data, error } = await supabase
        .from('request_messages')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching request messages:', error);
        return [];
    }

    return (data || []).map((msg: any) => ({
        id: msg.id,
        sender: msg.sender,
        senderId: msg.sender_id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.created_at
    }));
};


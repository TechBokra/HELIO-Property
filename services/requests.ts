
import { supabase } from '../lib/supabase';
import { RequestType, Role } from '../types';
import type { Request, Lead, LeadMessage } from '../types';
import { addNotification } from './notifications';
import { getPartnerById } from './partners';
import { addLead } from './leads';

// Helper to map DB row to Request object
const mapRequestFromDb = (row: any): Request => ({
    id: row.id,
    type: row.type as RequestType,
    status: row.status,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    requesterInfo: {
        name: row.requester_name,
        phone: row.requester_phone,
        email: row.requester_email,
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

    // Prepare payload for DB
    const dbPayload = {
        type,
        status: 'new',
        requester_name: data.requesterInfo.name,
        requester_phone: data.requesterInfo.phone,
        requester_email: data.requesterInfo.email,
        assigned_to: data.assignedTo,
        payload: finalPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    // Auto-assignment logic based on type if not provided
    if (!dbPayload.assigned_to) {
        switch(type) {
            case RequestType.PARTNER_APPLICATION:
                dbPayload.assigned_to = 'partner-relations-manager-1';
                break;
            case RequestType.PROPERTY_LISTING_REQUEST:
                dbPayload.assigned_to = 'platform-real-estate-manager-1';
                break;
            case RequestType.PROPERTY_INQUIRY:
            case RequestType.CONTACT_MESSAGE:
            default:
                dbPayload.assigned_to = 'customer-relations-manager-1';
                break;
        }
    }

    const { data: newReq, error } = await supabase
        .from('requests')
        .insert(dbPayload)
        .select()
        .single();

    if (error) throw error;
    
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

    if (error) return undefined;
    return mapRequestFromDb(data);
};

export const deleteRequest = async (id: string): Promise<boolean> => {
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

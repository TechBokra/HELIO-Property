
import { supabase } from '../lib/supabase';
import { RequestType, Role, Permission, OperationalStatus } from '../types';
import type { Request, Lead, LeadMessage, RequestHistoryEntry, UnifiedRequest, OperationalDomain, OperationalMetrics } from '../types';
import { addNotification } from './notifications';
import { requireAnyPermission } from './authGuard';
import { getPartnerById, getAllPartnersForAdmin } from './partners';
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

    // Notification Logic (Canonical Operations Center destination)
    if (request.assignedTo) {
        const link = `/admin/operations?id=${newReq.id}`; 
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

/**
 * ============================================================================
 * PHASE 3B: UNIFIED OPERATIONS CONTROL LAYER
 * ============================================================================
 */

export const mapDomainStatusToOperational = (status?: string, assignedTo?: string): OperationalStatus => {
    const s = String(status || '').toLowerCase().trim();
    if (['completed', 'approved', 'verified', 'won'].includes(s)) return OperationalStatus.RESOLVED;
    if (['closed', 'lost'].includes(s)) return OperationalStatus.CLOSED;
    if (['rejected', 'cancelled', 'declined'].includes(s)) return OperationalStatus.REJECTED;
    if (['quoted', 'waiting', 'viewing'].includes(s)) return OperationalStatus.WAITING;
    if (['contacted', 'site-visit', 'in-progress', 'qualified'].includes(s)) return OperationalStatus.IN_PROGRESS;
    if (['assigned'].includes(s)) return OperationalStatus.ASSIGNED;
    if (['new', 'pending'].includes(s)) {
        return assignedTo ? OperationalStatus.ASSIGNED : OperationalStatus.NEW;
    }
    return assignedTo ? OperationalStatus.ASSIGNED : OperationalStatus.NEW;
};

export const mapRequestToUnified = (req: Request, partnersMap?: Map<string, string>): UnifiedRequest => {
    const payload = req.payload || {};
    const createdDate = new Date(req.createdAt || Date.now());
    const ageHours = Math.max(0, Math.round((Date.now() - createdDate.getTime()) / (1000 * 60 * 60)));
    
    // Domain determination
    let domain: OperationalDomain = 'commercial';
    let typeLabel = { en: 'Lead', ar: 'طلب عميل' };
    let domainLabel = { en: 'Commercial', ar: 'القطاع التجاري' };

    switch (req.type) {
        case RequestType.PARTNER_APPLICATION:
            domain = 'partners';
            typeLabel = { en: 'Partner Application', ar: 'طلب انضمام شريك' };
            domainLabel = { en: 'Partners', ar: 'الشركاء' };
            break;
        case RequestType.PROPERTY_LISTING_REQUEST:
            domain = 'real_estate';
            typeLabel = { en: 'Property Listing Request', ar: 'طلب إضافة عقار' };
            domainLabel = { en: 'Real Estate', ar: 'العقارات' };
            break;
        case RequestType.PROPERTY_INQUIRY:
            domain = 'real_estate';
            typeLabel = { en: 'Property Search Inquiry', ar: 'استفسار طلب عقار' };
            domainLabel = { en: 'Real Estate', ar: 'العقارات' };
            break;
        case RequestType.CONTACT_MESSAGE:
            domain = 'customer_care';
            typeLabel = { en: 'Contact Message', ar: 'رسالة اتصل بنا' };
            domainLabel = { en: 'Customer Care', ar: 'خدمة العملاء' };
            break;
        case RequestType.LEAD:
        default:
            if (payload.serviceType === 'finishing') {
                domain = 'finishing';
                typeLabel = { en: 'Finishing Request', ar: 'طلب تشطيب' };
                domainLabel = { en: 'Finishing', ar: 'التشطيبات' };
            } else if (payload.serviceType === 'decorations') {
                domain = 'decorations';
                typeLabel = { en: 'Decoration Request', ar: 'طلب ديكور وتصميم' };
                domainLabel = { en: 'Decorations', ar: 'الديكور' };
            } else if (payload.propertyId || payload.propertyTitle) {
                domain = 'real_estate';
                typeLabel = { en: 'Property Inquiry Lead', ar: 'عميل استفسار عقار' };
                domainLabel = { en: 'Real Estate', ar: 'العقارات' };
            } else {
                domain = 'commercial';
                typeLabel = { en: 'Commercial Lead', ar: 'عميل محتمل' };
                domainLabel = { en: 'Commercial', ar: 'القطاع التجاري' };
            }
            break;
    }

    const domainStatus = String(payload.status || req.status || 'new');
    const operationalStatus = mapDomainStatusToOperational(domainStatus, req.assignedTo);
    const isClosedOrResolved = [OperationalStatus.RESOLVED, OperationalStatus.CLOSED, OperationalStatus.REJECTED].includes(operationalStatus);
    const isAged = ageHours > 48 && !isClosedOrResolved;

    // Priority derivation
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (!req.assignedTo && ageHours > 24) priority = 'high';
    if (isAged) priority = 'high';
    if (req.type === RequestType.PARTNER_APPLICATION) priority = 'high';
    if (payload.estimatedCost && Number(payload.estimatedCost) > 1000000) priority = 'high';
    if (isClosedOrResolved) priority = 'low';

    // Next action recommendation
    let nextAction = { en: 'Initial client contact', ar: 'التواصل الأولي مع العميل' };
    switch (operationalStatus) {
        case OperationalStatus.NEW:
            nextAction = { en: 'Assign owner & verify details', ar: 'تعيين مسؤول وتدقيق الطلب' };
            break;
        case OperationalStatus.ASSIGNED:
            nextAction = { en: 'Contact requester via phone/chat', ar: 'التواصل المباشر مع العميل' };
            break;
        case OperationalStatus.IN_PROGRESS:
            nextAction = { en: 'Coordinate site visit or quotation', ar: 'تنسيق المعاينة أو إعداد العرض' };
            break;
        case OperationalStatus.WAITING:
            nextAction = { en: 'Follow up on client decision', ar: 'متابعة رد وموافقة العميل' };
            break;
        case OperationalStatus.RESOLVED:
            nextAction = { en: 'Archive completed record', ar: 'أرشفة السجل المكتمل' };
            break;
        case OperationalStatus.CLOSED:
        case OperationalStatus.REJECTED:
            nextAction = { en: 'No action required', ar: 'لا يتطلب إجراء' };
            break;
    }

    // Detail route link to canonical specialized domain page
    let detailRoute = `/admin/operations?id=${req.id}`;
    if (req.type === RequestType.PARTNER_APPLICATION) {
        detailRoute = `/admin/partners/requests/${req.id}`;
    } else if (req.type === RequestType.PROPERTY_LISTING_REQUEST) {
        detailRoute = `/admin/properties/listing-requests/${req.id}`;
    } else if (req.type === RequestType.PROPERTY_INQUIRY) {
        detailRoute = `/admin/properties/search-requests?highlight=${req.id}`;
    } else if (req.type === RequestType.CONTACT_MESSAGE) {
        detailRoute = `/admin/contact-requests?highlight=${req.id}`;
    } else if (payload.serviceType === 'finishing') {
        detailRoute = `/admin/platform-finishing/requests/${req.id}`;
    } else if (payload.serviceType === 'decorations') {
        detailRoute = `/admin/platform-decorations/requests/${req.id}`;
    } else if (req.type === RequestType.LEAD) {
        detailRoute = `/admin/leads?highlight=${req.id}`;
    }

    const assignedToName = req.assignedTo && partnersMap?.get(req.assignedTo) ? partnersMap.get(req.assignedTo) : (req.assignedTo ? 'Team Member' : undefined);

    return {
        id: req.id,
        type: req.type,
        typeLabel,
        domain,
        domainLabel,
        createdAt: req.createdAt || new Date().toISOString(),
        updatedAt: req.updatedAt || req.createdAt || new Date().toISOString(),
        ageHours,
        isAged,
        requester: {
            name: req.requesterInfo?.name || payload.customerName || 'Anonymous',
            email: req.requesterInfo?.email || payload.customerEmail,
            phone: req.requesterInfo?.phone || payload.customerPhone,
            customerId: req.customerId || req.requesterInfo?.customerId,
        },
        context: {
            propertyId: payload.propertyId,
            propertyTitle: payload.propertyTitle || payload.propertyDetails?.title?.ar || payload.propertyDetails?.title?.en,
            projectId: payload.projectId,
            projectTitle: payload.projectName?.ar || payload.projectName?.en,
            partnerId: payload.partnerId,
            partnerName: payload.partnerName || payload.companyName,
            serviceType: payload.serviceType,
            serviceTitle: payload.serviceTitle || payload.companyName || payload.propertyDetails?.title?.ar,
            estimatedCost: payload.estimatedCost ? Number(payload.estimatedCost) : undefined,
            source: payload.source || 'web_form',
            utmSource: payload.utmSource || payload.utm_source,
            details: payload.message || payload.details || payload.customerNotes || payload.description,
            images: payload.images || (payload.referenceImage ? [payload.referenceImage] : []),
        },
        domainStatus,
        operationalStatus,
        priority,
        assignedTo: req.assignedTo,
        assignedToName,
        lastActivity: req.updatedAt || req.createdAt || new Date().toISOString(),
        nextAction,
        detailRoute,
        rawPayload: payload,
    };
};

export interface UnifiedRequestsFilter {
    domain?: OperationalDomain | 'all';
    type?: RequestType | 'all';
    operationalStatus?: OperationalStatus | 'all';
    assignedTo?: string | 'all' | 'unassigned';
    priority?: 'all' | 'high' | 'medium' | 'low';
    dateRange?: 'all' | 'today' | 'last7days' | 'last30days' | 'older';
    triageView?: 'all' | 'unassigned' | 'new' | 'aged' | 'waiting' | 'high_priority' | 'recently_updated' | 'resolved';
    searchTerm?: string;
    page?: number;
    pageSize?: number;
}

export interface UnifiedRequestsResponse {
    requests: UnifiedRequest[];
    totalCount: number;
    metrics: OperationalMetrics;
}

export const getUnifiedRequestById = async (id: string): Promise<UnifiedRequest | null> => {
    const [raw, partners] = await Promise.all([
        getRequestById(id),
        getAllPartnersForAdmin().catch(() => [])
    ]);
    if (!raw) return null;
    const managersMap = new Map<string, string>();
    (partners || []).forEach(p => {
        managersMap.set(p.id, p.name || p.email);
    });
    return mapRequestToUnified(raw, managersMap);
};

export const getUnifiedRequests = async (filter: UnifiedRequestsFilter = {}): Promise<UnifiedRequestsResponse> => {
    // 1. Fetch raw requests and managers
    const [rawRequests, partners] = await Promise.all([
        getAllRequests(),
        getAllPartnersForAdmin().catch(() => [])
    ]);

    const managersMap = new Map<string, string>();
    (partners || []).forEach(p => {
        managersMap.set(p.id, p.name || p.email);
    });

    // 2. Map all to UnifiedRequest model
    const allUnified = (rawRequests || []).map(r => mapRequestToUnified(r, managersMap));

    // 3. Compute operational triage metrics
    const metrics: OperationalMetrics = {
        total: allUnified.length,
        unassigned: allUnified.filter(r => !r.assignedTo).length,
        newCount: allUnified.filter(r => r.operationalStatus === OperationalStatus.NEW).length,
        inProgress: allUnified.filter(r => r.operationalStatus === OperationalStatus.IN_PROGRESS).length,
        waiting: allUnified.filter(r => r.operationalStatus === OperationalStatus.WAITING).length,
        agedRisk: allUnified.filter(r => r.isAged).length,
        highPriority: allUnified.filter(r => r.priority === 'high' && r.operationalStatus !== OperationalStatus.CLOSED && r.operationalStatus !== OperationalStatus.RESOLVED).length,
        resolvedToday: allUnified.filter(r => {
            if (r.operationalStatus !== OperationalStatus.RESOLVED && r.operationalStatus !== OperationalStatus.CLOSED) return false;
            const updatedDate = new Date(r.updatedAt);
            const now = new Date();
            return updatedDate.toDateString() === now.toDateString();
        }).length
    };

    // 4. Apply Filters
    let filtered = allUnified;

    // Triage View filter
    if (filter.triageView && filter.triageView !== 'all') {
        switch (filter.triageView) {
            case 'unassigned':
                filtered = filtered.filter(r => !r.assignedTo);
                break;
            case 'new':
                filtered = filtered.filter(r => r.operationalStatus === OperationalStatus.NEW);
                break;
            case 'aged':
                filtered = filtered.filter(r => r.isAged);
                break;
            case 'waiting':
                filtered = filtered.filter(r => r.operationalStatus === OperationalStatus.WAITING);
                break;
            case 'high_priority':
                filtered = filtered.filter(r => r.priority === 'high' && r.operationalStatus !== OperationalStatus.CLOSED && r.operationalStatus !== OperationalStatus.RESOLVED);
                break;
            case 'recently_updated':
                const past24Hours = Date.now() - 24 * 60 * 60 * 1000;
                filtered = filtered.filter(r => new Date(r.updatedAt).getTime() > past24Hours);
                break;
            case 'resolved':
                filtered = filtered.filter(r => r.operationalStatus === OperationalStatus.RESOLVED || r.operationalStatus === OperationalStatus.CLOSED);
                break;
        }
    }

    // Domain filter
    if (filter.domain && filter.domain !== 'all') {
        filtered = filtered.filter(r => r.domain === filter.domain);
    }

    // Type filter
    if (filter.type && filter.type !== 'all') {
        filtered = filtered.filter(r => r.type === filter.type);
    }

    // Operational Status filter
    if (filter.operationalStatus && filter.operationalStatus !== 'all') {
        filtered = filtered.filter(r => r.operationalStatus === filter.operationalStatus);
    }

    // Priority filter
    if (filter.priority && filter.priority !== 'all') {
        filtered = filtered.filter(r => r.priority === filter.priority);
    }

    // Date range filter
    if (filter.dateRange && filter.dateRange !== 'all') {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        switch (filter.dateRange) {
            case 'today':
                filtered = filtered.filter(r => (now - new Date(r.createdAt).getTime()) <= oneDay);
                break;
            case 'last7days':
                filtered = filtered.filter(r => (now - new Date(r.createdAt).getTime()) <= 7 * oneDay);
                break;
            case 'last30days':
                filtered = filtered.filter(r => (now - new Date(r.createdAt).getTime()) <= 30 * oneDay);
                break;
            case 'older':
                filtered = filtered.filter(r => (now - new Date(r.createdAt).getTime()) > 30 * oneDay);
                break;
        }
    }

    // Assignee filter
    if (filter.assignedTo) {
        if (filter.assignedTo === 'unassigned') {
            filtered = filtered.filter(r => !r.assignedTo);
        } else if (filter.assignedTo !== 'all') {
            filtered = filtered.filter(r => r.assignedTo === filter.assignedTo);
        }
    }

    // Search term filter
    if (filter.searchTerm && filter.searchTerm.trim()) {
        const term = filter.searchTerm.trim().toLowerCase();
        filtered = filtered.filter(r => 
            r.id.toLowerCase().includes(term) ||
            r.requester.name.toLowerCase().includes(term) ||
            (r.requester.phone && r.requester.phone.includes(term)) ||
            (r.requester.email && r.requester.email.toLowerCase().includes(term)) ||
            (r.context.serviceTitle && r.context.serviceTitle.toLowerCase().includes(term)) ||
            (r.context.propertyTitle && r.context.propertyTitle.toLowerCase().includes(term)) ||
            (r.context.details && r.context.details.toLowerCase().includes(term))
        );
    }

    // Pagination
    const totalCount = filtered.length;
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 15;
    const startIndex = (page - 1) * pageSize;
    const paginatedRequests = filtered.slice(startIndex, startIndex + pageSize);

    return {
        requests: paginatedRequests,
        totalCount,
        metrics,
    };
};

/**
 * Assign a request to an owner and record audit event
 */
export const assignRequest = async (requestId: string, assigneeId: string, noteText?: string): Promise<Request> => {
    requireAnyPermission([
        Permission.ASSIGN_REQUESTS,
        Permission.ASSIGN_LEADS,
        Permission.MANAGE_REQUESTS,
        Permission.MANAGE_LEADS
    ]);

    const req = await getRequestById(requestId);
    if (!req) throw new Error('Request not found');

    const previousAssignee = req.assignedTo;
    const newStatus = (req.status === 'new' || req.status === 'pending') ? 'assigned' : req.status;

    // 1. Update in Supabase
    const updated = await updateRequest(requestId, {
        assignedTo: assigneeId,
        status: newStatus as any,
    });

    if (!updated) throw new Error('Failed to update assignment in database');

    // 2. Insert audit note in request_messages
    try {
        await addMessageToLead(requestId, {
            sender: 'admin',
            type: 'note',
            content: `[ASSIGNMENT] Reassigned ownership from ${previousAssignee || 'Unassigned'} to ${assigneeId}${noteText ? '. Note: ' + noteText : ''}`
        });
    } catch (e) {
        console.warn('Could not insert assignment message into request_messages:', e);
    }

    // 3. Send notification to assignee
    try {
        await addNotification({
            userId: assigneeId,
            message: {
                en: `Request #${requestId.slice(0, 8)} has been assigned to you.`,
                ar: `تم تعيين الطلب رقم #${requestId.slice(0, 8)} لك.`,
            },
            link: `/admin/operations?id=${requestId}`
        });
    } catch (e) {
        console.warn('Could not dispatch assignment notification:', e);
    }

    return updated;
};

/**
 * Clear assignment of a request
 */
export const unassignRequest = async (requestId: string, noteText?: string): Promise<Request> => {
    requireAnyPermission([
        Permission.ASSIGN_REQUESTS,
        Permission.ASSIGN_LEADS,
        Permission.MANAGE_REQUESTS
    ]);

    const req = await getRequestById(requestId);
    if (!req) throw new Error('Request not found');

    const previousAssignee = req.assignedTo;
    const updated = await updateRequest(requestId, {
        assignedTo: null as any,
        status: 'pending' as any
    });

    if (!updated) throw new Error('Failed to clear assignment in database');

    try {
        await addMessageToLead(requestId, {
            sender: 'admin',
            type: 'note',
            content: `[ASSIGNMENT] Cleared assignment (previously assigned to ${previousAssignee || 'none'})${noteText ? '. Reason: ' + noteText : ''}`
        });
    } catch (e) {
        console.warn('Could not log unassignment event:', e);
    }

    return updated;
};

/**
 * Update operational status with canonical lifecycle validation
 */
export const updateRequestOperationalStatus = async (
    requestId: string, 
    newOperationalStatus: OperationalStatus, 
    domainStatus?: string, 
    noteText?: string
): Promise<Request> => {
    requireAnyPermission([
        Permission.MANAGE_REQUESTS,
        Permission.MANAGE_LEADS,
        Permission.MANAGE_PROPERTY_REQUESTS,
        Permission.MANAGE_PARTNER_REQUESTS,
        Permission.MANAGE_PLATFORM_FINISHING_LEADS,
        Permission.MANAGE_DECORATIONS_LEADS,
        Permission.MANAGE_CONTACT_REQUESTS
    ]);

    const req = await getRequestById(requestId);
    if (!req) throw new Error('Request not found');

    // Determine domain status string
    let resolvedDomainStatus = domainStatus;
    if (!resolvedDomainStatus) {
        switch (newOperationalStatus) {
            case OperationalStatus.NEW:
                resolvedDomainStatus = 'new';
                break;
            case OperationalStatus.ASSIGNED:
                resolvedDomainStatus = 'assigned';
                break;
            case OperationalStatus.IN_PROGRESS:
                resolvedDomainStatus = 'in-progress';
                break;
            case OperationalStatus.WAITING:
                resolvedDomainStatus = 'quoted';
                break;
            case OperationalStatus.RESOLVED:
                resolvedDomainStatus = req.type === RequestType.PARTNER_APPLICATION ? 'approved' : 'completed';
                break;
            case OperationalStatus.CLOSED:
                resolvedDomainStatus = 'closed';
                break;
            case OperationalStatus.REJECTED:
                resolvedDomainStatus = 'rejected';
                break;
        }
    }

    // Update in Supabase
    const payload = { ...(req.payload || {}), status: resolvedDomainStatus };
    const updated = await updateRequest(requestId, {
        status: resolvedDomainStatus as any,
        payload
    });

    if (!updated) throw new Error('Failed to update status in database');

    // Insert note
    try {
        await addMessageToLead(requestId, {
            sender: 'admin',
            type: 'note',
            content: `[STATUS] Operational status updated to ${newOperationalStatus} (${resolvedDomainStatus})${noteText ? '. Note: ' + noteText : ''}`
        });
    } catch (e) {
        console.warn('Could not log status update event:', e);
    }

    return updated;
};

/**
 * Add an internal note to a request
 */
export const addRequestInternalNote = async (
    requestId: string, 
    content: string, 
    senderId?: string, 
    senderRole?: string
): Promise<LeadMessage> => {
    requireAnyPermission([
        Permission.MANAGE_REQUESTS,
        Permission.MANAGE_LEADS,
        Permission.MANAGE_PROPERTY_REQUESTS,
        Permission.MANAGE_PARTNER_REQUESTS,
        Permission.MANAGE_PLATFORM_FINISHING_LEADS,
        Permission.MANAGE_DECORATIONS_LEADS,
        Permission.MANAGE_CONTACT_REQUESTS
    ]);

    const message = {
        sender: (senderRole === Role.SUPER_ADMIN || senderRole?.includes('_manager') ? 'admin' : 'partner') as any,
        senderId: senderId || 'admin',
        type: 'note' as const,
        content
    };

    await addMessageToLead(requestId, message);

    return {
        id: `note-${Date.now()}`,
        ...message,
        timestamp: new Date().toISOString()
    };
};


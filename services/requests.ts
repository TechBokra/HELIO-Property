
import { supabase } from '../lib/supabase';
import { RequestType, Role, Permission, OperationalStatus } from '../types';
import type { Request, RequestStatus, Lead, LeadMessage, RequestHistoryEntry, UnifiedRequest, OperationalDomain, OperationalMetrics, Partner } from '../types';
import { addNotification } from './notifications';
import { requireAnyPermission } from './authGuard';
import { getPartnerById, getAllPartnersForAdmin, mapPartnerFromDb } from './partners';
import { addLead } from './leads';
import { evaluateRoutingRules } from './routingRules';

export const isValidUUID = (id?: string): boolean => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

// Helper to map DB row to Request object
export const mapRequestFromDb = (row: any): Request => ({
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

    if (error) {
        console.error('Authoritative Supabase error querying requests:', error.message);
        throw error;
    }

    return (data || []).map(mapRequestFromDb);
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
        console.error('Error querying customer requests:', error.message);
        throw error;
    }

    return (data || []).map(mapRequestFromDb);
};

/**
 * Partner Lead Isolation: strictly scoped to the requested partner
 */
export const getPartnerLeads = async (partnerId: string): Promise<Request[]> => {
    if (!partnerId) return [];

    const isUuid = isValidUUID(partnerId);
    let query = supabase.from('requests').select('*');

    if (isUuid) {
        query = query.or(`assigned_to.eq.${partnerId},payload->>partnerId.eq.${partnerId}`);
    } else {
        query = query.filter('payload->>partnerId', 'eq', partnerId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching partner leads for partner:', partnerId, error.message);
        throw error;
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
        console.warn('Notice fetching request history:', error);
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
    try {
        const { data, error } = await supabase
            .from('requests')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return undefined;
        }
        return mapRequestFromDb(data);
    } catch {
        return undefined;
    }
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

    // Dynamic database-backed manager resolution (No static hardcoded UUIDs)
    if (!dbPayload.assigned_to) {
        dbPayload.assigned_to = await resolveEligibleManager(type);
    }

    // Authoritative Database Insert with pre-generated UUID
    const requestId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;

    const insertPayload = {
        id: requestId,
        ...dbPayload
    };

    const { error: insertError } = await supabase
        .from('requests')
        .insert(insertPayload);

    if (insertError) {
        console.error('Authoritative error during request insert into Supabase:', insertError);
        throw new Error(`Failed to create request in database: ${insertError.message}`);
    }

    const request: Request = {
        id: requestId,
        type,
        status: 'new',
        customerId: customerId,
        assignedTo: dbPayload.assigned_to,
        createdAt: dbPayload.created_at,
        updatedAt: dbPayload.updated_at,
        requesterInfo: enrichedRequesterInfo,
        payload: enrichedPayload,
        assignedToName: dbPayload.assigned_to
    };

    // Initial Tracking Note
    try {
        await supabase.from('request_messages').insert({
            request_id: requestId,
            sender: 'system',
            type: 'note',
            content: `[INTAKE] New ${type} received from ${data.requesterInfo.name}. Assigned to: ${dbPayload.assigned_to || 'Unassigned'}.`,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Non-blocking tracking message notice:', e);
    }

    // Notification Logic (Canonical Operations Center destination)
    if (request.assignedTo) {
        const link = `/admin/operations?id=${request.id}`; 
        await addNotification({
            userId: request.assignedTo,
            message: {
                ar: `لديك طلب جديد من "${data.requesterInfo.name}".`,
                en: `New ${type.toLowerCase().replace(/_/g, ' ')} from "${data.requesterInfo.name}".`,
            },
            link: link,
        }).catch(() => {});
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

export const getRequestMessages = async (requestId: string, viewerRole?: string): Promise<LeadMessage[]> => {
    let query = supabase
        .from('request_messages')
        .select('*')
        .eq('request_id', requestId);

    // Section 8: Internal operational notes are strictly isolated to internal staff
    const isInternalStaff = viewerRole === Role.SUPER_ADMIN || 
        String(viewerRole || '').toLowerCase().includes('manager') || 
        String(viewerRole || '').toLowerCase() === 'admin';

    if (!isInternalStaff) {
        query = query.eq('type', 'message');
    }

    const { data, error } = await query.order('created_at', { ascending: true });

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

export const deriveRequestPriority = (
    req: { type?: string; assignedTo?: string | null; createdAt?: string; status?: string },
    payload: any = {}
): 'high' | 'medium' | 'low' => {
    const domainStatus = String(payload.status || req.status || 'new');
    const operationalStatus = mapDomainStatusToOperational(domainStatus, req.assignedTo || undefined);
    const isClosedOrResolved = [OperationalStatus.RESOLVED, OperationalStatus.CLOSED, OperationalStatus.REJECTED].includes(operationalStatus);
    if (isClosedOrResolved) return 'low';

    const createdDate = new Date(req.createdAt || Date.now());
    const ageHours = Math.max(0, Math.round((Date.now() - createdDate.getTime()) / (1000 * 60 * 60)));
    const isAged = ageHours > 48;

    if (payload.priority === 'high') return 'high';
    if (!req.assignedTo && ageHours > 24) return 'high';
    if (isAged) return 'high';
    if (req.type === RequestType.PARTNER_APPLICATION) return 'high';
    if (payload.estimatedCost && Number(payload.estimatedCost) > 1000000) return 'high';

    if (payload.priority === 'low') return 'low';
    return 'medium';
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
    // Priority derivation using authoritative logic (P1.5)
    const priority = deriveRequestPriority(req, payload);

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

/**
 * Dynamically resolves an active eligible manager from the database
 * Removes reliance on static hardcoded manager UUIDs
 */
export const resolveEligibleManager = async (domainOrType: string): Promise<string | null> => {
    try {
        let targetRole = 'super_admin';
        const d = String(domainOrType || '').toLowerCase();
        if (d === 'finishing' || d.includes('finishing')) {
            targetRole = 'platform_finishing_manager';
        } else if (d === 'decorations' || d.includes('decor')) {
            targetRole = 'decoration_manager';
        } else if (d === 'real_estate' || d.includes('property') || d.includes('listing')) {
            targetRole = 'listings_manager';
        } else if (d === 'partners' || d.includes('partner')) {
            targetRole = 'partner_relations_manager';
        } else if (d === 'customer_care' || d.includes('contact') || d.includes('inquiry')) {
            targetRole = 'customer_relations_manager';
        }

        const { data: managers, error } = await supabase
            .from('partners')
            .select('id, role, type, status')
            .eq('status', 'active')
            .ilike('role', `%${targetRole}%`)
            .limit(1);

        if (!error && managers && managers.length > 0) {
            return managers[0].id;
        }

        // Fallback: query active super_admin from database
        const { data: admins } = await supabase
            .from('partners')
            .select('id')
            .eq('status', 'active')
            .ilike('role', '%super_admin%')
            .limit(1);

        if (admins && admins.length > 0) {
            return admins[0].id;
        }

        return null;
    } catch (e) {
        console.warn('Notice resolving eligible manager from database:', e);
        return null;
    }
};

/**
 * Section 7: Enforce Assignee Eligibility Validation at Service Boundary
 */
export const validateAssigneeEligibility = async (
    assigneeId: string,
    req: Request | UnifiedRequest
): Promise<{ eligible: boolean; reason?: string; assignee?: any }> => {
    if (!assigneeId) {
        return { eligible: false, reason: 'Assignee ID is required' };
    }

    const { data: partner, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', assigneeId)
        .maybeSingle();

    if (error || !partner) {
        return { eligible: false, reason: 'Assignee not found in authoritative records' };
    }

    if (partner.status !== 'active') {
        return { eligible: false, reason: 'Assignee account is not active' };
    }

    const role = String(partner.role || '').toLowerCase();
    const type = String(partner.type || '').toLowerCase();

    // Super Admin can be assigned any request
    if (role === 'super_admin' || role === 'admin' || type === 'admin') {
        return { eligible: true, assignee: partner };
    }

    const reqType = req.type;
    const reqPayload = ('rawPayload' in req ? req.rawPayload : req.payload) || {};
    const serviceType = String(reqPayload.serviceType || ('context' in req ? req.context?.serviceType : '') || '').toLowerCase();

    if (reqType === RequestType.PARTNER_APPLICATION) {
        if (role.includes('partner_relations')) {
            return { eligible: true, assignee: partner };
        }
        return { eligible: false, reason: 'Assignee is not eligible for partner applications' };
    }

    if (reqType === RequestType.PROPERTY_LISTING_REQUEST || reqType === RequestType.PROPERTY_INQUIRY) {
        if (role.includes('listings') || role.includes('real_estate') || type === 'developer' || type === 'agency') {
            return { eligible: true, assignee: partner };
        }
        return { eligible: false, reason: 'Assignee is not eligible for real estate domain' };
    }

    if (serviceType === 'finishing' || reqPayload.category === 'turnkey') {
        if (role.includes('finishing') || type === 'finishing') {
            return { eligible: true, assignee: partner };
        }
        return { eligible: false, reason: 'Assignee is not eligible for finishing domain' };
    }

    if (serviceType === 'decorations' || serviceType === 'decoration') {
        if (role.includes('decoration') || type === 'decoration') {
            return { eligible: true, assignee: partner };
        }
        return { eligible: false, reason: 'Assignee is not eligible for decorations domain' };
    }

    if (reqType === RequestType.CONTACT_MESSAGE) {
        if (role.includes('customer_relations') || role.includes('service')) {
            return { eligible: true, assignee: partner };
        }
        return { eligible: false, reason: 'Assignee is not eligible for customer care domain' };
    }

    if (role.includes('manager')) {
        return { eligible: true, assignee: partner };
    }

    return { eligible: false, reason: 'Assignee role does not match request domain' };
};

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

/**
 * Section 4: Operations Center — True Server-Side Data Handling
 * Server-backed pagination, filtering, search, sorting, and metrics calculation
 */
export const getUnifiedRequests = async (filter: UnifiedRequestsFilter = {}): Promise<UnifiedRequestsResponse> => {
    // 1. Fetch active partners for label hydration
    const partners = await getAllPartnersForAdmin().catch(() => []);
    const managersMap = new Map<string, string>();
    (partners || []).forEach(p => {
        managersMap.set(p.id, p.name || p.email);
    });

    // 2. Build authoritative server-side Supabase query
    let query = supabase.from('requests').select('*', { count: 'exact' });

    // Server-side Domain / Type filter
    if (filter.type && filter.type !== 'all') {
        query = query.eq('type', filter.type);
    } else if (filter.domain && filter.domain !== 'all') {
        switch (filter.domain) {
            case 'partners':
                query = query.eq('type', RequestType.PARTNER_APPLICATION);
                break;
            case 'real_estate':
                query = query.in('type', [RequestType.PROPERTY_LISTING_REQUEST, RequestType.PROPERTY_INQUIRY]);
                break;
            case 'customer_care':
                query = query.eq('type', RequestType.CONTACT_MESSAGE);
                break;
            case 'finishing':
                query = query.eq('type', RequestType.LEAD).filter('payload->>serviceType', 'eq', 'finishing');
                break;
            case 'decorations':
                query = query.eq('type', RequestType.LEAD).filter('payload->>serviceType', 'eq', 'decorations');
                break;
            case 'commercial':
                // Exclude finishing and decorations leads (P1.3)
                query = query.eq('type', RequestType.LEAD).not('payload->>serviceType', 'in', '(finishing,decorations)');
                break;
        }
    }

    // Server-side Date Range filter (P1.1)
    if (filter.dateRange && filter.dateRange !== 'all') {
        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        switch (filter.dateRange) {
            case 'today':
                query = query.gte('created_at', todayMidnight);
                break;
            case 'last7days':
                query = query.gte('created_at', sevenDaysAgo);
                break;
            case 'last30days':
                query = query.gte('created_at', thirtyDaysAgo);
                break;
            case 'older':
                query = query.lt('created_at', thirtyDaysAgo);
                break;
        }
    }

    // Server-side Operational Status filter aligned with canonical mapping (P1.4)
    if (filter.operationalStatus && filter.operationalStatus !== 'all') {
        switch (filter.operationalStatus) {
            case OperationalStatus.RESOLVED:
                query = query.or('payload->>operationalStatus.eq.RESOLVED,status.in.(completed,approved,verified,won,resolved)');
                break;
            case OperationalStatus.CLOSED:
                query = query.or('payload->>operationalStatus.eq.CLOSED,status.in.(closed,lost)');
                break;
            case OperationalStatus.REJECTED:
                query = query.or('payload->>operationalStatus.eq.REJECTED,status.in.(rejected,cancelled,declined)');
                break;
            case OperationalStatus.WAITING:
                query = query.or('payload->>operationalStatus.eq.WAITING,status.in.(quoted,waiting,viewing)');
                break;
            case OperationalStatus.IN_PROGRESS:
                query = query.or('payload->>operationalStatus.eq.IN_PROGRESS,status.in.(contacted,site-visit,in-progress,qualified)');
                break;
            case OperationalStatus.NEW:
                query = query.or('payload->>operationalStatus.eq.NEW,and(status.in.(new,pending),assigned_to.is.null)');
                break;
            case OperationalStatus.ASSIGNED:
                query = query.or('payload->>operationalStatus.eq.ASSIGNED,status.eq.assigned,and(status.in.(new,pending),assigned_to.not.is.null)');
                break;
            default:
                query = query.or(`payload->>operationalStatus.eq.${filter.operationalStatus},status.eq.${String(filter.operationalStatus).toLowerCase()}`);
                break;
        }
    }

    // Server-side Assignee filter
    if (filter.assignedTo) {
        if (filter.assignedTo === 'unassigned') {
            query = query.is('assigned_to', null);
        } else if (filter.assignedTo !== 'all') {
            query = query.eq('assigned_to', filter.assignedTo);
        }
    }

    // Server-side Triage View filter covering all advertised views (P1.2)
    if (filter.triageView && filter.triageView !== 'all') {
        switch (filter.triageView) {
            case 'unassigned':
                query = query.is('assigned_to', null);
                break;
            case 'new':
                query = query.or('payload->>operationalStatus.eq.NEW,and(status.in.(new,pending),assigned_to.is.null)');
                break;
            case 'waiting':
                query = query.or('payload->>operationalStatus.eq.WAITING,status.in.(quoted,waiting,viewing)');
                break;
            case 'resolved':
                query = query.or('payload->>operationalStatus.eq.RESOLVED,status.in.(completed,approved,verified,won,resolved)');
                break;
            case 'high_priority': {
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
                query = query.or(
                    `payload->>priority.eq.high,type.eq.${RequestType.PARTNER_APPLICATION},and(assigned_to.is.null,created_at.lt.${oneDayAgo}),created_at.lt.${twoDaysAgo}`
                ).not('status', 'in', '(completed,approved,closed,rejected,won,lost,cancelled,declined)');
                break;
            }
            case 'aged': {
                const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
                query = query.lt('created_at', twoDaysAgo).not('status', 'in', '(completed,approved,closed,rejected,won,lost,cancelled,declined)');
                break;
            }
            case 'recently_updated': {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                query = query.gte('updated_at', twentyFourHoursAgo);
                break;
            }
        }
    }

    // Server-side Search Term filter
    if (filter.searchTerm && filter.searchTerm.trim()) {
        const term = filter.searchTerm.trim();
        query = query.or(`requester_name.ilike.%${term}%,requester_phone.ilike.%${term}%,requester_email.ilike.%${term}%`);
    }

    // Server-side Priority filter aligned with authoritative derivation (P1.5)
    if (filter.priority && filter.priority !== 'all') {
        if (filter.priority === 'high') {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
            query = query.or(
                `payload->>priority.eq.high,type.eq.${RequestType.PARTNER_APPLICATION},and(assigned_to.is.null,created_at.lt.${oneDayAgo}),created_at.lt.${twoDaysAgo}`
            ).not('status', 'in', '(completed,approved,closed,rejected,won,lost,cancelled,declined)');
        } else if (filter.priority === 'low') {
            query = query.or('payload->>priority.eq.low,status.in.(completed,approved,verified,won,closed,lost,rejected,cancelled,declined)');
        } else if (filter.priority === 'medium') {
            query = query.or('payload->>priority.eq.medium,and(payload->>priority.is.null,type.neq.PARTNER_APPLICATION,status.not.in.(completed,approved,verified,won,closed,lost,rejected,cancelled,declined))');
        }
    }

    // Server-side Sorting
    query = query.order('created_at', { ascending: false });

    // Server-side Pagination
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.max(1, filter.pageSize || 15);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: rawRows, count, error } = await query;
    if (error) {
        console.error('Error fetching unified requests from Supabase:', error.message);
        throw error;
    }

    const mappedRequests = (rawRows || []).map(r => mapRequestToUnified(mapRequestFromDb(r), managersMap));

    // Calculate metrics via lightweight targeted counts aligned with canonical mappings
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const [
        totalRes,
        unassignedRes,
        newRes,
        inProgressRes,
        waitingRes,
        agedRes,
        highPriorityRes,
        resolvedTodayRes
    ] = await Promise.all([
        supabase.from('requests').select('*', { count: 'exact', head: true }),
        supabase.from('requests').select('*', { count: 'exact', head: true }).is('assigned_to', null),
        supabase.from('requests').select('*', { count: 'exact', head: true }).or('payload->>operationalStatus.eq.NEW,and(status.in.(new,pending),assigned_to.is.null)'),
        supabase.from('requests').select('*', { count: 'exact', head: true }).or('payload->>operationalStatus.eq.IN_PROGRESS,status.in.(contacted,site-visit,in-progress,qualified)'),
        supabase.from('requests').select('*', { count: 'exact', head: true }).or('payload->>operationalStatus.eq.WAITING,status.in.(quoted,waiting,viewing)'),
        supabase.from('requests').select('*', { count: 'exact', head: true }).lt('created_at', twoDaysAgo).not('status', 'in', '(completed,approved,closed,rejected,won,lost,cancelled,declined)'),
        supabase.from('requests').select('*', { count: 'exact', head: true }).or(`payload->>priority.eq.high,type.eq.${RequestType.PARTNER_APPLICATION},and(assigned_to.is.null,created_at.lt.${oneDayAgo}),created_at.lt.${twoDaysAgo}`).not('status', 'in', '(completed,approved,closed,rejected,won,lost,cancelled,declined)'),
        supabase.from('requests').select('*', { count: 'exact', head: true }).gte('updated_at', todayMidnight).or('status.in.(completed,approved,verified,won,resolved),payload->>operationalStatus.eq.RESOLVED')
    ]);

    const metrics: OperationalMetrics = {
        total: totalRes.count || 0,
        unassigned: unassignedRes.count || 0,
        newCount: newRes.count || 0,
        inProgress: inProgressRes.count || 0,
        waiting: waitingRes.count || 0,
        agedRisk: agedRes.count || 0,
        highPriority: highPriorityRes.count || 0,
        resolvedToday: resolvedTodayRes.count || 0
    };

    return {
        requests: mappedRequests,
        totalCount: count ?? (rawRows?.length || 0),
        metrics
    };
};

/**
 * Section 7: Assign request enforcing Actor Authorization + Assignee Eligibility
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

    // Validate assignee eligibility
    const eligibility = await validateAssigneeEligibility(assigneeId, req);
    if (!eligibility.eligible) {
        throw new Error(eligibility.reason || 'Assignee is not eligible for this request');
    }

    const previousAssignee = req.assignedTo;
    const { data: { session } } = await supabase.auth.getSession();
    const actorId = session?.user?.id || 'admin';

    // Update in Supabase
    const updated = await updateRequest(requestId, {
        assignedTo: assigneeId,
        payload: {
            ...(req.payload || {}),
            operationalStatus: OperationalStatus.ASSIGNED,
            operationalStatusUpdatedAt: new Date().toISOString()
        }
    });

    if (!updated) throw new Error('Failed to update assignment in database');

    // Insert audit note in request_messages
    try {
        await supabase.from('request_messages').insert({
            request_id: requestId,
            sender: 'admin',
            sender_id: actorId,
            type: 'note',
            content: `[ASSIGNMENT] Reassigned ownership from ${previousAssignee || 'Unassigned'} to ${assigneeId}${noteText ? '. Note: ' + noteText : ''}`,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Could not insert assignment message into request_messages:', e);
    }

    // Send notification to assignee
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
    const { data: { session } } = await supabase.auth.getSession();
    const actorId = session?.user?.id || 'admin';

    const updated = await updateRequest(requestId, {
        assignedTo: null as any,
        payload: {
            ...(req.payload || {}),
            operationalStatus: OperationalStatus.NEW,
            operationalStatusUpdatedAt: new Date().toISOString()
        }
    });

    if (!updated) throw new Error('Failed to clear assignment in database');

    try {
        await supabase.from('request_messages').insert({
            request_id: requestId,
            sender: 'admin',
            sender_id: actorId,
            type: 'note',
            content: `[ASSIGNMENT] Cleared assignment (previously assigned to ${previousAssignee || 'none'})${noteText ? '. Reason: ' + noteText : ''}`,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Could not log unassignment event:', e);
    }

    return updated;
};

/**
 * Section 6: Operational Status != Domain Status
 * Maintain transparent separation without blindly overwriting domain status
 */
export const updateRequestOperationalStatus = async (
    requestId: string, 
    newOperationalStatus: OperationalStatus, 
    explicitDomainStatus?: string, 
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

    const previousOperational = req.payload?.operationalStatus || mapDomainStatusToOperational(req.status, req.assignedTo);
    const { data: { session } } = await supabase.auth.getSession();
    const actorId = session?.user?.id || 'admin';

    // Store operational status strictly in payload
    const updatedPayload = { 
        ...(req.payload || {}), 
        operationalStatus: newOperationalStatus,
        operationalStatusUpdatedAt: new Date().toISOString()
    };

    const updateFields: Partial<Request> = {
        payload: updatedPayload
    };

    // Only update domain status if explicitly specified and valid for this domain
    if (explicitDomainStatus && explicitDomainStatus.trim().length > 0) {
        updateFields.status = explicitDomainStatus as RequestStatus;
        updatedPayload.status = explicitDomainStatus;
    }

    const updated = await updateRequest(requestId, updateFields);
    if (!updated) throw new Error('Failed to update status in database');

    // Record audit event in request_messages
    try {
        await supabase.from('request_messages').insert({
            request_id: requestId,
            sender: 'admin',
            sender_id: actorId,
            type: 'note',
            content: `[STATUS] Operational status changed from ${previousOperational} to ${newOperationalStatus}${explicitDomainStatus ? ' (Domain Status: ' + explicitDomainStatus + ')' : ''}${noteText ? '. Note: ' + noteText : ''}`,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.warn('Could not log status update event:', e);
    }

    return updated;
};

/**
 * Section 8: Internal operational note visible ONLY to authorized internal staff
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

    const { data, error } = await supabase
        .from('request_messages')
        .insert({
            request_id: requestId,
            sender: (senderRole === Role.SUPER_ADMIN || String(senderRole).includes('_manager') ? 'admin' : 'partner'),
            sender_id: senderId || null,
            type: 'note',
            content,
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to create internal note in Supabase:', error.message);
        throw error;
    }

    // Update request updated_at timestamp
    await updateRequest(requestId, { updatedAt: new Date().toISOString() });

    return {
        id: data.id,
        sender: data.sender,
        senderId: data.sender_id,
        type: 'note',
        content: data.content,
        timestamp: data.created_at
    };
};


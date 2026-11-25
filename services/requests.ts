
import { supabase } from '../lib/supabase';
import { RequestType, Role, Permission, OperationalStatus } from '../types';
import type { Request, RequestStatus, Lead, LeadMessage, RequestHistoryEntry, UnifiedRequest, OperationalDomain, OperationalMetrics, Partner } from '../types';
import { addNotification } from './notifications';
import { requireAnyPermission } from './authGuard';
import { getPartnerById, getAllPartnersForAdmin, mapPartnerFromDb } from './partners';
import { addLead } from './leads';
import { evaluateRoutingRules } from './routingRules';
import { resolvePropertyReferenceCode, resolveServiceReferenceCode } from '../utils/propertyFormShared';

export const isValidUUID = (id?: string): boolean => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

// Helper to map DB row to Request object
export const mapRequestFromDb = (row: any): Request => ({
    id: row.id,
    cityId: row.city_id || row.payload?.cityId || row.payload?.propertyDetails?.cityId || 'heliopolis',
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

export const getRequestById = async (
    id: string,
    options?: { client?: any }
): Promise<Request | undefined> => {
    try {
        const dbClient = options?.client || supabase;
        const { data, error } = await dbClient
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

    const resolvedCityId = (data as any).cityId || (finalPayload as any)?.cityId || (finalPayload as any)?.propertyDetails?.cityId || 'heliopolis';
    const resolvedPropId = (finalPayload as any)?.propertyId;
    const enrichedPayload = {
        ...(finalPayload || {}),
        cityId: resolvedCityId,
        ...(resolvedPropId && !(finalPayload as any)?.propertyReference
            ? { propertyReference: resolvePropertyReferenceCode(resolvedPropId) }
            : {}),
        requesterInfo: enrichedRequesterInfo
    };

    // Prepare payload for DB
    const dbPayload: any = {
        city_id: resolvedCityId,
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

export const updateRequest = async (
    id: string,
    updates: Partial<Request>,
    options?: { client?: any }
): Promise<Request | undefined> => {
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

    const dbClient = options?.client || supabase;
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
    if (updates.payload !== undefined) dbUpdates.payload = updates.payload;
    if (updates.cityId !== undefined) dbUpdates.city_id = updates.cityId;
    
    dbUpdates.updated_at = new Date().toISOString();

    let { data, error } = await dbClient
        .from('requests')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error && 'city_id' in dbUpdates && String(error.message || '').toLowerCase().includes('city_id')) {
        const { city_id: _ignored, ...legacyUpdates } = dbUpdates;
        const retry = await dbClient.from('requests').update(legacyUpdates).eq('id', id).select().single();
        data = retry.data;
        error = retry.error;
    }

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
    const normalizedViewerRole = String(viewerRole || '').trim().toLowerCase();
    const isInternalStaff = normalizedViewerRole === Role.SUPER_ADMIN || normalizedViewerRole.includes('_manager');

    if (!isInternalStaff) {
        query = query.eq('type', 'message');
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching request messages:', error);
        throw error;
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

const RESOLVED_DB_STATUSES = ['completed', 'approved', 'verified', 'won', 'resolved'] as const;
const CLOSED_DB_STATUSES = ['closed', 'lost'] as const;
const REJECTED_DB_STATUSES = ['rejected', 'cancelled', 'declined'] as const;
const ALL_TERMINAL_DB_STATUSES = [...RESOLVED_DB_STATUSES, ...CLOSED_DB_STATUSES, ...REJECTED_DB_STATUSES] as const;
const TERMINAL_DB_STATUS_IN = `(${ALL_TERMINAL_DB_STATUSES.join(',')})`;
const TERMINAL_OP_STATUS_IN = '(RESOLVED,CLOSED,REJECTED)';

export const parseValidDateMs = (dateStr?: string | null): number | null => {
    if (!dateStr) return null;
    const ms = new Date(dateStr).getTime();
    return Number.isFinite(ms) ? ms : null;
};

export const mapDomainStatusToOperational = (status?: string, assignedTo?: string): OperationalStatus => {
    const s = String(status || '').toLowerCase().trim();
    if ((RESOLVED_DB_STATUSES as readonly string[]).includes(s)) return OperationalStatus.RESOLVED;
    if ((CLOSED_DB_STATUSES as readonly string[]).includes(s)) return OperationalStatus.CLOSED;
    if ((REJECTED_DB_STATUSES as readonly string[]).includes(s)) return OperationalStatus.REJECTED;
    if (['quoted', 'waiting', 'viewing'].includes(s)) return OperationalStatus.WAITING;
    if (['contacted', 'site-visit', 'in-progress', 'qualified'].includes(s)) return OperationalStatus.IN_PROGRESS;
    if (['assigned'].includes(s)) return OperationalStatus.ASSIGNED;
    if (['new', 'pending'].includes(s)) {
        return assignedTo ? OperationalStatus.ASSIGNED : OperationalStatus.NEW;
    }
    return assignedTo ? OperationalStatus.ASSIGNED : OperationalStatus.NEW;
};

export const resolveOperationalStatus = (
    req: { status?: string; assignedTo?: string | null },
    payload: any = {}
): OperationalStatus => {
    const domainStatus = String(payload?.status || req.status || 'new');
    const domainMapped = mapDomainStatusToOperational(domainStatus, req.assignedTo || undefined);
    if ([OperationalStatus.RESOLVED, OperationalStatus.CLOSED, OperationalStatus.REJECTED].includes(domainMapped)) {
        return domainMapped;
    }
    const explicitOp = payload?.operationalStatus;
    if (explicitOp && Object.values(OperationalStatus).includes(explicitOp as OperationalStatus)) {
        return explicitOp as OperationalStatus;
    }
    return domainMapped;
};

export const resolveOperationalDomain = (type: RequestType, payload: any = {}): OperationalDomain => {
    switch (type) {
        case RequestType.PARTNER_APPLICATION:
            return 'partners';
        case RequestType.PROPERTY_LISTING_REQUEST:
        case RequestType.PROPERTY_INQUIRY:
            return 'real_estate';
        case RequestType.CONTACT_MESSAGE:
            return 'customer_care';
        case RequestType.LEAD:
        default: {
            const serviceType = String(payload?.serviceType || '').trim().toLowerCase();
            if (serviceType === 'finishing') return 'finishing';
            if (serviceType === 'decorations' || serviceType === 'decoration') return 'decorations';
            if (
                serviceType === 'property' ||
                serviceType === 'property_search' ||
                payload?.propertyId ||
                payload?.propertyTitle
            ) {
                return 'real_estate';
            }
            return 'commercial';
        }
    }
};

export const deriveRequestPriority = (
    req: { type?: string; assignedTo?: string | null; createdAt?: string; status?: string },
    payload: any = {},
    nowMs: number = Date.now()
): 'high' | 'medium' | 'low' => {
    const operationalStatus = resolveOperationalStatus(req, payload);
    const isClosedOrResolved = [OperationalStatus.RESOLVED, OperationalStatus.CLOSED, OperationalStatus.REJECTED].includes(operationalStatus);
    if (isClosedOrResolved) return 'low';

    const createdMs = parseValidDateMs(req.createdAt);
    const elapsedMs = createdMs !== null ? Math.max(0, nowMs - createdMs) : 0;
    const isOver24h = elapsedMs > 24 * 60 * 60 * 1000;
    const isAged = elapsedMs > 48 * 60 * 60 * 1000;

    if (payload.priority === 'high') return 'high';
    if (!req.assignedTo && isOver24h) return 'high';
    if (isAged) return 'high';
    if (req.type === RequestType.PARTNER_APPLICATION) return 'high';
    if (payload.estimatedCost && Number(payload.estimatedCost) > 1000000) return 'high';

    if (payload.priority === 'low') return 'low';
    return 'medium';
};

export const mapRequestToUnified = (
    req: Request,
    partnersMap?: Map<string, string>,
    nowMs: number = Date.now()
): UnifiedRequest => {
    const payload = req.payload || {};
    const createdMs = parseValidDateMs(req.createdAt);
    const updatedMs = parseValidDateMs(req.updatedAt);
    const ageHours = createdMs !== null ? Math.max(0, Math.round((nowMs - createdMs) / (1000 * 60 * 60))) : 0;
    const safeCreatedAt = createdMs !== null ? new Date(createdMs).toISOString() : new Date(nowMs).toISOString();
    const safeUpdatedAt = updatedMs !== null ? new Date(updatedMs).toISOString() : safeCreatedAt;

    // Domain determination
    const domain = resolveOperationalDomain(req.type, payload);
    let typeLabel = { en: 'Lead', ar: 'طلب عميل' };
    let domainLabel = { en: 'Commercial', ar: 'القطاع التجاري' };

    switch (req.type) {
        case RequestType.PARTNER_APPLICATION:
            typeLabel = { en: 'Partner Application', ar: 'طلب انضمام شريك' };
            domainLabel = { en: 'Partners', ar: 'الشركاء' };
            break;
        case RequestType.PROPERTY_LISTING_REQUEST:
            typeLabel = { en: 'Property Listing Request', ar: 'طلب إضافة عقار' };
            domainLabel = { en: 'Real Estate', ar: 'العقارات' };
            break;
        case RequestType.PROPERTY_INQUIRY:
            typeLabel = { en: 'Property Search Inquiry', ar: 'استفسار طلب عقار' };
            domainLabel = { en: 'Real Estate', ar: 'العقارات' };
            break;
        case RequestType.CONTACT_MESSAGE:
            typeLabel = { en: 'Contact Message', ar: 'رسالة اتصل بنا' };
            domainLabel = { en: 'Customer Care', ar: 'خدمة العملاء' };
            break;
        case RequestType.LEAD:
        default:
            if (domain === 'finishing') {
                typeLabel = { en: 'Finishing Request', ar: 'طلب تشطيب' };
                domainLabel = { en: 'Finishing', ar: 'التشطيبات' };
            } else if (domain === 'decorations') {
                typeLabel = { en: 'Decoration Request', ar: 'طلب ديكور وتصميم' };
                domainLabel = { en: 'Decorations', ar: 'الديكور' };
            } else if (domain === 'real_estate') {
                typeLabel = { en: 'Property Inquiry Lead', ar: 'عميل استفسار عقار' };
                domainLabel = { en: 'Real Estate', ar: 'العقارات' };
            } else {
                typeLabel = { en: 'Commercial Lead', ar: 'عميل محتمل' };
                domainLabel = { en: 'Commercial', ar: 'القطاع التجاري' };
            }
            break;
    }

    const domainStatus = String(payload.status || req.status || 'new');
    const operationalStatus = resolveOperationalStatus(req, payload);
    const isClosedOrResolved = [OperationalStatus.RESOLVED, OperationalStatus.CLOSED, OperationalStatus.REJECTED].includes(operationalStatus);
    const elapsedMs = createdMs !== null ? Math.max(0, nowMs - createdMs) : 0;
    const isAged = elapsedMs > 48 * 60 * 60 * 1000 && !isClosedOrResolved;
    // Priority derivation using authoritative logic (P1.5)
    const priority = deriveRequestPriority(req, payload, nowMs);

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
    } else if (domain === 'finishing') {
        detailRoute = `/admin/platform-finishing/requests/${req.id}`;
    } else if (domain === 'decorations') {
        detailRoute = `/admin/platform-decorations/requests/${req.id}`;
    } else if (req.type === RequestType.LEAD) {
        detailRoute = `/admin/leads?highlight=${req.id}`;
    }

    const assignedToName = req.assignedTo && partnersMap?.get(req.assignedTo) ? partnersMap.get(req.assignedTo) : (req.assignedTo ? 'Team Member' : undefined);
    const linkedPropertyId = payload.propertyId || undefined;
    const linkedPropertyRef = linkedPropertyId
        ? resolvePropertyReferenceCode(linkedPropertyId, payload.propertyReference)
        : (payload.propertyReference || undefined);
    const createdPropId = payload.createdPropertyId || undefined;
    const createdPropRef = createdPropId
        ? resolvePropertyReferenceCode(createdPropId, payload.createdPropertyReference)
        : (payload.createdPropertyReference || undefined);

    const contactSubject = payload.inquiryType
        ? `${payload.inquiryType}${payload.companyName ? ` — ${payload.companyName}` : ''}`
        : payload.companyName;
    const inquirySubject = payload.propertyTitle
        || (payload.propertyType || payload.purpose
            ? [payload.propertyType, payload.purpose].filter(Boolean).join(' • ')
            : undefined);

    const resolvedServiceTitle =
        payload.serviceTitle ||
        (req.type === RequestType.CONTACT_MESSAGE ? contactSubject : undefined) ||
        (req.type === RequestType.PROPERTY_INQUIRY ? inquirySubject : undefined) ||
        payload.companyName ||
        payload.propertyDetails?.title?.ar ||
        payload.propertyDetails?.title?.en;

    const resolvedServiceId = payload.serviceId || undefined;
    const resolvedServiceRef = resolvedServiceId
        ? resolveServiceReferenceCode('finishing', resolvedServiceId, payload.serviceReference)
        : (payload.serviceReference || undefined);
    const resolvedWorkItemId = payload.workItemId || payload.workItem?.id || undefined;
    const resolvedWorkItemRef = resolvedWorkItemId
        ? resolveServiceReferenceCode('decoration', resolvedWorkItemId, payload.workItemReference)
        : (payload.workItemReference || undefined);
    const resolvedWorkItemTitle = payload.workItemTitle || payload.workItem?.title?.ar || payload.workItem?.title?.en || undefined;
    const resolvedWorkItemImage = payload.workItemImage || payload.workItem?.imageUrl || payload.referenceImage || undefined;
    const resolvedWorkItemPrice = payload.workItemPrice !== undefined
        ? Number(payload.workItemPrice)
        : (payload.workItem?.price !== undefined ? Number(payload.workItem.price) : undefined);
    const resolvedCategoryName = payload.categoryName || payload.itemCategory || payload.workItem?.category?.ar || payload.workItem?.category?.en || undefined;
    const resolvedPartnerName = payload.partnerName
        || (payload.partnerId && partnersMap?.get(payload.partnerId))
        || payload.companyName
        || undefined;

    return {
        id: req.id,
        cityId: req.cityId || payload.cityId || payload.propertyDetails?.cityId || 'heliopolis',
        type: req.type,
        typeLabel,
        domain,
        domainLabel,
        createdAt: safeCreatedAt,
        updatedAt: safeUpdatedAt,
        ageHours,
        isAged,
        requester: {
            name: req.requesterInfo?.name || payload.customerName || 'Anonymous',
            email: req.requesterInfo?.email || payload.customerEmail,
            phone: req.requesterInfo?.phone || payload.customerPhone,
            customerId: req.customerId || req.requesterInfo?.customerId,
        },
        context: {
            propertyId: linkedPropertyId,
            propertyReference: linkedPropertyRef,
            propertyTitle: payload.propertyTitle || payload.propertyDetails?.title?.ar || payload.propertyDetails?.title?.en,
            createdPropertyId: createdPropId,
            createdPropertyReference: createdPropRef,
            projectId: payload.projectId,
            projectTitle: payload.projectName?.ar || payload.projectName?.en,
            partnerId: payload.partnerId,
            partnerName: resolvedPartnerName,
            serviceType: payload.serviceType,
            serviceTitle: resolvedServiceTitle,
            serviceId: resolvedServiceId,
            serviceReference: resolvedServiceRef,
            tierId: payload.tierId || payload.tierDetails?.id,
            workItemId: resolvedWorkItemId,
            workItemTitle: resolvedWorkItemTitle,
            workItemReference: resolvedWorkItemRef,
            workItemImage: resolvedWorkItemImage,
            workItemPrice: resolvedWorkItemPrice,
            categoryId: payload.categoryId,
            categoryName: resolvedCategoryName,
            estimatedCost: payload.estimatedCost ? Number(payload.estimatedCost) : undefined,
            source: payload.source || 'web_form',
            utmSource: payload.utmSource || payload.utm_source,
            details: payload.message || payload.details || payload.customerNotes || (typeof payload.description === 'string' ? payload.description : (payload.description?.ar || payload.description?.en)),
            images: payload.images || (resolvedWorkItemImage ? [resolvedWorkItemImage] : []),
        },
        domainStatus,
        operationalStatus,
        priority,
        assignedTo: req.assignedTo,
        assignedToName,
        lastActivity: safeUpdatedAt,
        nextAction,
        detailRoute,
        rawPayload: payload,
    };
};

export interface UnifiedRequestsFilter {
    cityId?: string | 'all';
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

export const computeDateRangeBounds = (
    dateRange?: UnifiedRequestsFilter['dateRange'] | string,
    now: Date = new Date()
): { gteIso?: string; ltIso?: string; isValid: boolean } => {
    const nowMs = now.getTime();
    if (!Number.isFinite(nowMs)) return { isValid: false };

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString();

    switch (dateRange) {
        case 'today':
            return { gteIso: todayMidnight, isValid: true };
        case 'last7days':
            return { gteIso: sevenDaysAgo, isValid: true };
        case 'last30days':
            return { gteIso: thirtyDaysAgo, isValid: true };
        case 'older':
            return { ltIso: thirtyDaysAgo, isValid: true };
        case 'all':
        case undefined:
            return { isValid: true };
        default:
            return { isValid: false };
    }
};

export const matchesUnifiedRequestFilter = (
    req: UnifiedRequest,
    filter: UnifiedRequestsFilter = {},
    now: Date = new Date()
): boolean => {
    const nowMs = now.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const twoDaysMs = 48 * 60 * 60 * 1000;

    if (filter.cityId && filter.cityId !== 'all' && filter.cityId !== 'hub') {
        const reqCity = String(req.cityId || req.rawPayload?.cityId || 'heliopolis').toLowerCase();
        if (reqCity !== filter.cityId.toLowerCase()) return false;
    }

    if (filter.type && filter.type !== 'all' && req.type !== filter.type) {
        return false;
    }

    if ((!filter.type || filter.type === 'all') && filter.domain && filter.domain !== 'all') {
        if (req.domain !== filter.domain) return false;
    }

    if (filter.dateRange && filter.dateRange !== 'all') {
        const bounds = computeDateRangeBounds(filter.dateRange, now);
        if (bounds.isValid) {
            const createdMs = parseValidDateMs(req.createdAt);
            if (createdMs === null) return false;
            if (bounds.gteIso && createdMs < new Date(bounds.gteIso).getTime()) return false;
            if (bounds.ltIso && createdMs >= new Date(bounds.ltIso).getTime()) return false;
        }
    }

    if (filter.operationalStatus && filter.operationalStatus !== 'all') {
        if (req.operationalStatus !== filter.operationalStatus) return false;
    }

    if (filter.assignedTo && filter.assignedTo !== 'all') {
        if (filter.assignedTo === 'unassigned') {
            if (req.assignedTo) return false;
        } else if (req.assignedTo !== filter.assignedTo) {
            return false;
        }
    }

    if (filter.triageView && filter.triageView !== 'all') {
        const createdMs = parseValidDateMs(req.createdAt);
        const updatedMs = parseValidDateMs(req.updatedAt);
        const isTerminal = [OperationalStatus.RESOLVED, OperationalStatus.CLOSED, OperationalStatus.REJECTED].includes(req.operationalStatus);

        switch (filter.triageView) {
            case 'unassigned':
                if (req.assignedTo) return false;
                break;
            case 'new':
                if (req.operationalStatus !== OperationalStatus.NEW) return false;
                break;
            case 'waiting':
                if (req.operationalStatus !== OperationalStatus.WAITING) return false;
                break;
            case 'resolved':
                if (req.operationalStatus !== OperationalStatus.RESOLVED) return false;
                break;
            case 'aged':
                if (isTerminal || createdMs === null || createdMs >= nowMs - twoDaysMs) return false;
                break;
            case 'recently_updated':
                if (updatedMs === null || updatedMs < nowMs - oneDayMs) return false;
                break;
            case 'high_priority':
                if (req.priority !== 'high') return false;
                break;
        }
    }

    if (filter.priority && filter.priority !== 'all') {
        if (req.priority !== filter.priority) return false;
    }

    if (filter.searchTerm && filter.searchTerm.trim()) {
        const term = filter.searchTerm.trim().toLowerCase();
        const haystacks = [
            req.id,
            req.requester.name,
            req.requester.phone,
            req.requester.email,
            req.context.propertyReference,
            req.context.propertyTitle,
            req.context.createdPropertyReference,
            req.context.serviceTitle,
            req.context.serviceReference,
            req.context.workItemTitle,
            req.context.workItemReference,
            req.context.categoryName,
            req.context.partnerName,
        ].filter(Boolean).map(v => String(v).toLowerCase());
        if (!haystacks.some(h => h.includes(term))) return false;
    }

    return true;
};

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

    // Only canonical Super Admin can be assigned any request
    if (role === Role.SUPER_ADMIN) {
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
export const applyUnifiedRequestsQueryFilters = (
    initialQuery: any,
    filter: UnifiedRequestsFilter = {},
    now: Date = new Date()
) => {
    let query = initialQuery;
    const nowMs = now.getTime();
    const oneDayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(nowMs - 48 * 60 * 60 * 1000).toISOString();

    // Server-side Domain / Type filter
    if (filter.type && filter.type !== 'all') {
        query = query.eq('type', filter.type);
    } else if (filter.domain && filter.domain !== 'all') {
        switch (filter.domain) {
            case 'partners':
                query = query.eq('type', RequestType.PARTNER_APPLICATION);
                break;
            case 'real_estate':
                query = query.or(
                    `type.in.(${RequestType.PROPERTY_LISTING_REQUEST},${RequestType.PROPERTY_INQUIRY}),and(type.eq.${RequestType.LEAD},or(payload->>serviceType.eq.property,payload->>serviceType.eq.property_search,payload->>propertyId.not.is.null,payload->>propertyTitle.not.is.null))`
                );
                break;
            case 'customer_care':
                query = query.eq('type', RequestType.CONTACT_MESSAGE);
                break;
            case 'finishing':
                query = query.eq('type', RequestType.LEAD).filter('payload->>serviceType', 'eq', 'finishing');
                break;
            case 'decorations':
                query = query.eq('type', RequestType.LEAD).or('payload->>serviceType.eq.decorations,payload->>serviceType.eq.decoration');
                break;
            case 'commercial':
                // Exclude finishing, decorations, and real estate property leads while preserving NULL serviceType leads (P1.3)
                query = query
                    .eq('type', RequestType.LEAD)
                    .or('payload->>serviceType.is.null,payload->>serviceType.not.in.(finishing,decorations,decoration,property,property_search)')
                    .is('payload->>propertyId', null)
                    .is('payload->>propertyTitle', null);
                break;
        }
    }

    // Server-side Date Range filter (P1.1)
    if (filter.dateRange && filter.dateRange !== 'all') {
        const bounds = computeDateRangeBounds(filter.dateRange, now);
        if (bounds.isValid) {
            if (bounds.gteIso) {
                query = query.gte('created_at', bounds.gteIso);
            }
            if (bounds.ltIso) {
                query = query.lt('created_at', bounds.ltIso);
            }
        }
    }

    // Server-side Operational Status filter aligned with canonical mapping & terminal precedence (P1.4)
    if (filter.operationalStatus && filter.operationalStatus !== 'all') {
        switch (filter.operationalStatus) {
            case OperationalStatus.RESOLVED:
                query = query.or(`status.in.(${RESOLVED_DB_STATUSES.join(',')}),and(status.not.in.${TERMINAL_DB_STATUS_IN},payload->>operationalStatus.eq.RESOLVED)`);
                break;
            case OperationalStatus.CLOSED:
                query = query.or(`status.in.(${CLOSED_DB_STATUSES.join(',')}),and(status.not.in.${TERMINAL_DB_STATUS_IN},payload->>operationalStatus.eq.CLOSED)`);
                break;
            case OperationalStatus.REJECTED:
                query = query.or(`status.in.(${REJECTED_DB_STATUSES.join(',')}),and(status.not.in.${TERMINAL_DB_STATUS_IN},payload->>operationalStatus.eq.REJECTED)`);
                break;
            case OperationalStatus.WAITING:
                query = query
                    .not('status', 'in', TERMINAL_DB_STATUS_IN)
                    .or('payload->>operationalStatus.eq.WAITING,and(payload->>operationalStatus.is.null,status.in.(quoted,waiting,viewing))');
                break;
            case OperationalStatus.IN_PROGRESS:
                query = query
                    .not('status', 'in', TERMINAL_DB_STATUS_IN)
                    .or('payload->>operationalStatus.eq.IN_PROGRESS,and(payload->>operationalStatus.is.null,status.in.(contacted,site-visit,in-progress,qualified))');
                break;
            case OperationalStatus.NEW:
                query = query
                    .not('status', 'in', TERMINAL_DB_STATUS_IN)
                    .or('payload->>operationalStatus.eq.NEW,and(payload->>operationalStatus.is.null,status.in.(new,pending),assigned_to.is.null)');
                break;
            case OperationalStatus.ASSIGNED:
                query = query
                    .not('status', 'in', TERMINAL_DB_STATUS_IN)
                    .or('payload->>operationalStatus.eq.ASSIGNED,and(payload->>operationalStatus.is.null,or(status.eq.assigned,and(status.in.(new,pending),assigned_to.not.is.null)))');
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
                query = query
                    .not('status', 'in', TERMINAL_DB_STATUS_IN)
                    .or('payload->>operationalStatus.eq.NEW,and(payload->>operationalStatus.is.null,status.in.(new,pending),assigned_to.is.null)');
                break;
            case 'waiting':
                query = query
                    .not('status', 'in', TERMINAL_DB_STATUS_IN)
                    .or('payload->>operationalStatus.eq.WAITING,and(payload->>operationalStatus.is.null,status.in.(quoted,waiting,viewing))');
                break;
            case 'resolved':
                query = query.or(`status.in.(${RESOLVED_DB_STATUSES.join(',')}),and(status.not.in.${TERMINAL_DB_STATUS_IN},payload->>operationalStatus.eq.RESOLVED)`);
                break;
            case 'high_priority':
                query = query
                    .not('status', 'in', TERMINAL_DB_STATUS_IN)
                    .or(`payload->>operationalStatus.is.null,payload->>operationalStatus.not.in.${TERMINAL_OP_STATUS_IN}`)
                    .or(
                        `payload->>priority.eq.high,type.eq.${RequestType.PARTNER_APPLICATION},and(assigned_to.is.null,created_at.lt.${oneDayAgo}),created_at.lt.${twoDaysAgo},payload->estimatedCost.gt.1000000`
                    );
                break;
            case 'aged':
                query = query
                    .lt('created_at', twoDaysAgo)
                    .not('status', 'in', TERMINAL_DB_STATUS_IN)
                    .or(`payload->>operationalStatus.is.null,payload->>operationalStatus.not.in.${TERMINAL_OP_STATUS_IN}`);
                break;
            case 'recently_updated':
                query = query.gte('updated_at', oneDayAgo);
                break;
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
            query = query
                .not('status', 'in', TERMINAL_DB_STATUS_IN)
                .or(`payload->>operationalStatus.is.null,payload->>operationalStatus.not.in.${TERMINAL_OP_STATUS_IN}`)
                .or(
                    `payload->>priority.eq.high,type.eq.${RequestType.PARTNER_APPLICATION},and(assigned_to.is.null,created_at.lt.${oneDayAgo}),created_at.lt.${twoDaysAgo},payload->estimatedCost.gt.1000000`
                );
        } else if (filter.priority === 'low') {
            query = query.or(
                `status.in.${TERMINAL_DB_STATUS_IN},payload->>operationalStatus.in.${TERMINAL_OP_STATUS_IN},and(payload->>priority.eq.low,type.neq.${RequestType.PARTNER_APPLICATION},created_at.gte.${twoDaysAgo},or(assigned_to.not.is.null,created_at.gte.${oneDayAgo}),or(payload->>estimatedCost.is.null,payload->estimatedCost.lte.1000000))`
            );
        } else if (filter.priority === 'medium') {
            query = query
                .not('status', 'in', TERMINAL_DB_STATUS_IN)
                .or(`payload->>operationalStatus.is.null,payload->>operationalStatus.not.in.${TERMINAL_OP_STATUS_IN}`)
                .neq('type', RequestType.PARTNER_APPLICATION)
                .gte('created_at', twoDaysAgo)
                .or(`assigned_to.not.is.null,created_at.gte.${oneDayAgo}`)
                .or('payload->>estimatedCost.is.null,payload->estimatedCost.lte.1000000')
                .or('payload->>priority.is.null,payload->>priority.eq.medium');
        }
    }

    return query;
};

/**
 * Section 4: Operations Center — True Server-Side Data Handling
 * Server-backed pagination, filtering, search, sorting, and metrics calculation
 */
export const getUnifiedRequests = async (
    filter: UnifiedRequestsFilter = {},
    options: { client?: any; partners?: Partner[]; now?: Date } = {}
): Promise<UnifiedRequestsResponse> => {
    const dbClient = options.client || supabase;
    const now = options.now || new Date();
    const nowMs = now.getTime();

    // 1. Fetch active partners for label hydration
    const partners = options.partners || await getAllPartnersForAdmin().catch(() => []);
    const managersMap = new Map<string, string>();
    (partners || []).forEach(p => {
        managersMap.set(p.id, p.name || p.email);
    });

    // 2. Build authoritative server-side Supabase query
    let query = dbClient.from('requests').select('*', { count: 'exact' });
    query = applyUnifiedRequestsQueryFilters(query, filter, now);

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

    const allMappedRequests = (rawRows || []).map((r: any) => mapRequestToUnified(mapRequestFromDb(r), managersMap, nowMs));
    const hasCityFilter = Boolean(filter.cityId && filter.cityId !== 'all' && filter.cityId !== 'hub');
    const mappedRequests = hasCityFilter
        ? allMappedRequests.filter((r: UnifiedRequest) => (r.cityId || 'heliopolis').toLowerCase() === String(filter.cityId).toLowerCase())
        : allMappedRequests;

    // Calculate metrics via lightweight targeted counts aligned with canonical mappings
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const oneDayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(nowMs - 48 * 60 * 60 * 1000).toISOString();

    const [
        totalRes,
        unassignedRes,
        newRes,
        inProgressRes,
        waitingRes,
        agedRes,
        highPriorityRes,
        resolvedTodayRes,
        recentlyUpdatedRes
    ] = await Promise.all([
        dbClient.from('requests').select('*', { count: 'exact', head: true }),
        dbClient.from('requests').select('*', { count: 'exact', head: true }).is('assigned_to', null),
        dbClient.from('requests').select('*', { count: 'exact', head: true }).not('status', 'in', TERMINAL_DB_STATUS_IN).or('payload->>operationalStatus.eq.NEW,and(payload->>operationalStatus.is.null,status.in.(new,pending),assigned_to.is.null)'),
        dbClient.from('requests').select('*', { count: 'exact', head: true }).not('status', 'in', TERMINAL_DB_STATUS_IN).or('payload->>operationalStatus.eq.IN_PROGRESS,and(payload->>operationalStatus.is.null,status.in.(contacted,site-visit,in-progress,qualified))'),
        dbClient.from('requests').select('*', { count: 'exact', head: true }).not('status', 'in', TERMINAL_DB_STATUS_IN).or('payload->>operationalStatus.eq.WAITING,and(payload->>operationalStatus.is.null,status.in.(quoted,waiting,viewing))'),
        dbClient.from('requests').select('*', { count: 'exact', head: true }).lt('created_at', twoDaysAgo).not('status', 'in', TERMINAL_DB_STATUS_IN).or(`payload->>operationalStatus.is.null,payload->>operationalStatus.not.in.${TERMINAL_OP_STATUS_IN}`),
        dbClient.from('requests').select('*', { count: 'exact', head: true }).not('status', 'in', TERMINAL_DB_STATUS_IN).or(`payload->>operationalStatus.is.null,payload->>operationalStatus.not.in.${TERMINAL_OP_STATUS_IN}`).or(`payload->>priority.eq.high,type.eq.${RequestType.PARTNER_APPLICATION},and(assigned_to.is.null,created_at.lt.${oneDayAgo}),created_at.lt.${twoDaysAgo},payload->estimatedCost.gt.1000000`),
        dbClient.from('requests').select('*', { count: 'exact', head: true }).gte('updated_at', todayMidnight).or(`status.in.(${RESOLVED_DB_STATUSES.join(',')}),and(status.not.in.${TERMINAL_DB_STATUS_IN},payload->>operationalStatus.eq.RESOLVED)`),
        dbClient.from('requests').select('*', { count: 'exact', head: true }).gte('updated_at', oneDayAgo)
    ]);

    const metrics: OperationalMetrics = {
        total: hasCityFilter ? mappedRequests.length : (totalRes.count || 0),
        unassigned: hasCityFilter ? mappedRequests.filter((r: UnifiedRequest) => !r.assignedTo).length : (unassignedRes.count || 0),
        newCount: hasCityFilter ? mappedRequests.filter((r: UnifiedRequest) => r.operationalStatus === OperationalStatus.NEW).length : (newRes.count || 0),
        inProgress: hasCityFilter ? mappedRequests.filter((r: UnifiedRequest) => r.operationalStatus === OperationalStatus.IN_PROGRESS).length : (inProgressRes.count || 0),
        waiting: hasCityFilter ? mappedRequests.filter((r: UnifiedRequest) => r.operationalStatus === OperationalStatus.WAITING).length : (waitingRes.count || 0),
        agedRisk: hasCityFilter ? mappedRequests.filter((r: UnifiedRequest) => r.isAged).length : (agedRes.count || 0),
        highPriority: hasCityFilter ? mappedRequests.filter((r: UnifiedRequest) => r.priority === 'high').length : (highPriorityRes.count || 0),
        resolvedToday: hasCityFilter ? mappedRequests.filter((r: UnifiedRequest) => r.operationalStatus === OperationalStatus.RESOLVED).length : (resolvedTodayRes.count || 0),
        recentlyUpdated: hasCityFilter ? mappedRequests.length : (recentlyUpdatedRes.count || 0)
    };

    return {
        requests: mappedRequests,
        totalCount: hasCityFilter ? mappedRequests.length : (count ?? (rawRows?.length || 0)),
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


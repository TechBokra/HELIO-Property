import { supabase } from '../lib/supabase';
import { getAllRequests, getRequestById, updateRequest, deleteRequest, addRequest } from './requests';
import {
    addProperty,
    getPropertyById,
    getPropertyBySourceRequestId,
    updateProperty,
} from './properties';
import {
    OperationalStatus,
    Permission,
    RequestType,
    type AddPropertyRequest,
    type Partner,
    type Property,
    type Request,
    type RequestStatus,
} from '../types';
import { requireAnyPermission } from './authGuard';
import {
    mapPropertyListingPayloadToDraftInput,
    resolvePropertyReferenceCode,
} from '../utils/propertyFormShared';

export const getAllPropertyRequests = async (): Promise<AddPropertyRequest[]> => {
    const all = await getAllRequests();
    return all
        .filter((r) => r.type === RequestType.PROPERTY_LISTING_REQUEST)
        .map((r) => ({
            ...(r.payload as any),
            id: r.id,
            cityId: r.cityId || (r.payload as any)?.cityId || (r.payload as any)?.propertyDetails?.cityId || 'heliopolis',
            status: r.status,
            createdAt: r.createdAt,
            assignedTo: r.assignedTo,
            customerName: r.requesterInfo.name,
            customerPhone: r.requesterInfo.phone,
        }));
};

export const addPropertyRequest = (
    data: Omit<AddPropertyRequest, 'id' | 'status' | 'createdAt' | 'managerId'>
): Promise<AddPropertyRequest> => {
    const resolvedCityId = (data as any).cityId || (data as any).propertyDetails?.cityId || 'heliopolis';
    return addRequest(RequestType.PROPERTY_LISTING_REQUEST, {
        cityId: resolvedCityId,
        requesterInfo: { name: data.customerName, phone: data.customerPhone },
        payload: { ...data, cityId: resolvedCityId },
    }) as Promise<any>;
};

export const updatePropertyRequestStatus = (id: string, status: RequestStatus): Promise<boolean> => {
    return updateRequest(id, { status }).then((res) => !!res);
};

export const deletePropertyRequest = (id: string): Promise<boolean> => {
    return deleteRequest(id);
};

export interface ApproveListingRequestResult {
    property: Property;
    request: Request;
    alreadyExisted: boolean;
}

const isUniqueConstraintViolation = (error: any): boolean => {
    if (!error) return false;
    const code = String(error.code || '');
    const msg = String(error.message || '').toLowerCase();
    return code === '23505' || msg.includes('duplicate key') || msg.includes('uq_properties_source_request_id');
};

/**
 * Idempotent, retry-safe approval of a public Property Listing Request.
 *
 * Guarantees:
 * - Creates at most ONE draft property for a given listing request, even if the workflow
 *   failed mid-way after creating the property or if the operator retries / double-clicks.
 * - Establishes an explicit bidirectional link:
 *     property.sourceRequestId -> request.id
 *     request.payload.createdPropertyId -> property.id
 *     request.payload.createdPropertyReference -> property.referenceNumber
 */
export const approvePropertyListingRequest = async (
    requestId: string,
    options?: {
        assigneeId?: string;
        actorId?: string;
        partners?: Partner[];
        client?: any;
    }
): Promise<ApproveListingRequestResult> => {
    requireAnyPermission([
        Permission.MANAGE_REQUESTS,
        Permission.MANAGE_PROPERTY_REQUESTS,
        Permission.MANAGE_ALL_PROPERTIES,
    ]);

    const dbClient = options?.client || supabase;
    const request = await getRequestById(requestId, { client: dbClient });
    if (!request) {
        throw new Error('Listing request was not found.');
    }
    if (request.type !== RequestType.PROPERTY_LISTING_REQUEST) {
        throw new Error('Only property listing requests can be converted into draft properties.');
    }

    const payload = (request.payload || {}) as Record<string, any>;
    const pd = payload.propertyDetails;
    if (!pd) {
        throw new Error('Invalid request data: Missing property details.');
    }

    // Pass 1 & 2: Idempotency check (stored createdPropertyId OR existing property.sourceRequestId)
    let linkedProperty: Property | undefined;
    if (payload.createdPropertyId) {
        linkedProperty = await getPropertyById(payload.createdPropertyId, { client: dbClient }).catch(() => undefined);
    }
    if (!linkedProperty) {
        linkedProperty = await getPropertyBySourceRequestId(request.id, { client: dbClient }).catch(() => undefined);
    }

    let alreadyExisted = Boolean(linkedProperty);

    if (!linkedProperty) {
        const draftInput = mapPropertyListingPayloadToDraftInput(request, {
            assigneeId: options?.assigneeId,
            actorId: options?.actorId,
            partners: options?.partners,
        });

        try {
            linkedProperty = await addProperty(draftInput, { client: dbClient });
        } catch (insertErr: any) {
            // Concurrent race or DB unique violation recovery: fetch existing linked property
            if (isUniqueConstraintViolation(insertErr)) {
                const recovered = await getPropertyBySourceRequestId(request.id, { client: dbClient });
                if (recovered) {
                    linkedProperty = recovered;
                    alreadyExisted = true;
                } else {
                    throw insertErr;
                }
            } else {
                throw insertErr;
            }
        }
    } else if (linkedProperty.sourceRequestId !== request.id) {
        // Repair reverse link if an earlier step left sourceRequestId unlinked
        const repaired = await updateProperty(
            linkedProperty.id,
            { sourceRequestId: request.id },
            { client: dbClient }
        ).catch(() => undefined);
        if (repaired) linkedProperty = repaired;
    }

    const createdPropertyReference =
        resolvePropertyReferenceCode(linkedProperty.id, linkedProperty.referenceNumber) || linkedProperty.id.slice(0, 8);

    const needsRequestUpdate =
        request.status !== 'approved' ||
        payload.createdPropertyId !== linkedProperty.id ||
        payload.createdPropertyReference !== createdPropertyReference ||
        payload.operationalStatus !== OperationalStatus.RESOLVED;

    let updatedRequest: Request = request;
    if (needsRequestUpdate) {
        const res = await updateRequest(
            request.id,
            {
                status: 'approved',
                assignedTo: options?.assigneeId || request.assignedTo || linkedProperty.partnerId,
                payload: {
                    ...payload,
                    createdPropertyId: linkedProperty.id,
                    createdPropertyReference,
                    operationalStatus: OperationalStatus.RESOLVED,
                },
            },
            { client: dbClient }
        );
        if (res) {
            updatedRequest = res;
        }
    }

    // Record non-blocking operational audit message on initial link completion
    if (!alreadyExisted || needsRequestUpdate) {
        try {
            await dbClient.from('request_messages').insert({
                request_id: request.id,
                sender: 'system',
                sender_id: options?.actorId || null,
                type: 'note',
                content: `[LISTING APPROVED] Linked draft property ${createdPropertyReference} (ID: ${linkedProperty.id}).`,
                created_at: new Date().toISOString(),
            });
        } catch {
            // Non-blocking audit trail note
        }
    }

    return {
        property: linkedProperty,
        request: updatedRequest,
        alreadyExisted,
    };
};

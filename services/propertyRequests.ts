
import { getAllRequests, updateRequest, deleteRequest, addRequest } from './requests';
import { RequestType } from '../types';
import type { AddPropertyRequest, RequestStatus } from '../types';

export const getAllPropertyRequests = async (): Promise<AddPropertyRequest[]> => {
    const all = await getAllRequests();
    return all
        .filter(r => r.type === RequestType.PROPERTY_LISTING_REQUEST)
        .map(r => ({
            ...r.payload as any,
            id: r.id,
            status: r.status,
            createdAt: r.createdAt,
            assignedTo: r.assignedTo,
            // Hydrate missing fields from Request wrapper if needed
            customerName: r.requesterInfo.name,
            customerPhone: r.requesterInfo.phone,
        }));
};

export const addPropertyRequest = (data: Omit<AddPropertyRequest, 'id' | 'status' | 'createdAt' | 'managerId'>): Promise<AddPropertyRequest> => {
    // Delegate to main service
    return addRequest(RequestType.PROPERTY_LISTING_REQUEST, {
        requesterInfo: { name: data.customerName, phone: data.customerPhone },
        payload: data // Note: You might need to adjust payload structure to match what addRequest expects if it varies
    }) as Promise<any>;
};

export const updatePropertyRequestStatus = (id: string, status: RequestStatus): Promise<boolean> => {
    return updateRequest(id, { status }).then(res => !!res);
};

export const deletePropertyRequest = (id: string): Promise<boolean> => {
    return deleteRequest(id);
};

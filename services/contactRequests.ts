
import { getAllRequests, updateRequest, deleteRequest, addRequest } from './requests';
import { RequestType } from '../types';
import type { ContactRequest, RequestStatus } from '../types';

export const getAllContactRequests = async (): Promise<ContactRequest[]> => {
    const all = await getAllRequests();
    return all
        .filter(r => r.type === RequestType.CONTACT_MESSAGE)
        .map(r => ({
            ...r.payload as any,
            id: r.id,
            status: r.status,
            createdAt: r.createdAt,
            assignedTo: r.assignedTo,
            updatedAt: r.createdAt,
            // Hydrate missing fields from Request wrapper
            name: r.requesterInfo.name,
            phone: r.requesterInfo.phone,
        }));
};

export const addContactRequest = (data: Omit<ContactRequest, 'id' | 'status' | 'createdAt' | 'managerId'>): Promise<ContactRequest> => {
    return addRequest(RequestType.CONTACT_MESSAGE, {
        requesterInfo: { name: data.name, phone: data.phone },
        payload: data
    }) as Promise<any>;
};

export const updateContactRequestStatus = (id: string, status: RequestStatus): Promise<boolean> => {
    return updateRequest(id, { status }).then(res => !!res);
};

export const deleteContactRequest = (id: string): Promise<boolean> => {
    return deleteRequest(id);
};

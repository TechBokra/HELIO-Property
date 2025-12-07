
import { getAllRequests, updateRequest, addRequest } from './requests';
import { RequestType } from '../types';
import type { PartnerRequest } from '../types';

export const getAllPartnerRequests = async (): Promise<PartnerRequest[]> => {
    const all = await getAllRequests();
    return all
        .filter(r => r.type === RequestType.PARTNER_APPLICATION)
        .map(r => ({
            ...r.payload as any,
            id: r.id,
            status: r.status,
            createdAt: r.createdAt,
            // Map contact info back if it was normalized
            contactName: r.requesterInfo.name || (r.payload as any).contactName,
            contactPhone: r.requesterInfo.phone || (r.payload as any).contactPhone,
            contactEmail: r.requesterInfo.email || (r.payload as any).contactEmail,
        }));
};

export const addPartnerRequest = (data: Omit<PartnerRequest, 'id' | 'status' | 'createdAt'>): Promise<PartnerRequest> => {
    return addRequest(RequestType.PARTNER_APPLICATION, {
        requesterInfo: { 
            name: data.contactName, 
            phone: data.contactPhone, 
            email: data.contactEmail 
        },
        payload: data
    }) as Promise<any>;
};

export const updatePartnerRequestStatus = (id: string, status: 'approved' | 'rejected'): Promise<boolean> => {
    return updateRequest(id, { status }).then(res => !!res);
};


import { getAllRequests, updateRequest, deleteRequest, addRequest } from './requests';
import { RequestType } from '../types';
import type { PropertyInquiryRequest, RequestStatus } from '../types';

export const getAllPropertyInquiries = async (): Promise<PropertyInquiryRequest[]> => {
    const all = await getAllRequests();
    return all
        .filter(r => r.type === RequestType.PROPERTY_INQUIRY)
        .map(r => ({
            ...r.payload as any,
            id: r.id,
            status: r.status,
            createdAt: r.createdAt,
            customerName: r.requesterInfo.name,
            customerPhone: r.requesterInfo.phone,
        }));
};

export const addPropertyInquiry = (data: Omit<PropertyInquiryRequest, 'id' | 'status' | 'createdAt'>): Promise<PropertyInquiryRequest> => {
    return addRequest(RequestType.PROPERTY_INQUIRY, {
        requesterInfo: { name: data.customerName, phone: data.customerPhone },
        payload: data
    }) as Promise<any>;
};

export const updatePropertyInquiryStatus = (id: string, status: RequestStatus): Promise<boolean> => {
    return updateRequest(id, { status }).then(res => !!res);
};

export const deletePropertyInquiry = (id: string): Promise<boolean> => {
    return deleteRequest(id);
};

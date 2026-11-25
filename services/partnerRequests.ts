
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
            cityId: r.cityId || (r.payload as any)?.cityId || 'heliopolis',
            allowedCities: Array.isArray((r.payload as any)?.allowedCities) && (r.payload as any).allowedCities.length > 0
                ? (r.payload as any).allowedCities
                : [r.cityId || (r.payload as any)?.cityId || 'heliopolis'],
            status: r.status,
            createdAt: r.createdAt,
            // Map contact info back if it was normalized
            contactName: r.requesterInfo.name || (r.payload as any).contactName,
            contactPhone: r.requesterInfo.phone || (r.payload as any).contactPhone,
            contactEmail: r.requesterInfo.email || (r.payload as any).contactEmail,
        }));
};

export const addPartnerRequest = (data: Omit<PartnerRequest, 'id' | 'status' | 'createdAt'>): Promise<PartnerRequest> => {
    const resolvedCityId = (data as any).cityId || (Array.isArray(data.allowedCities) && data.allowedCities[0]) || 'heliopolis';
    const resolvedAllowedCities = Array.isArray(data.allowedCities) && data.allowedCities.length > 0
        ? data.allowedCities
        : [resolvedCityId];
    return addRequest(RequestType.PARTNER_APPLICATION, {
        cityId: resolvedCityId,
        requesterInfo: { 
            name: data.contactName, 
            phone: data.contactPhone, 
            email: data.contactEmail 
        },
        payload: { ...data, cityId: resolvedCityId, allowedCities: resolvedAllowedCities }
    }) as Promise<any>;
};

export const updatePartnerRequestStatus = (id: string, status: 'approved' | 'rejected'): Promise<boolean> => {
    return updateRequest(id, { status }).then(res => !!res);
};

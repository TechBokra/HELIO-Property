
import type { Request } from '../types';
import { RequestType, RequestStatus } from '../types';

export let requestsData: Request[] = [
    {
        id: `req-${Date.now() + 1}`,
        type: RequestType.PARTNER_APPLICATION,
        requesterInfo: { name: 'علي حسن', phone: '01011223344', email: 'ali@marketpro.com' },
        payload: {
            companyName: 'MarketPro Agency',
            companyType: 'agency',
            description: 'A leading real estate marketing agency.',
        },
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: `req-${Date.now() + 2}`,
        type: RequestType.PROPERTY_LISTING_REQUEST,
        requesterInfo: { name: 'سارة كريم', phone: '01122334455' },
        payload: {
            cooperationType: 'commission',
            propertyDetails: {
                price: 7500000,
                address: 'فيلا فاخرة بكمبوند تلالا',
                propertyType: { en: 'Villa', ar: 'فيلا' },
                area: 500,
            }
        },
        status: 'new',
        createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
        id: `req-${Date.now() + 3}`,
        type: RequestType.PROPERTY_LISTING_REQUEST,
        requesterInfo: { name: 'محمد فتحي', phone: '01233445566' },
        payload: {
             cooperationType: 'paid_listing',
            propertyDetails: {
                price: 2500000,
                address: 'شقة 180م بالحي الثاني',
                propertyType: { en: 'Apartment', ar: 'شقة' },
                area: 180,
            }
        },
        status: 'new',
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
    {
        id: `req-${Date.now() + 4}`,
        type: RequestType.CONTACT_MESSAGE,
        requesterInfo: { name: 'هالة مصطفى', phone: '01544332211' },
        payload: {
            message: 'أود الاستفسار عن تفاصيل باقات الشراكة للمطورين العقاريين.',
            inquiryType: 'client'
        },
        status: 'new',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
        id: `req-${Date.now() + 5}`,
        type: RequestType.PROPERTY_INQUIRY,
        requesterInfo: { name: 'ياسر أمين', phone: '01099887766' },
        payload: {
            details: 'أبحث عن فيلا مستقلة بمساحة لا تقل عن 400م بحديقة خاصة، في حدود 8 مليون جنيه.',
        },
        status: 'new',
        createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 mins ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
        id: 'req-1',
        type: RequestType.LEAD,
        requesterInfo: { name: 'أحمد محمود', phone: '01012345678' },
        payload: {
            serviceType: 'finishing',
            contactTime: 'Morning',
            serviceTitle: 'طلب خدمة تشطيب شقة 150م',
            customerNotes: 'أرغب في تشطيب شقة على الطراز المودرن.',
            partnerId: 'el-mottaheda-group',
            managerId: 'service-manager-1',
        },
        status: 'new',
        assignedTo: 'service-manager-1',
        createdAt: '2024-07-28T10:00:00Z',
        updatedAt: '2024-07-28T10:00:00Z',
    },
    {
        id: 'req-2',
        type: RequestType.LEAD,
        requesterInfo: { name: 'فاطمة الزهراء', phone: '01123456789' },
        payload: {
            serviceType: 'decorations',
            contactTime: 'Afternoon',
            serviceTitle: 'طلب تصميم خاص: منحوتة جدارية لغرفة استقبال',
            customerNotes: 'تصميم يجمع بين الطابع الفرعوني والحديث.',
            partnerId: 'admin-user',
            managerId: 'service-manager-1',
        },
        status: 'reviewed',
        assignedTo: 'service-manager-1',
        createdAt: '2024-07-27T14:30:00Z',
        updatedAt: '2024-07-27T14:30:00Z',
    },
    {
        id: 'req-3',
        type: RequestType.LEAD,
        requesterInfo: { name: 'خالد وليد', phone: '01234567890' },
        payload: {
            serviceType: 'property',
            propertyId: 'villa-heliopolis-1',
            contactTime: 'Evening',
            serviceTitle: 'استفسار بخصوص "فيلا فاخرة بتصميم عصري في كمبوند تلالا"',
            partnerId: 'united-development',
        },
        status: 'new',
        assignedTo: 'united-development',
        createdAt: '2024-07-26T18:00:00Z',
        updatedAt: '2024-07-26T18:00:00Z',
    }
];
import type { FormDefinition } from '../types';

export interface FormUsageLocation {
    route: string;
    pageName: { ar: string; en: string };
    triggerContext: { ar: string; en: string };
    componentName: string;
    isPublicRoute: boolean;
}

export const FORM_USAGE_MAP: Record<string, FormUsageLocation[]> = {
    'contact-us': [
        {
            route: '/contact',
            pageName: { ar: 'صفحة تواصل معنا', en: 'Contact Us Page' },
            triggerContext: {
                ar: 'النموذج الرئيسي في صفحة التواصل',
                en: 'Primary contact inquiry form on Contact page',
            },
            componentName: 'ContactPage',
            isPublicRoute: true,
        },
    ],
    'property-inquiry': [
        {
            route: '/properties',
            pageName: { ar: 'صفحة قائمة العقارات', en: 'Properties Listing Page' },
            triggerContext: {
                ar: 'نافذة «اطلب البحث عن عقار» عند عدم توفر نتائج مطابقة',
                en: 'Property Search Request modal when no matching results appear',
            },
            componentName: 'PropertyInquiryModal',
            isPublicRoute: true,
        },
    ],
    'add-property': [
        {
            route: '/add-property',
            pageName: { ar: 'صفحة أضف عقارك', en: 'Add Property Page' },
            triggerContext: {
                ar: 'الخطوة الثالثة لإدخال بيانات العقار للزائر والعميل',
                en: 'Step 3 property submission form for visitors and owners',
            },
            componentName: 'Step3FormFields (AddPropertyPage)',
            isPublicRoute: true,
        },
    ],
    'finishing-request': [
        {
            route: '/request-service',
            pageName: { ar: 'صفحة طلب خدمة (مسار التشطيبات)', en: 'Service Request Page (Finishing Flow)' },
            triggerContext: {
                ar: 'يُفتح من أزرار الاستشارة وطلب عرض السعر في صفحة /finishing أو من تفاصيل العقار /properties/:id',
                en: 'Opened from consultation/quote CTAs on /finishing or from /properties/:id',
            },
            componentName: 'ServiceRequestPage',
            isPublicRoute: false,
        },
    ],
    'decoration-request': [
        {
            route: '/request-service',
            pageName: { ar: 'صفحة طلب خدمة (مسار الديكور والتصميم)', en: 'Service Request Page (Decorations Flow)' },
            triggerContext: {
                ar: 'يُفتح من أزرار «اطلب تصميم خاص» أو طلب عمل ديكور في صفحة /decorations',
                en: 'Opened from Custom Design or portfolio item inquiry CTAs on /decorations',
            },
            componentName: 'ServiceRequestPage',
            isPublicRoute: false,
        },
    ],
    'partner-application': [
        {
            route: '/register',
            pageName: { ar: 'صفحة انضمام الشركاء', en: 'Partner Registration Page' },
            triggerContext: {
                ar: 'إرسال طلبات انضمام المطورين وشركات التشطيب والوكالات (submitIntake)',
                en: 'Partner onboarding intake pipeline for developers, finishing companies & agencies',
            },
            componentName: 'RegisterPage',
            isPublicRoute: true,
        },
    ],
    'service-request': [
        {
            route: '/request-service',
            pageName: { ar: 'صفحة طلب خدمة (الحجز / الشراء / الاستفسار العام)', en: 'Service Request Page (Booking / Purchase / Property Inquiry)' },
            triggerContext: {
                ar: 'يُستخدم لحجز الباقات وشراء الديكورات أو الاستفسار عن عقار محدد',
                en: 'Used for finishing package bookings, decor purchases, and direct property inquiries',
            },
            componentName: 'ServiceRequestPage',
            isPublicRoute: false,
        },
        {
            route: '/finishing',
            pageName: { ar: 'حاسبة تكلفة التشطيب (نافذة طلب عرض السعر)', en: 'Finishing Cost Estimator (RFQ Modal)' },
            triggerContext: {
                ar: 'نافذة طلب تنفيذ التشطيب المرتبط بالحاسبة التقديرية داخل صفحة التشطيبات',
                en: 'RFQ modal launched from the interactive Finishing Cost Estimator',
            },
            componentName: 'ServiceRequestModal',
            isPublicRoute: true,
        },
    ],
};

export const getFormUsageLocations = (slug?: string): FormUsageLocation[] => {
    if (!slug) return [];
    return FORM_USAGE_MAP[slug.trim()] || [];
};

export const getPrimaryFormRouteSummary = (
    form: Pick<FormDefinition, 'slug'>,
    language: 'ar' | 'en'
): string => {
    const locations = getFormUsageLocations(form.slug);
    if (locations.length === 0) {
        return language === 'ar'
            ? `غير مرتبط بمسار ثابت (متاح عبر slug: ${form.slug})`
            : `Not bound to a fixed route (embed via slug: ${form.slug})`;
    }
    return locations
        .map((loc) => `${loc.pageName[language]} (${loc.route})`)
        .join(' • ');
};

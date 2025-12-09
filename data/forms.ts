
import type { FormDefinition } from '../types';

export let formsData: FormDefinition[] = [
    {
        id: 'form-1',
        slug: 'contact-us',
        title: { ar: 'اتصل بنا', en: 'Contact Us' },
        description: { ar: 'نموذج التواصل العام', en: 'General Contact Form' },
        category: 'public',
        destination: 'crm_messages',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submitButtonLabel: { ar: 'إرسال', en: 'Send Message' },
        fields: [
            {
                id: 'c1',
                key: 'name',
                type: 'text',
                label: { ar: 'الاسم بالكامل', en: 'Full Name' },
                required: true,
                width: 'half',
            },
            {
                id: 'c2',
                key: 'phone',
                type: 'tel',
                label: { ar: 'رقم الهاتف', en: 'Phone Number' },
                required: true,
                width: 'half',
                validation: { type: 'phone_eg' }
            },
            {
                id: 'c3',
                key: 'email',
                type: 'email',
                label: { ar: 'البريد الإلكتروني', en: 'Email Address' },
                required: false,
                width: 'full',
            },
            {
                id: 'c4',
                key: 'inquiryType',
                type: 'select',
                label: { ar: 'نوع الاستفسار', en: 'Inquiry Type' },
                required: true,
                width: 'full',
                options: 'general,sales,partnership,support'
            },
            {
                id: 'c5',
                key: 'message',
                type: 'textarea',
                label: { ar: 'الرسالة', en: 'Message' },
                required: true,
                width: 'full',
            }
        ]
    },
    {
        id: 'form-finishing',
        slug: 'finishing-request',
        title: { ar: 'طلب خدمة تشطيب', en: 'Finishing Request' },
        description: { ar: 'احصل على مقايسة تشطيب لوحدتك', en: 'Get a finishing quote for your unit' },
        category: 'lead_gen',
        destination: 'crm_leads',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submitButtonLabel: { ar: 'طلب معاينة / عرض سعر', en: 'Request Quote' },
        fields: [
            { id: 'f1', key: 'customerName', type: 'text', label: { ar: 'الاسم', en: 'Name' }, width: 'half', required: true },
            { id: 'f2', key: 'customerPhone', type: 'tel', label: { ar: 'رقم الهاتف', en: 'Phone' }, width: 'half', required: true, validation: { type: 'phone_eg' } },
            { id: 'f3', key: 'unitType', type: 'select', label: { ar: 'نوع الوحدة', en: 'Unit Type' }, width: 'half', required: true, options: 'apartment,villa,duplex,commercial,office' },
            { id: 'f4', key: 'unitArea', type: 'number', label: { ar: 'المساحة (م٢)', en: 'Area (m2)' }, width: 'half', required: true },
            { id: 'f5', key: 'currentStatus', type: 'select', label: { ar: 'حالة الوحدة الحالية', en: 'Current Status' }, width: 'half', required: true, options: 'core_shell,semi_finished,old_renovation' },
            { id: 'f6', key: 'finishingLevel', type: 'select', label: { ar: 'مستوى التشطيب المطلوب', en: 'Desired Finishing' }, width: 'half', required: true, options: 'economic,super_lux,ultra_lux,hotel_standard' },
            { id: 'f7', key: 'contactTime', type: 'select', label: { ar: 'أفضل وقت للتواصل', en: 'Best time to contact' }, width: 'full', required: true, options: 'morning,afternoon,evening' },
            { id: 'f8', key: 'customerNotes', type: 'textarea', label: { ar: 'ملاحظات إضافية', en: 'Additional Notes' }, width: 'full', required: false }
        ]
    },
    {
        id: 'form-decoration',
        slug: 'decoration-request',
        title: { ar: 'طلب ديكور خاص', en: 'Custom Decor Request' },
        description: { ar: 'صمم قطعة فنية فريدة لمساحتك', en: 'Design a unique piece for your space' },
        category: 'lead_gen',
        destination: 'crm_leads',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submitButtonLabel: { ar: 'إرسال الطلب', en: 'Submit Request' },
        fields: [
            { id: 'd1', key: 'customerName', type: 'text', label: { ar: 'الاسم', en: 'Name' }, width: 'half', required: true },
            { id: 'd2', key: 'customerPhone', type: 'tel', label: { ar: 'رقم الهاتف', en: 'Phone' }, width: 'half', required: true },
            { id: 'd3', key: 'itemCategory', type: 'select', label: { ar: 'نوع العمل', en: 'Category' }, width: 'half', required: true, options: 'wall_sculpture,canvas_painting,custom_furniture,antique_decor' },
            { id: 'd4', key: 'dimensions', type: 'text', label: { ar: 'الأبعاد التقريبية', en: 'Approx Dimensions' }, width: 'half', required: false },
            { id: 'd5', key: 'customerNotes', type: 'textarea', label: { ar: 'وصف الفكرة', en: 'Idea Description' }, width: 'full', required: true, placeholder: { ar: 'صف الألوان، الخامات، أو الطراز الذي تفضله...', en: 'Describe colors, materials, or style...' } },
            { id: 'd6', key: 'referenceImage', type: 'file', label: { ar: 'صورة مرجعية (اختياري)', en: 'Reference Image (Optional)' }, width: 'full', required: false }
        ]
    },
    {
        id: 'form-partner',
        slug: 'partner-application',
        title: { ar: 'طلب انضمام شريك', en: 'Partner Application' },
        description: { ar: 'انضم لشبكة شركاء هليوبوليس الجديدة', en: 'Join New Heliopolis Partner Network' },
        category: 'partner_app',
        destination: 'crm_partners',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submitButtonLabel: { ar: 'تقديم الطلب', en: 'Submit Application' },
        fields: [
            { id: 'p1', key: 'companyName', type: 'text', label: { ar: 'اسم الشركة', en: 'Company Name' }, width: 'half', required: true },
            { id: 'p2', key: 'companyType', type: 'select', label: { ar: 'نشاط الشركة', en: 'Business Type' }, width: 'half', required: true, options: 'developer,finishing,agency' },
            { id: 'p3', key: 'contactName', type: 'text', label: { ar: 'اسم المسؤول', en: 'Contact Person' }, width: 'half', required: true },
            { id: 'p4', key: 'contactPhone', type: 'tel', label: { ar: 'رقم الهاتف', en: 'Phone Number' }, width: 'half', required: true },
            { id: 'p5', key: 'contactEmail', type: 'email', label: { ar: 'البريد الإلكتروني', en: 'Email' }, width: 'full', required: true },
            { id: 'p6', key: 'description', type: 'textarea', label: { ar: 'نبذة عن الشركة', en: 'About Company' }, width: 'full', required: true },
            { id: 'p7', key: 'website', type: 'text', label: { ar: 'الموقع الإلكتروني', en: 'Website' }, width: 'full', required: false, validation: { type: 'url' } }
        ]
    },
    {
        id: 'form-add-property',
        slug: 'add-property',
        title: { ar: 'إضافة عقار', en: 'Add Property' },
        description: { ar: 'بيانات العقار التفصيلية', en: 'Detailed Property Information' },
        category: 'public',
        destination: 'crm_leads',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submitButtonLabel: { ar: 'إرسال الطلب', en: 'Submit Request' },
        fields: [
             { id: 'ap1', key: 'customerName', type: 'text', label: { ar: 'الاسم بالكامل', en: 'Full Name' }, required: true, width: 'half' },
             { id: 'ap2', key: 'customerPhone', type: 'tel', label: { ar: 'رقم الهاتف', en: 'Phone Number' }, required: true, width: 'half', validation: { type: 'phone_eg' } },
             { id: 'ap3', key: 'contactTime', type: 'select', label: { ar: 'الوقت المناسب للتواصل', en: 'Best time to contact' }, required: true, width: 'full', options: 'morning,afternoon,evening' },
             
             { id: 'ap6', key: 'address', type: 'text', label: { ar: 'العنوان التفصيلي', en: 'Detailed Address' }, required: true, width: 'full' },
             
             { id: 'ap7', key: 'propertyType', type: 'select', label: { ar: 'نوع العقار', en: 'Property Type' }, required: true, width: 'third', options: 'apartment,villa,commercial,land' },
             { id: 'ap8', key: 'area', type: 'number', label: { ar: 'المساحة (م٢)', en: 'Area (m2)' }, required: true, width: 'third' },
             { id: 'ap9', key: 'price', type: 'number', label: { ar: 'السعر المطلوب (ج.م)', en: 'Price (EGP)' }, required: true, width: 'third' },
             
             { id: 'ap13', key: 'beds', type: 'number', label: { ar: 'عدد الغرف', en: 'Bedrooms' }, required: true, width: 'third' },
             { id: 'ap14', key: 'baths', type: 'number', label: { ar: 'عدد الحمامات', en: 'Bathrooms' }, required: true, width: 'third' },
             { id: 'ap15', key: 'floor', type: 'number', label: { ar: 'الدور / الطابق', en: 'Floor' }, required: true, width: 'third' },

             { id: 'ap10', key: 'finishingStatus', type: 'select', label: { ar: 'حالة التشطيب', en: 'Finishing Status' }, required: true, width: 'half', options: 'core_shell,semi_finished,fully_finished,luxury' },
             
             { id: 'ap16', key: 'isInCompound', type: 'select', label: { ar: 'داخل كومبوند؟', en: 'In Compound?' }, required: true, width: 'half', options: 'yes,no' },
             { id: 'ap17', key: 'hasInstallments', type: 'select', label: { ar: 'متاح تقسيط؟', en: 'Installments Available?' }, required: true, width: 'half', options: 'yes,no' },
             { id: 'ap18', key: 'realEstateFinanceAvailable', type: 'select', label: { ar: 'تمويل عقاري؟', en: 'Mortgage Eligible?' }, required: true, width: 'half', options: 'yes,no' },
             
             { id: 'ap11', key: 'description.ar', type: 'textarea', label: { ar: 'وصف العقار (عربي)', en: 'Description (AR)' }, required: false, width: 'full' },
             { id: 'ap12', key: 'description.en', type: 'textarea', label: { ar: 'وصف العقار (إنجليزي)', en: 'Description (EN)' }, required: false, width: 'full' },
        ]
    },
    {
        id: 'form-service-generic',
        slug: 'service-request',
        title: { ar: 'طلب خدمة عام', en: 'General Service Request' },
        category: 'lead_gen',
        destination: 'crm_leads',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        submitButtonLabel: { ar: 'تأكيد الطلب', en: 'Confirm Request' },
        fields: [
            { id: 'g1', key: 'customerName', type: 'text', label: { ar: 'الاسم', en: 'Name' }, width: 'half', required: true },
            { id: 'g2', key: 'customerPhone', type: 'tel', label: { ar: 'رقم الهاتف', en: 'Phone' }, width: 'half', required: true },
            { id: 'g3', key: 'contactTime', type: 'select', label: { ar: 'وقت التواصل', en: 'Contact Time' }, width: 'full', required: true, options: 'morning,afternoon,evening' },
            { id: 'g4', key: 'customerNotes', type: 'textarea', label: { ar: 'تفاصيل الطلب', en: 'Request Details' }, width: 'full', required: true }
        ]
    }
];

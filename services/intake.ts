import { supabase } from '../lib/supabase';
import { 
    RequestType, 
    OperationalDomain, 
    type FormDefinition, 
    type FormFieldDefinition,
    type IntakeSubmissionParams,
    type IntakeSubmissionResult 
} from '../types';
import { getFormBySlug } from './forms';
import { evaluateRoutingRules } from './routingRules';
import { addNotification } from './notifications';
import { uploadFile } from './upload';
import { getAttribution } from '../utils/attribution';
import { resolveEligibleManager } from './requests';

export class IntakeValidationError extends Error {
    public errors: Record<string, { ar: string; en: string }>;
    constructor(errors: Record<string, { ar: string; en: string }>) {
        super('Intake validation failed');
        this.name = 'IntakeValidationError';
        this.errors = errors;
    }
}

const EGYPT_PHONE_REGEX = /^(?:\+?20|0)?1[0125][0-9]{8}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * Authoritative Server/Service-Side Validation
 */
export const validateIntakeSubmission = (
    fields: FormFieldDefinition[],
    data: Record<string, any>
): { isValid: boolean; errors: Record<string, { ar: string; en: string }> } => {
    const errors: Record<string, { ar: string; en: string }> = {};

    for (const field of fields) {
        const val = data[field.key];
        const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0);

        // Required check
        if (field.required && isEmpty) {
            errors[field.key] = {
                ar: `حقل "${field.label.ar}" مطلوب.`,
                en: `Field "${field.label.en}" is required.`,
            };
            continue;
        }

        if (isEmpty) continue; // Optional field empty, move on

        // Max text length to prevent DB bloat
        if (typeof val === 'string' && val.length > 5000) {
            errors[field.key] = {
                ar: `قيمة "${field.label.ar}" تتجاوز الحد الأقصى المسموح (5000 حرف).`,
                en: `Field "${field.label.en}" exceeds maximum allowed length of 5000 characters.`,
            };
            continue;
        }

        // Field Type / Validation Rule checks
        if (field.type === 'email' || field.validation?.type === 'email') {
            if (typeof val !== 'string' || !EMAIL_REGEX.test(val.trim())) {
                errors[field.key] = {
                    ar: 'يرجى إدخال بريد إلكتروني صالح.',
                    en: 'Please enter a valid email address.',
                };
            }
        } else if (field.type === 'tel' || field.validation?.type === 'phone_eg') {
            const cleanPhone = String(val).replace(/[\s-]/g, '');
            if (!EGYPT_PHONE_REGEX.test(cleanPhone)) {
                errors[field.key] = {
                    ar: 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678).',
                    en: 'Please enter a valid Egyptian mobile number (e.g. 01012345678).',
                };
            }
        } else if (field.type === 'number' || field.validation?.type === 'number') {
            const num = Number(val);
            if (isNaN(num)) {
                errors[field.key] = {
                    ar: 'يرجى إدخال قيمة رقمية صحيحة.',
                    en: 'Please enter a valid number.',
                };
            } else {
                if (field.validation?.min !== undefined && num < field.validation.min) {
                    errors[field.key] = {
                        ar: `القيمة يجب أن لا تقل عن ${field.validation.min}.`,
                        en: `Value must be at least ${field.validation.min}.`,
                    };
                }
                if (field.validation?.max !== undefined && num > field.validation.max) {
                    errors[field.key] = {
                        ar: `القيمة يجب أن لا تزيد عن ${field.validation.max}.`,
                        en: `Value must not exceed ${field.validation.max}.`,
                    };
                }
            }
        } else if (field.validation?.type === 'url') {
            if (typeof val !== 'string' || !URL_REGEX.test(val.trim())) {
                errors[field.key] = {
                    ar: 'يرجى إدخال رابط إلكتروني صحيح يبدأ بـ https://.',
                    en: 'Please enter a valid URL starting with https://.',
                };
            }
        } else if (field.type === 'select' || field.type === 'radio') {
            if (field.options) {
                const allowedOptions = Array.isArray(field.options) 
                    ? field.options 
                    : String(field.options).split(',').map(s => s.trim());
                if (!allowedOptions.includes(String(val))) {
                    errors[field.key] = {
                        ar: 'القيمة المختارة غير صالحة.',
                        en: 'Selected option is not valid.',
                    };
                }
            }
        } else if (field.type === 'multi-select') {
            if (field.options && Array.isArray(val)) {
                const allowedOptions = Array.isArray(field.options) 
                    ? field.options 
                    : String(field.options).split(',').map(s => s.trim());
                const hasInvalid = val.some(v => !allowedOptions.includes(String(v)));
                if (hasInvalid) {
                    errors[field.key] = {
                        ar: 'أحد الخيارات المختارة غير صالح.',
                        en: 'One of the selected options is invalid.',
                    };
                }
            }
        }

        // Custom Regex
        if (field.validation?.type === 'custom' && field.validation.pattern) {
            try {
                const regex = new RegExp(field.validation.pattern);
                if (!regex.test(String(val))) {
                    errors[field.key] = field.validation.errorMessage || {
                        ar: 'القيمة المدخلة غير مطابقة للشروط المطلوبة.',
                        en: 'Entered value does not match the required pattern.',
                    };
                }
            } catch (e) {
                console.warn('Invalid custom regex pattern in form config:', field.validation.pattern);
            }
        }

        // Length validation
        if (field.validation?.minLength && String(val).length < field.validation.minLength) {
            errors[field.key] = {
                ar: `الحد الأدنى للطول هو ${field.validation.minLength} أحرف.`,
                en: `Minimum length is ${field.validation.minLength} characters.`,
            };
        }
        if (field.validation?.maxLength && String(val).length > field.validation.maxLength) {
            errors[field.key] = {
                ar: `الحد الأقصى للطول هو ${field.validation.maxLength} أحرف.`,
                en: `Maximum length is ${field.validation.maxLength} characters.`,
            };
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
};

/**
 * Validate and process file uploads securely without Base64 storage
 */
const processIntakeFiles = async (
    files?: File[],
    existingData?: Record<string, any>
): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    const uploadedUrls: string[] = [];

    for (const file of files) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new Error(`File "${file.name}" exceeds maximum allowed size of 5MB.`);
        }
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            throw new Error(`File type "${file.type}" is not supported. Allowed formats: JPG, PNG, WEBP, PDF.`);
        }
        const url = await uploadFile(file);
        uploadedUrls.push(url);
    }

    return uploadedUrls;
};

/**
 * Map Form Definition to Canonical Request Type & Operational Domain
 */
const resolveFormTaxonomy = (
    formDef?: FormDefinition,
    explicitType?: RequestType,
    explicitDomain?: OperationalDomain
): { requestType: RequestType; domain: OperationalDomain } => {
    if (explicitType) {
        let domain: OperationalDomain = explicitDomain || 'commercial';
        switch (explicitType) {
            case RequestType.PROPERTY_LISTING_REQUEST:
            case RequestType.PROPERTY_INQUIRY:
                domain = 'real_estate';
                break;
            case RequestType.PARTNER_APPLICATION:
                domain = 'partners';
                break;
            case RequestType.CONTACT_MESSAGE:
                domain = 'customer_care';
                break;
            case RequestType.LEAD:
                domain = explicitDomain || 'commercial';
                break;
        }
        return { requestType: explicitType, domain };
    }

    if (!formDef) {
        return { requestType: RequestType.LEAD, domain: 'commercial' };
    }

    // From Form Definition requestType or slug/destination
    if (formDef.requestType) {
        return {
            requestType: formDef.requestType,
            domain: formDef.domain || 'commercial',
        };
    }

    // Slug-based taxonomy resolution
    switch (formDef.slug) {
        case 'contact-us':
            return { requestType: RequestType.CONTACT_MESSAGE, domain: 'customer_care' };
        case 'property-inquiry':
            return { requestType: RequestType.PROPERTY_INQUIRY, domain: 'real_estate' };
        case 'add-property':
            return { requestType: RequestType.PROPERTY_LISTING_REQUEST, domain: 'real_estate' };
        case 'finishing-request':
            return { requestType: RequestType.LEAD, domain: 'finishing' };
        case 'decoration-request':
            return { requestType: RequestType.LEAD, domain: 'decorations' };
        case 'partner-application':
            return { requestType: RequestType.PARTNER_APPLICATION, domain: 'partners' };
        default:
            return { requestType: RequestType.LEAD, domain: formDef.domain || 'commercial' };
    }
};

/**
 * CANONICAL INTAKE PIPELINE (PHASE 3C)
 * 
 * Capture → Validate → Identify → Classify → Route → Create Request → Track
 */
export const submitIntake = async (params: IntakeSubmissionParams): Promise<IntakeSubmissionResult> => {
    const { formSlug, requestType: explicitType, domain: explicitDomain, formData, contextData = {}, files } = params;

    // 1. Resolve Form Definition
    let formDef: FormDefinition | undefined;
    if (formSlug) {
        formDef = await getFormBySlug(formSlug);
    }

    // 2. Authoritative Server/Service Validation
    if (formDef && formDef.fields && formDef.fields.length > 0) {
        const validation = validateIntakeSubmission(formDef.fields, formData);
        if (!validation.isValid) {
            throw new IntakeValidationError(validation.errors);
        }
    } else {
        // Direct domain form without dynamic schema: validate essential requester fields
        const rawName = formData.name || formData.customerName || formData.contactName;
        const rawPhone = formData.phone || formData.customerPhone || formData.contactPhone;
        const errs: Record<string, { ar: string; en: string }> = {};

        if (!rawName || String(rawName).trim() === '') {
            errs.name = { ar: 'الاسم مطلوب.', en: 'Name is required.' };
        }
        if (!rawPhone || !EGYPT_PHONE_REGEX.test(String(rawPhone).replace(/[\s-]/g, ''))) {
            errs.phone = { ar: 'يرجى إدخال رقم هاتف مصري صالح.', en: 'Please enter a valid Egyptian phone number.' };
        }
        if (Object.keys(errs).length > 0) {
            throw new IntakeValidationError(errs);
        }
    }

    // 3. Resolve Identity & Authenticated Session
    const { data: { session } } = await supabase.auth.getSession();
    const authUser = session?.user;
    const customerId = authUser?.id || null;
    const authoritativeEmail = authUser?.email || formData.email || formData.customerEmail || formData.contactEmail || null;

    const requesterName = String(formData.name || formData.customerName || formData.contactName || authUser?.user_metadata?.full_name || 'Anonymous').trim();
    const requesterPhone = String(formData.phone || formData.customerPhone || formData.contactPhone || authUser?.user_metadata?.phone || '').trim();

    // 4. Secure File Uploads (Reject large Base64 payloads)
    let uploadedFileUrls: string[] = [];
    if (files && files.length > 0) {
        uploadedFileUrls = await processIntakeFiles(files, formData);
    }

    // 5. Taxonomy & Classification
    const { requestType, domain } = resolveFormTaxonomy(formDef, explicitType, explicitDomain);

    // 6. Marketing Attribution
    const attribution = getAttribution({
        source: formData.source || contextData.source || formSlug || 'web_form',
        propertyId: formData.propertyId || contextData.propertyId,
        pageOrigin: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    // 7. Sanitize Payload (never store Base64 blobs)
    const sanitizedFormData = { ...formData };
    Object.keys(sanitizedFormData).forEach(k => {
        const val = sanitizedFormData[k];
        if (typeof val === 'string' && val.startsWith('data:') && val.includes('base64,')) {
            // Strip raw base64 data to preserve database hygiene
            delete sanitizedFormData[k];
        }
    });

    const payload: Record<string, any> = {
        ...sanitizedFormData,
        ...contextData,
        formSlug: formSlug || 'direct_intake',
        formVersion: formDef?.version || 1,
        domain,
        intakeTimestamp: new Date().toISOString(),
        ...attribution,
    };

    if (uploadedFileUrls.length > 0) {
        payload.images = [...(payload.images || []), ...uploadedFileUrls];
        if (!payload.referenceImage && uploadedFileUrls.length === 1) {
            payload.referenceImage = uploadedFileUrls[0];
        }
    }

    // 8. Dynamic Automated Routing & Assignee Resolution (Section 9: No hardcoded UUIDs)
    let assignedTo = contextData.assignedTo || contextData.partnerId;

    if (!assignedTo) {
        assignedTo = await evaluateRoutingRules({
            type: requestType,
            payload,
            requesterInfo: {
                name: requesterName,
                phone: requesterPhone,
                email: authoritativeEmail,
            }
        });
    }

    // Dynamic resolution from authoritative database
    if (!assignedTo) {
        assignedTo = await resolveEligibleManager(domain || requestType);
    }

    // 9. Canonical Database Insertion (requests table)
    const requestId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;

    const dbPayload = {
        id: requestId,
        type: requestType,
        status: 'new',
        customer_id: customerId,
        requester_name: requesterName,
        requester_phone: requesterPhone,
        requester_email: authoritativeEmail,
        assigned_to: assignedTo,
        payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
        .from('requests')
        .insert(dbPayload);

    if (insertError) {
        console.error('Error inserting intake request:', insertError);
        throw new Error(`Failed to create intake record: ${insertError.message}`);
    }

    // 10. Initial Audit / Tracking Note
    try {
        await supabase
            .from('request_messages')
            .insert({
                request_id: requestId,
                sender: 'system',
                sender_id: 'intake_engine',
                type: 'note',
                content: `[INTAKE] Received via form "${formSlug || 'direct'}" (v${formDef?.version || 1}) from ${requesterName}. Assigned to ${assignedTo || 'Unassigned'}.`,
                created_at: new Date().toISOString(),
            });
    } catch (e) {
        console.warn('Could not record initial intake message:', e);
    }

    // 11. Staff Notification (Linking to Phase 3B Operations Center)
    if (assignedTo) {
        try {
            await addNotification({
                userId: assignedTo,
                message: {
                    ar: `طلب جديد وارد (${requestType}) من "${requesterName}".`,
                    en: `New incoming intake (${requestType}) from "${requesterName}".`,
                },
                link: `/admin/operations?id=${requestId}`,
            });
        } catch (e) {
            console.warn('Could not send intake assignment notification:', e);
        }
    }

    return {
        success: true,
        requestId: requestId,
        requestType,
        domain,
        assignedTo,
        status: 'new',
        message: {
            ar: 'تم إرسال طلبك بنجاح! سيتواصل معك فريقنا في أقرب وقت.',
            en: 'Your request has been submitted successfully! Our team will contact you shortly.',
        }
    };
};

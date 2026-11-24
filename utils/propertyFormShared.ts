import { CONFIG, PATTERNS } from './validation';
import type {
    FilterOption,
    ListingStatus,
    Partner,
    Property,
    Request,
} from '../types';

export const PROPERTY_VALIDATION_RULES = {
    MIN_AREA: 1,
    MAX_AREA: 100000,
    MIN_PRICE: 1,
    MAX_PRICE: 10_000_000_000,
    MIN_COUNT: 0,
    MAX_COUNT: 50,
    MIN_FLOOR: -5,
    MAX_FLOOR: 150,
    MAX_GALLERY_IMAGES: 10,
    MAX_FILE_SIZE_BYTES: CONFIG.MAX_FILE_SIZE,
    EGYPTIAN_PHONE_PATTERN: /^(?:\+?20|0)?1[0125][0-9]{8}$/,
} as const;

export const PROPERTY_PURPOSE_OPTIONS = [
    { en: 'For Sale' as const, ar: 'للبيع' as const },
    { en: 'For Rent' as const, ar: 'إيجار' as const },
];

export const isUuidString = (value?: string | null): boolean => {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
};

export const resolvePropertyReferenceCode = (
    propertyId?: string | null,
    explicitRef?: string | null
): string | undefined => {
    if (explicitRef && String(explicitRef).trim()) {
        return String(explicitRef).trim();
    }
    if (!propertyId) return undefined;
    const clean = String(propertyId).replace(/[^a-zA-Z0-9]/g, '');
    const suffix = clean.slice(-5).toUpperCase() || '1001';
    return `HEL-${suffix}`;
};

export const validateEgyptPhone = (
    value: string | undefined | null,
    language: 'ar' | 'en' = 'ar'
): true | string => {
    const cleaned = String(value || '').replace(/[\s-]/g, '');
    if (!cleaned) {
        return language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone number is required';
    }
    if (
        !PROPERTY_VALIDATION_RULES.EGYPTIAN_PHONE_PATTERN.test(cleaned) &&
        !PATTERNS.EGYPTIAN_PHONE.test(cleaned)
    ) {
        return language === 'ar'
            ? 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)'
            : 'Please enter a valid Egyptian mobile number (e.g. 01012345678)';
    }
    return true;
};

export const validatePropertyMediaFiles = (
    files: File[],
    currentCount: number,
    language: 'ar' | 'en' = 'ar'
): { valid: boolean; error?: string } => {
    if (currentCount + files.length > PROPERTY_VALIDATION_RULES.MAX_GALLERY_IMAGES) {
        return {
            valid: false,
            error:
                language === 'ar'
                    ? `الحد الأقصى للصور هو ${PROPERTY_VALIDATION_RULES.MAX_GALLERY_IMAGES} صور`
                    : `You can only upload a maximum of ${PROPERTY_VALIDATION_RULES.MAX_GALLERY_IMAGES} images.`,
        };
    }

    for (const file of files) {
        if (file.size > PROPERTY_VALIDATION_RULES.MAX_FILE_SIZE_BYTES) {
            const maxMb = PROPERTY_VALIDATION_RULES.MAX_FILE_SIZE_BYTES / (1024 * 1024);
            return {
                valid: false,
                error:
                    language === 'ar'
                        ? `حجم الملف "${file.name}" يتجاوز الحد الأقصى (${maxMb} ميجابايت)`
                        : `File "${file.name}" exceeds maximum size (${maxMb}MB).`,
            };
        }
        if (file.type && !CONFIG.ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
            return {
                valid: false,
                error:
                    language === 'ar'
                        ? `نوع الصورة "${file.name}" غير مدعوم. الصيغ المسموحة: JPG, PNG, WEBP`
                        : `Image type "${file.name}" is unsupported. Allowed: JPG, PNG, WEBP.`,
            };
        }
    }

    return { valid: true };
};

export const getAllowedListingStatusesForRole = (
    isAdmin: boolean,
    currentStatus?: ListingStatus | string
): ListingStatus[] => {
    if (isAdmin) {
        return ['active', 'draft', 'inactive', 'sold'];
    }
    // Partners create properties strictly as drafts pending admin review.
    // Once published/active or sold, partners may pause (inactive) or mark sold,
    // but cannot self-promote a draft/rejected unit to active.
    if (currentStatus === 'active' || currentStatus === 'sold') {
        return ['active', 'inactive', 'sold'];
    }
    return ['draft', 'inactive'];
};

export const resolveListingPurpose = (
    rawPurpose: any
): { en: 'For Sale' | 'For Rent'; ar: 'للبيع' | 'إيجار' } => {
    const enVal = typeof rawPurpose === 'object' ? rawPurpose?.en : rawPurpose;
    const arVal = typeof rawPurpose === 'object' ? rawPurpose?.ar : rawPurpose;
    const lower = String(enVal || arVal || '').toLowerCase();
    if (lower.includes('rent') || String(arVal || '').includes('إيجار')) {
        return { en: 'For Rent', ar: 'إيجار' };
    }
    return { en: 'For Sale', ar: 'للبيع' };
};

const FALLBACK_PROPERTY_TYPES: Record<string, { en: 'Apartment' | 'Villa' | 'Commercial' | 'Land'; ar: string }> = {
    apartment: { en: 'Apartment', ar: 'شقة' },
    villa: { en: 'Villa', ar: 'فيلا' },
    duplex: { en: 'Apartment', ar: 'دوبلكس' },
    commercial: { en: 'Commercial', ar: 'تجاري' },
    land: { en: 'Land', ar: 'أرض' },
};

export const resolvePropertyTypeOption = (
    rawType: any,
    catalogTypes?: FilterOption[]
): { en: 'Apartment' | 'Villa' | 'Commercial' | 'Land'; ar: string } => {
    const rawStr = typeof rawType === 'object' ? (rawType?.en || rawType?.ar || '') : String(rawType || '');
    const key = rawStr.trim().toLowerCase();

    if (catalogTypes && catalogTypes.length > 0) {
        const matched = catalogTypes.find(
            (opt) =>
                opt.en.toLowerCase() === key ||
                opt.ar.toLowerCase() === key ||
                String(opt.id || '').toLowerCase() === key
        );
        if (matched) {
            return {
                en: matched.en as 'Apartment' | 'Villa' | 'Commercial' | 'Land',
                ar: matched.ar,
            };
        }
    }

    if (typeof rawType === 'object' && rawType?.en && rawType?.ar) {
        const normalizedEn =
            FALLBACK_PROPERTY_TYPES[String(rawType.en).toLowerCase()]?.en ||
            (rawType.en as 'Apartment' | 'Villa' | 'Commercial' | 'Land');
        return { en: normalizedEn, ar: rawType.ar };
    }

    return FALLBACK_PROPERTY_TYPES[key] || { en: 'Apartment', ar: 'شقة' };
};

const FALLBACK_FINISHING_MAP: Record<string, { en: string; ar: string }> = {
    core_shell: { en: 'Core & Shell', ar: 'على الطوب الأحمر' },
    semi_finished: { en: 'Semi-Finished', ar: 'نصف تشطيب' },
    fully_finished: { en: 'Fully Finished', ar: 'تشطيب كامل' },
    luxury: { en: 'Ultra Super Lux', ar: 'تشطيب فاخر' },
};

export const resolveFinishingOption = (
    rawFinishing: any,
    catalogStatuses?: FilterOption[]
): { en: string; ar: string } | undefined => {
    if (!rawFinishing) return undefined;
    const rawStr =
        typeof rawFinishing === 'object'
            ? rawFinishing?.en || rawFinishing?.ar || ''
            : String(rawFinishing || '');
    const key = rawStr.trim().toLowerCase();
    if (!key) return undefined;

    if (catalogStatuses && catalogStatuses.length > 0) {
        const matched = catalogStatuses.find(
            (opt) =>
                opt.en.toLowerCase() === key ||
                opt.ar.toLowerCase() === key ||
                String(opt.id || '').toLowerCase() === key
        );
        if (matched) return { en: matched.en, ar: matched.ar };
    }

    if (typeof rawFinishing === 'object' && (rawFinishing.en || rawFinishing.ar)) {
        return {
            en: rawFinishing.en || rawFinishing.ar,
            ar: rawFinishing.ar || rawFinishing.en,
        };
    }

    return FALLBACK_FINISHING_MAP[key] || { en: rawStr, ar: rawStr };
};

export const normalizeBilingualText = (
    value: any,
    fallbackAr = '',
    fallbackEn = ''
): { ar: string; en: string } => {
    if (!value) {
        return { ar: fallbackAr, en: fallbackEn };
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return {
            ar: trimmed || fallbackAr,
            en: trimmed || fallbackEn,
        };
    }
    if (typeof value === 'object') {
        const ar = String(value.ar || value.en || fallbackAr || '').trim();
        const en = String(value.en || value.ar || fallbackEn || '').trim();
        return { ar, en };
    }
    return { ar: fallbackAr, en: fallbackEn };
};

export const formatPropertyPrice = (
    priceNumeric: number,
    area: number,
    purposeEn: string
): {
    price: { ar: string; en: string };
    pricePerMeter?: { ar: string; en: string };
} => {
    const safePrice = Number.isFinite(priceNumeric) && priceNumeric > 0 ? Math.round(priceNumeric) : 0;
    const safeArea = Number.isFinite(area) && area > 0 ? area : 0;
    const price = {
        ar: `${safePrice.toLocaleString('ar-EG')} ج.م`,
        en: `EGP ${safePrice.toLocaleString('en-US')}`,
    };
    const pricePerMeterNumeric = safeArea > 0 ? Math.round(safePrice / safeArea) : 0;
    const pricePerMeter =
        purposeEn === 'For Sale' && pricePerMeterNumeric > 0
            ? {
                  ar: `${pricePerMeterNumeric.toLocaleString('ar-EG')} ج.م/م²`,
                  en: `EGP ${pricePerMeterNumeric.toLocaleString('en-US')}/m²`,
              }
            : undefined;
    return { price, pricePerMeter };
};

export const resolveValidListingPartnerId = (candidates: {
    assigneeId?: string;
    requestAssignedTo?: string;
    partners?: Partner[];
    actorId?: string;
}): string => {
    const { assigneeId, requestAssignedTo, partners = [], actorId } = candidates;
    const tryOrder = [
        assigneeId,
        requestAssignedTo,
        partners.find((p) => p.status === 'active' && (p.type === 'developer' || p.type === 'agency'))?.id,
        partners.find((p) => p.status === 'active')?.id,
        partners[0]?.id,
        actorId,
        '3e554896-eee8-4545-9c7f-0a79a4c1a9f1',
    ];
    for (const candidate of tryOrder) {
        if (candidate && isUuidString(candidate)) {
            return candidate;
        }
    }
    return '3e554896-eee8-4545-9c7f-0a79a4c1a9f1';
};

export const mapPropertyListingPayloadToDraftInput = (
    request: Request,
    options?: {
        assigneeId?: string;
        actorId?: string;
        partners?: Partner[];
    }
): Omit<Property, 'id' | 'partnerName' | 'partnerImageUrl' | 'projectName'> => {
    const payload = (request.payload || {}) as Record<string, any>;
    const pd = (payload.propertyDetails || payload) as Record<string, any>;

    const parseSafeInt = (val: any, fallback = 0): number => {
        const parsed = Number(val);
        return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
    };

    const purpose = resolveListingPurpose(pd.purpose);
    const propertyType = resolvePropertyTypeOption(pd.propertyType);
    const finishingStatus = resolveFinishingOption(pd.finishingStatus);

    const addressObj = normalizeBilingualText(
        pd.address,
        'هليوبوليس الجديدة',
        'New Heliopolis'
    );
    const rawDesc =
        pd.description || {
            ar: payload['description.ar'] || '',
            en: payload['description.en'] || '',
        };
    const descriptionObj = normalizeBilingualText(
        rawDesc,
        'الوصف قيد المراجعة...',
        'Description pending review...'
    );

    const rawTitle = pd.title;
    const hasCustomTitle =
        rawTitle &&
        ((typeof rawTitle === 'string' && rawTitle.trim().length > 0) ||
            (typeof rawTitle === 'object' &&
                !String(rawTitle.ar || '').includes('في انتظار العنوان') &&
                !String(rawTitle.en || '').includes('Pending Title') &&
                (rawTitle.ar || rawTitle.en)));

    const titleObj = hasCustomTitle
        ? normalizeBilingualText(rawTitle)
        : {
              ar: `[مسودة] ${propertyType.ar} - ${addressObj.ar || 'هليوبوليس الجديدة'}`,
              en: `[DRAFT] ${propertyType.en} - ${addressObj.en || 'New Heliopolis'}`,
          };

    const area = Math.max(0, parseSafeInt(pd.area, 0));
    const priceNumeric = Math.max(0, parseSafeInt(pd.price ?? pd.priceNumeric, 0));
    const { price, pricePerMeter } = formatPropertyPrice(priceNumeric, area, purpose.en);

    const images = Array.isArray(payload.images)
        ? payload.images.filter((img: unknown) => typeof img === 'string' && img.length > 0)
        : [];
    const mainImage = images[0] || 'https://via.placeholder.com/800x600?text=Draft+Property';
    const gallery = images.length > 1 ? images.slice(1) : [];

    const hasInstallments =
        pd.hasInstallments === 'yes' ||
        pd.hasInstallments === true ||
        pd.installmentsAvailable === true ||
        pd.installmentsAvailable === 'true';

    const deliveryImmediate =
        pd.deliveryType ? pd.deliveryType === 'immediate' : pd.delivery?.isImmediate !== false;
    const deliveryDate =
        !deliveryImmediate && pd.deliveryYear
            ? `${pd.deliveryYear}-${pd.deliveryMonth || '01'}`
            : pd.delivery?.date;

    const validPartnerId = resolveValidListingPartnerId({
        assigneeId: options?.assigneeId,
        requestAssignedTo: request.assignedTo,
        partners: options?.partners,
        actorId: options?.actorId,
    });

    const validActorId = options?.actorId && isUuidString(options.actorId) ? options.actorId : validPartnerId;

    return {
        cityId: payload.cityId || pd.cityId || request.cityId || 'heliopolis',
        partnerId: validPartnerId,
        sourceType: 'owner_public',
        sourceRequestId: request.id,
        publicationStatus: 'draft',
        verificationStatus: 'pending',
        availabilityStatus: 'available',
        listingStatus: 'draft',
        listingStartDate: pd.listingStartDate || new Date().toISOString(),
        createdBy: validActorId,
        updatedBy: validActorId,
        title: titleObj,
        description: descriptionObj,
        address: addressObj,
        location: pd.location && typeof pd.location.lat === 'number'
            ? pd.location
            : { lat: 30.12, lng: 31.62 },
        status: purpose,
        type: propertyType,
        finishingStatus,
        area,
        price,
        priceNumeric,
        pricePerMeter,
        beds: Math.max(0, parseSafeInt(pd.bedrooms ?? pd.beds, 0)),
        baths: Math.max(0, parseSafeInt(pd.bathrooms ?? pd.baths, 0)),
        floor: parseSafeInt(pd.floor, 0),
        amenities:
            pd.amenities && Array.isArray(pd.amenities.en)
                ? pd.amenities
                : { en: [], ar: [] },
        isInCompound:
            pd.isInCompound === 'yes' ||
            pd.isInCompound === true ||
            pd.isInCompound === 'true',
        realEstateFinanceAvailable:
            pd.realEstateFinanceAvailable === 'yes' ||
            pd.realEstateFinanceAvailable === true ||
            pd.realEstateFinanceAvailable === 'true',
        installmentsAvailable: hasInstallments,
        installments: hasInstallments
            ? {
                  downPayment: parseSafeInt(pd.downPayment, 0),
                  monthlyInstallment: parseSafeInt(pd.monthlyInstallment, 0),
                  years: parseSafeInt(pd.years, 0),
              }
            : undefined,
        delivery: {
            isImmediate: deliveryImmediate,
            date: deliveryDate,
        },
        contactMethod: pd.contactMethod === 'direct' ? 'direct' : 'platform',
        ownerPhone: pd.ownerPhone || request.requesterInfo?.phone,
        imageUrl: mainImage,
        imageUrl_small: mainImage,
        imageUrl_medium: mainImage,
        imageUrl_large: mainImage,
        gallery,
    };
};

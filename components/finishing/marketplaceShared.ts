import type {
    FinishingMarketCategory,
    FinishingProviderKind,
    FinishingProviderSummary,
    Language,
    PartnerFinishingService,
} from '../../types';

type Lang = Language | 'ar' | 'en';

const pick = (value: { ar: string; en: string } | undefined, language: Lang): string => {
    if (!value) return '';
    return (language === 'ar' ? value.ar || value.en : value.en || value.ar) || '';
};

export const localized = pick;

export const providerKindLabel = (kind: FinishingProviderKind, language: Lang): string =>
    kind === 'engineer'
        ? (language === 'ar' ? 'مهندس مستقل' : 'Independent engineer')
        : (language === 'ar' ? 'شركة' : 'Company');

/** The partner's own price label. Returns '' when the partner chose "on request". */
export const formatPartnerPrice = (service: PartnerFinishingService, language: Lang): string => {
    if (service.pricingDisplay === 'on_request' || service.priceFrom === null || service.priceFrom === undefined) {
        return language === 'ar' ? 'السعر حسب العرض' : 'Price on quote';
    }
    const currency = service.currency || 'EGP';
    const currencyLabel = language === 'ar' && currency === 'EGP' ? 'ج.م' : currency;
    const amount = `${Number(service.priceFrom).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} ${currencyLabel}`;
    switch (service.pricingDisplay) {
        case 'per_sqm':
            return language === 'ar' ? `${amount} / م²` : `${amount} / m²`;
        case 'fixed':
            return amount;
        case 'starting_from':
        default:
            return language === 'ar' ? `يبدأ من ${amount}` : `From ${amount}`;
    }
};

export interface ProviderRequestContext {
    propertyId?: string;
    propertyReference?: string;
    propertyTitle?: string;
    cityId?: string;
}

/** Router state for /request-service when a customer asks a specific provider for a quote. */
export const buildProviderRequestState = (
    provider: Pick<FinishingProviderSummary, 'id' | 'name'>,
    service: PartnerFinishingService,
    category: FinishingMarketCategory | undefined,
    language: Lang,
    context: ProviderRequestContext = {}
) => {
    const providerName = pick(provider.name, language);
    const categoryName = category ? pick(category.name, language) : undefined;
    const serviceTitle = pick(service.title, language) || categoryName || '';
    return {
        serviceTitle: language === 'ar'
            ? `طلب عرض: ${serviceTitle} — ${providerName}`
            : `Quote request: ${serviceTitle} — ${providerName}`,
        serviceType: 'finishing' as const,
        partnerId: provider.id,
        partnerName: providerName,
        serviceId: service.id,
        categoryId: service.categoryId,
        categoryName,
        requestChannel: 'direct_provider' as const,
        propertyId: context.propertyId,
        propertyReference: context.propertyReference,
        propertyTitle: context.propertyTitle,
        cityId: context.cityId,
    };
};

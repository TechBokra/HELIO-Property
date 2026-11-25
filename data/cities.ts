import type { CityPortalConfig } from '../types';

export const ROOT_HUB_DOMAIN = 'only-property.com';

export const INITIAL_CITIES: CityPortalConfig[] = [
    {
        id: 'heliopolis',
        slug: 'heliopolis',
        subdomain: 'heliopolis.only-property.com',
        name: {
            ar: 'هليوبوليس الجديدة',
            en: 'New Heliopolis',
        },
        brandTitle: {
            ar: 'أونلي هليو',
            en: 'ONLY HELIO',
        },
        tagline: {
            ar: 'المرجع العقاري والخدمي المتخصص لمدينة هليوبوليس الجديدة — كمبوندات، أحياء، تشطيبات وخدمات محلية معتمدة.',
            en: 'The dedicated real estate and lifestyle directory for New Heliopolis — compounds, districts, finishing & verified local services.',
        },
        region: {
            ar: 'شرق القاهرة · طريق السويس',
            en: 'East Cairo · Suez Road',
        },
        accentColor: '#F59E0B',
        heroImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80',
        isActive: true,
        isFeatured: true,
        stats: {
            propertiesCount: 148,
            projectsCount: 14,
            partnersCount: 42,
            districtsCount: 19,
        },
        coordinates: {
            lat: 30.1286,
            lng: 31.6744,
        },
    },
    {
        id: 'shorouk',
        slug: 'shorouk',
        subdomain: 'shorouk.only-property.com',
        name: {
            ar: 'مدينة الشروق',
            en: 'El Shorouk City',
        },
        brandTitle: {
            ar: 'أونلي الشروق',
            en: 'ONLY SHOROUK',
        },
        tagline: {
            ar: 'بوابة عقارات وكمبوندات مدينة الشروق — فيلات، شقق سكنية، مراكز تجارية وشركاء تشطيب وديكور.',
            en: 'El Shorouk City property and compound portal — villas, residential apartments, commercial hubs & finishing partners.',
        },
        region: {
            ar: 'شرق القاهرة · محور الإسماعيلية والسويس',
            en: 'East Cairo · Ismailia & Suez Corridor',
        },
        accentColor: '#059669',
        heroImageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80',
        isActive: true,
        isFeatured: true,
        stats: {
            propertiesCount: 215,
            projectsCount: 18,
            partnersCount: 56,
            districtsCount: 12,
        },
        coordinates: {
            lat: 30.1449,
            lng: 31.6295,
        },
    },
    {
        id: 'badr',
        slug: 'badr',
        subdomain: 'badr.only-property.com',
        name: {
            ar: 'مدينة بدر',
            en: 'Badr City',
        },
        brandTitle: {
            ar: 'أونلي بدر',
            en: 'ONLY BADR',
        },
        tagline: {
            ar: 'دليل مدينة بدر العقاري والاستثماري — مشروعات سكنية وتجارية، أحياء متكاملة وفرص نمو بجوار العاصمة الإدارية.',
            en: 'Badr City real estate and investment portal — residential and commercial projects alongside the New Capital corridor.',
        },
        region: {
            ar: 'شرق القاهرة · ظهير العاصمة الإدارية',
            en: 'East Cairo · New Capital Gateway',
        },
        accentColor: '#2563EB',
        heroImageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80',
        isActive: true,
        isFeatured: true,
        stats: {
            propertiesCount: 94,
            projectsCount: 9,
            partnersCount: 28,
            districtsCount: 8,
        },
        coordinates: {
            lat: 30.1365,
            lng: 31.7145,
        },
    },
];

export interface CityResolutionResult {
    portalMode: 'hub' | 'city';
    cityId: string;
    unavailableCity?: CityPortalConfig;
    unavailableSlug?: string;
}

const SUBDOMAIN_ALIASES: Record<string, string> = {
    heliopolies: 'heliopolis',
    shrouk: 'shorouk',
};

export const resolveCityFromEnvironment = (
    hostname: string,
    search: string,
    availableCities: CityPortalConfig[] = INITIAL_CITIES,
): CityResolutionResult => {
    const bySlug = new Map<string, CityPortalConfig>();
    availableCities.forEach((c) => {
        bySlug.set(c.slug.toLowerCase(), c);
        bySlug.set(c.id.toLowerCase(), c);
    });

    const firstActiveCityId =
        availableCities.find((c) => c.isActive)?.id || availableCities[0]?.id || 'heliopolis';

    const resolveCandidate = (rawSlug: string): CityResolutionResult | null => {
        const canonical = SUBDOMAIN_ALIASES[rawSlug] || rawSlug;
        const found = bySlug.get(canonical);
        if (!found) return null;
        if (found.isActive) {
            return { portalMode: 'city', cityId: found.id };
        }
        return {
            portalMode: 'city',
            cityId: found.id,
            unavailableCity: found,
            unavailableSlug: found.slug,
        };
    };

    // 1. Explicit URL Query Override (?city=hub or ?city=shorouk) for dev/preview
    if (search) {
        const params = new URLSearchParams(search);
        const cityParam = params.get('city')?.trim().toLowerCase();
        if (cityParam === 'hub' || cityParam === 'root' || cityParam === 'all') {
            return { portalMode: 'hub', cityId: firstActiveCityId };
        }
        if (cityParam) {
            const matched = resolveCandidate(cityParam);
            if (matched) return matched;
        }
    }

    // 2. Subdomain / Hostname Resolution (e.g. heliopolis.only-property.com or only-property.com)
    const normalizedHost = (hostname || '').trim().toLowerCase();
    if (
        normalizedHost === ROOT_HUB_DOMAIN ||
        normalizedHost === `www.${ROOT_HUB_DOMAIN}` ||
        normalizedHost === 'only-propoerty.com' ||
        normalizedHost === 'www.only-propoerty.com'
    ) {
        return { portalMode: 'hub', cityId: firstActiveCityId };
    }

    const hostParts = normalizedHost.split('.');
    if (hostParts.length >= 2) {
        const candidateSubdomain = hostParts[0];
        const matched = resolveCandidate(candidateSubdomain);
        if (matched) return matched;
    }

    // 3. Default fallback preserves active New Heliopolis / first active city behavior
    return { portalMode: 'city', cityId: firstActiveCityId };
};

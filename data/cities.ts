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
        heroImageUrl: '/src/assets/images/city_portal_heliopolis_1794779920751.jpg',
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
        heroImageUrl: '/src/assets/images/city_portal_shorouk_1794779921340.jpg',
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
        heroImageUrl: '/src/assets/images/city_portal_badr_1794779922365.jpg',
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

export const resolveCityFromEnvironment = (
    hostname: string,
    search: string,
    availableCities: CityPortalConfig[] = INITIAL_CITIES,
): { portalMode: 'hub' | 'city'; cityId: string } => {
    const activeSlugs = new Set(availableCities.filter((c) => c.isActive).map((c) => c.slug.toLowerCase()));

    // 1. Explicit URL Query Override (?city=hub or ?city=shorouk) for dev/preview
    if (search) {
        const params = new URLSearchParams(search);
        const cityParam = params.get('city')?.trim().toLowerCase();
        if (cityParam === 'hub' || cityParam === 'root' || cityParam === 'all') {
            return { portalMode: 'hub', cityId: 'heliopolis' };
        }
        if (cityParam && activeSlugs.has(cityParam)) {
            return { portalMode: 'city', cityId: cityParam };
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
        return { portalMode: 'hub', cityId: 'heliopolis' };
    }

    const hostParts = normalizedHost.split('.');
    if (hostParts.length >= 2) {
        const candidateSubdomain = hostParts[0];
        if (candidateSubdomain === 'heliopolies') {
            return { portalMode: 'city', cityId: 'heliopolis' };
        }
        if (candidateSubdomain === 'shrouk') {
            return { portalMode: 'city', cityId: 'shorouk' };
        }
        if (activeSlugs.has(candidateSubdomain)) {
            return { portalMode: 'city', cityId: candidateSubdomain };
        }
    }

    // 3. Default fallback preserves existing New Heliopolis behavior
    return { portalMode: 'city', cityId: 'heliopolis' };
};

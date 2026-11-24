import type { HomeSectionConfig, HomeSectionId, NavigationLinkConfig, SiteContent } from '../types';
import { siteContentData as fallbackData } from '../data/content';

export const DEFAULT_NAVIGATION_LINKS: NavigationLinkConfig[] = fallbackData.navigation || [
    { id: 'nav-home', href: '/', label: { ar: 'الرئيسية', en: 'Home' }, visible: true, order: 1, icon: 'HomeIcon', isEnd: true },
    { id: 'nav-properties', href: '/properties', label: { ar: 'العقارات', en: 'Properties' }, visible: true, order: 2, icon: 'BuildingIcon' },
    { id: 'nav-projects', href: '/projects', label: { ar: 'المشاريع', en: 'Projects' }, visible: true, order: 3, icon: 'CubeIcon' },
    { id: 'nav-finishing', href: '/finishing', label: { ar: 'التشطيبات', en: 'Finishing' }, visible: true, order: 4, icon: 'WrenchScrewdriverIcon' },
    { id: 'nav-decorations', href: '/decorations', label: { ar: 'الديكورات', en: 'Decorations' }, visible: true, order: 5, icon: 'SparklesIcon' },
    { id: 'nav-contact', href: '/contact', label: { ar: 'تواصل معنا', en: 'Contact Us' }, visible: true, order: 6, icon: 'PhoneIcon' },
];

export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = fallbackData.homeSections || [
    { id: 'hero', label: { ar: 'القسم الرئيسي (Hero)', en: 'Hero Section' }, enabled: true, order: 1 },
    { id: 'homeBanner', label: { ar: 'البانرات الإعلانية', en: 'Promotional Banners' }, enabled: true, order: 2 },
    { id: 'socialProof', label: { ar: 'الإثبات الاجتماعي والأرقام', en: 'Social Proof Stats' }, enabled: true, order: 3 },
    { id: 'services', label: { ar: 'خدماتنا', en: 'Services Overview' }, enabled: true, order: 4 },
    { id: 'whyNewHeliopolis', label: { ar: 'لماذا هليوبوليس الجديدة', en: 'Why New Heliopolis' }, enabled: true, order: 5 },
    { id: 'whyUs', label: { ar: 'لماذا تختارنا', en: 'Why Choose Us' }, enabled: true, order: 6 },
    { id: 'homeListings', label: { ar: 'أحدث العقارات', en: 'Latest Properties' }, enabled: true, order: 7 },
    { id: 'partners', label: { ar: 'الشركاء والمطورون', en: 'Partners & Developers' }, enabled: true, order: 8 },
    { id: 'testimonials', label: { ar: 'آراء العملاء', en: 'Testimonials' }, enabled: true, order: 9 },
    { id: 'homeCTA', label: { ar: 'الدعوة لاتخاذ إجراء (CTA)', en: 'Call to Action (CTA)' }, enabled: true, order: 10 },
];

export const resolveNavigationLinks = (
    siteContent?: Partial<SiteContent> | null,
    options?: { includeHidden?: boolean }
): NavigationLinkConfig[] => {
    const rawList = Array.isArray(siteContent?.navigation) && siteContent.navigation.length > 0
        ? siteContent.navigation
        : DEFAULT_NAVIGATION_LINKS;

    const normalized = rawList
        .filter((item): item is NavigationLinkConfig => Boolean(item && typeof item === 'object' && item.href))
        .map((item, idx) => {
            const defaultMatch = DEFAULT_NAVIGATION_LINKS.find(
                (def) => def.id === item.id || def.href === item.href
            );
            return {
                id: item.id || defaultMatch?.id || `nav-${idx + 1}`,
                href: item.href,
                label: {
                    ar: item.label?.ar || defaultMatch?.label.ar || item.label?.en || item.href,
                    en: item.label?.en || defaultMatch?.label.en || item.label?.ar || item.href,
                },
                visible: item.visible !== false,
                order: typeof item.order === 'number' && Number.isFinite(item.order) ? item.order : idx + 1,
                icon: item.icon || defaultMatch?.icon || 'LinkIcon',
                isEnd: item.isEnd ?? (item.href === '/'),
            };
        })
        .sort((a, b) => a.order - b.order);

    if (options?.includeHidden) {
        return normalized;
    }
    return normalized.filter((item) => item.visible);
};

export const isSectionLegacyEnabled = (
    siteContent: Partial<SiteContent> | null | undefined,
    sectionId: HomeSectionId
): boolean => {
    if (!siteContent) return true;
    switch (sectionId) {
        case 'hero':
            return siteContent.hero?.enabled ?? true;
        case 'socialProof':
            return siteContent.socialProof?.enabled ?? true;
        case 'services':
            return siteContent.services?.enabled ?? true;
        case 'whyNewHeliopolis':
            return siteContent.whyNewHeliopolis?.enabled ?? true;
        case 'whyUs':
            return siteContent.whyUs?.enabled ?? true;
        case 'homeListings':
            return siteContent.homeListings?.enabled ?? true;
        case 'partners':
            return siteContent.partners?.enabled ?? true;
        case 'testimonials':
            return siteContent.testimonials?.enabled ?? true;
        case 'homeCTA':
            return siteContent.homeCTA?.enabled ?? true;
        case 'homeBanner':
        default:
            return true;
    }
};

export const resolveHomeSections = (
    siteContent?: Partial<SiteContent> | null,
    options?: { includeDisabled?: boolean }
): HomeSectionConfig[] => {
    const rawSections = Array.isArray(siteContent?.homeSections) && siteContent.homeSections.length > 0
        ? siteContent.homeSections
        : DEFAULT_HOME_SECTIONS;

    const seen = new Set<HomeSectionId>();
    const combined: HomeSectionConfig[] = [];

    rawSections.forEach((sec, idx) => {
        if (!sec || typeof sec !== 'object' || !sec.id) return;
        const defaultMatch = DEFAULT_HOME_SECTIONS.find((d) => d.id === sec.id);
        if (!defaultMatch || seen.has(sec.id)) return;
        seen.add(sec.id);

        const legacyEnabled = isSectionLegacyEnabled(siteContent, sec.id);
        combined.push({
            id: sec.id,
            label: {
                ar: sec.label?.ar || defaultMatch.label.ar,
                en: sec.label?.en || defaultMatch.label.en,
            },
            enabled: sec.enabled !== false && legacyEnabled,
            order: typeof sec.order === 'number' && Number.isFinite(sec.order) ? sec.order : idx + 1,
        });
    });

    // Ensure any newly introduced section ids are preserved for backward compatibility
    DEFAULT_HOME_SECTIONS.forEach((def) => {
        if (!seen.has(def.id)) {
            const legacyEnabled = isSectionLegacyEnabled(siteContent, def.id);
            combined.push({
                ...def,
                enabled: def.enabled && legacyEnabled,
                order: combined.length + 1,
            });
        }
    });

    const sorted = combined.sort((a, b) => a.order - b.order);
    return options?.includeDisabled ? sorted : sorted.filter((s) => s.enabled);
};

export const isExternalUrl = (target?: string): boolean => {
    if (!target) return false;
    return /^(https?:\/\/|mailto:|tel:|wa\.me)/i.test(target.trim());
};

export const normalizeActionTarget = (target?: string, fallback: string = '/'): string => {
    if (!target || typeof target !== 'string') return fallback;
    const trimmed = target.trim();
    if (!trimmed) return fallback;
    if (isExternalUrl(trimmed) || trimmed.startsWith('/')) return trimmed;
    return `/${trimmed}`;
};

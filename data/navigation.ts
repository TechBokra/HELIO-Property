import React from 'react';
import { Permission, Role, Language } from '../types';
import {
  HomeIcon, ChartBarIcon, UserPlusIcon, ClipboardDocumentListIcon, SearchIcon,
  InboxIcon, WrenchScrewdriverIcon, UsersIcon, CubeIcon, BuildingIcon,
  CogIcon, PhotoIcon, SparklesIcon, ShieldCheckIcon, PhoneIcon,
  AdjustmentsHorizontalIcon, BellIcon, BanknotesIcon, ListIcon, LinkIcon,
  TableCellsIcon, CloudIcon, DocumentCheckIcon
} from '../components/ui/Icons';

export type AdminNavGroup = 
  | 'control_center'
  | 'real_estate'
  | 'partners'
  | 'customers'
  | 'finishing_decoration'
  | 'commercial'
  | 'content_media'
  | 'analytics_reports'
  | 'governance'
  | 'automation_forms'
  | 'system';

export interface AdminGroupConfig {
    id: AdminNavGroup;
    label: { en: string; ar: string };
    order: number;
}

export const ADMIN_GROUPS: Record<AdminNavGroup, AdminGroupConfig> = {
    control_center: { id: 'control_center', label: { en: 'Control Center', ar: 'مركز التحكم' }, order: 1 },
    real_estate: { id: 'real_estate', label: { en: 'Real Estate', ar: 'العقارات' }, order: 2 },
    partners: { id: 'partners', label: { en: 'Partners', ar: 'الشركاء' }, order: 3 },
    customers: { id: 'customers', label: { en: 'Customers', ar: 'العملاء' }, order: 4 },
    finishing_decoration: { id: 'finishing_decoration', label: { en: 'Finishing & Decoration', ar: 'التشطيب والديكور' }, order: 5 },
    commercial: { id: 'commercial', label: { en: 'Commercial', ar: 'القطاع التجاري' }, order: 6 },
    content_media: { id: 'content_media', label: { en: 'Content & Media', ar: 'المحتوى والوسائط' }, order: 7 },
    analytics_reports: { id: 'analytics_reports', label: { en: 'Analytics & Reports', ar: 'التحليلات والتقارير' }, order: 8 },
    governance: { id: 'governance', label: { en: 'Governance', ar: 'الحوكمة وإدارة الفريق' }, order: 9 },
    automation_forms: { id: 'automation_forms', label: { en: 'Automation & Forms', ar: 'الأتمتة والنماذج' }, order: 10 },
    system: { id: 'system', label: { en: 'System', ar: 'النظام والإعدادات' }, order: 11 },
};

export interface NavLinkItem {
    id?: string;
    name: (t: any) => string;
    labelEn?: string;
    labelAr?: string;
    href: string;
    icon: React.FC<{ className?: string }>;
    exact?: boolean;
    group: AdminNavGroup | string;
    permission: Permission;
    roles?: Role[];
    matchPrefixes?: string[];
}

export interface BreadcrumbItem {
    label: string;
    href?: string;
    isCurrent?: boolean;
}

export const partnerNavLinks: NavLinkItem[] = [
    { name: t => t.nav.home, href: '/dashboard', icon: HomeIcon, exact: true, group: 'Partner', permission: Permission.VIEW_PARTNER_DASHBOARD },
    { name: t => t.nav.profile, href: '/dashboard/profile', icon: UserPlusIcon, group: 'Partner', permission: Permission.MANAGE_OWN_PROFILE },
    { name: t => t.nav.properties, href: '/dashboard/properties', icon: BuildingIcon, group: 'Partner', permission: Permission.MANAGE_OWN_PROPERTIES },
    { name: t => t.nav.projects, href: '/dashboard/projects', icon: CubeIcon, group: 'Partner', permission: Permission.MANAGE_OWN_PROJECTS },
    { name: t => t.nav.portfolio, href: '/dashboard/portfolio', icon: PhotoIcon, group: 'Partner', permission: Permission.MANAGE_OWN_PORTFOLIO },
    { name: t => t.nav?.capabilities || 'تخصصات ومناطق التشطيب', href: '/dashboard/capabilities', icon: WrenchScrewdriverIcon, group: 'Partner', permission: Permission.MANAGE_OWN_PROFILE },
    { name: t => t.nav.leads, href: '/dashboard/leads', icon: InboxIcon, group: 'Partner', permission: Permission.VIEW_OWN_LEADS },
    { name: t => t.nav.subscription, href: '/dashboard/subscription', icon: ClipboardDocumentListIcon, group: 'Partner', permission: Permission.MANAGE_OWN_SUBSCRIPTION },
    { name: t => t.nav.finance, href: '/dashboard/finance', icon: BanknotesIcon, group: 'Partner', permission: Permission.MANAGE_OWN_SUBSCRIPTION },
    { name: t => t.nav.team, href: '/dashboard/team', icon: UsersIcon, group: 'Partner', permission: Permission.MANAGE_TEAM },
];

/**
 * CANONICAL ADMIN NAVIGATION DEFINITION (PHASE 3A)
 * Single source of truth for:
 * - Desktop sidebar
 * - Mobile sidebar drawer
 * - Header breadcrumbs and context
 * - Active state determination
 */
export const adminNavLinks: NavLinkItem[] = [
    // --- 1. CONTROL CENTER ---
    {
        id: 'admin_dashboard',
        name: t => t.adminDashboard?.nav?.dashboard || (t.common?.dashboard || 'لوحة التحكم'),
        labelEn: 'Dashboard',
        labelAr: 'لوحة التحكم',
        href: '/admin',
        icon: HomeIcon,
        exact: true,
        group: 'control_center',
        permission: Permission.VIEW_ADMIN_DASHBOARD,
    },

    // --- 2. REAL ESTATE ---
    {
        id: 'real_estate_properties',
        name: t => t.adminDashboard?.nav?.properties || 'العقارات',
        labelEn: 'Properties',
        labelAr: 'العقارات',
        href: '/admin/properties',
        icon: BuildingIcon,
        group: 'real_estate',
        permission: Permission.VIEW_PROPERTIES,
        matchPrefixes: ['/admin/properties/list', '/admin/properties/new', '/admin/properties/edit', '/admin/properties/filters', '/admin/platform-properties'],
    },
    {
        id: 'real_estate_requests',
        name: t => t.adminDashboard?.nav?.propertyRequests || 'طلبات إضافة عقار',
        labelEn: 'Property Requests',
        labelAr: 'طلبات إضافة عقار',
        href: '/admin/properties/listing-requests',
        icon: ClipboardDocumentListIcon,
        group: 'real_estate',
        permission: Permission.MANAGE_PROPERTY_REQUESTS,
        matchPrefixes: ['/admin/properties/listing-requests'],
    },
    {
        id: 'real_estate_inquiries',
        name: t => t.adminDashboard?.nav?.propertyInquiries || 'استفسارات وطلبات البحث',
        labelEn: 'Property Inquiries',
        labelAr: 'استفسارات وطلبات البحث',
        href: '/admin/properties/search-requests',
        icon: SearchIcon,
        group: 'real_estate',
        permission: Permission.MANAGE_PROPERTY_INQUIRIES,
        matchPrefixes: ['/admin/properties/search-requests'],
    },
    {
        id: 'real_estate_projects',
        name: t => t.adminDashboard?.nav?.projects || 'المشاريع والكمبوندات',
        labelEn: 'Projects',
        labelAr: 'المشاريع والكمبوندات',
        href: '/admin/projects',
        icon: CubeIcon,
        group: 'real_estate',
        permission: Permission.VIEW_PROJECTS,
        matchPrefixes: ['/admin/projects/new', '/admin/projects/edit'],
    },

    // --- 3. PARTNERS ---
    {
        id: 'partners_management',
        name: t => t.adminDashboard?.nav?.partners || 'الشركاء والمطورين',
        labelEn: 'Partners',
        labelAr: 'الشركاء والمطورين',
        href: '/admin/partners',
        icon: UsersIcon,
        group: 'partners',
        permission: Permission.VIEW_PARTNERS,
        matchPrefixes: ['/admin/partners/list', '/admin/partners/new', '/admin/partners/edit'],
    },
    {
        id: 'partners_requests',
        name: t => t.adminDashboard?.nav?.partnerRequests || 'طلبات انضمام الشركاء',
        labelEn: 'Partner Requests',
        labelAr: 'طلبات انضمام الشركاء',
        href: '/admin/partners/requests',
        icon: UserPlusIcon,
        group: 'partners',
        permission: Permission.MANAGE_PARTNER_REQUESTS,
        matchPrefixes: ['/admin/partners/requests'],
    },
    {
        id: 'partners_routing',
        name: () => 'توجيه استفسارات الشركاء',
        labelEn: 'Partner Routing',
        labelAr: 'توجيه استفسارات الشركاء',
        href: '/admin/partners/inquiry-routing',
        icon: AdjustmentsHorizontalIcon,
        group: 'partners',
        permission: Permission.MANAGE_INQUIRY_ROUTING,
    },

    // --- 4. CUSTOMERS ---
    {
        id: 'customers_management',
        name: () => 'سجل العملاء',
        labelEn: 'Customers',
        labelAr: 'سجل العملاء',
        href: '/admin/customers',
        icon: UsersIcon,
        group: 'customers',
        permission: Permission.VIEW_CUSTOMERS,
    },

    // --- 5. FINISHING & DECORATION ---
    {
        id: 'finishing_services',
        name: t => t.adminDashboard?.nav?.platformFinishing || 'خدمات وباقات التشطيب',
        labelEn: 'Finishing Services',
        labelAr: 'خدمات وباقات التشطيب',
        href: '/admin/platform-finishing',
        icon: WrenchScrewdriverIcon,
        group: 'finishing_decoration',
        permission: Permission.VIEW_FINISHING,
        exact: true,
    },
    {
        id: 'finishing_requests',
        name: t => t.adminDashboard?.nav?.finishingRequests || 'طلبات التشطيب',
        labelEn: 'Finishing Requests',
        labelAr: 'طلبات التشطيب',
        href: '/admin/platform-finishing/requests',
        icon: ClipboardDocumentListIcon,
        group: 'finishing_decoration',
        permission: Permission.MANAGE_PLATFORM_FINISHING_LEADS,
        matchPrefixes: ['/admin/platform-finishing/requests'],
    },
    {
        id: 'decorations_portfolio',
        name: t => t.adminDashboard?.nav?.platformDecorations || 'معرض أعمال الديكور',
        labelEn: 'Decorations',
        labelAr: 'معرض أعمال الديكور',
        href: '/admin/platform-decorations',
        icon: SparklesIcon,
        group: 'finishing_decoration',
        permission: Permission.VIEW_DECORATIONS,
        exact: true,
        matchPrefixes: ['/admin/platform-decorations/portfolio'],
    },
    {
        id: 'decorations_requests',
        name: t => t.adminDashboard?.nav?.decorationsRequests || 'طلبات الديكور والتصميم',
        labelEn: 'Decoration Requests',
        labelAr: 'طلبات الديكور والتصميم',
        href: '/admin/platform-decorations/requests',
        icon: PhotoIcon,
        group: 'finishing_decoration',
        permission: Permission.MANAGE_DECORATIONS_LEADS,
        matchPrefixes: ['/admin/platform-decorations/requests'],
    },

    // --- 6. COMMERCIAL ---
    {
        id: 'commercial_leads',
        name: t => t.nav?.leads || 'العملاء المحتملين (Leads)',
        labelEn: 'Leads',
        labelAr: 'العملاء المحتملين (Leads)',
        href: '/admin/leads',
        icon: InboxIcon,
        group: 'commercial',
        permission: Permission.VIEW_LEADS,
    },
    {
        id: 'commercial_plans',
        name: t => t.adminDashboard?.nav?.subscriptionPlans || 'خطط وباقات الاشتراك',
        labelEn: 'Subscription Plans',
        labelAr: 'خطط وباقات الاشتراك',
        href: '/admin/partners/plans',
        icon: ClipboardDocumentListIcon,
        group: 'commercial',
        permission: Permission.MANAGE_PLANS,
        matchPrefixes: ['/admin/partners/plans'],
    },
    {
        id: 'commercial_finance',
        name: t => t.adminDashboard?.nav?.finance || 'المركز المالي والمعاملات',
        labelEn: 'Finance',
        labelAr: 'المركز المالي والمعاملات',
        href: '/admin/finance',
        icon: BanknotesIcon,
        group: 'commercial',
        permission: Permission.VIEW_FINANCE,
    },
    {
        id: 'commercial_contacts',
        name: t => t.adminDashboard?.nav?.contactRequests || 'رسائل اتصل بنا',
        labelEn: 'Contact Messages',
        labelAr: 'رسائل اتصل بنا',
        href: '/admin/contact-requests',
        icon: PhoneIcon,
        group: 'commercial',
        permission: Permission.MANAGE_CONTACT_REQUESTS,
    },

    // --- 7. CONTENT & MEDIA ---
    {
        id: 'content_website',
        name: t => t.adminDashboard?.nav?.siteContent || 'محتوى صفحات الموقع',
        labelEn: 'Website Content',
        labelAr: 'محتوى صفحات الموقع',
        href: '/admin/content',
        icon: ClipboardDocumentListIcon,
        group: 'content_media',
        permission: Permission.VIEW_SITE_CONTENT,
        matchPrefixes: ['/admin/content/'],
    },
    {
        id: 'content_banners',
        name: t => t.adminDashboard?.nav?.banners || 'الإعلانات والبانرات',
        labelEn: 'Banners & Ads',
        labelAr: 'الإعلانات والبانرات',
        href: '/admin/banners',
        icon: PhotoIcon,
        group: 'content_media',
        permission: Permission.MANAGE_BANNERS,
        matchPrefixes: ['/admin/banners/new', '/admin/banners/edit'],
    },
    {
        id: 'content_media',
        name: t => t.adminDashboard?.nav?.mediaLibrary || 'مكتبة الوسائط والتخزين',
        labelEn: 'Media Library',
        labelAr: 'مكتبة الوسائط والتخزين',
        href: '/admin/media',
        icon: CloudIcon,
        group: 'content_media',
        permission: Permission.MANAGE_MEDIA,
        matchPrefixes: ['/admin/cloudinary'],
    },

    // --- 8. ANALYTICS & REPORTS ---
    {
        id: 'analytics_overview',
        name: t => t.adminDashboard?.nav?.analytics || 'التحليلات والأداء',
        labelEn: 'Analytics',
        labelAr: 'التحليلات والأداء',
        href: '/admin/analytics',
        icon: ChartBarIcon,
        group: 'analytics_reports',
        permission: Permission.VIEW_ANALYTICS,
    },
    {
        id: 'analytics_reports',
        name: t => t.adminDashboard?.nav?.reports || 'التقارير وسجلات التصدير',
        labelEn: 'Reports',
        labelAr: 'التقارير وسجلات التصدير',
        href: '/admin/reports',
        icon: TableCellsIcon,
        group: 'analytics_reports',
        permission: Permission.VIEW_REPORTS,
    },

    // --- 9. GOVERNANCE ---
    {
        id: 'governance_users',
        name: t => t.adminDashboard?.nav?.users || 'المستخدمين وفريق العمل',
        labelEn: 'Users & Team',
        labelAr: 'المستخدمين وفريق العمل',
        href: '/admin/users',
        icon: UsersIcon,
        group: 'governance',
        permission: Permission.VIEW_USERS,
        matchPrefixes: ['/admin/users/new', '/admin/users/edit'],
    },
    {
        id: 'governance_roles',
        name: t => t.adminDashboard?.nav?.rolesAndPermissions || 'الأدوار والصلاحيات',
        labelEn: 'Roles & Permissions',
        labelAr: 'الأدوار والصلاحيات',
        href: '/admin/roles',
        icon: ShieldCheckIcon,
        group: 'governance',
        permission: Permission.VIEW_ROLES_PERMISSIONS,
    },
    {
        id: 'governance_audit',
        name: () => 'سجل التدقيق والعمليات',
        labelEn: 'Audit Log',
        labelAr: 'سجل التدقيق والعمليات',
        href: '/admin/audit-log',
        icon: DocumentCheckIcon,
        group: 'governance',
        permission: Permission.VIEW_AUDIT_LOG,
    },

    // --- 10. AUTOMATION & FORMS ---
    {
        id: 'automation_rules',
        name: t => t.adminDashboard?.nav?.automationRules || 'قواعد التوجيه والأتمتة',
        labelEn: 'Routing & Automation',
        labelAr: 'قواعد التوجيه والأتمتة',
        href: '/admin/automation',
        icon: AdjustmentsHorizontalIcon,
        group: 'automation_forms',
        permission: Permission.VIEW_AUTOMATION,
    },
    {
        id: 'automation_forms',
        name: t => t.adminDashboard?.nav?.forms || 'النماذج الديناميكية',
        labelEn: 'Dynamic Forms',
        labelAr: 'النماذج الديناميكية',
        href: '/admin/forms',
        icon: ListIcon,
        group: 'automation_forms',
        permission: Permission.VIEW_FORMS,
    },

    // --- 11. SYSTEM ---
    {
        id: 'system_settings',
        name: t => t.adminDashboard?.nav?.settings || 'إعدادات النظام العامة',
        labelEn: 'Settings',
        labelAr: 'إعدادات النظام العامة',
        href: '/admin/settings',
        icon: CogIcon,
        group: 'system',
        permission: Permission.VIEW_SETTINGS,
    },
    {
        id: 'system_integrations',
        name: t => t.adminDashboard?.nav?.externalSettings || 'الربط الخارجي والمفاتيح',
        labelEn: 'Integrations',
        labelAr: 'الربط الخارجي والمفاتيح',
        href: '/admin/external-settings',
        icon: LinkIcon,
        group: 'system',
        permission: Permission.MANAGE_SETTINGS,
    },
    {
        id: 'system_notifications',
        name: t => t.adminDashboard?.nav?.notifications || 'الإشعارات والتنبيهات',
        labelEn: 'Notifications',
        labelAr: 'الإشعارات والتنبيهات',
        href: '/admin/notifications',
        icon: BellIcon,
        group: 'system',
        permission: Permission.VIEW_ADMIN_DASHBOARD,
    },
    {
        id: 'system_profile',
        name: t => t.dashboard?.nav?.profile || 'الملف الشخصي',
        labelEn: 'My Profile',
        labelAr: 'الملف الشخصي',
        href: '/admin/profile',
        icon: UserPlusIcon,
        group: 'system',
        permission: Permission.VIEW_ADMIN_DASHBOARD,
    },
];

/**
 * Determines the active navigation item with longest-prefix specificity matching
 */
export const getActiveAdminNav = (pathname: string): NavLinkItem | undefined => {
    // 1. Exact match first
    const exactMatch = adminNavLinks.find(link => link.href === pathname);
    if (exactMatch) return exactMatch;

    // 2. Exact root match
    if (pathname === '/admin' || pathname === '/admin/') {
        return adminNavLinks.find(link => link.href === '/admin');
    }

    // 3. Find candidates that match via matchPrefixes or href prefix
    const candidates = adminNavLinks.filter(link => {
        if (link.exact && link.href !== pathname) return false;
        if (pathname.startsWith(link.href + '/')) return true;
        if (link.matchPrefixes?.some(prefix => pathname.startsWith(prefix))) return true;
        return false;
    });

    if (candidates.length === 0) return undefined;

    // 4. Return candidate with the longest href (highest specificity)
    return candidates.sort((a, b) => b.href.length - a.href.length)[0];
};

/**
 * Gets localized group label
 */
export const getAdminGroupLabel = (group: AdminNavGroup | string, language: Language): string => {
    const config = ADMIN_GROUPS[group as AdminNavGroup];
    if (config) {
        return language === 'ar' ? config.label.ar : config.label.en;
    }
    return String(group);
};

/**
 * Derives breadcrumbs trail from route pathname and canonical navigation metadata
 */
export const getAdminBreadcrumbs = (pathname: string, language: Language, t: any): BreadcrumbItem[] => {
    const isAr = language === 'ar';
    const crumbs: BreadcrumbItem[] = [
        {
            label: isAr ? 'مركز التحكم' : 'Control Center',
            href: '/admin',
            isCurrent: pathname === '/admin' || pathname === '/admin/',
        }
    ];

    if (pathname === '/admin' || pathname === '/admin/') {
        return crumbs;
    }

    const activeItem = getActiveAdminNav(pathname);
    if (!activeItem) {
        // Fallback for custom unmapped subpaths
        const segments = pathname.replace('/admin/', '').split('/').filter(Boolean);
        segments.forEach((seg, index) => {
            const isLast = index === segments.length - 1;
            crumbs.push({
                label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
                href: isLast ? undefined : `/admin/${segments.slice(0, index + 1).join('/')}`,
                isCurrent: isLast,
            });
        });
        return crumbs;
    }

    // Add Group
    if (activeItem.group && activeItem.group !== 'control_center') {
        const groupLabel = getAdminGroupLabel(activeItem.group, language);
        crumbs.push({
            label: groupLabel,
        });
    }

    // Add Page
    const pageLabel = activeItem.name(t) || (isAr ? activeItem.labelAr : activeItem.labelEn) || 'Page';
    const isExactPage = pathname === activeItem.href;

    crumbs.push({
        label: pageLabel,
        href: isExactPage ? undefined : activeItem.href,
        isCurrent: isExactPage,
    });

    // Check for child action modifiers (e.g. /new, /edit/:id, /requests/:id)
    if (!isExactPage) {
        if (pathname.includes('/new')) {
            crumbs.push({
                label: isAr ? 'إضافة جديد' : 'Add New',
                isCurrent: true,
            });
        } else if (pathname.includes('/edit/')) {
            crumbs.push({
                label: isAr ? 'تعديل السجل' : 'Edit Item',
                isCurrent: true,
            });
        } else if (pathname.includes('/requests/')) {
            crumbs.push({
                label: isAr ? 'تفاصيل الطلب' : 'Request Details',
                isCurrent: true,
            });
        }
    }

    return crumbs;
};

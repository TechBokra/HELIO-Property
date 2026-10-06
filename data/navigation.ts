
import React from 'react';
import { Permission, Role } from '../types';
import {
  HomeIcon, ChartBarIcon, UserPlusIcon, ClipboardDocumentListIcon, SearchIcon,
  InboxIcon, WrenchScrewdriverIcon, UsersIcon, CubeIcon, BuildingIcon, QuoteIcon,
  CogIcon, PhotoIcon, SparklesIcon, ShieldCheckIcon, FileDownloadIcon, PhoneIcon,
  AdjustmentsHorizontalIcon, BellIcon, BanknotesIcon, ListIcon, LinkIcon, CalculatorIcon,
  TableCellsIcon, CloudIcon
} from '../components/ui/Icons';

export interface NavLinkItem {
    name: (t: any) => string;
    href: string;
    icon: React.FC<{ className?: string }>;
    exact?: boolean;
    group: string;
    permission: Permission;
    roles?: Role[];
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

export const adminNavLinks: NavLinkItem[] = [
    // --- 1. Control Center ---
    { name: t => t.adminDashboard.nav.dashboard, href: '/admin', icon: HomeIcon, exact: true, permission: Permission.VIEW_ADMIN_DASHBOARD, group: 'Control Center' },
    
    // --- 2. Operations ---
    { name: t => t.adminDashboard.nav.properties, href: '/admin/properties', icon: BuildingIcon, permission: Permission.VIEW_PROPERTIES, group: 'Operations' },
    { name: t => t.adminDashboard.nav.projects, href: '/admin/projects', icon: CubeIcon, permission: Permission.VIEW_PROJECTS, group: 'Operations' },
    { name: t => t.adminDashboard.nav.partners, href: '/admin/partners', icon: UsersIcon, permission: Permission.VIEW_PARTNERS, group: 'Operations' },
    { name: t => t.nav?.leads || 'العملاء المحتملين (Leads)', href: '/admin/leads', icon: InboxIcon, permission: Permission.VIEW_LEADS, group: 'Operations' },
    { name: t => t.adminDashboard.nav.contactRequests, href: '/admin/contact-requests', icon: PhoneIcon, permission: Permission.MANAGE_CONTACT_REQUESTS, group: 'Operations' },

    // --- 3. Services & Operations ---
    { name: t => t.adminDashboard.nav.platformFinishing, href: '/admin/platform-finishing', icon: WrenchScrewdriverIcon, permission: Permission.VIEW_FINISHING, group: 'Services' },
    { name: t => t.adminDashboard.nav.platformDecorations, href: '/admin/platform-decorations', icon: SparklesIcon, permission: Permission.VIEW_DECORATIONS, group: 'Services' },
    { name: t => t.adminDashboard.nav.platformProperties, href: '/admin/platform-properties', icon: BuildingIcon, permission: Permission.MANAGE_PLATFORM_PROPERTIES, group: 'Services' },

    // --- 4. Content & Media ---
    { name: t => t.adminDashboard.nav.siteContent, href: '/admin/content', icon: ClipboardDocumentListIcon, permission: Permission.VIEW_SITE_CONTENT, group: 'Content' },
    { name: t => t.adminDashboard.nav.mediaLibrary, href: '/admin/media', icon: CloudIcon, permission: Permission.MANAGE_MEDIA, group: 'Content' },
    { name: t => t.adminDashboard.nav.banners, href: '/admin/banners', icon: PhotoIcon, permission: Permission.MANAGE_BANNERS, group: 'Content' },

    // --- 5. Commercial & Intelligence ---
    { name: t => t.adminDashboard.nav.analytics, href: '/admin/analytics', icon: ChartBarIcon, permission: Permission.VIEW_ANALYTICS, group: 'Commercial' },
    { name: t => t.adminDashboard.nav.reports, href: '/admin/reports', icon: TableCellsIcon, permission: Permission.VIEW_REPORTS, group: 'Commercial' },
    { name: t => t.adminDashboard.nav.finance, href: '/admin/finance', icon: BanknotesIcon, permission: Permission.VIEW_FINANCE, group: 'Commercial' },
    
    // --- 6. Governance & Administration ---
    { name: t => t.adminDashboard.nav.users, href: '/admin/users', icon: UsersIcon, permission: Permission.VIEW_USERS, group: 'Administration' },
    { name: t => t.adminDashboard.nav.rolesAndPermissions, href: '/admin/roles', icon: ShieldCheckIcon, permission: Permission.VIEW_ROLES_PERMISSIONS, group: 'Administration' },
    { name: t => t.adminDashboard.nav.forms, href: '/admin/forms', icon: ListIcon, permission: Permission.VIEW_FORMS, group: 'Administration' },
    { name: t => t.adminDashboard.nav.automationRules, href: '/admin/automation', icon: AdjustmentsHorizontalIcon, permission: Permission.VIEW_AUTOMATION, group: 'Administration' },
    { name: t => t.adminDashboard.nav.notifications, href: '/admin/notifications', icon: BellIcon, permission: Permission.VIEW_ADMIN_DASHBOARD, group: 'Administration' },
    { name: t => t.adminDashboard.nav.settings, href: '/admin/settings', icon: CogIcon, permission: Permission.VIEW_SETTINGS, group: 'Administration' },
    { name: t => t.adminDashboard.nav.externalSettings, href: '/admin/external-settings', icon: LinkIcon, permission: Permission.MANAGE_SETTINGS, group: 'Administration' },
    { name: t => t.dashboard.nav.profile, href: '/admin/profile', icon: UserPlusIcon, permission: Permission.VIEW_ADMIN_DASHBOARD, group: 'Administration' },
];

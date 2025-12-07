
import React from 'react';
import { Permission, Role } from '../types';
import {
  HomeIcon, ChartBarIcon, UserPlusIcon, ClipboardDocumentListIcon, SearchIcon,
  InboxIcon, WrenchScrewdriverIcon, UsersIcon, CubeIcon, BuildingIcon, QuoteIcon,
  CogIcon, PhotoIcon, SparklesIcon, ShieldCheckIcon, FileDownloadIcon, PhoneIcon,
  AdjustmentsHorizontalIcon, BellIcon, BanknotesIcon, ListIcon, LinkIcon, CalculatorIcon
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
    { name: t => t.nav.leads, href: '/dashboard/leads', icon: InboxIcon, group: 'Partner', permission: Permission.VIEW_OWN_LEADS },
    { name: t => t.nav.subscription, href: '/dashboard/subscription', icon: BanknotesIcon, group: 'Partner', permission: Permission.MANAGE_OWN_SUBSCRIPTION },
    { name: t => t.nav.team, href: '/dashboard/team', icon: UsersIcon, group: 'Partner', permission: Permission.MANAGE_TEAM },
];

export const adminNavLinks: NavLinkItem[] = [
    { name: t => t.adminDashboard.nav.dashboard, href: '/admin', icon: HomeIcon, exact: true, permission: Permission.VIEW_ADMIN_DASHBOARD, group: 'Overview' },
    { name: t => t.adminDashboard.nav.partners, href: '/admin/partners', icon: UsersIcon, permission: Permission.MANAGE_ALL_PARTNERS, group: 'Partner Relations' },
    { name: t => t.adminDashboard.nav.properties, href: '/admin/properties', icon: BuildingIcon, permission: Permission.MANAGE_ALL_PROPERTIES, group: 'Content & Listings' },
    { name: t => t.adminDashboard.nav.projects, href: '/admin/projects', icon: CubeIcon, permission: Permission.MANAGE_ALL_PROJECTS, group: 'Content & Listings' },
    
    { name: t => t.adminDashboard.nav.platformFinishing, href: '/admin/platform-finishing', icon: WrenchScrewdriverIcon, permission: Permission.MANAGE_PLATFORM_FINISHING_LEADS, group: 'Platform Operations' },
    { name: t => t.adminDashboard.nav.platformDecorations, href: '/admin/platform-decorations', icon: SparklesIcon, permission: Permission.MANAGE_DECORATIONS_LEADS, group: 'Platform Operations' },
    { name: t => t.adminDashboard.nav.platformProperties, href: '/admin/platform-properties', icon: BuildingIcon, permission: Permission.MANAGE_PLATFORM_PROPERTIES, group: 'Platform Operations' },
    { name: t => t.adminDashboard.nav.contactRequests, href: '/admin/contact-requests', icon: InboxIcon, permission: Permission.MANAGE_CONTACT_REQUESTS, group: 'Customer Relations' },
    { name: t => t.adminDashboard.nav.banners, href: '/admin/banners', icon: PhotoIcon, permission: Permission.MANAGE_BANNERS, group: 'Content Management' },
    { name: t => t.adminDashboard.nav.siteContent, href: '/admin/content', icon: ClipboardDocumentListIcon, permission: Permission.MANAGE_SITE_CONTENT, group: 'Content Management' },
    
    { name: t => t.adminDashboard.nav.forms, href: '/admin/forms', icon: ListIcon, permission: Permission.MANAGE_FORMS, group: 'System' },
    { name: t => t.adminDashboard.nav.users, href: '/admin/users', icon: UsersIcon, permission: Permission.MANAGE_USERS, group: 'System' },
    { name: t => t.adminDashboard.nav.automationRules, href: '/admin/automation', icon: AdjustmentsHorizontalIcon, permission: Permission.MANAGE_AUTOMATION, group: 'System' },
    { name: t => t.adminDashboard.nav.rolesAndPermissions, href: '/admin/roles', icon: ShieldCheckIcon, permission: Permission.MANAGE_ROLES_PERMISSIONS, group: 'System' },
    { name: t => t.adminDashboard.nav.settings, href: '/admin/settings', icon: CogIcon, permission: Permission.MANAGE_SETTINGS, group: 'System' },
    { name: t => t.adminDashboard.nav.externalSettings, href: '/admin/external-settings', icon: LinkIcon, permission: Permission.MANAGE_SETTINGS, group: 'System' },
    { name: t => t.dashboard.nav.profile, href: '/admin/profile', icon: UserPlusIcon, permission: Permission.VIEW_ADMIN_DASHBOARD, group: 'System' },
];

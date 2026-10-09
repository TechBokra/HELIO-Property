import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Role, Permission } from '../../../types';
import { getRolePermissions, updateRolePermissions } from '../../../services/permissions';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Checkbox } from '../../ui/Checkbox';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { ShieldCheckIcon, CheckCircleIcon, UsersIcon, BuildingIcon, SparklesIcon, CogIcon } from '../../ui/Icons';

// Comprehensive dictionary for all platform permissions in Arabic and English
interface PermissionMeta {
    ar: string;
    en: string;
    category: 'dashboard' | 'real_estate' | 'finishing' | 'partners' | 'system';
}

const PERMISSION_LABELS: Record<Permission, PermissionMeta> = {
    // DASHBOARD
    [Permission.VIEW_ADMIN_DASHBOARD]: { ar: 'عرض لوحة الإدارة', en: 'View Admin Dashboard', category: 'dashboard' },
    [Permission.VIEW_PARTNER_DASHBOARD]: { ar: 'عرض لوحة الشريك', en: 'View Partner Dashboard', category: 'dashboard' },
    [Permission.VIEW_CUSTOMER_DASHBOARD]: { ar: 'عرض لوحة العميل', en: 'View Customer Dashboard', category: 'dashboard' },
    
    // REAL ESTATE & PROPERTIES
    [Permission.VIEW_PROPERTIES]: { ar: 'عرض العقارات', en: 'View Properties', category: 'real_estate' },
    [Permission.MANAGE_ALL_PROPERTIES]: { ar: 'إدارة جميع العقارات', en: 'Manage All Properties', category: 'real_estate' },
    [Permission.MANAGE_PLATFORM_PROPERTIES]: { ar: 'إدارة عقارات المنصة الحصرية', en: 'Manage Platform Properties', category: 'real_estate' },
    [Permission.MANAGE_MARKET_PROPERTIES]: { ar: 'إدارة عقارات السوق المفتوح', en: 'Manage Market Properties', category: 'real_estate' },
    [Permission.PUBLISH_PROPERTIES]: { ar: 'نشر العقارات', en: 'Publish Properties', category: 'real_estate' },
    [Permission.ARCHIVE_PROPERTIES]: { ar: 'أرشفة وحذف العقارات', en: 'Archive Properties', category: 'real_estate' },
    [Permission.MANAGE_OWN_PROPERTIES]: { ar: 'إدارة العقارات الخاصة', en: 'Manage Own Properties', category: 'real_estate' },
    
    // PROJECTS
    [Permission.VIEW_PROJECTS]: { ar: 'عرض المشاريع', en: 'View Projects', category: 'real_estate' },
    [Permission.MANAGE_ALL_PROJECTS]: { ar: 'إدارة جميع المشاريع', en: 'Manage All Projects', category: 'real_estate' },
    [Permission.MANAGE_OWN_PROJECTS]: { ar: 'إدارة المشاريع الخاصة', en: 'Manage Own Projects', category: 'real_estate' },

    // PARTNERS
    [Permission.VIEW_PARTNERS]: { ar: 'عرض الشركاء', en: 'View Partners', category: 'partners' },
    [Permission.MANAGE_ALL_PARTNERS]: { ar: 'إدارة جميع الشركاء', en: 'Manage All Partners', category: 'partners' },
    [Permission.VERIFY_PARTNERS]: { ar: 'توثيق وتفعيل الشركاء', en: 'Verify Partners', category: 'partners' },
    [Permission.SUSPEND_PARTNERS]: { ar: 'تعليق وإيقاف الشركاء', en: 'Suspend Partners', category: 'partners' },
    [Permission.MANAGE_PARTNER_REQUESTS]: { ar: 'إدارة طلبات الشراكة', en: 'Manage Partner Requests', category: 'partners' },
    [Permission.MANAGE_INQUIRY_ROUTING]: { ar: 'إدارة توجيه الطلبات', en: 'Manage Inquiry Routing', category: 'partners' },
    [Permission.MANAGE_PLANS]: { ar: 'إدارة باقات الاشتراك', en: 'Manage Plans', category: 'partners' },

    // CUSTOMERS
    [Permission.VIEW_CUSTOMERS]: { ar: 'عرض العملاء والمستخدمين', en: 'View Customers', category: 'partners' },
    [Permission.MANAGE_CUSTOMERS]: { ar: 'إدارة حسابات العملاء', en: 'Manage Customers', category: 'partners' },

    // LEADS & REQUESTS
    [Permission.VIEW_LEADS]: { ar: 'عرض طلبات العملاء والمهتمين', en: 'View Leads', category: 'partners' },
    [Permission.MANAGE_LEADS]: { ar: 'إدارة طلبات العملاء والمهتمين', en: 'Manage Leads', category: 'partners' },
    [Permission.ASSIGN_LEADS]: { ar: 'توزيع وتعيين طلبات العملاء', en: 'Assign Leads', category: 'partners' },
    [Permission.VIEW_REQUESTS]: { ar: 'عرض طلبات العقارات والتواصل', en: 'View Requests', category: 'partners' },
    [Permission.MANAGE_REQUESTS]: { ar: 'معالجة وإدارة الطلبات', en: 'Manage Requests', category: 'partners' },
    [Permission.ASSIGN_REQUESTS]: { ar: 'تعيين وتوجيه الطلبات', en: 'Assign Requests', category: 'partners' },
    [Permission.MANAGE_PLATFORM_PROPERTY_LEADS]: { ar: 'إدارة عملاء عقارات المنصة', en: 'Manage Platform Property Leads', category: 'partners' },
    [Permission.MANAGE_PROPERTY_REQUESTS]: { ar: 'إدارة طلبات إدراج العقارات', en: 'Manage Property Requests', category: 'partners' },
    [Permission.MANAGE_PROPERTY_INQUIRIES]: { ar: 'إدارة استفسارات العقارات', en: 'Manage Property Inquiries', category: 'partners' },
    [Permission.MANAGE_CONTACT_REQUESTS]: { ar: 'إدارة رسائل التواصل', en: 'Manage Contact Messages', category: 'partners' },
    [Permission.VIEW_OWN_LEADS]: { ar: 'عرض طلبات العملاء الخاصة', en: 'View Own Leads', category: 'partners' },

    // FINISHING
    [Permission.VIEW_FINISHING]: { ar: 'عرض قسم التشطيبات', en: 'View Finishing', category: 'finishing' },
    [Permission.MANAGE_PLATFORM_FINISHING_PACKAGES]: { ar: 'إدارة باقات تشطيب المنصة', en: 'Manage Platform Finishing Packages', category: 'finishing' },
    [Permission.MANAGE_PLATFORM_FINISHING_LEADS]: { ar: 'إدارة طلبات تشطيب المنصة', en: 'Manage Platform Finishing Leads', category: 'finishing' },
    [Permission.MANAGE_FINISHING_PARTNERS]: { ar: 'إدارة شركاء التشطيب', en: 'Manage Finishing Partners', category: 'finishing' },
    [Permission.MANAGE_QUOTES]: { ar: 'إدارة المقايسات والعروض', en: 'Manage Quotes', category: 'finishing' },
    [Permission.MANAGE_EXECUTION]: { ar: 'إدارة ومتابعة التنفيذ', en: 'Manage Execution', category: 'finishing' },

    // DECORATIONS
    [Permission.VIEW_DECORATIONS]: { ar: 'عرض قسم الديكور', en: 'View Decorations', category: 'finishing' },
    [Permission.MANAGE_DECORATIONS_CONTENT]: { ar: 'إدارة محتوى الديكور', en: 'Manage Decorations Content', category: 'finishing' },
    [Permission.MANAGE_DECORATIONS_LEADS]: { ar: 'إدارة طلبات الديكور', en: 'Manage Decorations Leads', category: 'finishing' },

    // CONTENT & MEDIA
    [Permission.VIEW_SITE_CONTENT]: { ar: 'عرض محتوى الموقع', en: 'View Site Content', category: 'system' },
    [Permission.MANAGE_SITE_CONTENT]: { ar: 'إدارة محتوى الموقع', en: 'Manage Site Content', category: 'system' },
    [Permission.MANAGE_BANNERS]: { ar: 'إدارة الإعلانات والبانرات', en: 'Manage Banners', category: 'system' },
    [Permission.MANAGE_MEDIA]: { ar: 'إدارة مكتبة الوسائط والملفات', en: 'Manage Media Library', category: 'system' },

    // ANALYTICS & REPORTS
    [Permission.VIEW_ANALYTICS]: { ar: 'عرض الإحصائيات والأداء', en: 'View Analytics', category: 'system' },
    [Permission.VIEW_REPORTS]: { ar: 'عرض التقارير التشغيلية', en: 'View Reports', category: 'system' },
    [Permission.EXPORT_REPORTS]: { ar: 'تصدير التقارير والبيانات', en: 'Export Reports', category: 'system' },

    // FINANCE
    [Permission.VIEW_FINANCE]: { ar: 'عرض السجلات المالية والاشتراكات', en: 'View Finance', category: 'system' },
    [Permission.MANAGE_FINANCE]: { ar: 'إدارة المالية والفواتير', en: 'Manage Finance', category: 'system' },

    // USERS & GOVERNANCE
    [Permission.VIEW_USERS]: { ar: 'عرض قائمة المستخدمين والإداريين', en: 'View Users', category: 'system' },
    [Permission.MANAGE_USERS]: { ar: 'إدارة المستخدمين وحسابات الإدارة', en: 'Manage Users', category: 'system' },
    [Permission.MANAGE_USER_CREDENTIALS]: { ar: 'إدارة بيانات الاعتماد وكلمات المرور', en: 'Manage User Credentials & Passwords', category: 'system' },
    [Permission.VIEW_ROLES_PERMISSIONS]: { ar: 'عرض جدول الأدوار والصلاحيات', en: 'View Roles & Permissions', category: 'system' },
    [Permission.MANAGE_ROLES_PERMISSIONS]: { ar: 'إدارة الأدوار والصلاحيات', en: 'Manage Roles & Permissions', category: 'system' },
    [Permission.VIEW_AUDIT_LOG]: { ar: 'عرض سجل التدقيق والعمليات', en: 'View Audit Log', category: 'system' },

    // AUTOMATION
    [Permission.VIEW_AUTOMATION]: { ar: 'عرض قواعد الأتمتة', en: 'View Automation', category: 'system' },
    [Permission.MANAGE_AUTOMATION]: { ar: 'إدارة قواعد الأتمتة والتوجيه', en: 'Manage Automation', category: 'system' },

    // FORMS
    [Permission.VIEW_FORMS]: { ar: 'عرض النماذج الديناميكية', en: 'View Forms', category: 'system' },
    [Permission.MANAGE_FORMS]: { ar: 'إدارة وبناء النماذج', en: 'Manage Forms', category: 'system' },

    // SETTINGS & FILTERS
    [Permission.VIEW_SETTINGS]: { ar: 'عرض إعدادات المنصة', en: 'View Settings', category: 'system' },
    [Permission.MANAGE_SETTINGS]: { ar: 'إدارة إعدادات المنصة', en: 'Manage Settings', category: 'system' },
    [Permission.MANAGE_FILTERS]: { ar: 'إدارة خيارات وفلاتر البحث', en: 'Manage Filters', category: 'system' },

    // PARTNER SELF-SERVICE
    [Permission.MANAGE_OWN_PROFILE]: { ar: 'إدارة الملف الشخصي', en: 'Manage Own Profile', category: 'partners' },
    [Permission.MANAGE_OWN_PORTFOLIO]: { ar: 'إدارة معرض الأعمال الخاص', en: 'Manage Own Portfolio', category: 'partners' },
    [Permission.MANAGE_OWN_SUBSCRIPTION]: { ar: 'إدارة الاشتراك والباقة', en: 'Manage Own Subscription', category: 'partners' },
    [Permission.MANAGE_TEAM]: { ar: 'إدارة فريق العمل والموظفين', en: 'Manage Team Members', category: 'partners' }
};

interface RoleMetadataItem {
    ar: string;
    en: string;
    badgeAr: string;
    badgeEn: string;
    descAr: string;
    descEn: string;
    icon: string;
    type: 'partner' | 'customer' | 'internal';
}

// Complete metadata mapping guaranteeing all names are 100% visible and localized
const ROLE_METADATA: Record<string, RoleMetadataItem> = {
    // --- 1. External Partners (3 Roles) ---
    [Role.DEVELOPER_PARTNER]: {
        ar: 'مطور عقاري (شريك)',
        en: 'Real Estate Developer',
        badgeAr: 'شريك تطوير عقاري',
        badgeEn: 'Developer Partner',
        descAr: 'إدارة مشاريع وعقارات التطوير العقاري، وفريق العمل، ومتابعة الطلبات الواردة.',
        descEn: 'Manage developer projects, listings, staff accounts, and leads.',
        icon: '🏢',
        type: 'partner'
    },
    'developer': {
        ar: 'مطور عقاري (شريك)',
        en: 'Real Estate Developer',
        badgeAr: 'شريك تطوير عقاري',
        badgeEn: 'Developer Partner',
        descAr: 'إدارة مشاريع وعقارات التطوير العقاري، وفريق العمل، ومتابعة الطلبات الواردة.',
        descEn: 'Manage developer projects, listings, staff accounts, and leads.',
        icon: '🏢',
        type: 'partner'
    },
    [Role.FINISHING_PARTNER]: {
        ar: 'شركة تشطيبات (شريك)',
        en: 'Finishing Company',
        badgeAr: 'شريك تشطيب وديكور',
        badgeEn: 'Finishing Partner',
        descAr: 'إدارة معرض الأعمال، باقات وخدمات التشطيب، واستقبال طلبات ومقايسات العملاء.',
        descEn: 'Manage portfolio, finishing services, packages, and client requests.',
        icon: '🎨',
        type: 'partner'
    },
    'finishing': {
        ar: 'شركة تشطيبات (شريك)',
        en: 'Finishing Company',
        badgeAr: 'شريك تشطيب وديكور',
        badgeEn: 'Finishing Partner',
        descAr: 'إدارة معرض الأعمال، باقات وخدمات التشطيب، واستقبال طلبات ومقايسات العملاء.',
        descEn: 'Manage portfolio, finishing services, packages, and client requests.',
        icon: '🎨',
        type: 'partner'
    },
    [Role.AGENCY_PARTNER]: {
        ar: 'مكتب عقاري (شريك)',
        en: 'Real Estate Agency',
        badgeAr: 'وسيط ومكتب عقاري',
        badgeEn: 'Agency Partner',
        descAr: 'إدارة القوائم العقارية والوسطاء ومتابعة طلبات البيع والإيجار.',
        descEn: 'Manage property listings, brokers, and incoming inquiries.',
        icon: '📋',
        type: 'partner'
    },
    'agency': {
        ar: 'مكتب عقاري (شريك)',
        en: 'Real Estate Agency',
        badgeAr: 'وسيط ومكتب عقاري',
        badgeEn: 'Agency Partner',
        descAr: 'إدارة القوائم العقارية والوسطاء ومتابعة طلبات البيع والإيجار.',
        descEn: 'Manage property listings, brokers, and incoming inquiries.',
        icon: '📋',
        type: 'partner'
    },

    // --- 2. Customer Account (1 Role) ---
    [Role.CUSTOMER]: {
        ar: 'حساب العميل (مستخدم عادي)',
        en: 'Customer Account',
        badgeAr: 'عميل ومشتري',
        badgeEn: 'Customer Account',
        descAr: 'تصفح العقارات والمشاريع، تقديم طلبات المعاينة والتشطيب، وإدارة المفضلة والملف الشخصي.',
        descEn: 'Browse properties, submit inquiries and finishing requests, manage favorites.',
        icon: '👤',
        type: 'customer'
    },

    // --- 3. Platform Internal Managers (10 Roles) ---
    [Role.PLATFORM_REAL_ESTATE_MANAGER]: {
        ar: 'مدير عقارات المنصة',
        en: 'Platform Real Estate Manager',
        badgeAr: 'إدارة عقارات المنصة',
        badgeEn: 'Platform Real Estate Mgr',
        descAr: 'إدارة العقارات والوحدات الحصرية المملوكة للمنصة ومتابعة استفساراتها المباشرة.',
        descEn: 'Manage platform exclusive listings and direct customer inquiries.',
        icon: '🏛️',
        type: 'internal'
    },
    [Role.REAL_ESTATE_MARKET_MANAGER]: {
        ar: 'مدير سوق العقارات',
        en: 'Real Estate Market Manager',
        badgeAr: 'إدارة سوق العقارات',
        badgeEn: 'Market Manager',
        descAr: 'متابعة وإجازة إعلانات العقارات المعروضة في السوق المفتوح والمشاريع العامة.',
        descEn: 'Review and approve open market listings and general projects.',
        icon: '🏙️',
        type: 'internal'
    },
    [Role.PLATFORM_FINISHING_MANAGER]: {
        ar: 'مدير تشطيبات المنصة',
        en: 'Platform Finishing Manager',
        badgeAr: 'إدارة تشطيبات المنصة',
        badgeEn: 'Platform Finishing Mgr',
        descAr: 'إدارة باقات التشطيب الحصرية والمقاولين المعتمدين وجداول الأسعار.',
        descEn: 'Manage exclusive finishing packages and verified contractors.',
        icon: '🛠️',
        type: 'internal'
    },
    [Role.FINISHING_MARKET_MANAGER]: {
        ar: 'مدير سوق التشطيبات',
        en: 'Finishing Market Manager',
        badgeAr: 'سوق التشطيبات',
        badgeEn: 'Finishing Market Mgr',
        descAr: 'الإشراف على شركات ومقاولي التشطيب ومراجعة طلبات الانضمام.',
        descEn: 'Oversee independent finishing partners and directory listings.',
        icon: '📐',
        type: 'internal'
    },
    [Role.DECORATION_MANAGER]: {
        ar: 'مدير الديكور',
        en: 'Decoration Manager',
        badgeAr: 'إدارة الديكور',
        badgeEn: 'Decoration Mgr',
        descAr: 'إدارة كتالوجات ومعارض الديكور والتصميم الداخلي ومتابعة الطلبات.',
        descEn: 'Manage interior decoration catalogs and customer requests.',
        icon: '✨',
        type: 'internal'
    },
    [Role.PARTNER_RELATIONS_MANAGER]: {
        ar: 'مدير علاقات الشركاء',
        en: 'Partner Relations Manager',
        badgeAr: 'علاقات الشركاء',
        badgeEn: 'Partner Relations Mgr',
        descAr: 'إدارة حسابات الشركاء وباقات الاشتراك وقواعد توجيه الطلبات.',
        descEn: 'Manage partner onboarding, tiers, and inquiry routing rules.',
        icon: '🤝',
        type: 'internal'
    },
    [Role.CONTENT_MANAGER]: {
        ar: 'مدير المحتوى',
        en: 'Content Manager',
        badgeAr: 'إدارة المحتوى',
        badgeEn: 'Content Mgr',
        descAr: 'التحكم في صفحات الموقع العامة، النصوص، الإعلانات، والوسائط ومكتبة الصور.',
        descEn: 'Manage public website content, copy, banners, and media library.',
        icon: '📝',
        type: 'internal'
    },
    [Role.SERVICE_MANAGER]: {
        ar: 'مدير الخدمات العامة',
        en: 'Service Manager',
        badgeAr: 'الخدمات العامة',
        badgeEn: 'Service Mgr',
        descAr: 'إدارة خدمات التشطيب والدعم وطلبات التواصل والاستفسارات.',
        descEn: 'Handle general finishing services and support inquiries.',
        icon: '⚙️',
        type: 'internal'
    },
    [Role.CUSTOMER_RELATIONS_MANAGER]: {
        ar: 'مدير علاقات العملاء (CRM)',
        en: 'Customer Relations Manager',
        badgeAr: 'إدارة علاقات العملاء',
        badgeEn: 'CRM Manager',
        descAr: 'متابعة استفسارات الزوار وتوزيع العملاء المحتملين ورسائل التواصل.',
        descEn: 'Handle customer inquiries, lead routing, and support tickets.',
        icon: '💬',
        type: 'internal'
    },
    [Role.LISTINGS_MANAGER]: {
        ar: 'مدير القوائم العقارية',
        en: 'Listings Manager',
        badgeAr: 'إدارة القوائم',
        badgeEn: 'Listings Mgr',
        descAr: 'إدارة وتدقيق جميع العقارات المعروضة في المنصة وضمان جودتها.',
        descEn: 'General properties and listing management and moderation.',
        icon: '📑',
        type: 'internal'
    }
};

const AdminRolesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard;
    const isAr = language === 'ar';
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState<'all' | 'partner' | 'customer' | 'internal'>('all');

    const { data: initialPermissions, isLoading } = useQuery({
        queryKey: ['rolePermissions'],
        queryFn: getRolePermissions,
    });

    const [permissionsMap, setPermissionsMap] = useState<Map<Role, Permission[]>>(new Map());

    useEffect(() => {
        if (initialPermissions) {
            setPermissionsMap(new Map(initialPermissions.entries()));
        }
    }, [initialPermissions]);

    const mutation = useMutation({
        mutationFn: updateRolePermissions,
        onSuccess: () => {
            showToast(
                isAr 
                    ? 'تم حفظ وتحديث الأدوار والصلاحيات بنجاح في قاعدة البيانات!' 
                    : 'Permissions updated successfully in database!', 
                'success'
            );
            queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });
        },
        onError: (err: any) => {
            console.error('Failed to update permissions:', err);
            showToast(isAr ? 'حدث خطأ أثناء حفظ الصلاحيات.' : 'Failed to update permissions.', 'error');
        },
    });

    const handlePermissionChange = (role: Role, permission: Permission, isChecked: boolean) => {
        setPermissionsMap((prevMap) => {
            const newMap = new Map(prevMap);
            const currentPermissions = (newMap.get(role) || []) as Permission[];
            if (isChecked) {
                if (!currentPermissions.includes(permission)) {
                    newMap.set(role, [...currentPermissions, permission]);
                }
            } else {
                newMap.set(role, currentPermissions.filter((p) => p !== permission));
            }
            return newMap;
        });
    };

    const handleToggleAll = (role: Role, enableAll: boolean) => {
        setPermissionsMap((prevMap) => {
            const newMap = new Map(prevMap);
            if (enableAll) {
                newMap.set(role, Object.values(Permission));
            } else {
                newMap.set(role, []);
            }
            return newMap;
        });
    };

    const handleSave = () => {
        mutation.mutate(permissionsMap);
    };

    // Helper to get role display title and metadata safely
    const getRoleInfo = (role: Role | string) => {
        const cleanRole = String(role).trim().toLowerCase();
        const meta = ROLE_METADATA[cleanRole] || ROLE_METADATA[role as Role] || ROLE_METADATA[cleanRole.replace('_partner', '')];
        const pt = (t_admin.partnerTypes as Record<string, string>) || {};
        
        const title = (meta ? (isAr ? meta.ar : meta.en) : null) || pt[cleanRole] || pt[cleanRole.replace('_partner', '')] || cleanRole;
        const badge = (meta ? (isAr ? meta.badgeAr : meta.badgeEn) : null) || (isAr ? 'دور نظام' : 'System Role');
        const desc = (meta ? (isAr ? meta.descAr : meta.descEn) : '') || '';
        const icon = meta?.icon || '🛡️';
        const type = meta?.type || 'internal';

        return { title, badge, desc, icon, type };
    };

    // All available permissions
    const allPermissions = useMemo(() => Object.values(Permission), []);

    // Filter permissions by search
    const filteredPermissions = useMemo(() => {
        if (!searchQuery.trim()) return allPermissions;
        const q = searchQuery.toLowerCase().trim();
        return allPermissions.filter((perm) => {
            const label = PERMISSION_LABELS[perm];
            const arText = label?.ar?.toLowerCase() || '';
            const enText = label?.en?.toLowerCase() || '';
            const raw = perm.toLowerCase();
            return arText.includes(q) || enText.includes(q) || raw.includes(q);
        });
    }, [allPermissions, searchQuery]);

    // Roles list sorted and filtered by tab
    const rolesList = useMemo(() => {
        const allRoles = Array.from(permissionsMap.keys()).filter((role) => role !== Role.SUPER_ADMIN);
        
        // Define fixed preferred ordering: External Partners first, then Customer, then Managers
        const preferredOrder: string[] = [
            Role.DEVELOPER_PARTNER,
            Role.FINISHING_PARTNER,
            Role.AGENCY_PARTNER,
            Role.CUSTOMER,
            Role.PLATFORM_REAL_ESTATE_MANAGER,
            Role.REAL_ESTATE_MARKET_MANAGER,
            Role.PLATFORM_FINISHING_MANAGER,
            Role.FINISHING_MARKET_MANAGER,
            Role.DECORATION_MANAGER,
            Role.PARTNER_RELATIONS_MANAGER,
            Role.CONTENT_MANAGER,
            Role.SERVICE_MANAGER,
            Role.CUSTOMER_RELATIONS_MANAGER,
            Role.LISTINGS_MANAGER,
        ];

        const sorted = allRoles.sort((a, b) => {
            const idxA = preferredOrder.indexOf(a);
            const idxB = preferredOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return String(a).localeCompare(String(b));
        });

        if (selectedTab === 'all') return sorted;
        return sorted.filter((role) => {
            const info = getRoleInfo(role);
            return info.type === selectedTab;
        });
    }, [permissionsMap, selectedTab]);

    // Group categories for permissions inside card
    const permissionCategories = useMemo(() => [
        { key: 'dashboard', titleAr: 'لوحات التحكم والوصول', titleEn: 'Dashboard Access', icon: '🛡️' },
        { key: 'real_estate', titleAr: 'العقارات والمشاريع', titleEn: 'Real Estate & Projects', icon: '🏢' },
        { key: 'finishing', titleAr: 'التشطيبات والديكور', titleEn: 'Finishing & Decor', icon: '🎨' },
        { key: 'partners', titleAr: 'الشركاء والعملاء', titleEn: 'Partners & Leads', icon: '👥' },
        { key: 'system', titleAr: 'النظام والمحتوى', titleEn: 'System & Content', icon: '⚙️' }
    ], []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">
                    {isAr ? 'جاري تحميل جدول الأدوار والصلاحيات من قاعدة البيانات...' : 'Loading roles and permissions from database...'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                            <ShieldCheckIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                {t_admin.nav.rolesAndPermissions}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {isAr 
                                    ? 'تحديد وإدارة الصلاحيات لكل دور في المنصة مع الحفظ المباشر في قاعدة البيانات' 
                                    : 'Manage and configure permissions for all user and partner roles with instant database sync.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        onClick={handleSave} 
                        isLoading={mutation.isPending}
                        className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-6 py-2.5 shadow-md flex items-center gap-2"
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>{isAr ? 'حفظ التعديلات في قاعدة البيانات' : 'Save Changes to Database'}</span>
                    </Button>
                </div>
            </div>

            {/* Category Tabs: Clearly identifying the 3 types of roles */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                <button
                    type="button"
                    onClick={() => setSelectedTab('all')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                        selectedTab === 'all'
                            ? 'bg-amber-500 text-gray-950 shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                    <span>🛡️</span>
                    <span>{isAr ? 'جميع الأدوار (14)' : 'All Roles (14)'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setSelectedTab('partner')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                        selectedTab === 'partner'
                            ? 'bg-amber-500 text-gray-950 shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                    <BuildingIcon className="w-4 h-4" />
                    <span>{isAr ? 'الشركاء الخارجيون (3 قوائم: مطور، تشطيبات، مكتب عقاري)' : 'External Partners (3: Developer, Finishing, Agency)'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setSelectedTab('customer')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                        selectedTab === 'customer'
                            ? 'bg-amber-500 text-gray-950 shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                    <UsersIcon className="w-4 h-4" />
                    <span>{isAr ? 'حسابات العملاء (1: حساب العميل)' : 'Customer Accounts (1)'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => setSelectedTab('internal')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                        selectedTab === 'internal'
                            ? 'bg-amber-500 text-gray-950 shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                    <CogIcon className="w-4 h-4" />
                    <span>{isAr ? 'مدراء ومسؤولو المنصة (10 أدوار)' : 'Platform Managers (10 Roles)'}</span>
                </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="w-full sm:max-w-md">
                    <Input
                        type="text"
                        placeholder={isAr ? 'بحث عن صلاحية أو مسمى دور...' : 'Search specific permission or role...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-sm"
                    />
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-4">
                    <span>
                        {isAr ? `الأدوار المعروضة: ${rolesList.length}` : `Displayed Roles: ${rolesList.length}`}
                    </span>
                    <span>•</span>
                    <span>
                        {isAr ? `الصلاحيات المتاحة: ${filteredPermissions.length}` : `Available Permissions: ${filteredPermissions.length}`}
                    </span>
                </div>
            </div>

            {/* Super Admin Notice Card */}
            <div className="p-4 bg-gradient-to-r from-amber-500/15 via-amber-400/5 to-transparent border border-amber-300 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">👑</span>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {isAr ? 'المدير العام والمسؤول الكامل (Super Admin)' : 'Super Admin Role'}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                            {isAr 
                                ? 'يمتلك المدير العام كافة صلاحيات المنصة تلقائياً وبشكل كامل 100% ولا يمكن تقييده أو حجب أي قسم عنه.' 
                                : 'Super Admin automatically has 100% full platform permissions and cannot be restricted.'}
                        </p>
                    </div>
                </div>
                <span className="px-3.5 py-1.5 bg-amber-500 text-gray-950 font-bold text-xs rounded-full shadow-sm whitespace-nowrap">
                    {isAr ? 'صلاحيات كاملة 100%' : '100% Full Access'}
                </span>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {rolesList.map((role: Role) => {
                    const { title, badge, desc, icon } = getRoleInfo(role);
                    const currentPerms = permissionsMap.get(role) || [];
                    const activeCount = currentPerms.length;
                    const isAllSelected = activeCount === allPermissions.length;

                    return (
                        <Card key={role} className="flex flex-col border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
                            {/* Card Header: Explicit Role Title, Badge, Description */}
                            <CardHeader className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 p-5">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
                                        {icon}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <CardTitle className="text-base font-bold text-gray-950 dark:text-white leading-tight">
                                                {title}
                                            </CardTitle>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                                                {badge}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                            {desc}
                                        </p>
                                    </div>
                                </div>

                                {/* Active Count & Quick Selection */}
                                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200/60 dark:border-gray-700/60 text-xs">
                                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                        {isAr ? `${activeCount} من ${allPermissions.length} صلاحيات مفعلة` : `${activeCount} / ${allPermissions.length} active`}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => handleToggleAll(role, !isAllSelected)}
                                        className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-bold transition-colors"
                                    >
                                        {isAllSelected 
                                            ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All') 
                                            : (isAr ? 'تحديد الكل' : 'Select All')}
                                    </button>
                                </div>
                            </CardHeader>

                            {/* Card Content: Categorized list of permissions */}
                            <CardContent className="flex-1 p-4 space-y-4 max-h-[420px] overflow-y-auto">
                                {filteredPermissions.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-6">
                                        {isAr ? 'لا توجد نتائج مطابقة للبحث' : 'No matching permissions'}
                                    </p>
                                ) : (
                                    permissionCategories.map((cat) => {
                                        const catPerms = filteredPermissions.filter(
                                            (p) => PERMISSION_LABELS[p]?.category === cat.key
                                        );
                                        if (catPerms.length === 0) return null;

                                        return (
                                            <div key={cat.key} className="space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">
                                                    <span>{cat.icon}</span>
                                                    <span>{isAr ? cat.titleAr : cat.titleEn}</span>
                                                </div>

                                                <div className="space-y-1">
                                                    {catPerms.map((permission) => {
                                                        const isChecked = currentPerms.includes(permission);
                                                        const labelData = PERMISSION_LABELS[permission];
                                                        const displayLabel = labelData ? (isAr ? labelData.ar : labelData.en) : permission;

                                                        return (
                                                            <div 
                                                                key={permission} 
                                                                className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                                                                    isChecked 
                                                                        ? 'bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/60' 
                                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 border border-transparent'
                                                                }`}
                                                            >
                                                                <label
                                                                    htmlFor={`${role}-${permission}`}
                                                                    className="text-xs font-medium text-gray-900 dark:text-gray-200 cursor-pointer flex-1 select-none pr-2 leading-relaxed"
                                                                >
                                                                    {displayLabel}
                                                                </label>
                                                                <Checkbox
                                                                    id={`${role}-${permission}`}
                                                                    checked={isChecked}
                                                                    onCheckedChange={(checked) =>
                                                                        handlePermissionChange(role, permission, !!checked)
                                                                    }
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminRolesPage;

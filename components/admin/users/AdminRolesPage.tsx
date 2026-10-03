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
import { ShieldCheckIcon, CheckCircleIcon } from '../../ui/Icons';

// Comprehensive dictionary for all platform permissions in Arabic and English
const PERMISSION_LABELS: Record<Permission, { ar: string; en: string; group?: string }> = {
    [Permission.VIEW_ADMIN_DASHBOARD]: { ar: 'عرض لوحة الإدارة', en: 'View Admin Dashboard', group: 'admin' },
    [Permission.VIEW_PARTNER_DASHBOARD]: { ar: 'عرض لوحة الشريك', en: 'View Partner Dashboard', group: 'partner' },
    [Permission.VIEW_CUSTOMER_DASHBOARD]: { ar: 'عرض لوحة العميل', en: 'View Customer Dashboard', group: 'customer' },
    [Permission.MANAGE_USERS]: { ar: 'إدارة المستخدمين', en: 'Manage Users', group: 'admin' },
    [Permission.MANAGE_ROLES_PERMISSIONS]: { ar: 'إدارة الأدوار والصلاحيات', en: 'Manage Roles & Permissions', group: 'admin' },
    [Permission.MANAGE_SETTINGS]: { ar: 'إدارة الإعدادات العامة', en: 'Manage Settings', group: 'admin' },
    [Permission.MANAGE_FORMS]: { ar: 'إدارة النماذج الديناميكية', en: 'Manage Forms', group: 'admin' },
    [Permission.MANAGE_AUTOMATION]: { ar: 'إدارة قواعد الأتمتة', en: 'Manage Automation', group: 'admin' },
    [Permission.MANAGE_BANNERS]: { ar: 'إدارة الإعلانات والبانرات', en: 'Manage Banners', group: 'admin' },
    [Permission.MANAGE_SITE_CONTENT]: { ar: 'إدارة محتوى الموقع', en: 'Manage Site Content', group: 'admin' },
    [Permission.MANAGE_FILTERS]: { ar: 'إدارة خيارات الفلترة', en: 'Manage Filters', group: 'admin' },
    [Permission.MANAGE_ALL_PARTNERS]: { ar: 'إدارة جميع الشركاء', en: 'Manage All Partners', group: 'admin' },
    [Permission.MANAGE_PARTNER_REQUESTS]: { ar: 'إدارة طلبات الشراكة', en: 'Manage Partner Requests', group: 'admin' },
    [Permission.MANAGE_INQUIRY_ROUTING]: { ar: 'إدارة توجيه الطلبات', en: 'Manage Inquiry Routing', group: 'admin' },
    [Permission.MANAGE_PLANS]: { ar: 'إدارة باقات الاشتراك', en: 'Manage Plans', group: 'admin' },
    [Permission.MANAGE_ALL_PROPERTIES]: { ar: 'إدارة جميع العقارات', en: 'Manage All Properties', group: 'real_estate' },
    [Permission.MANAGE_PLATFORM_PROPERTIES]: { ar: 'إدارة عقارات المنصة الحصرية', en: 'Manage Platform Properties', group: 'real_estate' },
    [Permission.MANAGE_PLATFORM_PROPERTY_LEADS]: { ar: 'إدارة عملاء عقارات المنصة', en: 'Manage Platform Property Leads', group: 'real_estate' },
    [Permission.MANAGE_MARKET_PROPERTIES]: { ar: 'إدارة عقارات السوق المفتوح', en: 'Manage Market Properties', group: 'real_estate' },
    [Permission.MANAGE_PROPERTY_REQUESTS]: { ar: 'إدارة طلبات إدراج العقارات', en: 'Manage Property Requests', group: 'real_estate' },
    [Permission.MANAGE_PROPERTY_INQUIRIES]: { ar: 'إدارة استفسارات العقارات', en: 'Manage Property Inquiries', group: 'real_estate' },
    [Permission.MANAGE_CONTACT_REQUESTS]: { ar: 'إدارة رسائل التواصل', en: 'Manage Contact Messages', group: 'admin' },
    [Permission.MANAGE_ALL_PROJECTS]: { ar: 'إدارة جميع المشاريع', en: 'Manage All Projects', group: 'real_estate' },
    [Permission.MANAGE_DECORATIONS_CONTENT]: { ar: 'إدارة محتوى الديكور', en: 'Manage Decorations Content', group: 'decor' },
    [Permission.MANAGE_DECORATIONS_LEADS]: { ar: 'إدارة طلبات الديكور', en: 'Manage Decorations Leads', group: 'decor' },
    [Permission.MANAGE_PLATFORM_FINISHING_PACKAGES]: { ar: 'إدارة باقات تشطيب المنصة', en: 'Manage Platform Finishing Packages', group: 'finishing' },
    [Permission.MANAGE_PLATFORM_FINISHING_LEADS]: { ar: 'إدارة طلبات تشطيب المنصة', en: 'Manage Platform Finishing Leads', group: 'finishing' },
    [Permission.MANAGE_FINISHING_PARTNERS]: { ar: 'إدارة شركاء التشطيب', en: 'Manage Finishing Partners', group: 'finishing' },
    [Permission.MANAGE_OWN_PROFILE]: { ar: 'إدارة الملف الشخصي', en: 'Manage Own Profile', group: 'self' },
    [Permission.MANAGE_OWN_PROJECTS]: { ar: 'إدارة المشاريع الخاصة', en: 'Manage Own Projects', group: 'self' },
    [Permission.MANAGE_OWN_PROPERTIES]: { ar: 'إدارة العقارات الخاصة', en: 'Manage Own Properties', group: 'self' },
    [Permission.MANAGE_OWN_PORTFOLIO]: { ar: 'إدارة معرض الأعمال الخاص', en: 'Manage Own Portfolio', group: 'self' },
    [Permission.MANAGE_OWN_SUBSCRIPTION]: { ar: 'إدارة الاشتراك والباقة', en: 'Manage Own Subscription', group: 'self' },
    [Permission.VIEW_OWN_LEADS]: { ar: 'عرض طلبات العملاء الخاصة', en: 'View Own Leads', group: 'self' },
    [Permission.MANAGE_TEAM]: { ar: 'إدارة فريق العمل والموظفين', en: 'Manage Team Members', group: 'self' }
};

// Fallback metadata for all roles to ensure zero missing titles
const ROLE_METADATA: Record<string, { ar: string; en: string; descAr: string; descEn: string; icon: string }> = {
    [Role.DEVELOPER_PARTNER]: {
        ar: 'مطور عقاري (شريك)',
        en: 'Real Estate Developer',
        descAr: 'إدارة مشاريع وعقارات التطوير العقاري وفريق العمل.',
        descEn: 'Manage developer projects, properties, and team members.',
        icon: '🏢'
    },
    [Role.FINISHING_PARTNER]: {
        ar: 'شركة تشطيبات (شريك)',
        en: 'Finishing Company',
        descAr: 'إدارة معرض الأعمال، خدمات التشطيب، وطلبات العملاء.',
        descEn: 'Manage portfolio, finishing services, and client inquiries.',
        icon: '🎨'
    },
    [Role.AGENCY_PARTNER]: {
        ar: 'مكتب عقاري (شريك)',
        en: 'Real Estate Agency',
        descAr: 'إدارة القوائم العقارية والوسطاء والطلبات.',
        descEn: 'Manage property listings, agents, and brokerage leads.',
        icon: '📋'
    },
    [Role.CUSTOMER]: {
        ar: 'حساب العميل (مستخدم عادي)',
        en: 'Customer Account',
        descAr: 'تصفح العقارات، طلبات التشطيب، وإدارة المفضلة.',
        descEn: 'Browse properties, submit inquiries, and manage favorites.',
        icon: '👤'
    },
    [Role.DECORATION_MANAGER]: {
        ar: 'مدير الديكور',
        en: 'Decoration Manager',
        descAr: 'إدارة باقات وكتالوجات الديكور ومتابعة الطلبات.',
        descEn: 'Manage decoration catalogs and client requests.',
        icon: '✨'
    },
    [Role.PLATFORM_FINISHING_MANAGER]: {
        ar: 'مدير تشطيبات المنصة',
        en: 'Platform Finishing Manager',
        descAr: 'إدارة باقات التشطيب الحصرية والمقاولين المعتمدين.',
        descEn: 'Manage platform finishing packages and verified contractors.',
        icon: '🛠️'
    },
    [Role.FINISHING_MARKET_MANAGER]: {
        ar: 'مدير سوق التشطيبات',
        en: 'Finishing Market Manager',
        descAr: 'الإشراف على شركات ومقاولي التشطيب المستقلين.',
        descEn: 'Oversee independent finishing partners and directory.',
        icon: '📐'
    },
    [Role.PLATFORM_REAL_ESTATE_MANAGER]: {
        ar: 'مدير عقارات المنصة',
        en: 'Platform Real Estate Manager',
        descAr: 'إدارة العقارات والوحدات الحصرية المملوكة للمنصة.',
        descEn: 'Manage platform-owned and exclusive listings.',
        icon: '🏛️'
    },
    [Role.REAL_ESTATE_MARKET_MANAGER]: {
        ar: 'مدير سوق العقارات',
        en: 'Real Estate Market Manager',
        descAr: 'متابعة وإجازة إعلانات العقارات المعروضة في السوق.',
        descEn: 'Review and approve open market listings and leads.',
        icon: '🏙️'
    },
    [Role.PARTNER_RELATIONS_MANAGER]: {
        ar: 'مدير علاقات الشركاء',
        en: 'Partner Relations Manager',
        descAr: 'إدارة حسابات الشركاء والاشتراكات والموافقات.',
        descEn: 'Manage partner onboarding, tiers, and relations.',
        icon: '🤝'
    },
    [Role.CONTENT_MANAGER]: {
        ar: 'مدير المحتوى',
        en: 'Content Manager',
        descAr: 'التحكم في نصوص صفحات الموقع، البانرات، والوسائط.',
        descEn: 'Manage public website content, banners, and media.',
        icon: '📝'
    },
    [Role.SERVICE_MANAGER]: {
        ar: 'مدير الخدمات العامة',
        en: 'Service Manager',
        descAr: 'إدارة خدمات التشطيب العامة والدعم الفني.',
        descEn: 'General services and support management.',
        icon: '⚙️'
    },
    [Role.CUSTOMER_RELATIONS_MANAGER]: {
        ar: 'مدير علاقات العملاء (CRM)',
        en: 'Customer Relations Manager',
        descAr: 'متابعة استفسارات الزوار والعملاء ومبيعات العقارات.',
        descEn: 'Handle customer inquiries, lead routing, and support.',
        icon: '💬'
    },
    [Role.LISTINGS_MANAGER]: {
        ar: 'مدير القوائم العقارية',
        en: 'Listings Manager',
        descAr: 'إدارة جميع إعلانات العقارات المعروضة في المنصة.',
        descEn: 'General properties and listing management.',
        icon: '📑'
    }
};

const AdminRolesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard;
    const isAr = language === 'ar';
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');

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
                    : 'Permissions updated successfully!', 
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

    // Helper to get role display title with fallback
    const getRoleTitle = (role: Role): { title: string; desc: string; icon: string } => {
        const meta = ROLE_METADATA[role];
        const pt = (t_admin.partnerTypes as Record<string, string>) || {};
        const rd = (t_admin.roleDescriptions as Record<string, string>) || {};
        const roleKey = (Object.keys(Role) as Array<keyof typeof Role>).find((key) => Role[key] === role) || '';

        const title = pt[role] || pt[role.replace('_partner', '')] || (meta ? (isAr ? meta.ar : meta.en) : role);
        const desc = (roleKey && rd[roleKey]) || (meta ? (isAr ? meta.descAr : meta.descEn) : '');
        const icon = meta?.icon || '🛡️';

        return { title, desc, icon };
    };

    // Filter permissions by search
    const allPermissions = useMemo(() => Object.values(Permission), []);
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

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">
                    {isAr ? 'جاري تحميل جدول الأدوار والصلاحيات...' : 'Loading roles and permissions...'}
                </p>
            </div>
        );
    }

    const rolesList = Array.from(permissionsMap.keys()).filter((role) => role !== Role.SUPER_ADMIN);

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
                                    ? 'تحديد الصلاحيات بدقة لكل دور ومستخدم في المنصة وحفظها فوراً' 
                                    : 'Manage and configure permissions for each user role in the system.'}
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
                        <span>{isAr ? 'حفظ الصلاحيات' : 'Save Changes'}</span>
                    </Button>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="w-full sm:max-w-md">
                    <Input
                        type="text"
                        placeholder={isAr ? 'بحث عن صلاحية معينة...' : 'Search specific permission...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-sm"
                    />
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-4">
                    <span>
                        {isAr ? `إجمالي الأدوار: ${rolesList.length}` : `Total Roles: ${rolesList.length}`}
                    </span>
                    <span>•</span>
                    <span>
                        {isAr ? `الصلاحيات: ${filteredPermissions.length}` : `Permissions: ${filteredPermissions.length}`}
                    </span>
                </div>
            </div>

            {/* Super Admin Notice Card */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">👑</span>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {isAr ? 'حساب المدير العام (Super Admin)' : 'Super Admin Role'}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            {isAr 
                                ? 'يمتلك المدير العام كافة الصلاحيات تلقائياً ودائماً ولا يمكن حجب أي صلاحية عنه.' 
                                : 'Super Admin possesses all system permissions by default and cannot be restricted.'}
                        </p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-amber-500 text-gray-950 font-bold text-xs rounded-full shadow-sm">
                    {isAr ? 'صلاحيات كاملة 100%' : '100% Full Access'}
                </span>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {rolesList.map((role: Role) => {
                    const { title, desc, icon } = getRoleTitle(role);
                    const currentPerms = permissionsMap.get(role) || [];
                    const activeCount = currentPerms.length;
                    const isAllSelected = activeCount === allPermissions.length;

                    return (
                        <Card key={role} className="flex flex-col border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
                            <CardHeader className="bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800 pb-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-2xl">{icon}</span>
                                        <div>
                                            <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                                                {title}
                                            </CardTitle>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                                {desc}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap">
                                        {activeCount} / {allPermissions.length}
                                    </span>
                                </div>

                                {/* Quick selection toolbar */}
                                <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-gray-200/50 dark:border-gray-700/50 text-[11px]">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleAll(role, !isAllSelected)}
                                        className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold transition-colors"
                                    >
                                        {isAllSelected 
                                            ? (isAr ? 'إلغاء تحديد الكل' : 'Deselect All') 
                                            : (isAr ? 'تحديد الكل' : 'Select All')}
                                    </button>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 p-4 space-y-2.5 max-h-[380px] overflow-y-auto">
                                {filteredPermissions.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-6">
                                        {isAr ? 'لا توجد نتائج مطابقة للبحث' : 'No matching permissions'}
                                    </p>
                                ) : (
                                    filteredPermissions.map((permission) => {
                                        const isChecked = currentPerms.includes(permission);
                                        const labelData = PERMISSION_LABELS[permission];
                                        const displayLabel = labelData ? (isAr ? labelData.ar : labelData.en) : permission;

                                        return (
                                            <div 
                                                key={permission} 
                                                className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                                                    isChecked 
                                                        ? 'bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40' 
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/40 border border-transparent'
                                                }`}
                                            >
                                                <label
                                                    htmlFor={`${role}-${permission}`}
                                                    className="text-xs font-medium text-gray-800 dark:text-gray-200 cursor-pointer flex-1 select-none pr-2"
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

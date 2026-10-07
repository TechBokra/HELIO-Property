import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../shared/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { Permission, Role, RequestType } from '../../types';
import { 
    getAllPartnersForAdmin 
} from '../../services/partners';
import { 
    getAllProperties 
} from '../../services/properties';
import { 
    getAllLeads 
} from '../../services/leads';
import { 
    getAllProjects 
} from '../../services/projects';
import { 
    getAllRequests 
} from '../../services/requests';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { 
    BuildingIcon, 
    UsersIcon, 
    CubeIcon, 
    InboxIcon, 
    WrenchScrewdriverIcon, 
    SparklesIcon, 
    ArrowPathIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon,
    ChevronRightIcon,
    PlusIcon,
    ClipboardDocumentListIcon,
    CogIcon,
    ShieldCheckIcon
} from '../ui/Icons';

interface AttentionItem {
    id: string;
    domain: 'properties' | 'partners' | 'leads' | 'requests' | 'finishing' | 'decorations';
    domainLabel: string;
    title: string;
    count: number;
    explanation: string;
    actionLabel: string;
    actionUrl: string;
    urgency: 'high' | 'medium';
}

interface DomainSummary {
    id: string;
    title: string;
    icon: React.FC<{ className?: string }>;
    stats: { label: string; value: number | string }[];
    link: string;
    permission: Permission;
}

const AdminHomePage: React.FC = () => {
    const { language } = useLanguage();
    const { currentUser, hasPermission } = useAuth();
    const isAr = language === 'ar';

    // 1. Permission checks for selective query execution (Phase 3A performance optimization)
    const canViewProperties = hasPermission(Permission.VIEW_PROPERTIES);
    const canViewPartners = hasPermission(Permission.VIEW_PARTNERS);
    const canViewProjects = hasPermission(Permission.VIEW_PROJECTS);
    const canViewLeads = hasPermission(Permission.VIEW_LEADS);
    const canViewRequests = hasPermission(Permission.VIEW_REQUESTS) || 
                            hasPermission(Permission.MANAGE_REQUESTS) || 
                            hasPermission(Permission.MANAGE_PROPERTY_REQUESTS) ||
                            hasPermission(Permission.MANAGE_PROPERTY_INQUIRIES) ||
                            hasPermission(Permission.MANAGE_CONTACT_REQUESTS) ||
                            hasPermission(Permission.MANAGE_PLATFORM_FINISHING_LEADS) ||
                            hasPermission(Permission.MANAGE_DECORATIONS_LEADS);

    // 2. Selective React Query execution
    const { 
        data: properties, 
        isLoading: loadingProperties, 
        isError: errorProperties, 
        refetch: refetchProperties 
    } = useQuery({ 
        queryKey: ['allProperties'], 
        queryFn: getAllProperties,
        enabled: canViewProperties,
    });

    const { 
        data: partners, 
        isLoading: loadingPartners, 
        isError: errorPartners, 
        refetch: refetchPartners 
    } = useQuery({ 
        queryKey: ['allPartnersAdmin'], 
        queryFn: getAllPartnersForAdmin,
        enabled: canViewPartners,
    });

    const { 
        data: projects, 
        isLoading: loadingProjects, 
        isError: errorProjects, 
        refetch: refetchProjects 
    } = useQuery({ 
        queryKey: ['allProjects'], 
        queryFn: getAllProjects,
        enabled: canViewProjects,
    });

    const { 
        data: leads, 
        isLoading: loadingLeads, 
        isError: errorLeads, 
        refetch: refetchLeads 
    } = useQuery({ 
        queryKey: ['allLeads'], 
        queryFn: getAllLeads,
        enabled: canViewLeads,
    });

    const { 
        data: requests, 
        isLoading: loadingRequests, 
        isError: errorRequests, 
        refetch: refetchRequests 
    } = useQuery({ 
        queryKey: ['allRequestsAdmin'], 
        queryFn: getAllRequests,
        enabled: canViewRequests,
    });

    const isGlobalLoading = loadingProperties || loadingPartners || loadingProjects || loadingLeads || loadingRequests;
    const hasAnyError = errorProperties || errorPartners || errorProjects || errorLeads || errorRequests;

    const refetchAll = () => {
        if (canViewProperties) refetchProperties();
        if (canViewPartners) refetchPartners();
        if (canViewProjects) refetchProjects();
        if (canViewLeads) refetchLeads();
        if (canViewRequests) refetchRequests();
    };

    // 3. Needs Attention items calculation (Strictly permission-filtered)
    const attentionItems = useMemo<AttentionItem[]>(() => {
        const items: AttentionItem[] = [];

        // A. Real Estate: Property approvals
        if (hasPermission(Permission.MANAGE_ALL_PROPERTIES) || hasPermission(Permission.PUBLISH_PROPERTIES)) {
            const pendingProperties = (properties || []).filter(
                p => p.verificationStatus === 'pending' || p.listingStatus === 'draft'
            );
            if (pendingProperties.length > 0) {
                items.push({
                    id: 'prop-approvals',
                    domain: 'properties',
                    domainLabel: isAr ? 'العقارات' : 'Real Estate',
                    title: isAr ? 'عقارات بانتظار التدقيق والاعتماد' : 'Properties Pending Verification',
                    count: pendingProperties.length,
                    explanation: isAr 
                        ? `${pendingProperties.length} عقار جديد بحاجة للمراجعة والنشر`
                        : `${pendingProperties.length} property listings awaiting review and verification`,
                    actionLabel: isAr ? 'تدقيق العقارات' : 'Review Properties',
                    actionUrl: '/admin/properties/list?verification=pending',
                    urgency: 'high',
                });
            }
        }

        // B. Real Estate: Listing Requests
        if (hasPermission(Permission.MANAGE_PROPERTY_REQUESTS)) {
            const pendingPropRequests = (requests || []).filter(
                r => r.type === RequestType.PROPERTY_LISTING_REQUEST && r.status === 'pending'
            );
            if (pendingPropRequests.length > 0) {
                items.push({
                    id: 'prop-requests',
                    domain: 'properties',
                    domainLabel: isAr ? 'العقارات' : 'Real Estate',
                    title: isAr ? 'طلبات إضافة عقارات جديدة' : 'New Property Listing Requests',
                    count: pendingPropRequests.length,
                    explanation: isAr
                        ? `${pendingPropRequests.length} طلب إضافة عقار من أصحاب العقارات`
                        : `${pendingPropRequests.length} property submissions submitted by owners`,
                    actionLabel: isAr ? 'مراجعة الطلبات' : 'Review Requests',
                    actionUrl: '/admin/properties/listing-requests',
                    urgency: 'medium',
                });
            }
        }

        // C. Partners: Pending Verification
        if (hasPermission(Permission.VERIFY_PARTNERS) || hasPermission(Permission.MANAGE_ALL_PARTNERS)) {
            const pendingPartners = (partners || []).filter(p => p.status === 'pending');
            if (pendingPartners.length > 0) {
                items.push({
                    id: 'partner-approvals',
                    domain: 'partners',
                    domainLabel: isAr ? 'الشركاء' : 'Partners',
                    title: isAr ? 'طلبات انضمام شركاء جديدة' : 'Partner Applications Pending Verification',
                    count: pendingPartners.length,
                    explanation: isAr 
                        ? `${pendingPartners.length} شريك جديد بانتظار التحقق والتفعيل`
                        : `${pendingPartners.length} partner registrations awaiting review and activation`,
                    actionLabel: isAr ? 'اعتماد الشركاء' : 'Review Partners',
                    actionUrl: '/admin/partners?status=pending',
                    urgency: 'high',
                });
            }
        }

        // D. Commercial: Unassigned & New Leads
        if (hasPermission(Permission.MANAGE_LEADS) || hasPermission(Permission.ASSIGN_LEADS)) {
            const unassignedLeads = (leads || []).filter(l => !l.partnerId && !l.assignedTo);
            const newLeads = (leads || []).filter(l => l.status === 'new');
            const targetCount = Math.max(unassignedLeads.length, newLeads.length);

            if (targetCount > 0) {
                items.push({
                    id: 'leads-unassigned',
                    domain: 'leads',
                    domainLabel: isAr ? 'المبيعات' : 'Commercial',
                    title: isAr ? 'عملاء محتملين غير معينين (Leads)' : 'Unassigned or New Leads',
                    count: targetCount,
                    explanation: isAr 
                        ? `${targetCount} عميل محتمل بانتظار التوزيع والمتابعة`
                        : `${targetCount} commercial leads require assignment and follow-up`,
                    actionLabel: isAr ? 'توزيع العملاء' : 'Assign Leads',
                    actionUrl: '/admin/leads?status=new',
                    urgency: 'high',
                });
            }
        }

        // E. Commercial: Contact messages
        if (hasPermission(Permission.MANAGE_CONTACT_REQUESTS)) {
            const pendingContacts = (requests || []).filter(
                r => r.type === RequestType.CONTACT_MESSAGE && r.status === 'pending'
            );
            if (pendingContacts.length > 0) {
                items.push({
                    id: 'contact-requests',
                    domain: 'requests',
                    domainLabel: isAr ? 'خدمة العملاء' : 'Customer Care',
                    title: isAr ? 'رسائل واستفسارات اتصل بنا' : 'Pending Contact Inquiries',
                    count: pendingContacts.length,
                    explanation: isAr
                        ? `${pendingContacts.length} رسالة بحاجة للرد والمتابعة`
                        : `${pendingContacts.length} contact messages awaiting response`,
                    actionLabel: isAr ? 'الرد على الرسائل' : 'Process Messages',
                    actionUrl: '/admin/contact-requests',
                    urgency: 'medium',
                });
            }
        }

        // F. Finishing: Requests needing action
        if (hasPermission(Permission.MANAGE_PLATFORM_FINISHING_LEADS)) {
            const pendingFinishing = (leads || []).filter(
                l => l.serviceType === 'finishing' && (l.status === 'new' || l.status === 'contacted')
            );
            if (pendingFinishing.length > 0) {
                items.push({
                    id: 'finishing-requests',
                    domain: 'finishing',
                    domainLabel: isAr ? 'التشطيبات' : 'Finishing',
                    title: isAr ? 'طلبات باقات تشطيب جديدة' : 'Finishing Packages Inquiries',
                    count: pendingFinishing.length,
                    explanation: isAr
                        ? `${pendingFinishing.length} طلب تشطيب بحاجة للمعالجة والتسعير`
                        : `${pendingFinishing.length} finishing quote inquiries awaiting triage`,
                    actionLabel: isAr ? 'معالجة الطلبات' : 'Review Finishing',
                    actionUrl: '/admin/platform-finishing/requests',
                    urgency: 'medium',
                });
            }
        }

        // G. Decorations: Requests needing action
        if (hasPermission(Permission.MANAGE_DECORATIONS_LEADS)) {
            const pendingDecor = (leads || []).filter(
                l => l.serviceType === 'decorations' && (l.status === 'new' || l.status === 'contacted')
            );
            if (pendingDecor.length > 0) {
                items.push({
                    id: 'decor-requests',
                    domain: 'decorations',
                    domainLabel: isAr ? 'الديكور' : 'Decorations',
                    title: isAr ? 'طلبات استشارة وتصميم ديكور' : 'Decoration & Design Inquiries',
                    count: pendingDecor.length,
                    explanation: isAr
                        ? `${pendingDecor.length} طلب استشارة ديكور جديد`
                        : `${pendingDecor.length} interior design inquiries awaiting response`,
                    actionLabel: isAr ? 'متابعة الطلبات' : 'Review Inquiries',
                    actionUrl: '/admin/platform-decorations/requests',
                    urgency: 'medium',
                });
            }
        }

        // Order high urgency first
        return items.sort((a, b) => (a.urgency === 'high' ? -1 : 1));
    }, [properties, partners, leads, requests, hasPermission, isAr]);

    // 4. Operational KPIs by Domain
    const domainSummaries = useMemo<DomainSummary[]>(() => {
        const summaries: DomainSummary[] = [];

        // Real Estate KPIs
        if (canViewProperties) {
            const activeProps = (properties || []).filter(p => p.listingStatus === 'active').length;
            const pendingProps = (properties || []).filter(p => p.verificationStatus === 'pending').length;
            const totalProps = (properties || []).length;
            const totalProjects = (projects || []).length;

            summaries.push({
                id: 'real_estate',
                title: isAr ? 'قطاع العقارات والمشاريع' : 'Real Estate Operations',
                icon: BuildingIcon,
                link: '/admin/properties',
                permission: Permission.VIEW_PROPERTIES,
                stats: [
                    { label: isAr ? 'عقارات معتمدة' : 'Active Listings', value: activeProps },
                    { label: isAr ? 'قيد التدقيق' : 'Pending Review', value: pendingProps },
                    { label: isAr ? 'إجمالي العقارات' : 'Total Units', value: totalProps },
                    { label: isAr ? 'المشاريع' : 'Projects', value: totalProjects },
                ]
            });
        }

        // Partners KPIs
        if (canViewPartners) {
            const activePartners = (partners || []).filter(p => p.status === 'active').length;
            const pendingPartners = (partners || []).filter(p => p.status === 'pending').length;
            const totalPartners = (partners || []).length;

            summaries.push({
                id: 'partners',
                title: isAr ? 'شبكة الشركاء والمطورين' : 'Partner Network',
                icon: UsersIcon,
                link: '/admin/partners',
                permission: Permission.VIEW_PARTNERS,
                stats: [
                    { label: isAr ? 'شركاء نشطين' : 'Active Partners', value: activePartners },
                    { label: isAr ? 'طلبات انضمام' : 'Pending Verification', value: pendingPartners },
                    { label: isAr ? 'إجمالي الشركاء' : 'Total Partners', value: totalPartners },
                ]
            });
        }

        // Commercial KPIs
        if (canViewLeads) {
            const totalLeads = (leads || []).length;
            const newLeads = (leads || []).filter(l => l.status === 'new').length;
            const totalRequests = (requests || []).length;

            summaries.push({
                id: 'commercial',
                title: isAr ? 'القطاع التجاري والمبيعات' : 'Commercial & Leads',
                icon: InboxIcon,
                link: '/admin/leads',
                permission: Permission.VIEW_LEADS,
                stats: [
                    { label: isAr ? 'إجمالي العملاء' : 'Total Leads', value: totalLeads },
                    { label: isAr ? 'عملاء جدد' : 'New Leads', value: newLeads },
                    { label: isAr ? 'الطلبات العامة' : 'Total Inquiries', value: totalRequests },
                ]
            });
        }

        // Finishing KPIs
        if (hasPermission(Permission.VIEW_FINISHING)) {
            const finishingReqs = (leads || []).filter(l => l.serviceType === 'finishing').length;
            summaries.push({
                id: 'finishing',
                title: isAr ? 'خدمات وتشطيبات المنصة' : 'Platform Finishing',
                icon: WrenchScrewdriverIcon,
                link: '/admin/platform-finishing',
                permission: Permission.VIEW_FINISHING,
                stats: [
                    { label: isAr ? 'طلبات التشطيب' : 'Finishing Requests', value: finishingReqs },
                    { label: isAr ? 'باقات التشطيب' : 'Service Packages', value: '3 Active' },
                ]
            });
        }

        return summaries;
    }, [canViewProperties, canViewPartners, canViewLeads, properties, projects, partners, leads, requests, hasPermission, isAr]);

    // 5. Permission-Filtered Quick Actions
    const quickActions = useMemo(() => {
        const actions = [];

        if (hasPermission(Permission.MANAGE_ALL_PROPERTIES)) {
            actions.push({
                label: isAr ? 'إضافة عقار جديد' : 'Add Property',
                href: '/admin/properties/new',
                icon: PlusIcon,
            });
        }

        if (hasPermission(Permission.MANAGE_ALL_PROJECTS)) {
            actions.push({
                label: isAr ? 'إضافة كمبوند / مشروع' : 'Add Project',
                href: '/admin/projects/new',
                icon: CubeIcon,
            });
        }

        if (hasPermission(Permission.MANAGE_ALL_PARTNERS)) {
            actions.push({
                label: isAr ? 'تسجيل شريك جديد' : 'Add Partner',
                href: '/admin/partners/new',
                icon: UsersIcon,
            });
        }

        if (hasPermission(Permission.MANAGE_LEADS) || hasPermission(Permission.VIEW_LEADS)) {
            actions.push({
                label: isAr ? 'توزيع ومتابعة العملاء' : 'Process Leads',
                href: '/admin/leads',
                icon: InboxIcon,
            });
        }

        if (hasPermission(Permission.MANAGE_USERS)) {
            actions.push({
                label: isAr ? 'إضافة مستخدم للنظام' : 'Add Internal User',
                href: '/admin/users/new',
                icon: ShieldCheckIcon,
            });
        }

        if (hasPermission(Permission.MANAGE_SITE_CONTENT)) {
            actions.push({
                label: isAr ? 'تعديل محتوى الموقع' : 'Site Content',
                href: '/admin/content',
                icon: ClipboardDocumentListIcon,
            });
        }

        if (hasPermission(Permission.MANAGE_AUTOMATION)) {
            actions.push({
                label: isAr ? 'قواعد التوجيه والأتمتة' : 'Automation Rules',
                href: '/admin/automation',
                icon: CogIcon,
            });
        }

        return actions;
    }, [hasPermission, isAr]);

    // 6. Recent Activity derived from database updates
    const recentActivity = useMemo(() => {
        const events: { id: string; title: string; time: string; domain: string }[] = [];

        (properties || []).slice(0, 4).forEach(p => {
            if (p.updatedAt || p.createdAt) {
                events.push({
                    id: `prop-${p.id}`,
                    title: `${isAr ? 'تحديث عقار' : 'Property update'}: ${p.title?.[language] || p.title?.ar || p.title?.en || p.referenceNumber || 'Unit'}`,
                    time: p.updatedAt || p.createdAt || new Date().toISOString(),
                    domain: isAr ? 'عقارات' : 'Real Estate'
                });
            }
        });

        (requests || []).slice(0, 4).forEach(r => {
            events.push({
                id: `req-${r.id}`,
                title: `${isAr ? 'طلب جديد' : 'Request'}: ${r.type} (${r.status})`,
                time: r.createdAt || new Date().toISOString(),
                domain: isAr ? 'طلبات' : 'Requests'
            });
        });

        return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);
    }, [properties, requests, isAr, language]);

    const partnerName = (isAr && currentUser && 'nameAr' in currentUser ? (currentUser as any).nameAr : currentUser?.name) || currentUser?.email;

    return (
        <div className="space-y-8">
            {/* Control Center Welcome Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                {isAr ? 'مركز العمليات متصل' : 'Operational Center Online'}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2">
                            {isAr ? `مرحباً، ${partnerName}` : `Welcome, ${partnerName}`}
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            {isAr 
                                ? 'لوحة التحكم والعمليات الموحدة — إدارة العمليات والمهام التي تتطلب تدخلاً فورياً'
                                : 'Unified Operations Control Center — Manage domains and action items requiring immediate attention'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={refetchAll}
                            disabled={isGlobalLoading}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-amber-600 transition-all shadow-2xs disabled:opacity-60"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${isGlobalLoading ? 'animate-spin text-amber-500' : ''}`} />
                            <span>{isAr ? 'تحديث البيانات' : 'Refresh Data'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {hasAnyError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                        <span>{isAr ? 'تعذر تحميل بعض مؤشرات العمليات. جاري استخدام البيانات المخزنة مؤقتاً.' : 'Failed to query some operational indicators. Displaying cached state.'}</span>
                    </div>
                    <button 
                        onClick={refetchAll}
                        className="font-bold underline text-xs ms-2 shrink-0"
                    >
                        {isAr ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            )}

            {/* SECTION 1: NEEDS ATTENTION (Top Priority) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">
                            {isAr ? 'يتطلب اهتمامك الآن' : 'Needs Attention'}
                        </h2>
                        {attentionItems.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                {attentionItems.length}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-gray-400">
                        {isAr ? 'إجراءات فورية بحاجة للاعتماد والتوجيه' : 'Actionable items across your authorized domains'}
                    </span>
                </div>

                {/* Loading State */}
                {isGlobalLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl border border-gray-200"></div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isGlobalLoading && attentionItems.length === 0 && (
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-6 text-center">
                        <CheckBadgeIcon className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                        <h3 className="text-sm font-bold text-emerald-900">
                            {isAr ? 'جميع العمليات منتظمة — لا توجد عناصر تتطلب تدخلاً فورياً' : 'All Workflows Up to Date'}
                        </h3>
                        <p className="text-xs text-emerald-700 mt-1">
                            {isAr 
                                ? 'لا توجد طلبات معلقة أو اعتمادات بانتظار المراجعة ضمن صلاحياتك حالياً.' 
                                : 'No pending reviews, approvals, or unassigned requests in your authorized domains.'}
                        </p>
                    </div>
                )}

                {/* Actionable Cards Grid */}
                {!isGlobalLoading && attentionItems.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {attentionItems.map((item) => (
                            <div 
                                key={item.id}
                                className={`rounded-xl border p-4 bg-white shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs ${
                                    item.urgency === 'high' 
                                        ? 'border-red-200 hover:border-red-300' 
                                        : 'border-amber-200 hover:border-amber-300'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                            item.urgency === 'high' 
                                                ? 'bg-red-100 text-red-800' 
                                                : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {item.domainLabel} • {item.urgency === 'high' ? (isAr ? 'عاجل' : 'HIGH') : (isAr ? 'مهم' : 'MEDIUM')}
                                        </span>
                                        <span className={`text-sm font-extrabold px-2 py-0.5 rounded-full ${
                                            item.urgency === 'high' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                                        }`}>
                                            {item.count}
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-gray-900 leading-snug">
                                        {item.title}
                                    </h4>
                                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                                        {item.explanation}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                                    <Link
                                        to={item.actionUrl}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                            item.urgency === 'high'
                                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                                        }`}
                                    >
                                        <span>{item.actionLabel}</span>
                                        <ChevronRightIcon className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SECTION 2: OPERATIONAL KPIS BY DOMAIN */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">
                        {isAr ? 'المؤشرات التشغيلية حسب القطاع' : 'Operational KPIs by Domain'}
                    </h2>
                    <span className="text-xs text-gray-400">
                        {isAr ? 'محدثة تلقائياً من قواعد البيانات' : 'Grounded in live database counts'}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {domainSummaries.map((domain) => {
                        const Icon = domain.icon;

                        return (
                            <Card key={domain.id} className="bg-white border-gray-200 shadow-2xs hover:shadow-xs transition-shadow">
                                <CardHeader className="pb-3 border-b border-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <CardTitle className="text-xs font-bold text-gray-900">
                                                {domain.title}
                                            </CardTitle>
                                        </div>
                                        <Link 
                                            to={domain.link}
                                            className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-0.5"
                                        >
                                            <span>{isAr ? 'إدارة' : 'Manage'}</span>
                                            <ChevronRightIcon className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        {domain.stats.map((stat, idx) => (
                                            <div key={idx} className="bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                                                <span className="text-[11px] text-gray-500 block truncate">
                                                    {stat.label}
                                                </span>
                                                <span className="text-base font-bold text-gray-900 mt-0.5 block">
                                                    {isGlobalLoading ? '—' : stat.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* SECTION 3: QUICK ACTIONS & RECENT ACTIVITY */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions (2 cols) */}
                <div className="lg:col-span-2 space-y-3">
                    <h2 className="text-lg font-bold text-gray-900">
                        {isAr ? 'إجراءات وعمليات سريعة' : 'Quick Operational Actions'}
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {quickActions.map((action, idx) => {
                            const Icon = action.icon;

                            return (
                                <Link
                                    key={idx}
                                    to={action.href}
                                    className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:border-amber-400 hover:shadow-xs transition-all text-center group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-amber-50 group-hover:bg-amber-500 text-amber-600 group-hover:text-white flex items-center justify-center transition-colors mb-2">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-800 group-hover:text-amber-700 transition-colors">
                                        {action.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Activity Stream (1 col) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900">
                            {isAr ? 'آخر النشاطات' : 'Recent Activity'}
                        </h2>
                        {hasPermission(Permission.VIEW_AUDIT_LOG) && (
                            <Link 
                                to="/admin/audit-log" 
                                className="text-xs font-semibold text-amber-600 hover:underline"
                            >
                                {isAr ? 'سجل التدقيق' : 'Audit Log'}
                            </Link>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
                        {recentActivity.length === 0 ? (
                            <div className="p-6 text-center text-xs text-gray-400">
                                {isAr ? 'لا توجد نشاطات مسجلة مؤخراً' : 'No recent activity recorded'}
                            </div>
                        ) : (
                            recentActivity.map((act) => (
                                <div key={act.id} className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-100 last:border-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-900 truncate">
                                            {act.title}
                                        </p>
                                        <span className="text-[10px] text-gray-400">
                                            {act.domain}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-400 shrink-0">
                                        {new Date(act.time).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'numeric', day: 'numeric' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminHomePage;

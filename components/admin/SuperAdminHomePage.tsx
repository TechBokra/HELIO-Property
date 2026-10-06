import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Lead, Property, Project, Partner, Request } from '../../types';
import { 
    BuildingIcon, UsersIcon, ChartBarIcon, CubeIcon, WhatsAppIcon, PhoneIcon, CheckBadgeIcon, ExclamationTriangleIcon, ArrowPathIcon 
} from '../ui/Icons';
import { isListingActive } from '../../utils/propertyUtils';
import { getAllPartnersForAdmin } from '../../services/partners';
import { getAllProperties } from '../../services/properties';
import { getAllLeads } from '../../services/leads';
import { getAllProjects } from '../../services/projects';
import { getAllRequests } from '../../services/requests';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getCommercialKPIs } from '../../services/analytics';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface AttentionItem {
    id: string;
    domain: 'leads' | 'partners' | 'properties' | 'requests';
    title: string;
    description: string;
    status: string;
    actionLabel: string;
    actionUrl: string;
    urgency: 'high' | 'medium';
    date: string;
}

const SuperAdminHomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_home = t.adminDashboard.home;
    const t_analytics = t.adminAnalytics;
    
    const { data: partners, isLoading: loadingPartners, refetch: refetchPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const { data: properties, isLoading: loadingProperties, refetch: refetchProperties } = useQuery({ queryKey: ['allProperties'], queryFn: getAllProperties });
    const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
    const { data: leads, isLoading: loadingLeads, refetch: refetchLeads } = useQuery({ queryKey: ['allLeads'], queryFn: getAllLeads });
    const { data: requests, isLoading: loadingRequests, refetch: refetchRequests } = useQuery({ queryKey: ['allRequestsAdmin'], queryFn: getAllRequests });

    const loading = loadingPartners || loadingProperties || loadingLeads || loadingProjects || loadingRequests;

    const refetchAll = () => {
        refetchPartners();
        refetchProperties();
        refetchProjects();
        refetchLeads();
        refetchRequests();
    };

    const commercialData = useMemo(() => {
        if (loading) return null;

        const kpis = getCommercialKPIs(properties || [], leads || [], partners || []);
        const totalProjectsCount = (projects || []).length;

        const leadStats = (leads || []).reduce((acc, lead) => {
            if (lead.propertyId) acc.propertyLeads[lead.propertyId] = (acc.propertyLeads[lead.propertyId] || 0) + 1;
            if (lead.partnerId) acc.partnerLeads[lead.partnerId] = (acc.partnerLeads[lead.partnerId] || 0) + 1;
            return acc;
        }, { propertyLeads: {} as Record<string, number>, partnerLeads: {} as Record<string, number> });
        
        const topPartners = Object.entries(leadStats.partnerLeads)
            .sort(([, countA], [, countB]) => Number(countB) - Number(countA)).slice(0, 5)
            .map(([partnerId, count]) => ({ partner: (partners || []).find(p => p.id === partnerId), count }))
            .filter(p => p.partner && p.partner.type !== 'admin');

        const topProperties = Object.entries(leadStats.propertyLeads)
            .sort(([, countA], [, countB]) => Number(countB) - Number(countA)).slice(0, 5)
            .map(([propertyId, count]) => ({ property: (properties || []).find(p => p.id === propertyId), count }))
            .filter(p => p.property);

        // --- Actionable "Needs Attention" Detection ---
        const attentionItems: AttentionItem[] = [];

        // 1. Unassigned leads
        (leads || []).forEach(l => {
            const isUnassigned = !l.partnerId && !l.assignedTo;
            if (isUnassigned || l.status === 'new') {
                attentionItems.push({
                    id: `lead-${l.id}`,
                    domain: 'leads',
                    title: l.customerName || (language === 'ar' ? 'عميل محتمل' : 'Lead Customer'),
                    description: `${l.serviceTitle || 'Inquiry'} • ${l.customerPhone || 'No Phone'}`,
                    status: l.status,
                    actionLabel: isUnassigned 
                        ? (language === 'ar' ? 'تعيين شريك' : 'Assign Partner')
                        : (language === 'ar' ? 'معالجة العميل' : 'Process Lead'),
                    actionUrl: `/admin/leads?highlight=${l.id}`,
                    urgency: isUnassigned ? 'high' : 'medium',
                    date: l.createdAt || new Date().toISOString()
                });
            }
        });

        // 2. Pending partners needing verification
        (partners || []).forEach(p => {
            if (p.status === 'pending') {
                attentionItems.push({
                    id: `partner-${p.id}`,
                    domain: 'partners',
                    title: (language === 'ar' && p.nameAr ? p.nameAr : p.name) || p.email,
                    description: `${language === 'ar' ? 'طلب انضمام شريك جديد' : 'Partner Application'} (${p.type})`,
                    status: 'pending',
                    actionLabel: language === 'ar' ? 'مراجعة واعتماد' : 'Review & Verify',
                    actionUrl: `/admin/partners?status=pending&highlight=${p.id}`,
                    urgency: 'high',
                    date: p.createdAt || new Date().toISOString()
                });
            }
        });

        // 3. Properties pending verification or draft review
        (properties || []).forEach(prop => {
            if (prop.verificationStatus === 'pending' || prop.listingStatus === 'draft') {
                attentionItems.push({
                    id: `prop-${prop.id}`,
                    domain: 'properties',
                    title: prop.title?.[language] || prop.title?.ar || prop.title?.en || 'Property',
                    description: `${prop.type?.[language] || prop.type?.en || 'Listing'} • ${prop.partnerName || 'Owner'}`,
                    status: prop.verificationStatus === 'pending' ? 'pending' : prop.listingStatus,
                    actionLabel: language === 'ar' ? 'تدقيق العقار' : 'Audit Listing',
                    actionUrl: `/admin/properties/list?verification=pending&highlight=${prop.id}`,
                    urgency: 'medium',
                    date: prop.createdAt || prop.listingStartDate || new Date().toISOString()
                });
            }
        });

        // 4. Pending triage contact requests
        (requests || []).forEach(r => {
            if (r.status === 'pending') {
                attentionItems.push({
                    id: `req-${r.id}`,
                    domain: 'requests',
                    title: r.requesterInfo?.name || r.type,
                    description: `${r.type} • ${r.requesterInfo?.phone || r.requesterInfo?.email || ''}`,
                    status: r.status,
                    actionLabel: language === 'ar' ? 'معالجة الطلب' : 'Process Request',
                    actionUrl: `/admin/contact-requests?highlight=${r.id}`,
                    urgency: 'high',
                    date: r.createdAt || new Date().toISOString()
                });
            }
        });

        // Sort by high urgency first, then date
        attentionItems.sort((a, b) => {
            if (a.urgency === 'high' && b.urgency !== 'high') return -1;
            if (a.urgency !== 'high' && b.urgency === 'high') return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        // Today counters
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLeadsCount = (leads || []).filter(l => l.createdAt && l.createdAt.startsWith(todayStr)).length;
        const unassignedLeadsCount = (leads || []).filter(l => !l.partnerId && !l.assignedTo).length;
        const pendingPartnersCount = (partners || []).filter(p => p.status === 'pending').length;
        const pendingRequestsCount = (requests || []).filter(r => r.status === 'pending').length;
        const pendingPropertiesCount = (properties || []).filter(p => p.verificationStatus === 'pending' || p.listingStatus === 'draft').length;

        return {
            kpis,
            totalProjectsCount,
            topPartners,
            topProperties,
            attentionItems: attentionItems.slice(0, 8),
            actionCounts: {
                todayLeads: todayLeadsCount,
                unassignedLeads: unassignedLeadsCount,
                pendingPartners: pendingPartnersCount,
                pendingRequests: pendingRequestsCount,
                pendingProperties: pendingPropertiesCount,
                totalPendingAction: unassignedLeadsCount + pendingPartnersCount + pendingRequestsCount + pendingPropertiesCount
            }
        };
    }, [loading, leads, properties, partners, projects, requests, language]);

    if (loading || !commercialData) {
        return <div className="animate-pulse h-screen bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-6">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>)}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>;
    }

    const { kpis, totalProjectsCount, topPartners, topProperties, attentionItems, actionCounts } = commercialData;
    
    const commonChartOptions = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
             x: { ticks: { color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280' } },
             y: { ticks: { color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280' } },
        }
    };
    
    const topPartnersChartData = {
        labels: topPartners.map(p => p.partner ? (language === 'ar' ? p.partner.nameAr : p.partner.name) : 'N/A'),
        datasets: [{
            label: t_analytics.leads,
            data: topPartners.map(p => p.count),
            backgroundColor: 'rgba(245, 158, 11, 0.6)',
            borderColor: 'rgba(245, 158, 11, 1)',
            borderWidth: 1,
        }]
    };

    const topPropertiesChartData = {
        labels: topProperties.map(p => p.property ? (p.property.title?.[language] || p.property.title?.ar || p.property.title?.en) : 'N/A'),
        datasets: [{
            label: t_home.inquiries,
            data: topProperties.map(p => p.count),
            backgroundColor: 'rgba(217, 119, 6, 0.6)',
            borderColor: 'rgba(217, 119, 6, 1)',
            borderWidth: 1,
        }]
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header with Title and Quick Refresh */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-5">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                        {language === 'ar' ? 'مركز العمليات والتحكم الإداري' : 'Admin Operations Control Center'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {language === 'ar' 
                            ? 'إدارة الحوكمة، تعيين العملاء، واعتماد الشركاء والعقارات لمنصة ONLY HELIO' 
                            : 'Governance, lead routing, partner verification, and listings control for ONLY HELIO'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={refetchAll} className="gap-2">
                        <ArrowPathIcon className="w-4 h-4" />
                        <span>{language === 'ar' ? 'تحديث البيانات' : 'Refresh Cockpit'}</span>
                    </Button>
                    <Link to="/admin/reports">
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-medium">
                            {language === 'ar' ? 'التقارير التنفيذية' : 'Executive Reports'}
                        </Button>
                    </Link>
                </div>
            </div>

            {/* SECTION 1: TODAY / ACTION BAR */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500 text-white rounded-lg">
                            <ExclamationTriangleIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {language === 'ar' ? 'موجز اليوم — المهام المعلقة والمطلوبة' : 'Today Operations — Action Required'}
                            </h2>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                                {language === 'ar'
                                    ? `هناك ${actionCounts.totalPendingAction} معاملة تتطلب تدخلاً إدارياً حالياً`
                                    : `${actionCounts.totalPendingAction} pending records require administrator action`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Link to="/admin/leads?status=new" className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-500 transition-colors shadow-sm">
                        <p className="text-xs text-gray-500 font-medium">{language === 'ar' ? 'عملاء غير معينين' : 'Unassigned Leads'}</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{actionCounts.unassignedLeads}</p>
                        <span className="text-xs text-amber-600 hover:underline">{language === 'ar' ? 'تعيين الآن ←' : 'Assign now →'}</span>
                    </Link>

                    <Link to="/admin/partners?status=pending" className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-500 transition-colors shadow-sm">
                        <p className="text-xs text-gray-500 font-medium">{language === 'ar' ? 'شركاء بانتظار الاعتماد' : 'Pending Partners'}</p>
                        <p className="text-2xl font-bold text-amber-600 mt-1">{actionCounts.pendingPartners}</p>
                        <span className="text-xs text-amber-600 hover:underline">{language === 'ar' ? 'اعتماد الشركاء ←' : 'Verify now →'}</span>
                    </Link>

                    <Link to="/admin/properties/list?verification=pending" className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-500 transition-colors shadow-sm">
                        <p className="text-xs text-gray-500 font-medium">{language === 'ar' ? 'عقارات بانتظار التدقيق' : 'Pending Properties'}</p>
                        <p className="text-2xl font-bold text-purple-600 mt-1">{actionCounts.pendingProperties}</p>
                        <span className="text-xs text-amber-600 hover:underline">{language === 'ar' ? 'مراجعة ونشر ←' : 'Audit now →'}</span>
                    </Link>

                    <Link to="/admin/contact-requests" className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-500 transition-colors shadow-sm">
                        <p className="text-xs text-gray-500 font-medium">{language === 'ar' ? 'استفسارات عامة معلقة' : 'Pending Inquiries'}</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{actionCounts.pendingRequests}</p>
                        <span className="text-xs text-amber-600 hover:underline">{language === 'ar' ? 'معالجة الطلبات ←' : 'Triage now →'}</span>
                    </Link>
                </div>
            </div>

            {/* SECTION 2: NEEDS ATTENTION ACTIONABLE LIST */}
            {attentionItems.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                                {language === 'ar' ? 'قائمة الاهتمام الفوري (Needs Attention)' : 'Needs Immediate Attention'}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {language === 'ar' ? 'معاملات تتطلب اتخاذ إجراء فوري مباشر' : 'Actionable items awaiting admin intervention'}
                            </p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full">
                            {attentionItems.length} {language === 'ar' ? 'عنصر' : 'Items'}
                        </span>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {attentionItems.map(item => (
                            <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                                            item.domain === 'leads' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                            item.domain === 'partners' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                            item.domain === 'properties' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                                            'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                        }`}>
                                            {item.domain}
                                        </span>
                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{item.title}</h3>
                                        <StatusBadge status={item.status} />
                                    </div>
                                    <p className="text-xs text-gray-500">{item.description}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] text-gray-400">
                                        {new Date(item.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <Link to={item.actionUrl}>
                                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900 text-xs font-semibold px-4 py-1.5 rounded-lg shadow-sm">
                                            {item.actionLabel}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* SECTION 3: COMMERCIAL 4-QUADRANT COCKPIT */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    {language === 'ar' ? 'المؤشرات التشغيلية والتجارية للمنصة' : 'Commercial & Operational Cockpit'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Quadrant 1: Marketplace Inventory */}
                    <Card className="border-t-4 border-t-amber-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                                <span>{language === 'ar' ? 'مخزون العقارات' : 'Marketplace Inventory'}</span>
                                <BuildingIcon className="w-5 h-5 text-amber-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">{kpis.activeListings}</span>
                                <span className="text-xs text-gray-500">{language === 'ar' ? `من إجمالي ${kpis.totalListings}` : `of ${kpis.totalListings} total`}</span>
                            </div>
                            <div className="text-xs space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{language === 'ar' ? 'المشاريع والكمبوندات:' : 'Projects:'}</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{totalProjectsCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{language === 'ar' ? 'مشاهدات العقارات:' : 'Total Views:'}</span>
                                    <span className="font-semibold text-amber-600">{kpis.propertyViews}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quadrant 2: Lead Engine */}
                    <Card className="border-t-4 border-t-blue-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                                <span>{language === 'ar' ? 'محرك العملاء والتحويل' : 'Lead Engine'}</span>
                                <ChartBarIcon className="w-5 h-5 text-blue-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">{kpis.newLeadsCount}</span>
                                <span className="text-xs text-emerald-600 font-semibold">{kpis.conversionRate}% {language === 'ar' ? 'نسبة الإغلاق' : 'Won'}</span>
                            </div>
                            <div className="text-xs space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{language === 'ar' ? 'نسبة التواصل:' : 'Contacted Rate:'}</span>
                                    <span className="font-semibold text-blue-600">{kpis.contactedRate}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{language === 'ar' ? 'نسبة المعاينات:' : 'Viewing Rate:'}</span>
                                    <span className="font-semibold text-purple-600">{kpis.viewingRate}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quadrant 3: Partner Operations */}
                    <Card className="border-t-4 border-t-emerald-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                                <span>{language === 'ar' ? 'الشركاء والاشتراكات' : 'Partner Operations'}</span>
                                <UsersIcon className="w-5 h-5 text-emerald-500" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">{kpis.activePartnersCount}</span>
                                <span className="text-xs text-emerald-600 font-medium">✓ {language === 'ar' ? 'شركاء معتمدون' : 'Active Partners'}</span>
                            </div>
                            <div className="text-xs space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{language === 'ar' ? 'معدل الفرص لكل شريك:' : 'Leads/Partner:'}</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                        {kpis.activePartnersCount > 0 ? (kpis.newLeadsCount / kpis.activePartnersCount).toFixed(1) : '0'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">{language === 'ar' ? 'باقات الاشتراك:' : 'Plan Status:'}</span>
                                    <span className="font-semibold text-emerald-600">{language === 'ar' ? 'سارية ونشطة' : 'Active'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quadrant 4: High-Intent Direct Channels */}
                    <Card className="border-t-4 border-t-purple-500 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                                <span>{language === 'ar' ? 'قنوات التواصل المباشر' : 'Direct Channels'}</span>
                                <WhatsAppIcon className="w-5 h-5 text-emerald-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">{kpis.whatsAppClicks + kpis.callClicks}</span>
                                <span className="text-xs text-purple-600 font-semibold">{language === 'ar' ? 'تفاعل عالي النية' : 'High-Intent CTAs'}</span>
                            </div>
                            <div className="text-xs space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-1"><WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" /> {language === 'ar' ? 'نقرات الواتساب:' : 'WhatsApp:'}</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{kpis.whatsAppClicks}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-1"><PhoneIcon className="w-3.5 h-3.5 text-amber-500" /> {language === 'ar' ? 'الاتصالات الهاتفية:' : 'Calls:'}</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{kpis.callClicks}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* SECTION 4: PERFORMANCE ANALYTICS CHARTS */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                    {language === 'ar' ? 'تحليلات الأداء والفرص' : 'Performance Analytics'}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">{t_home.topPerformingPartners}</h3>
                        <div className="h-80">
                            <Bar data={topPartnersChartData} options={commonChartOptions} />
                        </div>
                    </div>
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">{t_home.topPerformingProperties}</h3>
                        <div className="h-80">
                            <Bar data={topPropertiesChartData} options={commonChartOptions} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminHomePage;

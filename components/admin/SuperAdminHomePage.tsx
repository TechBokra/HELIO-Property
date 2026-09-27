import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Lead, Property, Project, Partner } from '../../types';
import { 
    BuildingIcon, UsersIcon, ChartBarIcon, CubeIcon, WhatsAppIcon, PhoneIcon, CheckBadgeIcon 
} from '../ui/Icons';
import { isListingActive } from '../../utils/propertyUtils';
import { getAllPartnersForAdmin } from '../../services/partners';
import { getAllProperties } from '../../services/properties';
import { getAllLeads } from '../../services/leads';
import { getAllProjects } from '../../services/projects';
import { useQuery } from '@tanstack/react-query';
import StatCard from '../shared/StatCard';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getCommercialKPIs } from '../../services/analytics';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SuperAdminHomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_home = t.adminDashboard.home;
    const t_analytics = t.adminAnalytics;
    
    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const { data: properties, isLoading: loadingProperties } = useQuery({ queryKey: ['allProperties'], queryFn: getAllProperties });
    const { data: projects, isLoading: loadingProjects } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
    const { data: leads, isLoading: loadingLeads } = useQuery({ queryKey: ['allLeads'], queryFn: getAllLeads });

    const loading = loadingPartners || loadingProperties || loadingLeads || loadingProjects;

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

        return {
            kpis,
            totalProjectsCount,
            topPartners,
            topProperties
        };
    }, [loading, leads, properties, partners, projects]);

    if (loading || !commercialData) {
        return <div className="animate-pulse h-screen bg-gray-50 dark:bg-gray-800 rounded-lg"></div>;
    }

    const { kpis, totalProjectsCount, topPartners, topProperties } = commercialData;
    
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
        labels: topProperties.map(p => p.property ? p.property.title[language] : 'N/A'),
        datasets: [{
            label: t_home.inquiries,
            data: topProperties.map(p => p.count),
            backgroundColor: 'rgba(217, 119, 6, 0.6)',
            borderColor: 'rgba(217, 119, 6, 1)',
            borderWidth: 1,
        }]
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_home.title}</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {language === 'ar' 
                        ? 'لوحة القيادة التجارية والتشغيلية لمنصة ONLY HELIO — مدينة هليوبوليس الجديدة' 
                        : 'Commercial & Operations Cockpit for ONLY HELIO — New Heliopolis City'}
                </p>
            </div>
            
            {/* Commercial 4-Quadrant Cockpit */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Quadrant 1: Marketplace Inventory */}
                <Card className="border-t-4 border-t-amber-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                            <span>{language === 'ar' ? 'مخزون العقارات' : 'Marketplace Inventory'}</span>
                            <BuildingIcon className="w-5 h-5 text-amber-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-baseline">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.activeListings}</span>
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
                <Card className="border-t-4 border-t-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                            <span>{language === 'ar' ? 'محرك العملاء والتحويل' : 'Lead Engine'}</span>
                            <ChartBarIcon className="w-5 h-5 text-blue-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-baseline">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.newLeadsCount}</span>
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
                <Card className="border-t-4 border-t-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                            <span>{language === 'ar' ? 'الشركاء والاشتراكات' : 'Partner Operations'}</span>
                            <UsersIcon className="w-5 h-5 text-emerald-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-baseline">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.activePartnersCount}</span>
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

                {/* Quadrant 4: High-Intent Growth Channels */}
                <Card className="border-t-4 border-t-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                            <span>{language === 'ar' ? 'قنوات التواصل المباشر' : 'Direct Channels'}</span>
                            <WhatsAppIcon className="w-5 h-5 text-emerald-600" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between items-baseline">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.whatsAppClicks + kpis.callClicks}</span>
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

            {/* Performance Analytics Charts */}
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    {language === 'ar' ? 'تحليلات الأداء والفرص' : 'Performance Analytics'}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t_home.topPerformingPartners}</h3>
                        <div className="h-80">
                            <Bar data={topPartnersChartData} options={commonChartOptions} />
                        </div>
                    </div>
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t_home.topPerformingProperties}</h3>
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


import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllPartnersForAdmin } from '../../services/partners';
import { getAllProjects } from '../../services/projects';
import { getAllProperties } from '../../services/properties';
import { getAllPartnerRequests } from '../../services/partnerRequests';
import { UsersIcon, CubeIcon, BuildingIcon, UserPlusIcon } from '../ui/Icons';
import StatCard from '../shared/StatCard';
import RequestList from '../shared/RequestList';
import { useLanguage } from '../shared/LanguageContext';
import { isListingActive } from '../../utils/propertyUtils';
import type { PartnerRequest } from '../../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const FinishingMarketHomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard;

    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const { data: projects, isLoading: loadingProjects } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
    const { data: properties, isLoading: loadingProperties } = useQuery({ queryKey: ['allPropertiesAdmin'], queryFn: getAllProperties });
    const { data: partnerRequests, isLoading: loadingRequests } = useQuery({ queryKey: ['partnerRequests'], queryFn: getAllPartnerRequests });

    const isLoading = loadingPartners || loadingProjects || loadingProperties || loadingRequests;

    const dashboardData = useMemo(() => {
        if (!partners || !projects || !properties || !partnerRequests) return null;

        const businessPartners = partners.filter(p => ['developer', 'finishing', 'agency'].includes(p.type));
        const activeProperties = properties.filter(isListingActive);
        const pendingRequests = partnerRequests.filter(r => r.status === 'pending');

        const partnerDistribution = businessPartners.reduce((acc, partner) => {
            const type = t_admin.partnerTypes[partner.type as keyof typeof t_admin.partnerTypes] || partner.type;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const chartData = {
            labels: Object.keys(partnerDistribution),
            datasets: [{
                data: Object.values(partnerDistribution),
                backgroundColor: ['#FBBF24', '#F97316', '#D97706'],
                borderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                borderWidth: 2,
            }],
        };

        return {
            totalPartners: businessPartners.length,
            totalProjects: projects.length,
            activeProperties: activeProperties.length,
            pendingRequestsCount: pendingRequests.length,
            chartData,
            recentRequests: pendingRequests.slice(0, 5)
        };
    }, [partners, projects, properties, partnerRequests, language, t_admin.partnerTypes]);

    if (isLoading || !dashboardData) {
        return <div>Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {language === 'ar' ? 'لوحة تحكم الشركاء والمشاريع' : 'Partners & Projects Dashboard'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {language === 'ar' 
                        ? 'نظرة شاملة على الشركاء، طلبات الانضمام، المشاريع، والعقارات.' 
                        : 'A comprehensive overview of partners, applications, projects, and properties.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title={t_admin.partnersManagement.totalPartners} 
                    value={dashboardData.totalPartners}
                    icon={UsersIcon}
                    linkTo="/admin/partners/list"
                />
                <StatCard 
                    title={t_admin.home.pendingPartnerRequests} 
                    value={dashboardData.pendingRequestsCount}
                    icon={UserPlusIcon}
                    linkTo="/admin/partners/requests"
                />
                <StatCard 
                    title={t_admin.listingsManagerHome.activeProperties}
                    value={dashboardData.activeProperties}
                    icon={BuildingIcon}
                    linkTo="/admin/properties/list"
                />
                <StatCard 
                    title={t_admin.listingsManagerHome.totalProjects}
                    value={dashboardData.totalProjects}
                    icon={CubeIcon}
                    linkTo="/admin/projects"
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t_admin.partnersManagement.partnerDistributionByType}</h2>
                    <div className="h-64 flex justify-center">
                        <Doughnut data={dashboardData.chartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: document.documentElement.classList.contains('dark') ? '#E5E7EB' : '#374151' } } } }} />
                    </div>
                </div>
                
                <RequestList<PartnerRequest>
                    title={t_admin.partnersManagement.recentPartnerRequests}
                    requests={dashboardData.recentRequests}
                    linkTo="/admin/partners/requests"
                    itemRenderer={(item) => (
                        <li key={item.id} className="py-3">
                            <Link to={`/admin/partners/requests/${item.id}`} className="flex justify-between items-center group">
                                <div>
                                    <p className="font-medium group-hover:text-amber-600">{item.companyName}</p>
                                    <p className="text-sm text-gray-500">{item.contactName}</p>
                                </div>
                                <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString(language)}</p>
                            </Link>
                        </li>
                    )}
                />
            </div>
        </div>
    );
};

export default FinishingMarketHomePage;

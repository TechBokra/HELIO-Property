
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { getAllProjects } from '../../../services/projects';
import { getAllPartnerRequests } from '../../../services/partnerRequests';
import { UsersIcon, CubeIcon, UserPlusIcon } from '../../ui/Icons';
import StatCard from '../../shared/StatCard';
import RequestList from '../../shared/RequestList';
import { useLanguage } from '../../shared/LanguageContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import type { PartnerRequest } from '../../../types';
import { Card, CardContent } from '../../ui/Card';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);


const ActionCard: React.FC<{ title: string; count: number; linkTo: string; icon: React.FC<{className?: string}>; t: any }> = ({ title, count, linkTo, icon: Icon, t }) => (
    <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 p-0">
        <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                    <p className="text-4xl font-bold text-amber-600 dark:text-amber-400">{count}</p>
                </div>
                <Icon className="w-8 h-8 text-amber-500" />
            </div>
            <Link to={linkTo} className="mt-4 text-center font-semibold text-amber-600 dark:text-amber-500 bg-amber-200/50 dark:bg-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-500/20 rounded-md py-2 transition-colors">
                {t.adminDashboard.home.review}
            </Link>
        </CardContent>
    </Card>
);

const AdminPartnersDashboard: React.FC = () => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard;

    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const { data: projects, isLoading: loadingProjects } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
    const { data: partnerRequests, isLoading: loadingRequests } = useQuery({ queryKey: ['partnerRequests'], queryFn: getAllPartnerRequests });

    const isLoading = loadingPartners || loadingProjects || loadingRequests;

    const dashboardData = useMemo(() => {
        if (!partners || !projects) return null;

        const businessPartners = partners.filter(p => ['developer', 'finishing', 'agency'].includes(p.type));
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
            pendingRequests: (partnerRequests || []).filter(r => r.status === 'pending').length,
            chartData
        };
    }, [partners, projects, partnerRequests, language, t_admin.partnerTypes]);

    if (isLoading || !dashboardData) {
        return <div>Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {t_admin.partnersManagement.title}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {t_admin.partnersManagement.subtitle}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title={t_admin.partnersManagement.totalPartners} value={dashboardData.totalPartners} icon={UsersIcon} linkTo="/admin/partners/list" />
                <StatCard title={t_admin.listingsManagerHome.totalProjects} value={dashboardData.totalProjects} icon={CubeIcon} linkTo="/admin/projects" />
                <StatCard title={t_admin.home.pendingPartnerRequests} value={dashboardData.pendingRequests} icon={UserPlusIcon} linkTo="/admin/partner-requests" />
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
                    requests={partnerRequests}
                    linkTo="/admin/requests?type=PARTNER_APPLICATION"
                    itemRenderer={(item) => (
                        <li key={item.id} className="py-3">
                            <Link to={`/admin/requests/${item.id}`} className="flex justify-between items-center group">
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

export default AdminPartnersDashboard;

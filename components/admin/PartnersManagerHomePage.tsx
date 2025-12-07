
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllPartnerRequests } from '../../services/partnerRequests';
import { getAllPartnersForAdmin } from '../../services/partners';
import { UserPlusIcon, UsersIcon } from '../ui/Icons';
import StatCard from '../shared/StatCard';
import RequestList from '../shared/RequestList';
import { useLanguage } from '../shared/LanguageContext';
import type { PartnerRequest, Language, SubscriptionPlan } from '../../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const PartnerRelationsHomePage: React.FC = () => {
    const { language, t: i18n } = useLanguage();
    const t = i18n.adminDashboard.partnersManagement;
    
    const { data: partnerRequests, isLoading: loadingPartnerRequests } = useQuery({ queryKey: ['partnerRequests'], queryFn: getAllPartnerRequests });
    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });

    const isLoading = loadingPartnerRequests || loadingPartners;

    const dashboardData = useMemo(() => {
        if (!partners) return null;

        const businessPartners = partners.filter(p => ['developer', 'finishing', 'agency'].includes(p.type));

        const partnerDistribution = businessPartners.reduce((acc, partner) => {
            const type = i18n.adminDashboard.partnerTypes[partner.type as keyof typeof i18n.adminDashboard.partnerTypes] || partner.type;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const partnersByPlan = businessPartners.reduce((acc, partner) => {
            const plan = partner.subscriptionPlan;
            acc[plan] = (acc[plan] || 0) + 1;
            return acc;
        }, {} as Record<SubscriptionPlan, number>);


        const distributionChartData = {
            labels: Object.keys(partnerDistribution),
            datasets: [{
                data: Object.values(partnerDistribution),
                backgroundColor: ['#FBBF24', '#F97316', '#D97706'],
                borderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                borderWidth: 2,
            }],
        };
        
        const planChartData = {
            labels: Object.keys(partnersByPlan),
            datasets: [{
                label: 'Partners',
                data: Object.values(partnersByPlan),
                backgroundColor: 'rgba(217, 119, 6, 0.6)',
                borderColor: 'rgba(217, 119, 6, 1)',
                borderWidth: 1,
            }]
        };

        return {
            pendingRequests: (partnerRequests || []).filter(r => r.status === 'pending').length,
            totalPartners: businessPartners.length,
            distributionChartData,
            planChartData
        };
    }, [isLoading, partnerRequests, partners, language, i18n.adminDashboard.partnerTypes]);

    if (isLoading || !dashboardData) {
        return <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>;
    }

    const { pendingRequests, totalPartners, distributionChartData, planChartData } = dashboardData;

    return (
       <div className="space-y-8">
           <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.title}</h1>
           <p className="text-gray-500 dark:text-gray-400">{t.subtitle}</p>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <StatCard 
                   title={i18n.adminDashboard.home.pendingPartnerRequests} 
                   value={pendingRequests}
                   icon={UserPlusIcon}
                   linkTo="/admin/partners/requests"
               />
               <StatCard 
                   title={t.totalPartners}
                   value={totalPartners}
                   icon={UsersIcon}
                   linkTo="/admin/partners/list"
               />
           </div>
           
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                 <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t.partnerDistributionByType}</h2>
                    <div className="h-64 flex justify-center">
                        <Doughnut data={distributionChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: document.documentElement.classList.contains('dark') ? '#E5E7EB' : '#374151' } } } }} />
                    </div>
                </div>
                 <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t.partnersByPlan}</h2>
                    <div className="h-64">
                        <Bar data={planChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 } } } }} />
                    </div>
                </div>
            </div>

           <RequestList<PartnerRequest>
               title={t.recentPartnerRequests}
               requests={partnerRequests}
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
    );
};

export default PartnerRelationsHomePage;


import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllProperties } from '../../services/properties';
import { getAllLeads } from '../../services/leads';
import { BuildingIcon, InboxIcon, ChartBarIcon } from '../ui/Icons';
import StatCard from '../shared/StatCard';
import RequestList from '../shared/RequestList';
import { useLanguage } from '../shared/LanguageContext';
import { Property, Lead } from '../../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const RealEstatePlatformHomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_dash = t.adminDashboard.propertiesDashboard;
    
    const { data: properties, isLoading: loadingProps } = useQuery({ queryKey: ['allPropertiesAdmin'], queryFn: getAllProperties });
    const { data: leads, isLoading: loadingLeads } = useQuery({ queryKey: ['allLeads'], queryFn: getAllLeads });

    const isLoading = loadingProps || loadingLeads;

    const dashboardData = useMemo(() => {
        if (!properties || !leads) return null;

        // Filter for Platform Properties (individual-listings or admin-user)
        const platformProperties = properties.filter(p => 
            p.partnerId === 'individual-listings' || p.partnerId === 'admin-user'
        );

        const platformPropertyIds = new Set(platformProperties.map(p => p.id));
        
        // Filter leads related to these properties
        const platformLeads = leads.filter(l => 
            (l.propertyId && platformPropertyIds.has(l.propertyId)) || 
            l.partnerId === 'individual-listings'
        );

        const stats = {
            activeListings: platformProperties.filter(p => p.listingStatus === 'active').length,
            totalLeads: platformLeads.length,
            newLeads: platformLeads.filter(l => l.status === 'new').length,
        };

        const typeDistribution = platformProperties.reduce((acc, prop) => {
            const typeName = prop.type[language];
            acc[typeName] = (acc[typeName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const chartData = {
            labels: Object.keys(typeDistribution),
            datasets: [{
                data: Object.values(typeDistribution),
                backgroundColor: ['#FBBF24', '#F97316', '#D97706', '#B45309'],
                borderWidth: 0,
            }],
        };

        // Get latest platform leads
        const recentLeads = [...platformLeads]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);

        return { stats, chartData, recentLeads };

    }, [properties, leads, language]);

    if (isLoading || !dashboardData) return <div>Loading dashboard...</div>;
    
    const { stats, chartData, recentLeads } = dashboardData;

    return (
        <div className="space-y-8 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {language === 'ar' ? 'لوحة تحكم عقارات المنصة' : 'Platform Real Estate Dashboard'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'متابعة العقارات المدارة بواسطة المنصة وطلبات العملاء المباشرة.' : 'Overview of platform-managed listings and direct leads.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title={language === 'ar' ? 'العقارات النشطة' : 'Active Listings'} 
                    value={stats.activeListings} 
                    icon={BuildingIcon} 
                    linkTo="/admin/platform-properties" 
                />
                <StatCard 
                    title={language === 'ar' ? 'طلبات جديدة' : 'New Leads'} 
                    value={stats.newLeads} 
                    icon={InboxIcon} 
                    linkTo="/dashboard/leads" // Leads for platform props usually go to dashboard view or admin leads filtered
                />
                <StatCard 
                    title={language === 'ar' ? 'إجمالي الطلبات' : 'Total Leads'} 
                    value={stats.totalLeads} 
                    icon={ChartBarIcon} 
                    linkTo="/dashboard/leads" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t_dash.propertiesByType}</h2>
                    <div className="h-64 flex justify-center">
                        <Doughnut 
                            data={chartData} 
                            options={{ 
                                maintainAspectRatio: false, 
                                plugins: { legend: { position: 'right', labels: { color: '#9CA3AF' } } } 
                            }} 
                        />
                    </div>
                </div>

                <RequestList<Lead>
                    title={language === 'ar' ? 'أحدث طلبات العملاء' : 'Recent Leads'}
                    requests={recentLeads}
                    linkTo="/dashboard/leads"
                    itemRenderer={(item) => (
                        <li key={item.id} className="py-3">
                            <Link to={`/dashboard/leads/${item.id}`} className="flex justify-between items-center group">
                                <div>
                                    <p className="font-medium group-hover:text-amber-600">{item.customerName}</p>
                                    <p className="text-sm text-gray-500">{item.serviceTitle}</p>
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

export default RealEstatePlatformHomePage;

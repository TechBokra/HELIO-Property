import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAllProperties } from '../../../services/properties';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { useLanguage } from '../../shared/LanguageContext';
import { BuildingIcon, InboxIcon, UsersIcon } from '../../ui/Icons';
import StatCard from '../../shared/StatCard';
import RequestList from '../../shared/RequestList';
import { isListingActive } from '../../../utils/propertyUtils';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import type { Property } from '../../../types';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const AdminPropertiesDashboard: React.FC = () => {
    const { language, t } = useLanguage();
    const t_dash = t.adminDashboard.propertiesDashboard;
    
    const { data: properties, isLoading: loadingProps } = useQuery({ queryKey: ['allPropertiesAdmin'], queryFn: getAllProperties });
    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });

    const isLoading = loadingProps || loadingPartners;

    const dashboardData = useMemo(() => {
        if (!properties || !partners) return null;

        const activeProperties = properties.filter(isListingActive);
        
        const stats = {
            active: activeProperties.length,
            forSale: activeProperties.filter(p => p.status.en === 'For Sale').length,
            forRent: activeProperties.filter(p => p.status.en === 'For Rent').length,
        };

        const propertiesByType = activeProperties.reduce((acc, prop) => {
            const typeName = prop.type[language];
            acc[typeName] = (acc[typeName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const propertiesByPartner = activeProperties.reduce((acc, prop) => {
            acc[prop.partnerId] = (acc[prop.partnerId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topPartners = Object.entries(propertiesByPartner)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .slice(0, 5)
            .map(([partnerId, count]) => {
                const partner = partners.find(p => p.id === partnerId);
                return { name: partner ? (language === 'ar' ? partner.nameAr : partner.name) : partnerId, count };
            });

        const typeChartData = {
            labels: Object.keys(propertiesByType),
            datasets: [{
                data: Object.values(propertiesByType),
                backgroundColor: ['#FBBF24', '#F97316', '#D97706', '#B45309'],
                borderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                borderWidth: 2,
            }],
        };

        const partnerChartData = {
            labels: topPartners.map(p => p.name),
            datasets: [{
                label: 'Listings',
                data: topPartners.map(p => p.count),
                backgroundColor: 'rgba(245, 158, 11, 0.6)',
                borderColor: 'rgba(245, 158, 11, 1)',
                borderWidth: 1,
            }]
        };

        return { stats, typeChartData, partnerChartData };

    }, [properties, partners, language]);

    const adaptedLatestProperties = useMemo(() => {
        if (!properties) return [];
        
        const adaptedProperties = properties.map(p => ({
            ...p,
            createdAt: p.listingStartDate || '1970-01-01T00:00:00Z', 
        }));

        return adaptedProperties;
            
    }, [properties]);
    
    if (isLoading || !dashboardData) {
        return <div>Loading...</div>;
    }
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_dash.title}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t_dash.subtitle}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title={t_dash.activeProperties} value={dashboardData.stats.active} icon={BuildingIcon} linkTo="/admin/properties/list" />
                <StatCard title={t_dash.propertiesForSale} value={dashboardData.stats.forSale} icon={BuildingIcon} linkTo="/admin/properties/list?status=For+Sale" />
                <StatCard title={t_dash.propertiesForRent} value={dashboardData.stats.forRent} icon={BuildingIcon} linkTo="/admin/properties/list?status=For+Rent" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                 <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t_dash.propertiesByType}</h2>
                    <div className="h-64 flex justify-center">
                        <Doughnut data={dashboardData.typeChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: document.documentElement.classList.contains('dark') ? '#E5E7EB' : '#374151' } } } }} />
                    </div>
                </div>
                 <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t_dash.topPartnersByListings}</h2>
                    <div className="h-64">
                        <Bar data={dashboardData.partnerChartData} options={{ maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }} />
                    </div>
                </div>
            </div>
            
            <RequestList<Property & { createdAt: string }>
                title={t_dash.latestPropertiesAdded}
                requests={adaptedLatestProperties}
                linkTo="/admin/properties/list"
                itemRenderer={(item) => (
                    <li key={item.id} className="py-3">
                        <Link to={`/admin/properties/edit/${item.id}`} className="flex justify-between items-center group">
                            <div>
                                <p className="font-medium group-hover:text-amber-600">{item.title[language]}</p>
                                <p className="text-sm text-gray-500">{item.partnerName}</p>
                            </div>
                            <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString(language)}</p>
                        </Link>
                    </li>
                )}
            />
        </div>
    );
};

export default AdminPropertiesDashboard;
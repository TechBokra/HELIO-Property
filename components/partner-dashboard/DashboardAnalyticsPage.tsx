import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { Language, Lead, Property } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { getPropertiesByPartnerId } from '../../services/properties';
import { getLeadsByPartnerId } from '../../services/leads';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { BuildingIcon, InboxIcon, ChartBarIcon } from '../ui/Icons';
import StatCard from '../shared/StatCard';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DashboardAnalyticsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { language, t } = useLanguage();
    const t_analytics = t.dashboardAnalytics;

    const { data: properties, isLoading: loadingProperties } = useQuery({
        queryKey: [`partner-properties-${currentUser?.id}`],
        queryFn: () => getPropertiesByPartnerId(currentUser!.id),
        enabled: !!currentUser,
    });
    const { data: leads, isLoading: loadingLeads } = useQuery({
        queryKey: [`partner-leads-${currentUser?.id}`],
        queryFn: () => getLeadsByPartnerId(currentUser!.id),
        enabled: !!currentUser,
    });

    const isLoading = loadingProperties || loadingLeads;

    const analyticsData = useMemo(() => {
        if (!properties || !leads) return null;

        const totalListings = properties.length;
        const totalLeads = leads.length;
        const conversionRate = totalListings > 0 ? (totalLeads / totalListings).toFixed(2) : '0.00';

        const leadsByProperty = leads.reduce(
            (acc, lead) => {
                if (lead.propertyId) {
                    acc[lead.propertyId] = (acc[lead.propertyId] || 0) + 1;
                }
                return acc;
            },
            {} as Record<string, number>,
        );

        const topProperties = Object.entries(leadsByProperty)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .slice(0, 5)
            .map(([id, count]) => ({ property: properties.find((p) => p.id === id), count }))
            .filter((item) => !!item.property);

        return {
            totalListings,
            totalLeads,
            conversionRate,
            topProperties,
        };
    }, [properties, leads]);

    if (isLoading) {
        return <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>;
    }

    if (!analyticsData || analyticsData.totalListings === 0) {
        return (
            <div className="text-center py-16">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_analytics.title}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t_analytics.subtitle}</p>
                <p className="mt-8 text-lg text-gray-600 dark:text-gray-300">{t_analytics.noData}</p>
            </div>
        );
    }

    const { totalListings, totalLeads, conversionRate, topProperties } = analyticsData;

    const chartData = {
        labels: topProperties.map((p) => p.property!.title[language].substring(0, 20) + '...'),
        datasets: [
            {
                label: t_analytics.leads,
                data: topProperties.map((p) => p.count),
                backgroundColor: 'rgba(245, 158, 11, 0.6)',
                borderColor: 'rgba(245, 158, 11, 1)',
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280' } },
            y: { ticks: { color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280', stepSize: 1 } },
        },
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_analytics.title}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t_analytics.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title={t_analytics.totalListings}
                    value={totalListings}
                    icon={BuildingIcon}
                    linkTo="/dashboard/properties"
                />
                <StatCard title={t_analytics.totalLeads} value={totalLeads} icon={InboxIcon} linkTo="/dashboard/leads" />
                <StatCard
                    title={t_analytics.conversionRate}
                    value={`${conversionRate} ${t_analytics.leadsPerListing}`}
                    icon={ChartBarIcon}
                    linkTo="#"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t_analytics.topPerforming}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="h-80">
                        {topProperties.length > 0 ? (
                            <Bar data={chartData} options={chartOptions} />
                        ) : (
                            <p className="text-center text-gray-500">{t_analytics.noData}</p>
                        )}
                    </div>
                    <ul className="space-y-3">
                        {topProperties.map(
                            ({ property, count }) =>
                                property && (
                                    <li key={property.id}>
                                        <Link
                                            to={`/properties/${property.id}`}
                                            target="_blank"
                                            className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                        >
                                            <img
                                                src={property.imageUrl}
                                                alt={property.title[language]}
                                                className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                                            />
                                            <div className="flex-grow overflow-hidden">
                                                <p className="font-semibold text-sm truncate text-gray-800 dark:text-gray-200">
                                                    {property.title[language]}
                                                </p>
                                                <p className="text-xs text-gray-500">{property.price[language]}</p>
                                            </div>
                                            <div className="font-bold text-lg text-gray-800 dark:text-gray-200 flex-shrink-0">
                                                {count as number}{' '}
                                                <span className="text-sm font-normal text-gray-500">
                                                    {t_analytics.leads}
                                                </span>
                                            </div>
                                        </Link>
                                    </li>
                                ),
                        )}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardAnalyticsPage;
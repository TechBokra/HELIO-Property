import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllProperties } from '../../services/properties';
import { getAllProjects } from '../../services/projects';
import { BuildingIcon, CubeIcon } from '../ui/Icons';
import StatCard from '../shared/StatCard';
import RequestList from '../shared/RequestList';
import { isListingActive } from '../../utils/propertyUtils';
import { useLanguage } from '../shared/LanguageContext';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { Property } from '../../types';

ChartJS.register(ArcElement, Tooltip, Legend);

const ListingsManagerHomePage: React.FC = () => {
    const { language, t: i18n } = useLanguage();
    const t = i18n.adminDashboard.listingsManagerHome;
    const t_dash = i18n.adminDashboard.propertiesDashboard;

    const { data: properties, isLoading: loadingProps } = useQuery({ queryKey: ['allPropertiesAdmin'], queryFn: getAllProperties });
    const { data: projects, isLoading: loadingProjs } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });

    const isLoading = loadingProps || loadingProjs;

    const dashboardData = useMemo(() => {
        if (!properties) return null;

        const activeProperties = properties.filter(isListingActive);
        
        const propertiesByType = activeProperties.reduce((acc, prop) => {
            const typeName = prop.type[language];
            acc[typeName] = (acc[typeName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const typeChartData = {
            labels: Object.keys(propertiesByType),
            datasets: [{
                data: Object.values(propertiesByType),
                backgroundColor: ['#FBBF24', '#F97316', '#D97706', '#B45309'],
                borderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                borderWidth: 2,
            }],
        };
        
        const latestProperties = [...properties]
            .sort((a, b) => new Date(b.listingStartDate || 0).getTime() - new Date(a.listingStartDate || 0).getTime())
            .slice(0, 5)
            .map(p => ({ ...p, createdAt: p.listingStartDate || '1970-01-01T00:00:00Z' }));

        return {
            activePropertiesCount: activeProperties.length,
            totalProjectsCount: (projects || []).length,
            typeChartData,
            latestProperties
        };
    }, [properties, projects, language]);

    if (isLoading || !dashboardData) return <div>Loading...</div>;
    
    const { activePropertiesCount, totalProjectsCount, typeChartData, latestProperties } = dashboardData;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.title}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t.subtitle}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title={t.activeProperties}
                    value={activePropertiesCount}
                    icon={BuildingIcon}
                    linkTo="/admin/properties/list"
                />
                 <StatCard 
                    title={t.totalProjects}
                    value={totalProjectsCount}
                    icon={CubeIcon}
                    linkTo="/admin/projects"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t_dash.propertiesByType}</h2>
                    <div className="h-64 flex justify-center">
                        <Doughnut 
                            data={typeChartData} 
                            options={{ 
                                maintainAspectRatio: false, 
                                plugins: { 
                                    legend: { 
                                        position: 'right', 
                                        labels: { color: document.documentElement.classList.contains('dark') ? '#E5E7EB' : '#374151' } 
                                    } 
                                } 
                            }} 
                        />
                    </div>
                </div>
                <RequestList<Property & { createdAt: string }>
                    title={t_dash.latestPropertiesAdded}
                    requests={latestProperties}
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
        </div>
    );
};

export default ListingsManagerHomePage;
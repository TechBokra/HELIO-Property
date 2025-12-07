import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllBanners } from '../../services/banners';
import { getContent } from '../../services/content';
import { PhotoIcon, QuoteIcon, CogIcon, ClipboardDocumentListIcon, WrenchScrewdriverIcon } from '../ui/Icons';
import StatCard from '../shared/StatCard';
import { useLanguage } from '../shared/LanguageContext';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ContentManagerHomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_home = t.adminDashboard.home;
    const t_nav = t.adminDashboard.nav;
    const t_content = t.adminDashboard.contentManagerHome;
    const { data: banners, isLoading: loadingBanners } = useQuery({ queryKey: ['banners'], queryFn: getAllBanners });
    const { data: siteContent, isLoading: loadingContent } = useQuery({ queryKey: ['siteContent'], queryFn: getContent });

    const isLoading = loadingBanners || loadingContent;

    const dashboardData = useMemo(() => {
        if (!banners) return null;
        const activeBanners = banners.filter(b => b.status === 'active');
        const locationsCount = activeBanners.reduce((acc, banner) => {
            banner.locations.forEach(loc => {
                const capitalizedLoc = loc.charAt(0).toUpperCase() + loc.slice(1);
                acc[capitalizedLoc] = (acc[capitalizedLoc] || 0) + 1;
            });
            return acc;
        }, {} as Record<string, number>);

        const chartData = {
            labels: Object.keys(locationsCount),
            datasets: [{
                label: 'Active Banners',
                data: Object.values(locationsCount),
                backgroundColor: 'rgba(245, 158, 11, 0.6)',
                borderColor: 'rgba(245, 158, 11, 1)',
                borderWidth: 1,
            }],
        };
        
        return {
            activeBannersCount: activeBanners.length,
            totalQuotesCount: (siteContent?.quotes || []).length,
            chartData
        };
    }, [banners, siteContent]);

    if (isLoading || !dashboardData) return <div>Loading content dashboard...</div>;
    
    const { activeBannersCount, totalQuotesCount, chartData } = dashboardData;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_content.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t_content.subtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard 
                    title={t_home.activeBanners}
                    value={activeBannersCount}
                    icon={PhotoIcon}
                    linkTo="/admin/banners"
                />
                 <StatCard 
                    title={t_home.totalQuotes}
                    value={totalQuotesCount}
                    icon={QuoteIcon}
                    linkTo="/admin/content/quotes"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Active Banners by Location</h3>
                    <div className="h-64">
                         <Bar 
                            data={chartData} 
                            options={{ 
                                maintainAspectRatio: false, 
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                            }} 
                        />
                    </div>
                </div>
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t_content.quickLinks}</h3>
                    <div className="grid grid-cols-2 gap-4">
                         <Link to="/admin/banners" className="text-amber-600 hover:underline font-semibold flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                            <PhotoIcon className="w-5 h-5" /> {t_nav.banners}
                        </Link>
                         <Link to="/admin/content" className="text-amber-600 hover:underline font-semibold flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                            <ClipboardDocumentListIcon className="w-5 h-5" /> {t_nav.siteContent}
                        </Link>
                         <Link to="/admin/properties/filters" className="text-amber-600 hover:underline font-semibold flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                            <CogIcon className="w-5 h-5" /> {t_nav.propertyFilters}
                        </Link>
                         <Link to="/admin/finishing-management/services" className="text-amber-600 hover:underline font-semibold flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                            <WrenchScrewdriverIcon className="w-5 h-5" /> {t_nav.finishingServices}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContentManagerHomePage;
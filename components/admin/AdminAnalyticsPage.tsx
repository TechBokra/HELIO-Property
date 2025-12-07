
import React from 'react';
import { Link } from 'react-router-dom';
import { BuildingIcon, InboxIcon, UsersIcon, ChartBarIcon } from '../ui/Icons';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useAdminAnalytics, TimePeriod } from '../../hooks/useAdminAnalytics';
import AsyncBoundary from '../shared/AsyncBoundary';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <Card className="p-0">
        <CardContent className="p-6">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                </div>
                <div className="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 p-3 rounded-full">
                    {icon}
                </div>
            </div>
        </CardContent>
    </Card>
);

const AnalyticsContent: React.FC<{ timePeriod: TimePeriod, setTimePeriod: (p: TimePeriod) => void }> = ({ timePeriod, setTimePeriod }) => {
    const { language, t } = useLanguage();
    const t_analytics = t.adminAnalytics;
    const { analyticsData } = useAdminAnalytics(); // Hook now handles suspense internally if configured, or parent suspense

    if (!analyticsData) return null;
    
    const { leadsOverTime, requestTypeDistribution } = analyticsData;
    
    const lineChartData = {
        labels: leadsOverTime.labels,
        datasets: [{
            label: t_analytics.newLeads,
            data: leadsOverTime.data,
            borderColor: '#F59E0B',
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            fill: true,
            tension: 0.3,
        }],
    };

    const requestTypeChartData = {
        labels: Object.keys(requestTypeDistribution),
        datasets: [{
            data: Object.values(requestTypeDistribution),
            backgroundColor: ['#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F'],
            hoverOffset: 4,
        }],
    };
    
    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
             x: { ticks: { color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280' } },
             y: { ticks: { color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280' } },
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right' as const, labels: { color: document.documentElement.classList.contains('dark') ? '#E5E7EB' : '#374151' } },
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t_analytics.newLeads} value={analyticsData.newLeads} icon={<InboxIcon className="w-6 h-6" />} />
                <StatCard title={t_analytics.newPartners} value={analyticsData.newPartners} icon={<UsersIcon className="w-6 h-6" />} />
                <StatCard title={t_analytics.newProperties} value={analyticsData.newProperties} icon={<BuildingIcon className="w-6 h-6" />} />
                <StatCard title={t_analytics.conversionRate} value={analyticsData.conversionRate} icon={<ChartBarIcon className="w-6 h-6" />} />
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                         <CardTitle>{t_analytics.leadsOverTime}</CardTitle>
                         <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg gap-1">
                            {(Object.keys(t_analytics) as (keyof typeof t_analytics)[]).filter(k => String(k).startsWith('last') || String(k).startsWith('this')).map(periodKey => {
                                const periodMap: Record<string, TimePeriod> = { last7days: '7d', last30days: '30d', thismonth: 'month', thisyear: 'year' };
                                const key = String(periodKey).replace(/([A-Z])/g, '$1').toLowerCase();
                                const targetPeriod = periodMap[key];
                                return (
                                    <button 
                                        key={key} 
                                        onClick={() => setTimePeriod(targetPeriod)} 
                                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timePeriod === targetPeriod ? 'bg-white dark:bg-gray-700 shadow text-amber-600' : 'text-gray-600 dark:text-gray-400'}`}
                                    >
                                        {t_analytics[periodKey] as string}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="h-80"><Line data={lineChartData} options={commonChartOptions}/></CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card>
                     <CardHeader><CardTitle>{t_analytics.requestTypeDistribution}</CardTitle></CardHeader>
                     <CardContent className="h-80"><Doughnut data={requestTypeChartData} options={doughnutOptions} /></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>{t_analytics.topPerformingPartners}</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {analyticsData.topPartners.map(({ partner, count }) => partner && (
                                <li key={partner.id}>
                                     <Link to={`/admin/partners?edit=${partner.id}&highlight=${partner.id}`} className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <img src={partner.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                                        <div className="flex-grow">
                                            <p className="font-semibold text-sm truncate">{language === 'ar' ? partner.nameAr : partner.name}</p>
                                            <p className="text-xs text-gray-500">{partner.type}</p>
                                        </div>
                                        <div className="font-bold text-gray-800 dark:text-gray-200">{count} {t_analytics.leads}</div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                <CardHeader><CardTitle>{t_analytics.topPerformingProperties}</CardTitle></CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {analyticsData.topProperties.map(({ property, count }) => property && (
                            <li key={property.id}>
                                <Link to={`/admin/properties/edit/${property.id}`} className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <img src={property.imageUrl} alt="" className="w-10 h-10 rounded-md object-cover" />
                                    <div className="flex-grow overflow-hidden">
                                        <p className="font-semibold text-sm truncate">{property.title[language]}</p>
                                        <p className="text-xs text-gray-500">{property.partnerName}</p>
                                    </div>
                                    <div className="font-bold text-gray-800 dark:text-gray-200 flex-shrink-0">{count} {t_analytics.leads}</div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}

const AdminAnalyticsPage: React.FC = () => {
    const { t } = useLanguage();
    const t_analytics = t.adminAnalytics;
    const { timePeriod, setTimePeriod } = useAdminAnalytics();

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_analytics.title}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t_analytics.subtitle}</p>
                </div>
            </div>
            
            <AsyncBoundary>
                <AnalyticsContent timePeriod={timePeriod} setTimePeriod={setTimePeriod} />
            </AsyncBoundary>
        </div>
    );
};

export default AdminAnalyticsPage;

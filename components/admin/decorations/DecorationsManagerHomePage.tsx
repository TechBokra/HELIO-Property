import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Language, Lead, PortfolioItem, DecorationCategory } from '../../../types';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads } from '../../../services/leads';
import { getAllPortfolioItems } from '../../../services/portfolio';
import { getDecorationCategories } from '../../../services/decorations';
import { SparklesIcon, InboxIcon, WrenchScrewdriverIcon, CheckCircleIcon } from '../../ui/Icons';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useLanguage } from '../../shared/LanguageContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const StatCard: React.FC<{ title: string; value: number | string; icon: React.FC<{ className?: string }> }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                <Icon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    </div>
);

const DecorationsDashboardHomePage: React.FC = () => {
    const { language, t: i18n } = useLanguage();
    const t = i18n.adminDashboard.decorationsManagement;
    const t_leads = i18n.dashboard.leadTable;

    const { data: allLeads, isLoading: loadingLeads } = useQuery({ queryKey: ['allLeads'], queryFn: getAllLeads });
    const { data: portfolio, isLoading: loadingPortfolio } = useQuery({ queryKey: ['portfolio'], queryFn: getAllPortfolioItems });
    const { data: decorationCategories, isLoading: loadingCategories } = useQuery({ queryKey: ['decorationCategories'], queryFn: getDecorationCategories });

    const isLoading = loadingLeads || loadingPortfolio || loadingCategories;

    const decorationsData = useMemo(() => {
        if (!allLeads || !portfolio || !decorationCategories) return null;

        const decorationLeads = allLeads.filter(lead => lead.serviceType === 'decorations');
        
        const decorationCategoryNamesEn = (decorationCategories || []).map(c => c.name.en);
        const decorationItems = (portfolio || []).filter(item => 
            decorationCategoryNamesEn.includes(item.category.en) || 
            decorationCategoryNamesEn.includes(item.category.ar)
        );

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const stats = {
            new: decorationLeads.filter(l => l.status === 'new').length,
            inProgress: decorationLeads.filter(l => ['contacted', 'quoted', 'in-progress'].includes(l.status)).length,
            completedThisMonth: decorationLeads.filter(l => l.status === 'completed' && new Date(l.updatedAt) >= firstDayOfMonth).length,
            totalPortfolioItems: decorationItems.length,
        };

        const recentRequests = [...decorationLeads]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5);

        const portfolioByCategory = decorationItems.reduce((acc, item) => {
            const categoryName = item.category[language];
            acc[categoryName] = (acc[categoryName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const openLeadsByCategory = decorationLeads
            .filter(l => ['new', 'contacted', 'quoted', 'in-progress'].includes(l.status))
            .reduce((acc, lead) => {
                const categoryMatch = decorationCategories.find(cat => lead.serviceTitle.includes(cat.name.ar) || lead.serviceTitle.includes(cat.name.en));
                if (categoryMatch) {
                    const categoryName = categoryMatch.name[language];
                    acc[categoryName] = (acc[categoryName] || 0) + 1;
                }
                return acc;
            }, {} as Record<string, number>);

        const chartData = {
            labels: Object.keys(portfolioByCategory),
            datasets: [
                {
                    label: '# of Items',
                    data: Object.values(portfolioByCategory),
                    backgroundColor: ['#FBBF24', '#F97316', '#D97706', '#B45309', '#78350F'],
                    borderColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
                    borderWidth: 2,
                },
            ],
        };

        return { stats, recentRequests, chartData, openLeadsByCategory };
    }, [allLeads, portfolio, decorationCategories, language]);

    if (isLoading || !decorationsData) {
        return <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>;
    }

    const { stats, recentRequests, chartData, openLeadsByCategory } = decorationsData;
    
    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t.newRequests} value={stats.new} icon={InboxIcon} />
                <StatCard title={t.inProgress} value={stats.inProgress} icon={WrenchScrewdriverIcon} />
                <StatCard title={t.completedThisMonth} value={stats.completedThisMonth} icon={CheckCircleIcon} />
                <StatCard title={t.totalPortfolioItems} value={stats.totalPortfolioItems} icon={SparklesIcon} />
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t.recentActivity}</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-gray-500 dark:text-gray-400">
                                <tr>
                                    <th className="py-2">{t_leads.customer}</th>
                                    <th className="py-2">{t_leads.service}</th>
                                    <th className="py-2">{t.lastUpdated}</th>
                                    <th className="py-2">{t_leads.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {recentRequests.map(lead => (
                                    <tr key={lead.id}>
                                        <td className="py-3 font-medium text-gray-800 dark:text-gray-200">{lead.customerName}</td>
                                        <td className="py-3 text-gray-600 dark:text-gray-300 truncate max-w-xs" title={lead.serviceTitle}>{lead.serviceTitle}</td>
                                        <td className="py-3 text-gray-500 dark:text-gray-400">{new Date(lead.updatedAt).toLocaleDateString(language, { day: 'numeric', month: 'short' })}</td>
                                        <td className="py-3">
                                            <Link to={`/admin/decoration-requests/${lead.id}`} className="font-medium text-amber-600 hover:underline">
                                                Manage
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {recentRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-gray-500">{t.noRequests}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t.categoryOverview}</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                         <div>
                            <h3 className="text-center font-semibold text-gray-600 dark:text-gray-300 mb-2">{t.portfolioDistribution}</h3>
                             <div className="h-48 w-48 mx-auto">
                                <Doughnut data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                            </div>
                         </div>
                         <div>
                             <h3 className="text-center font-semibold text-gray-600 dark:text-gray-300 mb-2">{t.leadsByCategory}</h3>
                             <ul className="space-y-2 text-sm">
                                {Object.entries(openLeadsByCategory).map(([category, count]) => (
                                    <li key={category} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{category}</span>
                                        <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">{count as number}</span>
                                    </li>
                                ))}
                                {Object.keys(openLeadsByCategory).length === 0 && <p className="text-center text-xs text-gray-400">No open leads.</p>}
                             </ul>
                         </div>
                     </div>
                </div>
             </div>
        </div>
    );
};

export default DecorationsDashboardHomePage;
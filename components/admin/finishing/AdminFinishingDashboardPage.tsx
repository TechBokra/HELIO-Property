
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads } from '../../../services/leads';
import { InboxIcon, WrenchScrewdriverIcon, CheckCircleIcon, SparklesIcon, ArrowRightIcon } from '../../ui/Icons';
import StatCard from '../../shared/StatCard';
import { useLanguage } from '../../shared/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import RequestList from '../../shared/RequestList';
import { Lead } from '../../../types';
import { StatusBadge } from '../../ui/StatusBadge';

const AdminFinishingDashboardPage: React.FC = () => {
    const { language, t: i18n } = useLanguage();
    const t_dash = i18n.dashboard;
    const t_page = i18n.adminDashboard.finishingManagement;
    
    // Fetch all leads
    const { data: allLeads, isLoading: loadingLeads } = useQuery({ queryKey: ['allLeadsAdmin'], queryFn: getAllLeads });

    const dashboardData = useMemo(() => {
        if (!allLeads) return null;

        // Filter for finishing requests assigned to Platform specifically
        // This includes leads assigned to 'admin-user' OR specific finishing manager role
        const finishingLeads = allLeads.filter(lead => 
            lead.serviceType === 'finishing' && 
            (
                lead.assignedTo === 'admin-user' || 
                lead.partnerId === 'admin-user' || 
                lead.managerId === 'platform-finishing-manager-1' ||
                lead.assignedTo === 'platform-finishing-manager-1'
            )
        );
        
        const stats = {
            new: finishingLeads.filter(l => l.status === 'new').length,
            inProgress: finishingLeads.filter(l => ['contacted', 'quoted', 'in-progress', 'site-visit'].includes(l.status)).length,
            total: finishingLeads.length,
        };
        
        // Get 5 most recent requests
        const recentRequests = [...finishingLeads]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);

        return { stats, recentRequests };
    }, [allLeads]);

    if (loadingLeads || !dashboardData) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
                <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
        );
    }

    const { stats, recentRequests } = dashboardData;

    return (
        <div className="space-y-8 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {t_page.dashboardTitle}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {t_page.dashboardSubtitle}
                </p>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title={i18n.adminDashboard.serviceManagerHome.newRequests} 
                    value={stats.new} 
                    icon={InboxIcon} 
                    linkTo="/admin/platform-finishing/requests" 
                />
                <StatCard 
                    title={i18n.adminDashboard.serviceManagerHome.inProgress} 
                    value={stats.inProgress} 
                    icon={WrenchScrewdriverIcon} 
                    linkTo="/admin/platform-finishing/requests" 
                />
                 <StatCard 
                    title={i18n.adminDashboard.serviceManagerHome.totalRequests} 
                    value={stats.total} 
                    icon={CheckCircleIcon} 
                    linkTo="/admin/platform-finishing/requests" 
                />
                
                {/* Shortcut Card */}
                <Link to="/admin/platform-finishing/services" className="block h-full">
                    <Card className="bg-amber-500 text-white hover:bg-amber-600 transition-colors h-full border-none cursor-pointer">
                        <CardContent className="p-6 flex items-center justify-between h-full">
                            <div>
                                <h3 className="font-bold text-lg">{t_page.servicePackages}</h3>
                                <p className="text-amber-100 text-sm">{t_page.managePackages}</p>
                            </div>
                            <SparklesIcon className="w-8 h-8 text-white/80" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Requests List */}
                <div className="lg:col-span-2">
                    <RequestList<Lead>
                        title={t_page.recentInternalRequests}
                        requests={recentRequests}
                        linkTo="/admin/platform-finishing/requests"
                        itemRenderer={(lead) => (
                            <li key={lead.id} className="py-3">
                                <Link to={`/admin/platform-finishing/requests/${lead.id}`} className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${lead.status === 'new' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                                        <div>
                                            <p className="font-medium group-hover:text-amber-600">{lead.customerName}</p>
                                            <p className="text-sm text-gray-500 truncate w-48 sm:w-auto">{lead.serviceTitle}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <StatusBadge status={lead.status} className="scale-90 origin-right" />
                                        <p className="text-xs text-gray-400 mt-1">{new Date(lead.createdAt).toLocaleDateString(language)}</p>
                                    </div>
                                </Link>
                            </li>
                        )}
                    />
                </div>

                {/* Quick Actions / Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>{t_page.quickTools}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <Link to="/admin/platform-finishing/services" className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-gray-200 dark:border-gray-700 transition-all group">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-md group-hover:bg-blue-200">
                                    <SparklesIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{t_page.editPackages}</p>
                                    <p className="text-xs text-gray-500">{t_page.updatePricing}</p>
                                </div>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminFinishingDashboardPage;

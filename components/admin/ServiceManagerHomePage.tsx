



import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Lead } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads } from '../../services/leads';
import { WrenchScrewdriverIcon, InboxIcon, SparklesIcon } from '../ui/Icons';
import { useLanguage } from '../shared/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import StatCard from '../shared/StatCard';
import RequestList from '../shared/RequestList';

const ServiceManagerHomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const { currentUser } = useAuth();
    const t_home = t.adminDashboard.serviceManagerHome;
    const t_nav = t.adminDashboard.nav;

    const { data: allLeads, isLoading: loadingLeads } = useQuery({ queryKey: ['allLeads'], queryFn: getAllLeads });

    const isLoading = loadingLeads;
    
    const serviceData = useMemo(() => {
        if (!allLeads || !currentUser) return null;

        const finishingLeads = allLeads.filter(lead => lead.serviceType === 'finishing');
        const decorationLeads = allLeads.filter(lead => lead.serviceType === 'decorations');

        const finishingStats = {
            new: finishingLeads.filter(l => l.status === 'new').length,
            inProgress: finishingLeads.filter(l => ['contacted', 'site-visit', 'quoted', 'in-progress'].includes(l.status)).length,
        };
        const decorationStats = {
            new: decorationLeads.filter(l => l.status === 'new').length,
            inProgress: decorationLeads.filter(l => ['contacted', 'site-visit', 'quoted', 'in-progress'].includes(l.status)).length,
        };

        const recentFinishing = [...finishingLeads]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 3);
            
        const recentDecorations = [...decorationLeads]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 3);
        
        return { finishingStats, decorationStats, recentFinishing, recentDecorations };

    }, [allLeads, currentUser]);

    if (isLoading || !serviceData) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                {Array.from({length: 4}).map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>)}
            </div>
        );
    }
    
    const { finishingStats, decorationStats, recentFinishing, recentDecorations } = serviceData;
    
    const renderRequestItem = (lead: Lead) => (
        <li key={lead.id} className="py-3">
            <Link to={`/admin/${lead.serviceType}-requests/${lead.id}`} className="flex justify-between items-center group">
                <div>
                    <p className="font-medium group-hover:text-amber-600">{lead.customerName}</p>
                    <p className="text-sm text-gray-500 truncate max-w-xs" title={lead.serviceTitle}>{lead.serviceTitle}</p>
                </div>
                <p className="text-xs text-gray-400">{new Date(lead.updatedAt).toLocaleDateString(language, { day: 'numeric', month: 'short' })}</p>
            </Link>
        </li>
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_home.title}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t_home.subtitle}</p>
            </div>
            
            <div className="space-y-8 animate-fadeIn">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="w-6 h-6 text-gray-500"/>
                        {t_nav.finishingRequests}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <StatCard title={t_home.newRequests} value={finishingStats.new} icon={InboxIcon} linkTo="/admin/finishing-requests" />
                        <StatCard title={t_home.inProgress} value={finishingStats.inProgress} icon={WrenchScrewdriverIcon} linkTo="/admin/finishing-requests" />
                    </div>
                </div>

                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-gray-500"/>
                        {t_nav.decorationsRequests}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <StatCard title={t_home.newRequests} value={decorationStats.new} icon={InboxIcon} linkTo="/admin/decoration-requests" />
                        <StatCard title={t_home.inProgress} value={decorationStats.inProgress} icon={WrenchScrewdriverIcon} linkTo="/admin/decoration-requests" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <RequestList<Lead>
                        title={t_home.recentFinishing}
                        requests={recentFinishing}
                        linkTo="/admin/finishing-requests"
                        itemRenderer={renderRequestItem}
                    />
                    <RequestList<Lead>
                        title={t_home.recentDecorations}
                        requests={recentDecorations}
                        linkTo="/admin/decoration-requests"
                        itemRenderer={renderRequestItem}
                    />
                </div>
            </div>
        </div>
    );
};

export default ServiceManagerHomePage;
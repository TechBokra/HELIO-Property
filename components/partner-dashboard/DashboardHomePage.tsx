
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Role, Project, Property, Lead, PortfolioItem } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getAllProperties } from '../../services/properties';
import { getAllProjects } from '../../services/projects';
import { getAllLeads } from '../../services/leads';
import { getAllPortfolioItems } from '../../services/portfolio';
import StatCard from '../shared/StatCard';
import { CubeIcon, BuildingIcon, InboxIcon, ClipboardDocumentListIcon, PhotoIcon } from '../ui/Icons';
import { useLanguage } from '../shared/LanguageContext';
import RequestList from '../shared/RequestList';
import ErrorState from '../shared/ErrorState';

const DashboardHomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const { currentUser } = useAuth();
    const t_home = t.dashboardHome;
    
    const { 
        data: allProperties, 
        isLoading: loadingProps, 
        isError: errorProps, 
        refetch: refetchProps 
    } = useQuery({ queryKey: ['allPropertiesAdmin'], queryFn: getAllProperties, enabled: !!currentUser });
    
    const { 
        data: allProjects, 
        isLoading: loadingProjs, 
        isError: errorProjs, 
        refetch: refetchProjs 
    } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects, enabled: !!currentUser });
    
    const { 
        data: allLeads, 
        isLoading: loadingLeads, 
        isError: errorLeads, 
        refetch: refetchLeads 
    } = useQuery({ queryKey: ['allLeadsAdmin'], queryFn: getAllLeads, enabled: !!currentUser });
    
    const { 
        data: allPortfolioItems, 
        isLoading: loadingPortfolio, 
        isError: errorPortfolio, 
        refetch: refetchPortfolio 
    } = useQuery({ queryKey: ['allPortfolioItems'], queryFn: getAllPortfolioItems, enabled: !!currentUser });

    const isLoading = loadingProps || loadingProjs || loadingLeads || loadingPortfolio;
    const isError = errorProps || errorProjs || errorLeads || errorPortfolio;
    
    const refetchAll = () => {
        refetchProps();
        refetchProjs();
        refetchLeads();
        refetchPortfolio();
    };

    const { properties, projects, leads, portfolio } = useMemo(() => {
        if (!currentUser) return { properties: [], projects: [], leads: [], portfolio: [] };
        return {
            properties: (allProperties || []).filter(p => p.partnerId === currentUser.id),
            projects: (allProjects || []).filter(p => p.partnerId === currentUser.id),
            leads: (allLeads || []).filter(l => l.partnerId === currentUser.id),
            portfolio: (allPortfolioItems || []).filter(p => p.partnerId === currentUser.id),
        }
    }, [allProperties, allProjects, allLeads, allPortfolioItems, currentUser]);

    const projectsWithUnitCount = useMemo(() => {
        if (!projects || !properties) return [];
        return projects.map(project => ({
            ...project,
            unitCount: properties.filter(p => p.projectId === project.id).length
        }));
    }, [projects, properties]);
    
    const topPerformingProperties = useMemo(() => {
        if (!leads || !properties) return [];
        const leadCounts = leads.reduce((acc, lead) => {
            if(lead.propertyId) acc[lead.propertyId] = (acc[lead.propertyId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return properties
            .map(p => ({ ...p, leadCount: leadCounts[p.id] || 0 }))
            .filter(p => p.leadCount > 0)
            .sort((a, b) => b.leadCount - a.leadCount)
            .slice(0, 3);
    }, [leads, properties]);


    const stats = useMemo(() => {
        if (isLoading || !currentUser || !('type' in currentUser)) {
            return { items: [], planName: '' };
        }

        const planCategory = ['developer', 'agency', 'finishing'].includes(currentUser.type) ? currentUser.type : 'agency';
        // @ts-ignore
        const planName = t.subscriptionPlans[planCategory]?.[currentUser.subscriptionPlan]?.name || currentUser.subscriptionPlan;
        
        const newLeadsCount = (leads || []).filter(l => l.status === 'new').length;
        const items = [{ title: t_home.newLeads, value: newLeadsCount, icon: InboxIcon, linkTo: "/dashboard/leads" }];

        switch (currentUser.role) {
            case Role.DEVELOPER_PARTNER:
                items.unshift({ title: t_home.totalUnits, value: (properties || []).length, icon: BuildingIcon, linkTo: "/dashboard/projects" });
                items.unshift({ title: t_home.totalProjects, value: (projects || []).length, icon: CubeIcon, linkTo: "/dashboard/projects" });
                break;
            case Role.FINISHING_PARTNER:
                items.unshift({ title: t_home.totalPortfolio, value: (portfolio || []).length, icon: PhotoIcon, linkTo: "/dashboard/portfolio" });
                break;
            case Role.AGENCY_PARTNER:
                items.unshift({ title: t_home.totalProperties, value: (properties || []).length, icon: BuildingIcon, linkTo: "/dashboard/properties" });
                break;
        }
        
        items.push({ title: t_home.currentPlan, value: planName, icon: ClipboardDocumentListIcon, linkTo: "/dashboard/subscription" });
        return { items, planName };

    }, [isLoading, projects, properties, portfolio, leads, currentUser, language, t_home, t.subscriptionPlans]);

    const renderLeadItem = (lead: Lead) => (
         <li key={lead.id} className="py-3">
            <Link to={`/dashboard/leads/${lead.id}`} className="flex items-center justify-between group">
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-amber-500">{lead.customerName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs" title={lead.serviceTitle}>
                        {lead.serviceTitle}
                    </p>
                </div>
                <div className="text-right text-sm text-gray-400">
                    {new Date(lead.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
                </div>
            </Link>
        </li>
    );

    if (isError) {
        return <ErrorState onRetry={refetchAll} />;
    }

    if (isLoading || !currentUser || !('type' in currentUser)) {
        return <div className="text-center p-8">Loading Dashboard...</div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_home.title}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t_home.subtitle}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.items.map(stat => (
                    <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} linkTo={stat.linkTo} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <RequestList<Lead>
                    title={t_home.recentLeads}
                    requests={leads as Lead[]}
                    linkTo="/dashboard/leads"
                    itemRenderer={renderLeadItem}
                />
                 
                {currentUser.role === Role.DEVELOPER_PARTNER && (
                    <RequestList<Project & {unitCount: number, createdAt: string}>
                        title={t_home.projectsOverview}
                        requests={projectsWithUnitCount.map(p => ({...p, createdAt: p.createdAt || new Date().toISOString()}))}
                        linkTo="/dashboard/projects"
                        itemRenderer={(p) => (
                             <li key={p.id} className="py-3">
                                <Link to={`/dashboard/projects/${p.id}`} className="flex items-center justify-between p-2 -m-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-amber-500">{p.name[language]}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{p.unitCount} {t.projectDashboard.units}</p>
                                    </div>
                                    <div className="text-right text-sm font-semibold text-amber-500">
                                        {t.projectDashboard.manageProject}
                                    </div>
                                </Link>
                            </li>
                        )}
                    />
                )}
                 
                {currentUser.role === Role.AGENCY_PARTNER && (
                     <RequestList<Property & { leadCount: number, createdAt: string }>
                        title={t.adminDashboard.home.topPerformingProperties}
                        requests={topPerformingProperties.map(p => ({...p, createdAt: p.listingStartDate || ''}))}
                        linkTo="/dashboard/analytics"
                        itemRenderer={(p) => (
                             <li key={p.id} className="py-3">
                                <Link to={`/properties/${p.id}`} target="_blank" className="flex items-center justify-between p-2 -m-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                                     <div className="flex items-center gap-3 overflow-hidden">
                                        <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0"/>
                                        <div className="overflow-hidden">
                                            <p className="font-semibold text-sm truncate text-gray-800 dark:text-gray-200 group-hover:text-amber-500">{p.title[language]}</p>
                                            <p className="text-xs text-gray-500">{p.price[language]}</p>
                                        </div>
                                    </div>
                                    <div className="font-bold text-gray-800 dark:text-gray-200 flex-shrink-0 ml-4">{p.leadCount} {t.adminAnalytics.leads}</div>
                                </Link>
                            </li>
                        )}
                    />
                )}
                 
                {currentUser.role === Role.FINISHING_PARTNER && (
                     <RequestList<PortfolioItem & {createdAt: string}>
                        title="Recent Portfolio Additions"
                        requests={portfolio.map(p => ({...p, createdAt: new Date().toISOString()}))}
                        linkTo="/dashboard/portfolio"
                        itemRenderer={(item) => (
                            <li key={item.id} className="py-3">
                                <Link to="/dashboard/portfolio" className="flex items-center gap-3 group">
                                    <img src={item.imageUrl} alt={item.alt} className="w-10 h-10 rounded-md object-cover"/>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 group-hover:text-amber-500">{item.title[language]}</p>
                                        <p className="text-xs text-gray-500">{item.category[language]}</p>
                                    </div>
                                </Link>
                            </li>
                        )}
                    />
                )}

            </div>
        </div>
    );
};

export default DashboardHomePage;

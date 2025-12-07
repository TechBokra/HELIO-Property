
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Lead, AdminPartner, Property, AddPropertyRequest, ContactRequest, PartnerRequest, PropertyInquiryRequest, Project, Language } from '../../types';
import { UserPlusIcon, ClipboardDocumentListIcon, InboxIcon, BuildingIcon, UsersIcon, ChartBarIcon, CubeIcon } from '../ui/Icons';
import { isListingActive } from '../../utils/propertyUtils';
import { getAllPartnerRequests } from '../../services/partnerRequests';
import { getAllPropertyRequests } from '../../services/propertyRequests';
import { getAllContactRequests } from '../../services/contactRequests';
import { getAllPartnersForAdmin } from '../../services/partners';
import { getAllProperties } from '../../services/properties';
import { getAllLeads } from '../../services/leads';
import { getAllProjects } from '../../services/projects';
import { useQuery } from '@tanstack/react-query';
import StatCard from '../shared/StatCard';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SuperAdminHomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_home = t.adminDashboard.home;
    const t_analytics = t.adminAnalytics;
    
    const { data: partnerRequests, isLoading: loadingPartnerRequests } = useQuery({ queryKey: ['partnerRequests'], queryFn: getAllPartnerRequests });
    const { data: propertyRequests, isLoading: loadingPropertyRequests } = useQuery({ queryKey: ['propertyRequests'], queryFn: getAllPropertyRequests });
    const { data: contactRequests, isLoading: loadingContactRequests } = useQuery({ queryKey: ['contactRequests'], queryFn: getAllContactRequests });
    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const { data: properties, isLoading: loadingProperties } = useQuery({ queryKey: ['allProperties'], queryFn: getAllProperties });
    const { data: projects, isLoading: loadingProjects } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
    const { data: leads, isLoading: loadingLeads } = useQuery({ queryKey: ['allLeads'], queryFn: getAllLeads });

    const loading = loadingPartnerRequests || loadingPropertyRequests || loadingContactRequests || loadingPartners || loadingProperties || loadingLeads || loadingProjects;

    const memoizedData = useMemo(() => {
        if (loading) return null;

        const activePartnersCount = (partners || []).filter(p => p.status === 'active').length;
        const activePropertiesCount = (properties || []).filter(isListingActive).length;
        const totalProjectsCount = (projects || []).length;
        const totalLeadsCount = (leads || []).length;

        const leadStats = (leads || []).reduce((acc, lead) => {
            if (lead.propertyId) acc.propertyLeads[lead.propertyId] = (acc.propertyLeads[lead.propertyId] || 0) + 1;
            if (lead.partnerId) acc.partnerLeads[lead.partnerId] = (acc.partnerLeads[lead.partnerId] || 0) + 1;
            return acc;
        }, { propertyLeads: {} as Record<string, number>, partnerLeads: {} as Record<string, number> });
        
        const topPartners = Object.entries(leadStats.partnerLeads)
            .sort(([, countA], [, countB]) => Number(countB) - Number(countA)).slice(0, 5)
            .map(([partnerId, count]) => ({ partner: (partners || []).find(p => p.id === partnerId), count }))
            .filter(p => p.partner && p.partner.type !== 'admin');

        const topProperties = Object.entries(leadStats.propertyLeads)
            .sort(([, countA], [, countB]) => Number(countB) - Number(countA)).slice(0, 5)
            .map(([propertyId, count]) => ({ property: (properties || []).find(p => p.id === propertyId), count }))
            .filter(p => p.property);
        

        return {
            activePartnersCount, activePropertiesCount, totalProjectsCount, totalLeadsCount,
            topPartners, topProperties
        };
    }, [loading, partnerRequests, propertyRequests, contactRequests, leads, properties, partners, projects, language]);

    if (loading || !memoizedData) {
        return <div className="animate-pulse h-screen bg-gray-50 dark:bg-gray-800"></div>
    }

    const { 
        activePartnersCount, activePropertiesCount, totalProjectsCount, totalLeadsCount, topPartners, topProperties 
    } = memoizedData;
    
    const commonChartOptions = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
             x: { ticks: { color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280' } },
             y: { ticks: { color: document.documentElement.classList.contains('dark') ? '#9CA3AF' : '#6B7280' } },
        }
    };
    
    const topPartnersChartData = {
        labels: topPartners.map(p => p.partner ? (language === 'ar' ? p.partner.nameAr : p.partner.name) : 'N/A'),
        datasets: [{
            label: t_analytics.leads,
            data: topPartners.map(p => p.count),
            backgroundColor: 'rgba(245, 158, 11, 0.6)',
            borderColor: 'rgba(245, 158, 11, 1)',
            borderWidth: 1,
        }]
    };

    const topPropertiesChartData = {
        labels: topProperties.map(p => p.property ? p.property.title[language] : 'N/A'),
        datasets: [{
            label: t_home.inquiries,
            data: topProperties.map(p => p.count),
            backgroundColor: 'rgba(217, 119, 6, 0.6)',
            borderColor: 'rgba(217, 119, 6, 1)',
            borderWidth: 1,
        }]
    };


    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_home.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t_home.subtitle}</p>
            
             <div className="mb-10">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Key Metrics</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title={t_home.activePartners} value={activePartnersCount} icon={UsersIcon} linkTo="/admin/partners/list" />
                    <StatCard title={t_home.activeProperties} value={activePropertiesCount} icon={BuildingIcon} linkTo="/admin/properties/list" />
                    <StatCard title={t.adminDashboard.listingsManagerHome.totalProjects} value={totalProjectsCount} icon={CubeIcon} linkTo="/admin/projects" />
                    <StatCard title={t_home.totalLeads} value={totalLeadsCount} icon={ChartBarIcon} linkTo="/admin/analytics" /> 
                </div>
            </div>

            <div>
                 <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Performance Analytics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t_home.topPerformingPartners}</h2>
                        <div className="h-80">
                            <Bar data={topPartnersChartData} options={commonChartOptions} />
                        </div>
                    </div>
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t_home.topPerformingProperties}</h2>
                        <div className="h-80">
                            <Bar data={topPropertiesChartData} options={commonChartOptions} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminHomePage;

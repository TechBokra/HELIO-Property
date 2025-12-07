
import React, { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Property, Lead } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { getAllProjects, deleteProject as apiDeleteProject } from '../../services/projects';
import { getPropertiesByPartnerId, deleteProperty as apiDeleteProperty } from '../../services/properties';
import { getLeadsByPartnerId } from '../../services/leads';
import { BuildingIcon, ChartBarIcon, InboxIcon } from '../ui/Icons';
import { useAuth } from '../auth/AuthContext';
import UpgradePlanModal from '../shared/UpgradePlanModal';
import StatCard from '../shared/StatCard';
import { useSubscriptionUsage } from '../../hooks/useSubscriptionUsage';
import { useLanguage } from '../shared/LanguageContext';
import ConfirmationModal from '../shared/ConfirmationModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';

const DashboardProjectDetailsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { language, t } = useLanguage();
    const t_proj = t.projectDashboard;
    const t_prop_table = t.dashboard.propertyTable;
    const t_analytics = t.dashboard.projectAnalytics;

    const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
    const { data: partnerProperties, isLoading: loadingProperties, refetch: refetchProperties } = useQuery({
        queryKey: [`partner-properties-${currentUser?.id}`],
        queryFn: () => getPropertiesByPartnerId(currentUser!.id),
        enabled: !!currentUser,
    });
    const { data: leads, isLoading: loadingLeads, refetch: refetchLeads } = useQuery({ queryKey: [`leads-${currentUser?.id}`], queryFn: () => getLeadsByPartnerId(currentUser!.id), enabled: !!currentUser });
    
    const { isLimitReached: isUnitsLimitReached } = useSubscriptionUsage('units');
    
    const [activeTab, setActiveTab] = useState('units');
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [modalState, setModalState] = useState<{ type: 'deleteProject' | 'deleteProperty'; id: string } | null>(null);


    const project = useMemo(() => (projects || []).find(p => p.id === projectId), [projects, projectId]);
    const projectProperties = useMemo(() => (partnerProperties || []).filter(p => p.projectId === projectId), [partnerProperties, projectId]);

    const handleAddUnitClick = () => {
        if (!project) return;
        if (isUnitsLimitReached) {
            setIsUpgradeModalOpen(true);
        } else {
            navigate(`/dashboard/properties/new?projectId=${project.id}`);
        }
    };
    
    const refetchAll = useCallback(() => {
        refetchProjects();
        refetchProperties();
        refetchLeads();
    }, [refetchProjects, refetchProperties, refetchLeads]);


    const handleDeleteProject = async () => {
        if (project && modalState?.type === 'deleteProject') {
            const propertyDeletions = projectProperties.map(p => apiDeleteProperty(p.id));
            await Promise.all(propertyDeletions);
            await apiDeleteProject(project.id);
            refetchAll();
            setModalState(null);
            navigate('/dashboard/projects');
        }
    };
    
    const handleDeleteProperty = async () => {
        if (modalState?.type === 'deleteProperty') {
            await apiDeleteProperty(modalState.id);
            refetchProperties();
            setModalState(null);
        }
    };
    
    // Analytics Data Memoization
    const projectAnalytics = useMemo(() => {
        if (!leads || !projectProperties) return { totalLeads: 0, topUnits: [] };
        
        const propertyIdMap = new Map<string, string>(); // Map title -> propertyId
        projectProperties.forEach(p => {
            propertyIdMap.set(p.title.ar, p.id);
            propertyIdMap.set(p.title.en, p.id);
        });

        const projectLeads = leads.filter(lead => {
            const titleMatch = lead.serviceTitle.match(/"([^"]+)"/);
            if(titleMatch) {
                const propertyId = propertyIdMap.get(titleMatch[1]);
                return !!propertyId;
            }
            return false;
        });

        const leadCounts: Record<string, number> = {};
        projectLeads.forEach(lead => {
             const titleMatch = lead.serviceTitle.match(/"([^"]+)"/);
             if(titleMatch) {
                const propertyId = propertyIdMap.get(titleMatch[1]);
                if(propertyId) {
                    leadCounts[propertyId] = (leadCounts[propertyId] || 0) + 1;
                }
             }
        });

        const topUnits = Object.entries(leadCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([propertyId, count]) => ({
                property: projectProperties.find(p => p.id === propertyId),
                count,
            }))
            .filter(item => item.property);

        return { totalLeads: projectLeads.length, topUnits };

    }, [leads, projectProperties]);


    const loading = loadingProjects || loadingProperties || loadingLeads;

    if (loading) {
        return <div className="text-center p-8">Loading project details...</div>;
    }

    if (!project) {
        return <div className="text-center p-8">Project not found.</div>;
    }

    return (
        <div>
            {isUpgradeModalOpen && <UpgradePlanModal onClose={() => setIsUpgradeModalOpen(false)} />}
            {modalState && (
                <ConfirmationModal
                    isOpen={!!modalState}
                    onClose={() => setModalState(null)}
                    onConfirm={modalState.type === 'deleteProject' ? handleDeleteProject : handleDeleteProperty}
                    title={modalState.type === 'deleteProject' ? 'Delete Project' : 'Delete Property'}
                    message={modalState.type === 'deleteProject' ? t_proj.confirmDelete : t_prop_table.confirmDelete}
                    confirmText="Delete"
                />
            )}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
                <div className="flex flex-col sm:flex-row gap-6">
                    <img src={project.imageUrl} alt={project.name[language]} className="w-full sm:w-48 h-48 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-grow">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.name[language]}</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">{project.description[language]}</p>
                        <div className="mt-4 flex items-center gap-4 text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-2"><BuildingIcon className="w-5 h-5" /> {projectProperties.length} {t_proj.units}</span>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col gap-2">
                        <Link to={`/dashboard/projects/edit/${project.id}`} className="text-center bg-amber-500 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors">{t_proj.editProjectButton}</Link>
                        <button onClick={() => setModalState({ type: 'deleteProject', id: project.id })} className="text-center bg-red-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">{t_proj.deleteProjectButton}</button>
                    </div>
                </div>
            </div>

            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab('units')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'units' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {t_proj.units} ({projectProperties.length})
                    </button>
                     <button onClick={() => setActiveTab('analytics')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'analytics' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {language === 'ar' ? 'التحليلات' : 'Analytics'}
                    </button>
                </nav>
            </div>

            {activeTab === 'units' && (
                <div className="animate-fadeIn">
                    <div className="flex justify-end mb-4">
                        <button onClick={handleAddUnitClick} className="bg-green-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                            {t_proj.addUnit}
                        </button>
                    </div>
                     <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t_prop_table.image}</TableHead>
                                    <TableHead>{t_prop_table.title}</TableHead>
                                    <TableHead>{t_prop_table.status}</TableHead>
                                    <TableHead>{t_prop_table.price}</TableHead>
                                    <TableHead>{t_prop_table.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projectProperties.length > 0 ? projectProperties.map(prop => (
                                     <TableRow key={prop.id}>
                                        <TableCell>
                                            <img src={prop.imageUrl} alt={prop.title[language]} className="w-16 h-16 object-cover rounded-md" />
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {prop.title[language]}
                                        </TableCell>
                                        <TableCell>{prop.status[language]}</TableCell>
                                        <TableCell>{prop.price[language]}</TableCell>
                                        <TableCell className="space-x-2 whitespace-nowrap">
                                            <Link to={`/dashboard/properties/edit/${prop.id}`} className="font-medium text-amber-600 dark:text-amber-500 hover:underline">{t_prop_table.edit}</Link>
                                            <button onClick={() => setModalState({ type: 'deleteProperty', id: prop.id })} className="font-medium text-red-600 dark:text-red-500 hover:underline">{t_prop_table.delete}</button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center p-8">{t_prop_table.noProperties}</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
            {activeTab === 'analytics' && (
                <div className="animate-fadeIn space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatCard title={t.dashboardHome.totalUnits} value={projectProperties.length} icon={BuildingIcon} linkTo="#"/>
                        <StatCard title={t_analytics.totalLeads} value={projectAnalytics.totalLeads} icon={InboxIcon} linkTo="#"/>
                     </div>
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t_analytics.topPerformingUnits}</h3>
                        {projectAnalytics.topUnits.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {projectAnalytics.topUnits.map(({ property, count }) => (
                                    property && (
                                        <li key={property.id}>
                                            <Link to={`/properties/${property.id}`} target="_blank" className="flex items-center justify-between p-2 -m-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <img src={property.imageUrl} alt={property.title[language]} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                                                    <div className="overflow-hidden">
                                                        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{property.title[language]}</p>
                                                        <p className="text-sm text-gray-500">{property.price[language]}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-4">
                                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                                                    <p className="text-sm text-gray-500">{t_analytics.leadsCount}</p>
                                                </div>
                                            </Link>
                                        </li>
                                    )
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-8">{language === 'ar' ? 'لا توجد بيانات كافية لعرض الوحدات الأعلى أداءً.' : 'Not enough data to show top performing units.'}</p>
                        )}
                     </div>
                </div>
            )}
        </div>
    );
};

export default DashboardProjectDetailsPage;

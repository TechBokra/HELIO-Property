
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Project } from '../../types';
import { Role } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { BuildingIcon } from '../ui/Icons';
import { useQuery } from '@tanstack/react-query';
import { getProperties } from '../../services/properties';
// FIX: Corrected import path for UpgradePlanModal from root 'components' to 'shared'.
import UpgradePlanModal from '../shared/UpgradePlanModal';
import { useSubscriptionUsage } from '../../hooks/useSubscriptionUsage';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';
import ErrorState from '../shared/ErrorState';
import ProjectCardSkeleton from '../shared/ProjectCardSkeleton';

const DashboardProjectsPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const t_proj = t.projectDashboard;

    const { 
        data: partnerProjects, 
        isLoading: isLoadingProjects,
        isError: isErrorProjects, 
        isLimitReached,
        refetch: refetchProjects 
    } = useSubscriptionUsage('projects');

    const { data: properties, isLoading: isLoadingProperties, isError: isErrorProperties, refetch: refetchProperties } = useQuery({
        queryKey: ['all-dashboard-properties'],
        queryFn: getProperties,
        enabled: !!currentUser && currentUser.role === Role.DEVELOPER_PARTNER,
    });
    
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const loading = isLoadingProjects || isLoadingProperties;
    const isError = isErrorProjects || isErrorProperties;

    const refetchAll = useCallback(() => {
        refetchProjects();
        refetchProperties();
    }, [refetchProjects, refetchProperties]);

    if (currentUser?.role !== Role.DEVELOPER_PARTNER) {
        return null;
    }

    if (isError) {
        return <ErrorState onRetry={refetchAll} />;
    }

    const handleAddProjectClick = () => {
        if (isLimitReached) {
            setIsUpgradeModalOpen(true);
        } else {
            navigate('/dashboard/projects/new');
        }
    };

    return (
        <div>
            {isUpgradeModalOpen && <UpgradePlanModal onClose={() => setIsUpgradeModalOpen(false)} />}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t_proj.title}</h1>
                <button 
                    onClick={handleAddProjectClick}
                    className="bg-amber-500 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-amber-600 transition-colors"
                >
                    {t_proj.addProject}
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
                </div>
            ) : partnerProjects && partnerProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(partnerProjects as Project[]).map(project => {
                        const projectPropertiesCount = (properties || []).filter(p => p.projectId === project.id).length;
                        return (
                            <Link 
                                to={`/dashboard/projects/${project.id}`} 
                                key={project.id} 
                                className="block transform hover:-translate-y-1 transition-transform duration-300 group"
                            >
                                <Card className="overflow-hidden p-0 h-full flex flex-col">
                                    <div className="relative">
                                        <img src={project.imageUrl} alt={project.name[language]} className="w-full h-48 object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 p-4">
                                            <h2 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">{project.name[language]}</h2>
                                        </div>
                                    </div>
                                    <CardContent className="p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            <BuildingIcon className="w-5 h-5" />
                                            <span>{projectPropertiesCount} {t_proj.units}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-500 group-hover:underline">
                                            {t_proj.manageProject}
                                        </span>
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-xl text-gray-500 dark:text-gray-400">{t_proj.noProjects}</p>
                </div>
            )}
        </div>
    );
};

export default DashboardProjectsPage;



import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Language, Project, Partner } from '../../types';
import { BuildingIcon, GridIcon, ListIcon } from '../ui/Icons';
import SEO from '../shared/SEO';
import ProjectCardSkeleton from '../shared/ProjectCardSkeleton';
import ProjectListItem from '../shared/ProjectListItem';
import ProjectListItemSkeleton from '../shared/ProjectListItemSkeleton';
import { useQuery } from '@tanstack/react-query';
import { getAllProjects } from '../../services/projects';
import { getAllPartnersForAdmin } from '../../services/partners';
import { getAllProperties } from '../../services/properties';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';
import { useSiteContent } from '../../hooks/useSiteContent';

interface ProjectCardProps {
    project: Project; 
    developer?: Partner; 
    unitsCount: number;
}

const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project, developer, unitsCount }) => {
    const { language, t } = useLanguage();
    const unitsText = unitsCount === 1 ? t.projectsPage.unitsAvailable : t.projectsPage.unitsAvailablePlural;
    
    return (
        <Link to={`/projects/${project.id}`} className="block group h-full">
            <Card className="transform hover:-translate-y-2 transition-transform duration-300 h-full flex flex-col overflow-hidden p-0 card-glow">
                <div className="relative">
                    <picture>
                        <source
                            type="image/webp"
                            srcSet={`${project.imageUrl_small}&fm=webp 480w, ${project.imageUrl_medium}&fm=webp 800w, ${project.imageUrl_large || project.imageUrl}&fm=webp 1200w`}
                            sizes="(max-width: 640px) 90vw, 100vw"
                        />
                        <img 
                            src={project.imageUrl}
                            srcSet={`${project.imageUrl_small} 480w, ${project.imageUrl_medium} 800w, ${project.imageUrl_large || project.imageUrl} 1200w`}
                            sizes="(max-width: 640px) 90vw, 100vw"
                            alt={project.name[language]}
                            className="w-full h-64 object-cover disable-image-interaction"
                            onContextMenu={(e) => e.preventDefault()}
                            loading="lazy"
                        />
                    </picture>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6">
                        <h3 className="text-white text-2xl font-bold">{project.name[language]}</h3>
                        {developer && (
                            <p className="text-amber-300 text-sm">{t.propertyCard.by} {developer.name}</p>
                        )}
                    </div>
                </div>
                <CardContent className="p-6 flex flex-col flex-grow">
                    <p className="text-gray-600 text-sm flex-grow mb-4 line-clamp-3">{project.description[language]}</p>
                    <div className="border-t border-gray-200 pt-4 mt-auto flex justify-between items-center text-gray-500">
                        <div className="flex items-center gap-2">
                           <BuildingIcon className="w-5 h-5" />
                           <span>{unitsCount} {unitsText}</span>
                        </div>
                        <span className="font-semibold text-amber-500 group-hover:underline">
                            {t.propertyCard.viewProject}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
});

const ProjectsPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  
  const { data: siteContent, isLoading: isLoadingContent } = useSiteContent();
  const { data: projects, isLoading: isLoadingProjs } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
  const { data: partners, isLoading: isLoadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
  const { data: properties, isLoading: isLoadingProps } = useQuery({ queryKey: ['allProperties'], queryFn: getAllProperties });
  
  const isLoading = isLoadingProjs || isLoadingPartners || isLoadingProps || isLoadingContent;
  
  // Use dynamic content if available, fallback to translation file
  const content = siteContent?.projectsPage?.[language] || t.projectsPage;
  
  const projectsWithDetails = useMemo(() => {
    if (!projects || !partners || !properties) return [];
    return projects.map(project => {
        const developer = (partners || []).find(p => p.id === project.partnerId);
        const unitsCount = (properties || []).filter(p => p.projectId === project.id).length;
        return { project, developer, unitsCount };
    }).filter(item => item.developer?.status === 'active');
  }, [projects, partners, properties]);

  return (
    <div className="bg-gray-50 py-20">
      <SEO 
        title={`${t.nav.projects} | ONLY HELIO`}
        description={content.subtitle}
      />
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{content.title}</h1>
          <p className="text-lg text-gray-500 mt-4 max-w-3xl mx-auto">{content.subtitle}</p>
        </div>
        
        <div className="flex justify-end items-center mb-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-200">
                <button
                    onClick={() => setView('grid')}
                    className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-white text-amber-500 shadow' : 'text-gray-500 hover:text-amber-500'}`}
                    aria-label="Grid View"
                >
                    <GridIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setView('list')}
                    className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-white text-amber-500 shadow' : 'text-gray-500 hover:text-amber-500'}`}
                    aria-label="List View"
                >
                    <ListIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        {isLoading ? (
            <div className="animate-fadeIn max-w-7xl mx-auto">
                {view === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array.from({ length: 3 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => <ProjectListItemSkeleton key={i} />)}
                    </div>
                )}
            </div>
        ) : (
            <div className="animate-fadeIn max-w-7xl mx-auto">
                {view === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {projectsWithDetails.map(({ project, developer, unitsCount }) => (
                            <ProjectCard 
                                key={project.id}
                                project={project}
                                developer={developer as Partner}
                                unitsCount={unitsCount}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {projectsWithDetails.map(({ project, developer, unitsCount }) => (
                            <ProjectListItem
                                key={project.id}
                                project={project}
                                developer={developer as Partner}
                                unitsCount={unitsCount}
                            />
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Language, Project, Partner, Property } from '../../types';
import { BuildingIcon, GridIcon, ListIcon } from '../ui/Icons';
import SEO from '../shared/SEO';
import ProjectCardSkeleton from '../shared/ProjectCardSkeleton';
import ProjectListItem from '../shared/ProjectListItem';
import ProjectListItemSkeleton from '../shared/ProjectListItemSkeleton';
import { useQuery } from '@tanstack/react-query';
import { getPublicProjects, filterProjectsByCity } from '../../services/projects';
import { getPublicPartners } from '../../services/partners';
import { getProperties } from '../../services/properties';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';
import { useSiteContent } from '../../hooks/useSiteContent';
import { getResponsiveImageSources } from '../../utils/imageUtils';
import { useCityStore } from '../../store/useCityStore';
import { isPropertyPubliclyVisible } from '../../utils/propertyUtils';
import { getEffectivePropertySource, propertyQueryKeys } from '../../utils/propertyQueryKeys';
import ErrorState from '../shared/ErrorState';
import { useIncrementalList } from '../../hooks/useIncrementalList';
import LoadMore from '../shared/LoadMore';

interface ProjectCardProps {
    project: Project; 
    developer?: Partner; 
    unitsCount: number;
}

const ProjectCard: React.FC<ProjectCardProps> = React.memo(({ project, developer, unitsCount }) => {
    const { language, t } = useLanguage();
    const unitsText = unitsCount === 1 ? t.projectsPage.unitsAvailable : t.projectsPage.unitsAvailablePlural;
    
    const responsiveImage = useMemo(() => {
        return getResponsiveImageSources(project.imageUrl || project.imageUrl_large || project.imageUrl_medium || project.imageUrl_small);
    }, [project.imageUrl, project.imageUrl_large, project.imageUrl_medium, project.imageUrl_small]);

    return (
        <Link to={`/projects/${project.id}`} className="block group h-full">
            <Card className="transform hover:-translate-y-2 transition-transform duration-300 h-full flex flex-col overflow-hidden p-0 card-glow">
                <div className="relative">
                    <picture>
                        {responsiveImage.srcSetWebp && (
                            <source
                                type="image/webp"
                                srcSet={responsiveImage.srcSetWebp}
                                sizes="(max-width: 640px) 90vw, 100vw"
                            />
                        )}
                        <img 
                            src={responsiveImage.src}
                            srcSet={responsiveImage.srcSet}
                            sizes="(max-width: 640px) 90vw, 100vw"
                            alt={project.name?.[language] || project.name?.en || project.name?.ar || ''}
                            className="w-full h-64 object-cover disable-image-interaction"
                            onContextMenu={(e) => e.preventDefault()}
                            loading="lazy"
                            decoding="async"
                        />
                    </picture>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6">
                        <h3 className="text-white text-2xl font-bold">{project.name?.[language] || project.name?.en || project.name?.ar || ''}</h3>
                        {developer && (
                            <p className="text-amber-300 text-sm">
                                {t?.propertyCard?.by || (language === 'ar' ? 'بواسطة' : 'By')}{' '}
                                {language === 'ar' && (developer as any).nameAr ? (developer as any).nameAr : developer.name}
                            </p>
                        )}
                    </div>
                </div>
                <CardContent className="p-6 flex flex-col flex-grow">
                    <p className="text-gray-600 text-sm flex-grow mb-4 line-clamp-3">
                        {project.description?.[language] || project.description?.en || project.description?.ar || ''}
                    </p>
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
  const activeCityId = useCityStore((s) => s.activeCityId);
  const activeCity = useCityStore((s) => s.getActiveCity());

  const { data: siteContent } = useSiteContent();
  const {
    data: projects,
    isLoading: isLoadingProjs,
    isError: isProjectsError,
    refetch: refetchProjects
  } = useQuery<Project[]>({
    queryKey: ['publicProjects', activeCityId],
    queryFn: () => getPublicProjects(activeCityId),
    staleTime: 1000 * 60 * 5
  });
  const { data: partners } = useQuery<Partner[]>({
    queryKey: ['publicPartners'],
    queryFn: () => getPublicPartners(),
    staleTime: 1000 * 60 * 5
  });
  const propertySource = getEffectivePropertySource();
  const { data: properties } = useQuery<Property[]>({
    queryKey: propertyQueryKeys.publicList(activeCityId, propertySource),
    queryFn: () => getProperties(activeCityId),
    staleTime: 1000 * 60 * 5
  });

  const isLoading = isLoadingProjs;

  const content = siteContent?.projectsPage?.[language] || t.projectsPage;

  const projectsList = useMemo(
    () => (Array.isArray(projects) ? filterProjectsByCity(projects, activeCityId) : []),
    [projects, activeCityId]
  );

  const projectsWithDetails = useMemo(() => {
    const publicProperties = (properties || []).filter((p) => isPropertyPubliclyVisible(p, { includeSold: true }));
    return projectsList.map(project => {
      const developer = (partners || []).find(p => p.id === project.partnerId);
      const unitsCount = publicProperties.filter(p => p.projectId === project.id).length;
      return { project, developer, unitsCount };
    });
  }, [projectsList, partners, properties]);
  const projectBatch = useIncrementalList(projectsWithDetails, 9, view);

  const brandLabel = activeCity?.brandTitle?.[language] || 'ONLY HELIO';

  return (
    <div className="bg-gray-50 py-20">
      <SEO 
        title={`${t.nav.projects} | ${brandLabel}`}
        description={content.subtitle}
      />
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            {activeCityId !== 'heliopolis'
              ? (language === 'ar' ? `مشروعات وكمبوندات ${activeCity.name.ar}` : `${activeCity.name.en} Compounds & Projects`)
              : content.title}
          </h1>
          <p className="text-lg text-gray-500 mt-4 max-w-3xl mx-auto">
            {activeCityId !== 'heliopolis' ? activeCity.tagline[language] : content.subtitle}
          </p>
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
        ) : isProjectsError ? (
            <ErrorState
                title={language === 'ar' ? 'تعذر تحميل المشروعات حالياً' : 'Failed to load projects'}
                message={language === 'ar' ? 'يرجى التحقق من اتصالك بقاعدة البيانات وإعادة المحاولة.' : 'Please check your database connection and try again.'}
                retryLabel={language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                onRetry={() => refetchProjects()}
                className="max-w-lg mx-auto py-12"
            />
        ) : projectsWithDetails.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-gray-500">
                {language === 'ar' ? 'لا توجد مشروعات متاحة حالياً.' : 'No projects available at the moment.'}
            </div>
        ) : (
            <div className="animate-fadeIn max-w-7xl mx-auto">
                {view === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {projectBatch.visibleItems.map(({ project, developer, unitsCount }) => (
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
                        {projectBatch.visibleItems.map(({ project, developer, unitsCount }) => (
                            <ProjectListItem
                                key={project.id}
                                project={project}
                                developer={developer as Partner}
                                unitsCount={unitsCount}
                            />
                        ))}
                    </div>
                )}
                <LoadMore hasMore={projectBatch.hasMore} onLoadMore={projectBatch.showMore} sentinelRef={projectBatch.sentinelRef} shown={projectBatch.shown} total={projectBatch.total} />
            </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BedIcon, BathIcon, AreaIcon, CheckBadgeIcon, ShareIcon, HeartIcon, HeartIconSolid, FloorIcon, CalendarIcon, WalletIcon, BuildingIcon, WrenchScrewdriverIcon, CompoundIcon, BanknotesIcon, SwimmingPoolIcon, ParkIcon, ShieldCheckIcon, ShoppingCartIcon, BuildingStorefrontIcon, ElevatorIcon, WhatsAppIcon } from '../ui/Icons';
import type { Property, Language } from '../../types';
import { useFavorites } from '../shared/FavoritesContext';
import Lightbox from '../shared/Lightbox';
import { isCommercial } from '../../utils/propertyUtils';
import BannerDisplay from '../shared/BannerDisplay';
import { getPropertiesByProjectId } from '../../services/properties';
import { useQuery } from '@tanstack/react-query';
import DetailItem from '../shared/DetailItem';
import ContactOptionsModal from '../shared/ContactOptionsModal';
import { useToast } from '../shared/ToastContext';
import SEO from '../shared/SEO';
import DetailSection from '../shared/DetailSection';
import { getProjectById } from '../../services/projects';
import { getAllAmenities } from '../../services/filters';
import { getPartnerById } from '../../services/partners';
import { useLanguage } from '../shared/LanguageContext';
import PropertyCard from '../properties/PropertyCard';
import ProjectDetailsSkeleton from '../shared/ProjectDetailsSkeleton';
import { Button } from '../ui/Button';


const iconMap: { [key: string]: React.FC<{ className?: string }> } = {
    SwimmingPoolIcon,
    ParkIcon,
    ShieldCheckIcon,
    ShoppingCartIcon,
    BuildingStorefrontIcon,
    ElevatorIcon
};


const ProjectDetailsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { language, t } = useLanguage();
    const t_page = t?.propertyDetailsPage || {};
    const { showToast } = useToast();

    const fetchProject = useCallback(() => getProjectById(projectId!), [projectId]);
    const { data: project, isLoading: isLoadingProjs } = useQuery({ queryKey: [`project-${projectId}`], queryFn: fetchProject, enabled: !!projectId });
    
    const { data: projectProperties, isLoading: isLoadingProps } = useQuery({
        queryKey: [`project-properties-${projectId}`],
        queryFn: () => getPropertiesByProjectId(projectId!),
        enabled: !!projectId,
    });

    const { data: developer, isLoading: isLoadingPartner } = useQuery({
        queryKey: [`partner-${project?.partnerId}`],
        queryFn: () => getPartnerById(project!.partnerId),
        enabled: !!project?.partnerId,
    });

    const isLoading = isLoadingProjs || isLoadingProps || isLoadingPartner;

    const [activeType, setActiveType] = useState('all');
    const [shareModalOpen, setShareModalOpen] = useState(false);

    const unitTypes: string[] = useMemo(() => {
        if (!projectProperties) return [];
        const types = new Set(projectProperties.map(p => p.type?.en).filter(Boolean));
        return ['all', ...Array.from(types)];
    }, [projectProperties]);
    
    const filteredProperties = useMemo(() => {
        if (!projectProperties) return [];
        if (activeType === 'all') return projectProperties;
        return projectProperties.filter(p => p.type?.en === activeType);
    }, [projectProperties, activeType]);

    const projectName = project?.name?.[language] || project?.name?.en || project?.name?.ar || (typeof project?.name === 'string' ? project.name : '');
    const projectDesc = project?.description?.[language] || project?.description?.en || project?.description?.ar || (typeof project?.description === 'string' ? project.description : '');

    const handleWhatsAppShare = () => {
        if (!project) return;
        const urlToShare = window.location.href;
        const text = encodeURIComponent(`${projectName}\n${urlToShare}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        setShareModalOpen(false);
    };

    const handleCopyLink = async () => {
        if (!project) return;
        const urlToShare = window.location.href;
        try {
            await navigator.clipboard.writeText(urlToShare);
            showToast(t?.sharing?.linkCopied || (language === 'ar' ? 'تم نسخ الرابط' : 'Link copied'), 'success');
            setShareModalOpen(false);
        } catch (err) {
            showToast(t?.sharing?.shareFailed || (language === 'ar' ? 'فشل نسخ الرابط' : 'Failed to copy link'), 'error');
        }
    };

    if (isLoading) {
        return <ProjectDetailsSkeleton />;
    }

    if (!project) {
        return (
            <div className="text-center py-20 container mx-auto">
                <SEO title="Project Not Found | ONLY HELIO" description="Sorry, we couldn't find the project you're looking for." />
                <h1 className="text-4xl font-bold">Project Not Found</h1>
                <p className="mt-4 text-gray-500">Sorry, we couldn't find the project you're looking for.</p>
                <Link to="/" className="mt-8 inline-block bg-amber-500 text-gray-900 font-semibold px-6 py-3 rounded-lg">Back to Home</Link>
            </div>
        );
    }

    const pageTitle = `${projectName || 'Project'} | ONLY HELIO`;
    const pageDescription = (projectDesc || '').substring(0, 160);
    const pageUrl = window.location.href;
    const imageUrl = project.imageUrl_large || project.imageUrl;
    
    return (
        <>
        <SEO title={pageTitle} description={pageDescription} url={pageUrl} imageUrl={imageUrl} />
        {shareModalOpen && (
            <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fadeIn" onClick={() => setShareModalOpen(false)}>
                <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                        {t?.sharing?.shareProject || (language === 'ar' ? 'مشاركة المشروع' : 'Share Project')}
                    </h3>
                    <div className="space-y-3">
                         <Button onClick={handleCopyLink} variant="outline" className="w-full justify-center">
                            {t?.sharing?.copyLink || (language === 'ar' ? 'نسخ الرابط' : 'Copy Link')}
                        </Button>
                        <Button onClick={handleWhatsAppShare} className="w-full justify-center bg-green-500 hover:bg-green-600 text-white">
                            <WhatsAppIcon className="w-5 h-5 mr-2" />
                            {t?.sharing?.shareOnWhatsApp || (language === 'ar' ? 'مشاركة عبر واتساب' : 'Share via WhatsApp')}
                        </Button>
                    </div>
                </div>
            </div>
        )}
        <div className="bg-gray-50">
            {/* Project Hero */}
            <section className="relative h-[60vh] bg-cover bg-center" style={{ backgroundImage: `url(${project.imageUrl})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                <div className="relative z-10 container mx-auto px-6 h-full flex flex-col justify-end pb-16 text-white">
                    <div className="flex justify-between items-end gap-4">
                        <div className="flex-grow">
                            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">{projectName}</h1>
                            {developer && (
                                <p className="mt-2 text-xl font-medium">
                                    {t?.propertyCard?.by || (language === 'ar' ? 'بواسطة' : 'By')}{' '}
                                    <Link to={`/partners/${developer.id}`} className="text-amber-300 hover:underline">
                                        {language === 'ar' && (developer as any).nameAr ? (developer as any).nameAr : developer.name}
                                    </Link>
                                </p>
                            )}
                        </div>
                        <div className="flex-shrink-0">
                             <Button
                                onClick={() => setShareModalOpen(true)}
                                variant="secondary"
                                size="icon"
                                className="bg-white/20 text-white border-white/50 hover:bg-white/30"
                                aria-label={t?.sharing?.shareProject || 'Share'}
                            >
                                <ShareIcon className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
            
            <div className="container mx-auto px-6 py-20">
                 {/* Project Description */}
                <div className="max-w-4xl mx-auto mb-20">
                    <h2 className="text-3xl font-bold text-center text-amber-500 mb-6">
                        {t_page?.description || (language === 'ar' ? 'الوصف' : 'Description')}
                    </h2>
                    <p className="text-lg text-gray-600 leading-relaxed text-center whitespace-pre-line">
                        {projectDesc}
                    </p>
                </div>

                {/* Project Features */}
                {project.features && project.features.length > 0 && (
                    <div className="mb-20">
                        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
                            {t_page?.projectFeatures || (language === 'ar' ? 'مميزات المشروع' : 'Project Features')}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
                            {project.features.map((feature: any, index: number) => {
                                const iconName = typeof feature === 'object' && feature !== null ? feature.icon : undefined;
                                const IconComponent = (iconName && iconMap[iconName]) || BuildingIcon;
                                const featureText = typeof feature === 'string'
                                    ? feature
                                    : (typeof feature?.text === 'object' && feature?.text !== null
                                        ? (feature.text[language] || feature.text.en || feature.text.ar || '')
                                        : (feature?.text || ''));
                                return (
                                <div key={index} className="text-center flex flex-col items-center">
                                    <div className="bg-amber-100 p-4 rounded-full mb-4">
                                        <IconComponent className="w-8 h-8 text-amber-500" />
                                    </div>
                                    <p className="font-semibold text-gray-700">{featureText}</p>
                                </div>
                            )})}
                        </div>
                    </div>
                )}


                <BannerDisplay location="details" />

                {/* Project Properties */}
                <div className="mt-20">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-6">
                        {t_page?.availableUnits || (language === 'ar' ? 'الوحدات المتاحة' : 'Available Units')}
                    </h2>
                     {unitTypes.length > 2 && ( // Show filters only if there's more than one type
                        <div className="flex justify-center flex-wrap gap-3 mb-12">
                            {unitTypes.map((type: string) => {
                                const propMatch = (projectProperties || []).find(p => p.type?.en === type);
                                const typeName = type === 'all' 
                                    ? (t_page?.allUnits || (language === 'ar' ? 'الكل' : 'All Units'))
                                    : (propMatch?.type?.[language] || propMatch?.type?.en || type);

                                return (
                                    <button
                                        key={type}
                                        onClick={() => setActiveType(type)}
                                        className={`px-6 py-2 font-semibold rounded-full transition-colors ${
                                            activeType === type
                                                ? 'bg-amber-500 text-gray-900 shadow'
                                                : 'bg-white text-gray-600 hover:bg-amber-100'
                                        }`}
                                    >
                                        {typeName}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {filteredProperties.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredProperties.map(prop => (
                                <PropertyCard key={prop.id} {...prop} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                            <p className="text-xl text-gray-500">
                                {language === 'ar' ? 'لا توجد وحدات متاحة حاليًا في هذا المشروع.' : 'There are currently no available units in this project.'}
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
        </>
    );
};

export default ProjectDetailsPage;
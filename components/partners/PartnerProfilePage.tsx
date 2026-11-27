
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { PortfolioItem, AdminPartner } from '../../types';
import Lightbox from '../shared/Lightbox';
import PropertyCard from '../properties/PropertyCard';
import { getPortfolioByPartnerId } from '../../services/portfolio';
import { getPublicPropertiesByPartnerId } from '../../services/properties';
import { useQuery } from '@tanstack/react-query';
import { getPublicPartnerById } from '../../services/partners';
import { useLanguage } from '../shared/LanguageContext';
import { WhatsAppIcon, ShareIcon, PhoneIcon } from '../ui/Icons';
import { useToast } from '../shared/ToastContext';
import { Button } from '../ui/Button';
import ErrorState from '../shared/ErrorState';
import PropertyCardSkeleton from '../shared/PropertyCardSkeleton';
import { isPropertyPubliclyVisible } from '../../utils/propertyUtils';
import { useCityStore } from '../../store/useCityStore';
import { getEffectivePropertySource, propertyQueryKeys } from '../../utils/propertyQueryKeys';
import { getFinishingMarketCategories, getPublicPartnerFinishingServices } from '../../services/finishingMarketplace';
import { buildProviderRequestState, formatPartnerPrice, localized, providerKindLabel } from '../finishing/marketplaceShared';


const PartnerProfileSkeleton: React.FC = () => (
    <div className="animate-pulse">
        <section className="py-20 bg-gray-50 dark:bg-gray-800">
            <div className="container mx-auto px-6 text-center">
                <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-6"></div>
                <div className="h-10 w-1/2 bg-gray-200 dark:bg-gray-700 mx-auto mb-4 rounded"></div>
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 mx-auto rounded"></div>
                <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 mx-auto mt-8 rounded-lg"></div>
            </div>
        </section>
        <section className="py-20">
            <div className="container mx-auto px-6">
                <div className="h-8 w-1/3 bg-gray-200 dark:bg-gray-700 mx-auto mb-12 rounded"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="w-full h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    ))}
                </div>
            </div>
        </section>
    </div>
);


const PartnerProfilePage: React.FC = () => {
    const { partnerId } = useParams<{ partnerId: string }>();
    const { language, t } = useLanguage();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const activeCityId = useCityStore((state) => state.activeCityId);
    const cities = useCityStore((state) => state.cities);

    // Fetch partner data from DB
    const {
        data: partnerInfo,
        isLoading: isLoadingPartner,
        isError: isErrorPartner,
        refetch: refetchPartner
    } = useQuery({
        queryKey: ['publicPartner', partnerId],
        queryFn: () => getPublicPartnerById(partnerId!),
        enabled: !!partnerId
    });

    // Fetch portfolio (for finishing partners)
    const {
        data: partnerPortfolio,
        isLoading: isLoadingPortfolio,
        isError: isErrorPortfolio,
        refetch: refetchPortfolio
    } = useQuery({
        queryKey: ['partnerPortfolio', partnerId],
        queryFn: () => getPortfolioByPartnerId(partnerId!),
        enabled: !!partnerId && partnerInfo?.type === 'finishing'
    });

    // Approved finishing services of this provider (same records shown in the finishing directory)
    const isFinishingProvider = partnerInfo?.type === 'finishing';
    const { data: finishingServices = [] } = useQuery({
        queryKey: ['publicPartnerFinishingServices', partnerId],
        queryFn: () => getPublicPartnerFinishingServices(partnerId!),
        enabled: !!partnerId && isFinishingProvider
    });
    const { data: finishingCategories = [] } = useQuery({
        queryKey: ['finishingMarketCategories'],
        queryFn: () => getFinishingMarketCategories(),
        enabled: isFinishingProvider,
        staleTime: 60000
    });
    const visibleFinishingServices = useMemo(() => {
        const order = new Map(finishingCategories.map((c) => [c.id, c.displayOrder]));
        return finishingServices
            .filter((s) => order.has(s.categoryId))
            .sort((a, b) => (order.get(a.categoryId) ?? 0) - (order.get(b.categoryId) ?? 0));
    }, [finishingServices, finishingCategories]);

    // Fetch strictly publicly visible properties (for developers/agencies)
    const propertySource = getEffectivePropertySource();
    const {
        data: rawPartnerProperties,
        isLoading: isLoadingProperties,
        isError: isErrorProperties,
        refetch: refetchProperties
    } = useQuery({
        queryKey: propertyQueryKeys.partnerPublic(partnerId, propertySource),
        queryFn: () => getPublicPropertiesByPartnerId(partnerId!),
        enabled: !!partnerId && (!partnerInfo || partnerInfo.type === 'developer' || partnerInfo.type === 'agency')
    });

    const partnerProperties = useMemo(
        () => (rawPartnerProperties || []).filter((p) => isPropertyPubliclyVisible(p, { includeSold: true })),
        [rawPartnerProperties]
    );

    const loading = isLoadingPartner;

    const displayPartner = useMemo(() => {
        if (!partnerInfo) return null;
        
        const p = partnerInfo as AdminPartner;
        
        return {
            name: (language === 'ar' ? p.nameAr : p.name) || p.name,
            description: (language === 'ar' ? p.descriptionAr : p.description) || p.description,
            imageUrl: p.imageUrl,
            type: p.type,
            contactMethods: p.contactMethods
        };
    }, [partnerInfo, language]);


    const [lightboxState, setLightboxState] = useState({
        isOpen: false,
        images: [] as string[],
        startIndex: 0,
    });
    
    const [shareModalOpen, setShareModalOpen] = useState(false);

    const openLightbox = (gallery: PortfolioItem[], startIndex: number) => {
        setLightboxState({
            isOpen: true,
            images: gallery.map(img => img.imageUrl),
            startIndex,
        });
    };
    
    const handleRequestService = () => {
        if (!partnerInfo || !displayPartner) return;
        if (isFinishingProvider && visibleFinishingServices.length > 0) {
            document.getElementById('provider-services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }
        const serviceTitle = `${t.partnerProfilePage.serviceRequestFor} ${displayPartner.name}`;
        navigate('/request-service', {
            state: {
                serviceTitle,
                partnerId: partnerInfo.id,
                serviceType: partnerInfo.type === 'finishing' ? 'finishing' : 'property', // Default guess
                cityId: activeCityId || 'heliopolis',
            }
        });
    };

    const handleWhatsAppShare = () => {
        if (!partnerId || !displayPartner) return;
        const urlToShare = window.location.href;
        const text = encodeURIComponent(`${displayPartner.name}\n${urlToShare}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        setShareModalOpen(false);
    };

    const handleCopyLink = async () => {
        if (!partnerId) return;
        const urlToShare = window.location.href;
        try {
            await navigator.clipboard.writeText(urlToShare);
            showToast(t.sharing.linkCopied, 'success');
            setShareModalOpen(false);
        } catch (err) {
            showToast(t.sharing.shareFailed, 'error');
        }
    };


    if (loading) {
        return <PartnerProfileSkeleton />;
    }

    if (isErrorPartner) {
        return (
            <div className="py-20 container mx-auto px-6">
                <ErrorState
                    title={language === 'ar' ? 'تعذر تحميل بيانات الشريك' : 'Failed to load partner profile'}
                    message={language === 'ar' ? 'حدث خطأ أثناء الاتصال بقاعدة البيانات. يرجى إعادة المحاولة.' : 'A connection error occurred. Please try again.'}
                    retryLabel={language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
                    onRetry={() => refetchPartner()}
                    className="max-w-lg mx-auto py-12"
                />
            </div>
        );
    }

    if (!partnerInfo || !displayPartner) {
        return (
            <div className="py-20 text-center container mx-auto px-6">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{t.partnerProfilePage.partnerNotFound}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-4">{t.partnerProfilePage.partnerNotFoundText}</p>
                <Link to="/" className="mt-8 inline-block bg-amber-500 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-amber-600">
                    {t.partnerProfilePage.backToHome}
                </Link>
            </div>
        );
    }
    
    // Check if partner accepts calls directly
    const showCallButton = displayPartner.contactMethods?.phone?.enabled && displayPartner.contactMethods.phone.number;
    
    return (
        <div className="bg-white dark:bg-gray-900">
            {lightboxState.isOpen && (
                <Lightbox 
                    images={lightboxState.images}
                    startIndex={lightboxState.startIndex}
                    onClose={() => setLightboxState({ isOpen: false, images: [], startIndex: 0 })}
                />
            )}
            {shareModalOpen && (
                <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fadeIn" onClick={() => setShareModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            {t.sharing.sharePartner}
                        </h3>
                        <div className="space-y-3">
                             <Button onClick={handleCopyLink} variant="outline" className="w-full justify-center">
                                {t.sharing.copyLink}
                            </Button>
                            <Button onClick={handleWhatsAppShare} className="w-full justify-center bg-green-500 hover:bg-green-600 text-white">
                                <WhatsAppIcon className="w-5 h-5 mr-2" />
                                {t.sharing.shareOnWhatsApp}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            <section className="py-20 bg-gray-50 dark:bg-gray-800">
                <div className="container mx-auto px-6 text-center">
                    <img src={displayPartner.imageUrl} alt={displayPartner.name} className="w-32 h-32 rounded-full object-cover mx-auto mb-6 border-4 border-white dark:border-gray-700 shadow-lg"/>
                    <h1 className="text-4xl md:text-5xl font-bold text-amber-500">{displayPartner.name}</h1>
                    {isFinishingProvider && (
                        <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm">
                            <span className="px-3 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-200">
                                {providerKindLabel(partnerInfo.profileKind || 'company', language)}
                            </span>
                            {(partnerInfo.allowedCities || []).filter((c) => c && c !== '*').map((cityId) => {
                                const city = cities.find((c) => c.id === cityId || c.slug === cityId);
                                return (
                                    <span key={cityId} className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
                                        {city ? localized(city.name, language) : cityId}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                    <p className="max-w-3xl mx-auto text-lg text-gray-600 dark:text-gray-400 mt-4 whitespace-pre-line leading-relaxed">{displayPartner.description}</p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            onClick={handleRequestService}
                            size="lg"
                            className="shadow-lg shadow-amber-500/20"
                        >
                            {isFinishingProvider
                                ? (partnerInfo.profileKind === 'engineer'
                                    ? (language === 'ar' ? 'اطلب عرضًا من المهندس' : 'Request a quote from the engineer')
                                    : (language === 'ar' ? 'اطلب عرضًا من الشركة' : 'Request a quote from the company'))
                                : t.partnerProfilePage.requestService}
                        </Button>
                        {showCallButton && (
                            <a href={`tel:${displayPartner.contactMethods?.phone?.number}`} className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:text-lg">
                                <PhoneIcon className="w-5 h-5 mr-2" />
                                {language === 'ar' ? 'اتصال' : 'Call'}
                            </a>
                        )}
                        <Button
                            onClick={() => setShareModalOpen(true)}
                            size="lg"
                            variant="outline"
                            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label={t.sharing.sharePartner}
                        >
                            <ShareIcon className="w-5 h-5 mr-2" />
                            {t.sharing.share}
                        </Button>
                    </div>
                </div>
            </section>
            
            {isFinishingProvider && visibleFinishingServices.length > 0 && (
                <section id="provider-services" className="py-16 scroll-mt-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                                {language === 'ar' ? 'الخدمات المعتمدة' : 'Approved services'}
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {visibleFinishingServices.map((service) => {
                                const category = finishingCategories.find((c) => c.id === service.categoryId);
                                const scope = localized(service.scope, language);
                                return (
                                    <div key={service.id} className="flex flex-col p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                                        {category && (
                                            <span className="self-start px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 mb-3">
                                                {localized(category.name, language)}
                                            </span>
                                        )}
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {localized(service.title, language) || (category ? localized(category.name, language) : '')}
                                        </h3>
                                        {localized(service.description, language) && (
                                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{localized(service.description, language)}</p>
                                        )}
                                        {scope && (
                                            <div className="mt-3 text-sm">
                                                <p className="font-semibold text-gray-800 dark:text-gray-200">{language === 'ar' ? 'نطاق الخدمة' : 'Scope'}</p>
                                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">{scope}</p>
                                            </div>
                                        )}
                                        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                                            <span className="font-bold text-gray-900 dark:text-white text-sm">{formatPartnerPrice(service, language)}</span>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    navigate('/request-service', {
                                                        state: buildProviderRequestState(
                                                            { id: partnerInfo.id, name: { ar: (partnerInfo as AdminPartner).nameAr || partnerInfo.name, en: partnerInfo.name } },
                                                            service,
                                                            category,
                                                            language,
                                                            { cityId: activeCityId || 'heliopolis' }
                                                        )
                                                    })
                                                }
                                            >
                                                {language === 'ar' ? 'اطلب عرضًا من مقدم الخدمة' : 'Request a quote'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {partnerInfo.type === 'finishing' && (
                <section className="py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{t.partnerProfilePage.galleryTitle}</h2>
                        </div>
                        {isLoadingPortfolio ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-80 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : isErrorPortfolio ? (
                            <ErrorState
                                title={language === 'ar' ? 'تعذر تحميل معرض الأعمال' : 'Failed to load portfolio'}
                                message={language === 'ar' ? 'يرجى إعادة المحاولة.' : 'Please try again.'}
                                retryLabel={language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                                onRetry={() => refetchPortfolio()}
                                className="max-w-lg mx-auto"
                            />
                        ) : (partnerPortfolio && partnerPortfolio.length > 0) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {partnerPortfolio.map((img, index) => (
                                    <div key={index} className="group relative overflow-hidden rounded-lg shadow-lg aspect-w-1 aspect-h-1 bg-gray-100 dark:bg-gray-800 hover:shadow-xl transition-all">
                                        <img src={img.imageUrl} alt={img.alt} className="w-full h-80 object-cover transform transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                                            <button 
                                                onClick={() => openLightbox(partnerPortfolio, index)}
                                                className="bg-white/20 backdrop-blur-sm text-white font-semibold px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
                                                aria-label="View image"
                                            >
                                            {language === 'ar' ? 'عرض' : 'View'}
                                            </button>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                            <h3 className="text-white font-semibold">{img.title[language]}</h3>
                                            <p className="text-gray-300 text-xs">{img.category[language]}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-xl text-gray-500 dark:text-gray-400">
                                    {language === 'ar' ? 'لم يقم هذا الشريك برفع أي أعمال بعد.' : 'This partner has not uploaded any works yet.'}
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {(partnerInfo.type === 'developer' || partnerInfo.type === 'agency' || partnerProperties.length > 0) && (
                 <section className="py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{t.partnerProfilePage.ourListings}</h2>
                        </div>
                        {isLoadingProperties ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {Array.from({ length: 4 }).map((_, index) => <PropertyCardSkeleton key={index} />)}
                            </div>
                        ) : isErrorProperties ? (
                            <ErrorState
                                title={language === 'ar' ? 'تعذر تحميل عقارات الشريك' : 'Failed to load partner properties'}
                                message={language === 'ar' ? 'حدث خطأ أثناء تحميل القائمة. يرجى إعادة المحاولة.' : 'An error occurred while loading listings. Please try again.'}
                                retryLabel={language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                                onRetry={() => refetchProperties()}
                                className="max-w-lg mx-auto"
                            />
                        ) : partnerProperties.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {partnerProperties.map((prop) => (
                                    <PropertyCard key={prop.id} {...prop} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-xl text-gray-500 dark:text-gray-400">
                                    {language === 'ar' ? 'لا توجد عقارات منشورة متاحة لهذا الشريك حالياً.' : 'No published properties available for this partner at the moment.'}
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
};

export default PartnerProfilePage;

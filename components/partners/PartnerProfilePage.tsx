

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Language, PortfolioItem, Property, AdminPartner, Project } from '../../types';
import Lightbox from '../shared/Lightbox';
import PropertyCard from '../properties/PropertyCard';
import { getPortfolioByPartnerId } from '../../services/portfolio';
import { getPropertiesByPartnerId } from '../../services/properties';
import { useQuery } from '@tanstack/react-query';
import { getPartnerById } from '../../services/partners';
import { useLanguage } from '../shared/LanguageContext';
import { WhatsAppIcon, ShareIcon } from '../ui/Icons';
import { useToast } from '../shared/ToastContext';
import { Button } from '../ui/Button';


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

    const { data: partnerInfo, isLoading: isLoadingPartner } = useQuery({ queryKey: [`partner-${partnerId}`], queryFn: () => getPartnerById(partnerId!), enabled: !!partnerId });
    const { data: partnerPortfolio, isLoading: isLoadingPortfolio } = useQuery({ queryKey: [`partnerPortfolio-${partnerId}`], queryFn: () => getPortfolioByPartnerId(partnerId!), enabled: !!partnerId });
    const { data: partnerProperties, isLoading: isLoadingProperties } = useQuery({ queryKey: [`partnerProperties-${partnerId}`], queryFn: () => getPropertiesByPartnerId(partnerId!), enabled: !!partnerId });

    const loading = isLoadingPartner || isLoadingPortfolio || isLoadingProperties;

    const localizedPartner = useMemo(() => {
        if (!partnerInfo) return null;
        return t.partnerInfo[partnerInfo.id] || null;
    }, [partnerInfo, t]);


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
        if (!partnerInfo || !localizedPartner) return;
        const serviceTitle = `${t.partnerProfilePage.serviceRequestFor} ${localizedPartner.name}`;
        navigate('/request-service', {
            state: {
                serviceTitle,
                partnerId: partnerInfo.id,
            }
        });
    };

    const handleWhatsAppShare = () => {
        if (!partnerId || !localizedPartner) return;
        const urlToShare = window.location.href;
        const text = encodeURIComponent(`${localizedPartner.name}\n${urlToShare}`);
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

    if (!partnerInfo || !localizedPartner) {
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
                    <img src={partnerInfo.imageUrl} alt={localizedPartner.name} className="w-32 h-32 rounded-full object-cover mx-auto mb-6 border-4 border-white dark:border-gray-700 shadow-lg"/>
                    <h1 className="text-4xl md:text-5xl font-bold text-amber-500">{localizedPartner.name}</h1>
                    <p className="max-w-3xl mx-auto text-lg text-gray-600 dark:text-gray-400 mt-4">{localizedPartner.description}</p>
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            onClick={handleRequestService}
                            size="lg"
                            className="shadow-lg shadow-amber-500/20"
                        >
                            {t.partnerProfilePage.requestService}
                        </Button>
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
            
            {partnerInfo.type === 'finishing' && (
                <section className="py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{t.partnerProfilePage.galleryTitle}</h2>
                        </div>
                        {(partnerPortfolio && partnerPortfolio.length > 0) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {partnerPortfolio.map((img, index) => (
                                    <div key={index} className="group relative overflow-hidden rounded-lg shadow-lg aspect-w-1 aspect-h-1 bg-gray-100 dark:bg-gray-800">
                                        <img src={img.imageUrl} alt={img.alt} className="w-full h-80 object-cover transform transition-transform duration-300 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                                            <button 
                                                onClick={() => openLightbox(partnerPortfolio, index)}
                                                className="bg-white/20 backdrop-blur-sm text-white font-semibold px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
                                                aria-label="View image"
                                            >
                                            {language === 'ar' ? 'عرض' : 'View'}
                                            </button>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                                            <h3 className="text-white font-semibold">{img.title[language]}</h3>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400">This partner has not uploaded any works yet.</p>
                        )}
                    </div>
                </section>
            )}

            {(partnerInfo.type === 'developer' || partnerInfo.type === 'agency') && (
                 <section className="py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{t.partnerProfilePage.ourListings}</h2>
                        </div>
                         {(partnerProperties && partnerProperties.length > 0) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {partnerProperties.map((prop) => (
                                    <PropertyCard key={prop.id} {...prop} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400">This partner has not listed any properties yet.</p>
                        )}
                    </div>
                </section>
            )}

        </div>
    );
};

export default PartnerProfilePage;
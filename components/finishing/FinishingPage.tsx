
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Language, AdminPartner } from '../../types';
import BannerDisplay from '../shared/BannerDisplay';
import SEO from '../shared/SEO';
import { usePartners } from '../../hooks/usePartners';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useFavorites } from '../shared/FavoritesContext';
import { useToast } from '../shared/ToastContext';
import { HeartIcon, HeartIconSolid, ShareIcon } from '../ui/Icons';

interface PricingTier {
    unitType: { ar: string; en: string };
    areaRange: { ar: string; en: string };
    price: number;
}

const ServicePackageCard: React.FC<{
    service: any;
    onBookTier: (serviceTitle: string, tier: PricingTier) => void;
    language: Language;
    t: any;
}> = ({ service, onBookTier, language, t }) => {
    const { isFavorite, toggleFavorite } = useFavorites();
    const { showToast } = useToast();
    
    const titleLocalized = service?.title?.[language] || service?.title?.en || 'Service';
    const descLocalized = service?.description?.[language] || service?.description?.en || '';

    const serviceId = service?.title?.en || 'unknown-service';
    const isFav = isFavorite(serviceId, 'service');

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(serviceId, 'service');
        showToast(isFav ? t.favoritesPage.removedFromFavorites : t.favoritesPage.addedToFavorites, 'success');
    };

    return (
        <Card className="flex flex-col h-full p-0 border-2 border-transparent hover:border-amber-500/30 transition-all duration-300 shadow-sm hover:shadow-lg overflow-hidden group">
            <CardContent className="p-8 flex flex-col flex-grow relative">
                 <button onClick={handleFavoriteClick} className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors z-10" aria-label={isFav ? t.favoritesPage.removeFromFavorites : t.favoritesPage.addToFavorites}>
                    {isFav ? <HeartIconSolid className="w-5 h-5 text-red-500" /> : <HeartIcon className="w-5 h-5 text-gray-500" />}
                </button>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-4 group-hover:text-amber-500">{titleLocalized}</h3>
                <p className="text-gray-600 dark:text-gray-300 flex-grow mb-8 leading-relaxed text-sm md:text-base">{descLocalized}</p>

                <div className="space-y-4">
                    {(service.pricingTiers || []).map((tier: PricingTier, index: number) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 gap-4 transition-colors hover:border-amber-200 dark:hover:border-amber-800">
                            <div>
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-base">{tier.unitType?.[language]}</p>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{tier.areaRange?.[language]}</p>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                <p className="font-bold text-lg text-gray-900 dark:text-white whitespace-nowrap">
                                    {(tier.price || 0).toLocaleString(language)} EGP
                                </p>
                                <Button 
                                    size="sm" 
                                    onClick={() => onBookTier(titleLocalized, tier)}
                                    className="whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold shadow-md hover:shadow-lg"
                                >
                                    {language === 'ar' ? 'حجز الآن' : 'Book Now'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

const PartnerCompanyCard: React.FC<{ partner: AdminPartner; t: any }> = ({ partner, t }) => {
    const { language } = useLanguage();
    
    // Prioritize DB Name, then localized key fallback
    const name = (language === 'ar' ? partner.nameAr : partner.name) || partner.name;
    const desc = (language === 'ar' ? partner.descriptionAr : partner.description) || '';

    return (
        <Link to={`/partners/${partner.id}`} className="block h-full">
            <Card className="transform hover:-translate-y-2 transition-transform duration-300 group h-full flex flex-col overflow-hidden p-0 card-glow border border-gray-100 dark:border-gray-700">
                <div className="relative overflow-hidden h-48">
                    <picture>
                         <source
                            type="image/webp"
                            srcSet={`${partner.imageUrl_small || partner.imageUrl}&fm=webp`}
                        />
                        <img
                            src={partner.imageUrl}
                            alt={name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            loading="lazy"
                        />
                    </picture>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                </div>
                <CardContent className="p-6 flex flex-col flex-grow relative">
                     <div className="-mt-10 mb-3 relative">
                        <div className="bg-white dark:bg-gray-800 p-1 rounded-lg inline-block shadow-md">
                             <img src={partner.imageUrl} alt="Logo" className="w-12 h-12 rounded object-cover" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-amber-500 transition-colors">
                        {name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm flex-grow line-clamp-3">
                        {desc}
                    </p>
                </CardContent>
            </Card>
        </Link>
    );
};

const ServiceProviderCard: React.FC<{ partner: AdminPartner; onRequest: (title: string, partnerId: string) => void; t: any; buttonText: string }> = ({ partner, onRequest, t, buttonText }) => {
    const { language } = useLanguage();
    
    const name = (language === 'ar' ? partner.nameAr : partner.name) || partner.name;
    const desc = (language === 'ar' ? partner.descriptionAr : partner.description) || '';

    return (
        <Card className="p-6 flex flex-col sm:flex-row justify-between items-center hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
                 <img src={partner.imageUrl} alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600" />
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 max-w-md">{desc}</p>
                </div>
            </div>
            <Button 
                onClick={() => onRequest(t.partnerProfilePage.serviceRequestFor + ' ' + name, partner.id)} 
                className="flex-shrink-0"
                variant="outline"
            >
                {buttonText}
            </Button>
        </Card>
    );
};


const FinishingPage: React.FC = () => {
    const { language, t } = useLanguage();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [activeServiceIndex, setActiveServiceIndex] = useState(0);

    const { data: partners, isLoading: isLoadingPartners } = usePartners();
    const { data: siteContent, isLoading: isLoadingContent } = useSiteContent();

    const isLoading = isLoadingPartners || isLoadingContent;
    
    const defaultContent = t.finishingPage;
    const dynamicContent = siteContent?.finishingPage?.[language];
    const content = dynamicContent || defaultContent;

    const handleRequestService = (serviceTitle: string, partnerId: string = 'admin-user') => {
        navigate('/request-service', {
            state: {
                serviceTitle,
                partnerId: partnerId,
                serviceType: 'finishing',
            },
        });
    };
    
    const handleBookTier = (serviceTitle: string, tier: PricingTier) => {
        navigate('/request-service', {
            state: {
                serviceTitle,
                partnerId: 'admin-user',
                serviceType: 'finishing',
                tier: tier,
                isBooking: true
            },
        });
    };
    
    const handleShare = async () => {
        const urlToShare = window.location.href;
        const shareData = {
            title: `${t.nav.finishing} | ONLY HELIO`,
            text: content.heroSubtitle,
            url: urlToShare,
        };
        try {
            if (navigator.share && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(urlToShare);
                showToast(t.sharing.linkCopied, 'success');
            }
        } catch (error) {
             await navigator.clipboard.writeText(urlToShare);
             showToast(t.sharing.linkCopied, 'success');
        }
    };

    const services = useMemo(() => {
        return siteContent?.finishingServices || [];
    }, [siteContent]);

    const { companyPartners, serviceProviders } = useMemo(() => {
        if (!partners) return { companyPartners: [], serviceProviders: [] };
        
        const allFinishingPartners = partners.filter((p) => p.type === 'finishing' && p.status === 'active');
        
        // Categorize based on subscription plan from DB
        const companies = allFinishingPartners.filter(p => p.subscriptionPlan === 'professional' || p.subscriptionPlan === 'elite');
        const providers = allFinishingPartners.filter(p => p.subscriptionPlan === 'commission' || p.subscriptionPlan === 'basic');

        return { companyPartners: companies, serviceProviders: providers };
    }, [partners]);

    if (isLoading) {
        return <div className="animate-pulse h-screen bg-gray-50 dark:bg-gray-800"></div>;
    }

    return (
        <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
            <SEO title={`${t.nav.finishing} | ONLY HELIO`} description={content.heroSubtitle} />
            
            {/* Hero Section */}
            <section
                className="relative h-[50vh] flex items-center justify-center text-center bg-cover bg-center"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?fm=webp&q=75&w=1600&auto=format&fit=crop')",
                }}
            >
                <div className="absolute top-0 left-0 w-full h-full bg-black/70 z-10"></div>
                <div className="relative z-20 px-4 container mx-auto text-white">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-shadow">{content.heroTitle}</h1>
                    <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-200 mt-4 text-shadow">
                        {content.heroSubtitle}
                    </p>
                     <div className="mt-6">
                        <Button
                            onClick={handleShare}
                            variant="secondary"
                            className="bg-white/20 text-white border-white/50 hover:bg-white/30 backdrop-blur-sm"
                        >
                            <ShareIcon className="w-5 h-5 mr-2" />
                            {t.sharing.share}
                        </Button>
                    </div>
                </div>
            </section>

            <BannerDisplay location="finishing" />

            {/* Services Packages Section (Tabbed) */}
            {services.length > 0 && (
                <section className="py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{content.servicesTitle}</h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mt-4">{content.servicesSubtitle}</p>
                             <p className="text-md text-gray-600 dark:text-gray-300 mt-2">{content.servicesIntro}</p>
                        </div>

                        {/* Service Tabs */}
                        <div className="flex flex-wrap justify-center gap-4 mb-12" role="tablist">
                            {services.map((service, index) => (
                                <button
                                    key={index}
                                    role="tab"
                                    aria-selected={activeServiceIndex === index}
                                    onClick={() => setActiveServiceIndex(index)}
                                    className={`px-6 py-3 rounded-full font-bold text-sm md:text-base transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 ${
                                        activeServiceIndex === index
                                            ? 'bg-amber-500 text-white shadow-lg transform -translate-y-1'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {service.title?.[language] || `Service ${index + 1}`}
                                </button>
                            ))}
                        </div>

                        {/* Active Service Card */}
                        <div className="max-w-5xl mx-auto min-h-[400px]">
                            {services[activeServiceIndex] && (
                                 <div key={activeServiceIndex} className="animate-fadeIn">
                                    <ServicePackageCard
                                        service={services[activeServiceIndex]}
                                        onBookTier={handleBookTier}
                                        language={language}
                                        t={t}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Partner Companies Gallery */}
            {companyPartners.length > 0 && (
                <section className="py-20 bg-gray-50 dark:bg-gray-800">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold">{content.partnerCompaniesTitle}</h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mt-4">
                                {content.partnerCompaniesSubtitle}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {companyPartners.map((partner) => (
                                <PartnerCompanyCard
                                    key={partner.id}
                                    partner={partner}
                                    t={t}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Service Providers */}
            {serviceProviders.length > 0 && (
                <section className="py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold">{content.serviceProvidersTitle}</h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mt-4">
                                {content.serviceProvidersSubtitle}
                            </p>
                        </div>
                        <div className="max-w-4xl mx-auto space-y-4">
                            {serviceProviders.map((partner) => (
                                <ServiceProviderCard
                                    key={partner.id}
                                    partner={partner}
                                    onRequest={handleRequestService}
                                    t={t}
                                    buttonText={t.finishingPage.requestButton}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section className="py-20 md:py-32 bg-white dark:bg-gray-900 subtle-bg">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-gray-900 dark:text-white">
                        {content.ctaTitle}
                    </h2>
                    <p className="max-w-3xl mx-auto text-lg text-gray-500 mb-8">{content.ctaSubtitle}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/contact"
                            className="w-full sm:w-auto bg-amber-500 text-gray-900 font-semibold px-8 py-4 rounded-lg text-lg hover:bg-amber-600 transition-colors duration-200 shadow-lg shadow-amber-500/20"
                        >
                            {content.ctaButton}
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default FinishingPage;

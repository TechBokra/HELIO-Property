import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import type { Language, AdminPartner, FinishingService, FinishingPricingTier } from '../../types';
import BannerDisplay from '../shared/BannerDisplay';
import SEO from '../shared/SEO';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useFavorites } from '../shared/FavoritesContext';
import { useToast } from '../shared/ToastContext';
import { HeartIcon, HeartIconSolid, ShareIcon, CheckCircleIcon, MapPinIcon, BuildingIcon } from '../ui/Icons';
import { useQuery } from '@tanstack/react-query';
import { 
    getFinishingServices, 
    getFinishingPartners, 
    PLATFORM_FINISHING_MANAGER_ID,
    calculateEstimatedCost 
} from '../../services/finishing';
import { useSiteContent } from '../../hooks/useSiteContent';
import FinishingCostEstimator from './FinishingCostEstimator';

const ServicePackageCard: React.FC<{
    service: FinishingService;
    onBookTier: (serviceTitle: string, tier: FinishingPricingTier) => void;
    onRequestCustomQuote: (serviceTitle: string) => void;
    linkedPropertyArea?: number;
    language: Language;
    t: any;
}> = ({ service, onBookTier, onRequestCustomQuote, linkedPropertyArea, language, t }) => {
    const { isFavorite, toggleFavorite } = useFavorites();
    const { showToast } = useToast();
    
    const titleLocalized = service.title[language] || service.title.en;
    const descLocalized = service.description[language] || service.description.en;

    const serviceId = service.id || service.title.en;
    const isFav = isFavorite(serviceId, 'service');

    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(serviceId, 'service');
        showToast(isFav ? t.favoritesPage.removedFromFavorites : t.favoritesPage.addedToFavorites, 'success');
    };

    const modelBadge = useMemo(() => {
        switch (service.pricingModel) {
            case 'per_sqm':
                return {
                    label: language === 'ar' ? 'سعر بالمتر المربع' : 'Price per m²',
                    bg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                };
            case 'fixed_package':
                return {
                    label: language === 'ar' ? 'باقة شاملة التكلفة' : 'Fixed Package',
                    bg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                };
            default:
                return {
                    label: language === 'ar' ? 'مقايسة معتمدة' : 'Custom Quote',
                    bg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                };
        }
    }, [service.pricingModel, language]);

    return (
        <Card className="flex flex-col h-full p-0 border-2 border-transparent hover:border-amber-500/30 transition-all duration-300 shadow-sm hover:shadow-lg overflow-hidden group">
            <CardContent className="p-8 flex flex-col flex-grow relative">
                <button 
                    onClick={handleFavoriteClick} 
                    className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors z-10" 
                    aria-label={isFav ? t.favoritesPage.removeFromFavorites : t.favoritesPage.addToFavorites}
                >
                    {isFav ? <HeartIconSolid className="w-5 h-5 text-red-500" /> : <HeartIcon className="w-5 h-5 text-gray-500" />}
                </button>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${modelBadge.bg}`}>
                        {modelBadge.label}
                    </span>
                    {service.basePrice && service.basePrice > 0 ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {language === 'ar' ? 'يبدأ من:' : 'Starting from:'} {service.basePrice.toLocaleString(language)} {service.currency || 'EGP'}
                        </span>
                    ) : null}
                </div>

                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-3 group-hover:text-amber-500">
                    {titleLocalized}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed text-sm md:text-base">
                    {descLocalized}
                </p>

                {/* Features & Guarantees */}
                {service.features && service.features.length > 0 && (
                    <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5">
                            {language === 'ar' ? 'المواصفات والضمانات الهندسية:' : 'Engineering Specs & Guarantees:'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                            {service.features.map((feat, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    <span>{feat[language] || feat.en}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pricing Tiers */}
                <div className="space-y-4 flex-grow">
                    {(service.pricingTiers || []).map((tier: FinishingPricingTier, index: number) => {
                        const costCalc = calculateEstimatedCost(service, tier, linkedPropertyArea);
                        const isPerSqm = tier.priceModel === 'per_sqm' || service.pricingModel === 'per_sqm';

                        return (
                            <div 
                                key={tier.id || index} 
                                className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 gap-4 transition-colors hover:border-amber-200 dark:hover:border-amber-800"
                            >
                                <div className="space-y-1">
                                    <p className="font-bold text-gray-800 dark:text-gray-200 text-sm md:text-base">
                                        {tier.unitType[language] || tier.unitType.en}
                                    </p>
                                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                        {tier.areaRange[language] || tier.areaRange.en}
                                    </p>
                                    {linkedPropertyArea && isPerSqm && (
                                        <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                            {language === 'ar' 
                                                ? `تقدير لمساحة العقار (${linkedPropertyArea} م²): ${costCalc.totalCost.toLocaleString(language)} ج.م` 
                                                : `Est. for property (${linkedPropertyArea} m²): ${costCalc.totalCost.toLocaleString(language)} EGP`}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-gray-900 dark:text-white whitespace-nowrap">
                                            {(tier.price || 0).toLocaleString(language)} {service.currency || 'EGP'}
                                            {isPerSqm && <span className="text-xs font-normal text-gray-500"> / {language === 'ar' ? 'م²' : 'm²'}</span>}
                                        </p>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        onClick={() => onBookTier(titleLocalized, tier)}
                                        className="whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold shadow-md hover:shadow-lg"
                                    >
                                        {language === 'ar' ? 'طلب الباقة' : 'Book Tier'}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500">
                    <span>
                        {language === 'ar' 
                            ? 'إشراف هندسي وضمان تنفيذ معتمد من المنصة' 
                            : 'Verified engineering supervision & warranty by ONLY HELIO'}
                    </span>
                    <button
                        type="button"
                        onClick={() => onRequestCustomQuote(titleLocalized)}
                        className="text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                    >
                        {language === 'ar' ? 'طلب مقايسة خاصة' : 'Request Custom Quote'}
                    </button>
                </div>
            </CardContent>
        </Card>
    );
};

const PartnerCompanyCard: React.FC<{ partner: AdminPartner; t: any }> = ({ partner }) => {
    const { language } = useLanguage();
    
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

const ServiceProviderCard: React.FC<{ 
    partner: AdminPartner; 
    onRequest: (title: string, partnerId: string) => void; 
    t: any; 
    buttonText: string 
}> = ({ partner, onRequest, t, buttonText }) => {
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
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const [activeServiceIndex, setActiveServiceIndex] = useState(0);

    // Linked Property Context from state or URL query
    const linkedPropertyId = location.state?.propertyId || searchParams.get('propertyId');
    const linkedPropertyTitle = location.state?.propertyTitle;
    const linkedPropertyArea = location.state?.propertyArea ? Number(location.state.propertyArea) : undefined;

    // Load canonical services from Supabase
    const { data: services = [], isLoading: isLoadingServices } = useQuery({
        queryKey: ['canonicalFinishingServices'],
        queryFn: getFinishingServices,
        staleTime: 60000
    });

    // Load verified finishing partners from Supabase
    const { data: partners = [], isLoading: isLoadingPartners } = useQuery({
        queryKey: ['finishingPartnersSupabase'],
        queryFn: getFinishingPartners,
        staleTime: 60000
    });

    const { data: siteContent } = useSiteContent();

    const isLoading = isLoadingServices || isLoadingPartners;
    
    const defaultContent = t.finishingPage;
    const dynamicContent = siteContent?.finishingPage?.[language];
    const content = dynamicContent || defaultContent;

    // Direct routing to verified Platform Finishing Manager UUID
    const handleRequestService = (serviceTitle: string, partnerId: string = PLATFORM_FINISHING_MANAGER_ID) => {
        navigate('/request-service', {
            state: {
                serviceTitle,
                partnerId: partnerId,
                serviceType: 'finishing',
                propertyId: linkedPropertyId || undefined,
                propertyTitle: linkedPropertyTitle || undefined,
            },
        });
    };
    
    const handleBookTier = (serviceTitle: string, tier: FinishingPricingTier) => {
        navigate('/request-service', {
            state: {
                serviceTitle,
                partnerId: PLATFORM_FINISHING_MANAGER_ID,
                serviceType: 'finishing',
                tier: tier,
                isBooking: true,
                propertyId: linkedPropertyId || undefined,
                propertyTitle: linkedPropertyTitle || undefined,
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
        } catch {
            await navigator.clipboard.writeText(urlToShare);
            showToast(t.sharing.linkCopied, 'success');
        }
    };

    // Partition partners by real capabilities and service specialties
    const { turnkeyCompanies, designStudios } = useMemo(() => {
        if (!partners || partners.length === 0) return { turnkeyCompanies: [], designStudios: [] };
        
        const turnkey = partners.filter(p => 
            p.name.toLowerCase().includes('finish') || 
            p.name.toLowerCase().includes('touch') || 
            p.name.toLowerCase().includes('contract') || 
            p.nameAr?.includes('تشطيب') ||
            p.subscriptionPlan === 'professional' ||
            p.subscriptionPlan === 'elite'
        );

        const studios = partners.filter(p => !turnkey.some(t => t.id === p.id));

        return { 
            turnkeyCompanies: turnkey.length > 0 ? turnkey : partners, 
            designStudios: studios 
        };
    }, [partners]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500">{language === 'ar' ? 'جاري تحميل باقات التشطيب...' : 'Loading finishing packages...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
            <SEO title={`${t.nav.finishing} | ONLY HELIO`} description={content.heroSubtitle} />
            
            {/* Hero Section */}
            <section
                className="relative h-[48vh] min-h-[380px] flex items-center justify-center text-center bg-cover bg-center"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?fm=webp&q=75&w=1600&auto=format&fit=crop')",
                }}
            >
                <div className="absolute top-0 left-0 w-full h-full bg-black/70 z-10"></div>
                <div className="relative z-20 px-4 container mx-auto text-white">
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-shadow mb-4">
                        {content.heroTitle}
                    </h1>
                    <p className="max-w-3xl mx-auto text-base md:text-xl text-gray-200 text-shadow">
                        {content.heroSubtitle}
                    </p>
                    
                    <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
                        <Button
                            onClick={handleShare}
                            variant="secondary"
                            className="bg-white/20 text-white border-white/50 hover:bg-white/30 backdrop-blur-sm"
                        >
                            <ShareIcon className="w-5 h-5 mr-2" />
                            {t.sharing.share}
                        </Button>
                        <Button
                            onClick={() => handleRequestService(language === 'ar' ? 'طلب استشارة تشطيب عامة' : 'General Finishing Inquiry')}
                            className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold"
                        >
                            {language === 'ar' ? 'تواصل مع مدير التشطيبات' : 'Contact Finishing Manager'}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Linked Property Alert Banner */}
            {linkedPropertyId && (
                <section className="bg-amber-500/10 border-y border-amber-500/30 py-3.5 px-4">
                    <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3">
                            <span className="p-2 rounded-lg bg-amber-500 text-gray-950 font-bold">
                                <BuildingIcon className="w-5 h-5" />
                            </span>
                            <div>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {language === 'ar' ? 'طلب تشطيب مرتبط بالعقار:' : 'Finishing inquiry for property:'}
                                </span>{' '}
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    {linkedPropertyTitle || linkedPropertyId}
                                </span>
                                {linkedPropertyArea && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                        ({linkedPropertyArea} {language === 'ar' ? 'م²' : 'm²'})
                                    </span>
                                )}
                            </div>
                        </div>
                        <Link 
                            to={`/properties/${linkedPropertyId}`} 
                            className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
                        >
                            {language === 'ar' ? 'الرجوع لصفحة العقار ←' : 'Back to Property →'}
                        </Link>
                    </div>
                </section>
            )}

            <BannerDisplay location="finishing" />

            {/* Canonical Finishing Packages Section (Tabbed) */}
            {services.length > 0 && (
                <section className="py-16 md:py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-10 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                                {content.servicesTitle}
                            </h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 mt-3">
                                {content.servicesSubtitle}
                            </p>
                            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-2">
                                {content.servicesIntro}
                            </p>
                        </div>

                        {/* Service Package Tabs */}
                        <div className="flex flex-wrap justify-center gap-3 mb-10" role="tablist">
                            {services.map((service, index) => (
                                <button
                                    key={service.id || index}
                                    role="tab"
                                    aria-selected={activeServiceIndex === index}
                                    onClick={() => setActiveServiceIndex(index)}
                                    className={`px-5 py-2.5 rounded-full font-bold text-sm md:text-base transition-all duration-200 outline-none focus:ring-2 focus:ring-amber-500 ${
                                        activeServiceIndex === index
                                            ? 'bg-amber-500 text-gray-900 shadow-md transform -translate-y-0.5'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {service.title[language] || service.title.en}
                                </button>
                            ))}
                        </div>

                        {/* Active Service Card with Canonical Decoupled Pricing */}
                        <div className="max-w-5xl mx-auto min-h-[420px]">
                            {services[activeServiceIndex] && (
                                <div key={activeServiceIndex} className="animate-fadeIn">
                                    <ServicePackageCard
                                        service={services[activeServiceIndex]}
                                        onBookTier={handleBookTier}
                                        onRequestCustomQuote={(title) => handleRequestService(`طلب مقايسة خاصة: ${title}`)}
                                        linkedPropertyArea={linkedPropertyArea}
                                        language={language}
                                        t={t}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Interactive Finishing Cost Estimator & RFQ Builder (P2) */}
            <div className="container mx-auto px-6">
                <FinishingCostEstimator
                    defaultArea={linkedPropertyArea || 140}
                    propertyId={linkedPropertyId || undefined}
                    propertyTitle={linkedPropertyTitle || undefined}
                    onRfqLaunched={() => {
                        // Optional callback
                    }}
                />
            </div>

            {/* Turnkey Contractors Showcase */}
            {turnkeyCompanies.length > 0 && (
                <section className="py-16 md:py-20 bg-gray-50 dark:bg-gray-800/50">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold">
                                {language === 'ar' ? 'شركات المقاولات والتشطيب المعتمدة' : content.partnerCompaniesTitle}
                            </h2>
                            <p className="text-base text-gray-500 dark:text-gray-400 mt-3">
                                {content.partnerCompaniesSubtitle}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {turnkeyCompanies.map((partner) => (
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

            {/* Design Studios & Specialized Providers */}
            {designStudios.length > 0 && (
                <section className="py-16 md:py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-4xl font-bold">
                                {language === 'ar' ? 'مكاتب التصميم الداخلي والاستشارات' : content.serviceProvidersTitle}
                            </h2>
                            <p className="text-base text-gray-500 dark:text-gray-400 mt-3">
                                {content.serviceProvidersSubtitle}
                            </p>
                        </div>
                        <div className="max-w-4xl mx-auto space-y-4">
                            {designStudios.map((partner) => (
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

            {/* Platform Finishing Manager CTA */}
            <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-t border-gray-100 dark:border-gray-800">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-gray-900 dark:text-white">
                        {content.ctaTitle}
                    </h2>
                    <p className="max-w-2xl mx-auto text-base text-gray-500 dark:text-gray-400 mb-8">
                        {content.ctaSubtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button
                            onClick={() => handleRequestService(language === 'ar' ? 'طلب معاينة واستشارة للموقع' : 'Site Visit & Consultation Request')}
                            className="w-full sm:w-auto bg-amber-500 text-gray-900 font-bold px-8 py-3.5 rounded-lg text-base hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                        >
                            {content.ctaButton}
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default FinishingPage;

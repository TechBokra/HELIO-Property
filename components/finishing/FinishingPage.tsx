import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import BannerDisplay from '../shared/BannerDisplay';
import SEO from '../shared/SEO';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { BuildingIcon, MapPinIcon, ShareIcon } from '../ui/Icons';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useCityStore } from '../../store/useCityStore';
import { resolvePropertyReferenceCode } from '../../utils/propertyFormShared';
import {
    getFinishingDirectory,
    getFinishingMarketCategories,
    groupDirectoryByCategory,
} from '../../services/finishingMarketplace';
import type { FinishingDirectoryEntry, FinishingMarketCategory } from '../../types';
import FinishingCostEstimator from './FinishingCostEstimator';
import {
    buildProviderRequestState,
    formatPartnerPrice,
    localized,
    providerKindLabel,
    type ProviderRequestContext,
} from './marketplaceShared';

const ProviderServiceCard: React.FC<{
    entry: FinishingDirectoryEntry;
    category: FinishingMarketCategory;
    cityName: (id: string) => string;
    requestContext: ProviderRequestContext;
}> = ({ entry, category, cityName, requestContext }) => {
    const { language, t } = useLanguage();
    const navigate = useNavigate();
    const { provider, service } = entry;
    const providerName = localized(provider.name, language);
    const serviceTitle = localized(service.title, language) || localized(category.name, language);
    const serviceDescription = localized(service.description, language) || localized(provider.description, language);

    return (
        <Card className="flex flex-col h-full p-0 overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-6 flex flex-col flex-grow gap-4">
                <div className="flex items-center gap-4">
                    {provider.imageUrl ? (
                        <img
                            src={provider.imageUrl}
                            alt={providerName}
                            className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-gray-600 flex-shrink-0"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xl font-bold text-amber-700 dark:text-amber-300 flex-shrink-0">
                            {providerName.slice(0, 1)}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{providerName}</h3>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                            {providerKindLabel(provider.profileKind, language)}
                        </span>
                    </div>
                </div>

                <div className="flex-grow">
                    <p className="font-semibold text-amber-700 dark:text-amber-400">{serviceTitle}</p>
                    {serviceDescription && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{serviceDescription}</p>
                    )}
                </div>

                <div className="space-y-2 text-sm">
                    <p className="font-bold text-gray-900 dark:text-white">{formatPartnerPrice(service, language)}</p>
                    {provider.servedCities.length > 0 && (
                        <p className="flex items-start gap-1.5 text-gray-500 dark:text-gray-400">
                            <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{provider.servedCities.map(cityName).join('، ')}</span>
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <Link
                        to={`/partners/${provider.id}`}
                        className="text-center px-4 py-2 rounded-md border border-amber-500 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm"
                    >
                        {language === 'ar' ? 'عرض البروفايل' : 'View profile'}
                    </Link>
                    <Button
                        size="sm"
                        onClick={() =>
                            navigate('/request-service', {
                                state: buildProviderRequestState(provider, service, category, language, requestContext),
                            })
                        }
                    >
                        {t.finishingPage.requestButton}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const FinishingPage: React.FC = () => {
    const { language, t } = useLanguage();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const activeCityId = useCityStore((state) => state.activeCityId);
    const cities = useCityStore((state) => state.cities);
    const { data: siteContent } = useSiteContent();

    // Linked property context (from a property page)
    const linkedPropertyId = location.state?.propertyId || searchParams.get('propertyId') || undefined;
    const linkedPropertyCityId = location.state?.cityId || searchParams.get('cityId') || undefined;
    const effectiveCityId = linkedPropertyCityId || activeCityId || 'heliopolis';
    const linkedPropertyTitle = location.state?.propertyTitle || searchParams.get('propertyTitle') || undefined;
    const linkedPropertyReference =
        location.state?.propertyReference ||
        searchParams.get('propertyReference') ||
        (linkedPropertyId ? resolvePropertyReferenceCode(linkedPropertyId) : undefined);
    const linkedPropertyArea = location.state?.propertyArea ? Number(location.state.propertyArea) : undefined;
    const rawType = (location.state?.propertyType || searchParams.get('propertyType') || '').toLowerCase();
    const linkedPropertyType =
        rawType.includes('villa') || rawType.includes('فيلا') || rawType.includes('townhouse') || rawType.includes('twin')
            ? 'villa'
            : 'apartment';

    const requestContext: ProviderRequestContext = {
        propertyId: linkedPropertyId,
        propertyReference: linkedPropertyReference,
        propertyTitle: linkedPropertyTitle,
        cityId: effectiveCityId,
    };

    const categoriesQuery = useQuery({
        queryKey: ['finishingMarketCategories'],
        queryFn: () => getFinishingMarketCategories(),
        staleTime: 60000,
    });
    const directoryQuery = useQuery({
        queryKey: ['finishingDirectory'],
        queryFn: getFinishingDirectory,
        staleTime: 60000,
    });

    const groups = useMemo(
        () => groupDirectoryByCategory(categoriesQuery.data || [], directoryQuery.data || []),
        [categoriesQuery.data, directoryQuery.data]
    );
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(searchParams.get('category'));
    const activeGroup = groups.find((g) => g.category.id === activeCategoryId) || groups[0];

    const cityName = (id: string) => {
        const city = cities.find((c) => c.id === id || c.slug === id);
        return city ? localized(city.name, language) : id;
    };

    const defaultContent = t.finishingPage;
    const dynamicContent = siteContent?.finishingPage?.[language];
    const heroTitle = dynamicContent?.heroTitle || defaultContent.heroTitle;
    const heroSubtitle = dynamicContent?.heroSubtitle || defaultContent.heroSubtitle;
    const heroImageUrl =
        siteContent?.finishingPage?.heroImageUrl ||
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?fm=webp&q=75&w=1600&auto=format&fit=crop';

    const scrollToDirectory = () => {
        document.getElementById('finishing-directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleShare = async () => {
        const urlToShare = window.location.href;
        const shareData = { title: `${t.nav.finishing}`, text: heroSubtitle, url: urlToShare };
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

    const isLoading = categoriesQuery.isLoading || directoryQuery.isLoading;
    const isError = categoriesQuery.isError || directoryQuery.isError;

    return (
        <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
            <SEO title={`${t.nav.finishing}`} description={heroSubtitle} />

            {/* Hero */}
            <section
                className="relative h-[44vh] min-h-[340px] flex items-center justify-center text-center bg-cover bg-center"
                style={{ backgroundImage: `url('${heroImageUrl}')` }}
            >
                <div className="absolute inset-0 bg-black/70 z-10"></div>
                <div className="relative z-20 px-4 container mx-auto text-white">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-shadow mb-4">{heroTitle}</h1>
                    <p className="max-w-3xl mx-auto text-base md:text-xl text-gray-200 text-shadow">{heroSubtitle}</p>
                    <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
                        <Button onClick={scrollToDirectory} className="font-bold">
                            {defaultContent.ctaButton}
                        </Button>
                        <Button
                            onClick={handleShare}
                            variant="secondary"
                            className="bg-white/20 text-white border-white/50 hover:bg-white/30 backdrop-blur-sm"
                        >
                            <ShareIcon className="w-5 h-5 me-2" />
                            {t.sharing.share}
                        </Button>
                    </div>
                </div>
            </section>

            {/* Linked property banner */}
            {linkedPropertyId && (
                <section className="bg-amber-500/10 border-y border-amber-500/30 py-3.5 px-4">
                    <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3">
                            <span className="p-2 rounded-lg bg-amber-500 text-gray-950 font-bold">
                                <BuildingIcon className="w-5 h-5" />
                            </span>
                            <div>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    {language === 'ar' ? 'طلبك مرتبط بالعقار:' : 'Your request is linked to property:'}
                                </span>{' '}
                                {linkedPropertyReference && (
                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 me-1.5">
                                        {linkedPropertyReference}
                                    </span>
                                )}
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    {linkedPropertyTitle || linkedPropertyId}
                                </span>
                            </div>
                        </div>
                        <Link to={`/properties/${linkedPropertyId}`} className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline">
                            {language === 'ar' ? 'الرجوع لصفحة العقار' : 'Back to property'}
                        </Link>
                    </div>
                </section>
            )}

            <BannerDisplay location="finishing" />

            {/* Provider directory by category */}
            <section id="finishing-directory" className="py-16 md:py-20 scroll-mt-20">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-10 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{defaultContent.servicesTitle}</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400 mt-3">{defaultContent.servicesSubtitle}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{defaultContent.servicesIntro}</p>
                    </div>

                    {isLoading ? (
                        <div className="py-16 text-center">
                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                    ) : isError ? (
                        <div className="max-w-lg mx-auto text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
                            <p className="font-semibold mb-4">
                                {language === 'ar' ? 'تعذر تحميل مقدمي خدمات التشطيب' : 'Failed to load finishing providers'}
                            </p>
                            <Button
                                onClick={() => {
                                    categoriesQuery.refetch();
                                    directoryQuery.refetch();
                                }}
                            >
                                {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                            </Button>
                        </div>
                    ) : groups.length === 0 ? null : (
                        <>
                            <div className="flex flex-wrap justify-center gap-3 mb-6" role="tablist">
                                {groups.map(({ category, entries }) => {
                                    const selected = activeGroup?.category.id === category.id;
                                    return (
                                        <button
                                            key={category.id}
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => setActiveCategoryId(category.id)}
                                            className={`px-5 py-2.5 rounded-full font-bold text-sm md:text-base transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                                                selected
                                                    ? 'bg-amber-500 text-gray-900 shadow-md'
                                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            {localized(category.name, language)}
                                            <span className="ms-2 text-xs opacity-70">({entries.length})</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {activeGroup && (
                                <div role="tabpanel">
                                    <p className="text-center text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
                                        {localized(activeGroup.category.description, language)}
                                    </p>
                                    {activeGroup.entries.length === 0 ? (
                                        <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                                            {language === 'ar'
                                                ? 'لا يوجد مقدمو خدمة معتمدون في هذه الفئة حاليًا.'
                                                : 'There are no approved providers in this category yet.'}
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {activeGroup.entries.map((entry) => (
                                                <ProviderServiceCard
                                                    key={entry.service.id}
                                                    entry={entry}
                                                    category={activeGroup.category}
                                                    cityName={cityName}
                                                    requestContext={requestContext}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Indicative cost calculator (managed in Phase 3) */}
            <div className="container mx-auto px-6">
                <FinishingCostEstimator
                    defaultArea={linkedPropertyArea}
                    defaultPropertyType={linkedPropertyType}
                    propertyId={linkedPropertyId}
                    propertyReference={linkedPropertyReference}
                    propertyTitle={linkedPropertyTitle}
                    cityId={effectiveCityId}
                />
            </div>

            <section className="py-16 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900 dark:text-white">{defaultContent.ctaTitle}</h2>
                    <p className="max-w-2xl mx-auto text-gray-500 dark:text-gray-400 mb-6">{defaultContent.ctaSubtitle}</p>
                    <Button onClick={scrollToDirectory} className="font-bold px-8">
                        {defaultContent.ctaButton}
                    </Button>
                </div>
            </section>
        </div>
    );
};

export default FinishingPage;

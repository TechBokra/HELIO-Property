
import React, { useState, useMemo, useEffect } from 'react';
// FIX: Imported 'keepPreviousData' for use with TanStack Query v5's placeholderData option.
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import SEO from '../shared/SEO';
import { useLanguage } from '../shared/LanguageContext';
import { GridIcon, ListIcon } from '../ui/Icons';
import PropertyFilters from './PropertyFilters';
import PropertyCard from './PropertyCard';
import PropertyListItem from './PropertyListItem';
import PropertyCardSkeleton from '../shared/PropertyCardSkeleton';
import PropertyListItemSkeleton from '../shared/PropertyListItemSkeleton';
import PropertyInquiryModal from '../shared/PropertyInquiryModal';
import { getPublicProjects } from '../../services/projects';
import { getPublicPartners } from '../../services/partners';
import { getAllPropertyTypes, getAllFinishingStatuses, getAllAmenities } from '../../services/filters';
import { getPaginatedProperties } from '../../services/properties';
import { usePropertyFilters } from '../../hooks/usePropertyFilters';
import Pagination from '../shared/Pagination';
import { useCityStore } from '../../store/useCityStore';
import ErrorState from '../shared/ErrorState';
import { sanitizePropertyReadError } from '../../utils/propertyUtils';

const ITEMS_PER_PAGE = 12;

const PropertiesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_page = t.propertiesPage;
    const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
    const activeCityId = useCityStore((s) => s.activeCityId);
    const activeCity = useCityStore((s) => s.getActiveCity());
    
    const filterControls = usePropertyFilters();
    const { 
        page, view, status, type, query, minPrice, maxPrice, project, 
        finishing, installments, realEstateFinance, floor, compound, delivery, 
        amenities: amenitiesFilter, beds, baths, setFilter, setPage
    } = filterControls;
    
    // Fetch dependencies (dropdown options) with 10-minute cache
    const { data: projects } = useQuery({ 
        queryKey: ['publicProjects', activeCityId], 
        queryFn: () => getPublicProjects(activeCityId),
        staleTime: 1000 * 60 * 10
    });
    const { data: partners } = useQuery({ 
        queryKey: ['publicPartners'], 
        queryFn: () => getPublicPartners(),
        staleTime: 1000 * 60 * 10
    });
    const { data: propertyTypes } = useQuery({ 
        queryKey: ['propertyTypes'], 
        queryFn: getAllPropertyTypes,
        staleTime: 1000 * 60 * 10
    });
    const { data: finishingStatuses } = useQuery({ 
        queryKey: ['finishingStatuses'], 
        queryFn: getAllFinishingStatuses,
        staleTime: 1000 * 60 * 10
    });
    const { data: amenities } = useQuery({ 
        queryKey: ['amenities'], 
        queryFn: getAllAmenities,
        staleTime: 1000 * 60 * 10
    });
    
    // Memoize filters to prevent unnecessary query refetches
    const queryFilters = useMemo(() => ({
        status, type, query, minPrice, maxPrice, project, finishing, 
        installments, realEstateFinance, floor, compound, delivery, 
        amenities: amenitiesFilter, beds, baths
    }), [
        status, type, query, minPrice, maxPrice, project, finishing, 
        installments, realEstateFinance, floor, compound, delivery, 
        amenitiesFilter, beds, baths
    ]);

    // Fetch properties
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const { 
        data: propertiesData, 
        isLoading: propsLoading,
        isError: isPropsError,
        error: propsError,
        refetch: refetchProps
    } = useQuery({
        queryKey: ['properties', activeCityId, safePage, queryFilters],
        queryFn: () => getPaginatedProperties({ 
            page: safePage, 
            limit: ITEMS_PER_PAGE, 
            filters: { ...queryFilters, view: (view as 'grid' | 'list') },
            disablePagination: false,
            cityId: activeCityId,
        }),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 2, // 2 minutes cache for listing pages
    });
    
    const properties = propertiesData?.properties || [];
    const totalProperties = propertiesData?.total || 0;
    const totalPages = Math.ceil(totalProperties / ITEMS_PER_PAGE);

    const sanitizedError = useMemo(() => {
        if (!isPropsError || !propsError) return null;
        return sanitizePropertyReadError(propsError, language);
    }, [isPropsError, propsError, language]);

    useEffect(() => {
        if (sanitizedError) {
            console.error('[PropertiesPage] Catalog read failed:', sanitizedError.diagnosticCode);
        }
    }, [sanitizedError]);

    // This logic was incorrect in the original file, it should depend on filterControls.view
    const gridClasses = filterControls.view === 'list' 
        ? 'grid-cols-1 gap-4' 
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8';

    const brandLabel = activeCity?.brandTitle?.[language] || 'ONLY HELIO';

    return (
        <div className="bg-white dark:bg-gray-900 min-h-screen">
            <SEO title={`${t.nav.properties} | ${brandLabel}`} description={t_page.subtitle} />
            {isInquiryModalOpen && <PropertyInquiryModal onClose={() => setIsInquiryModalOpen(false)} />}
            
            <div className="container mx-auto px-6 py-8">
                <PropertyFilters
                    filters={filterControls as any}
                    projects={projects || []}
                    partners={partners || []}
                    propertyTypes={propertyTypes || []}
                    finishingStatuses={finishingStatuses || []}
                    amenities={amenities || []}
                />
            </div>
            
            {/* Toolbar Section */}
            <div className="bg-gray-50 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 py-4 sticky top-16 lg:top-20 z-30 shadow-sm">
                <div className="container mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                        {propsLoading
                            ? (language === 'ar' ? 'جاري تحميل العقارات...' : 'Loading properties...')
                            : isPropsError
                                ? (language === 'ar' ? 'تعذر تحميل العقارات' : 'Unable to load properties')
                                : t.propertiesPage.resultsFound.replace('{count}', String(totalProperties))}
                    </p>

                    <div className="flex items-center gap-2 bg-white dark:bg-gray-700 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                        <button
                            onClick={() => setFilter('view', 'grid')}
                            className={`p-2 rounded-md transition-all ${filterControls.view === 'grid' ? 'bg-amber-500 text-white shadow' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                            aria-label="Grid View"
                            title={language === 'ar' ? 'عرض شبكي' : 'Grid View'}
                        >
                            <GridIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setFilter('view', 'list')}
                            className={`p-2 rounded-md transition-all ${filterControls.view === 'list' ? 'bg-amber-500 text-white shadow' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                            aria-label="List View"
                            title={language === 'ar' ? 'عرض قائمة' : 'List View'}
                        >
                            <ListIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="container mx-auto px-6 py-12">
                {propsLoading ? (
                    <div className={`grid ${gridClasses}`}>
                        {Array.from({ length: 6 }).map((_, i) => filterControls.view === 'list' ? <PropertyListItemSkeleton key={i} /> : <PropertyCardSkeleton key={i} />)}
                    </div>
                ) : isPropsError ? (
                    <ErrorState
                        title={sanitizedError?.visitorTitle || (language === 'ar' ? 'حدث خطأ أثناء تحميل العقارات' : 'Unable to load properties')}
                        message={sanitizedError?.visitorMessage || (language === 'ar' ? 'تعذر عرض قائمة العقارات مؤقتاً. يرجى إعادة المحاولة بعد قليل.' : 'The property catalog is temporarily unavailable. Please try again shortly.')}
                        retryLabel={language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                        onRetry={() => refetchProps()}
                        className="max-w-lg mx-auto py-12"
                    />
                ) : (
                    <>
                        {properties.length > 0 ? (
                            <div className={`grid ${gridClasses}`}>
                                {properties.map(prop => (
                                    filterControls.view === 'list' ? (
                                        <PropertyListItem key={prop.id} {...prop} />
                                    ) : (
                                        <PropertyCard key={prop.id} {...prop} />
                                    )
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg shadow-inner border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-xl text-gray-500 dark:text-gray-400 mb-6">{t_page.noResults}</p>
                                <div className="text-center">
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{t_page.cantFindTitle}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 my-2">{t_page.cantFindSubtitle}</p>
                                    <button onClick={() => setIsInquiryModalOpen(true)} className="mt-2 text-amber-500 font-semibold hover:underline">
                                        {t_page.leaveRequestButton}
                                    </button>
                                </div>
                            </div>
                        )}
                        {totalPages > 1 && (
                            <div className="mt-12">
                                <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PropertiesPage;

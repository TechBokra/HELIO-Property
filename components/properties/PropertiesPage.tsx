
import React, { useState, useMemo } from 'react';
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
import { getAllProjects } from '../../services/projects';
import { getAllPartnersForAdmin } from '../../services/partners';
import { getAllPropertyTypes, getAllFinishingStatuses, getAllAmenities } from '../../services/filters';
import { getPaginatedProperties } from '../../services/properties';
import { usePropertyFilters } from '../../hooks/usePropertyFilters';
import Pagination from '../shared/Pagination';

const ITEMS_PER_PAGE = 12;

const PropertiesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_page = t.propertiesPage;
    const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
    
    const filterControls = usePropertyFilters();
    const { 
        page, view, status, type, query, minPrice, maxPrice, project, 
        finishing, installments, realEstateFinance, floor, compound, delivery, 
        amenities: amenitiesFilter, beds, baths, setFilter, setPage
    } = filterControls;
    
    // Fetch dependencies (dropdown options)
    const { data: projects, isLoading: pLoading } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
    const { data: partners, isLoading: paLoading } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const { data: propertyTypes, isLoading: ptLoading } = useQuery({ queryKey: ['propertyTypes'], queryFn: getAllPropertyTypes });
    const { data: finishingStatuses, isLoading: fsLoading } = useQuery({ queryKey: ['finishingStatuses'], queryFn: getAllFinishingStatuses });
    const { data: amenities, isLoading: amLoading } = useQuery({ queryKey: ['amenities'], queryFn: getAllAmenities });
    
    // Memoize filters to prevent unnecessary query refetches
    const queryFilters = useMemo(() => ({
        view, // Include view property
        status, type, query, minPrice, maxPrice, project, finishing, 
        installments, realEstateFinance, floor, compound, delivery, 
        amenities: amenitiesFilter, beds, baths
    }), [
        view,
        status, type, query, minPrice, maxPrice, project, finishing, 
        installments, realEstateFinance, floor, compound, delivery, 
        amenitiesFilter, beds, baths
    ]);

    // Fetch properties
    const { data: propertiesData, isLoading: propsLoading } = useQuery({
        queryKey: ['properties', page, queryFilters],
        queryFn: () => getPaginatedProperties({ 
            page: page, 
            limit: ITEMS_PER_PAGE, 
            filters: queryFilters,
            disablePagination: false,
        }),
        // FIX: Replaced deprecated `keepPreviousData: true` with `placeholderData: keepPreviousData` for TanStack Query v5.
        placeholderData: keepPreviousData,
    });
    
    const isLoadingDependencies = pLoading || paLoading || ptLoading || fsLoading || amLoading;
    const isLoadingAny = isLoadingDependencies || propsLoading;
    const properties = propertiesData?.properties || [];
    const totalProperties = propertiesData?.total || 0;
    const totalPages = Math.ceil(totalProperties / ITEMS_PER_PAGE);

    // This logic was incorrect in the original file, it should depend on filterControls.view
    const gridClasses = filterControls.view === 'list' 
        ? 'grid-cols-1 gap-4' 
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8';

    return (
        <div className="bg-white dark:bg-gray-900 min-h-screen">
            <SEO title={`${t.nav.properties} | ONLY HELIO`} description={t_page.subtitle} />
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
                        {t.propertiesPage.resultsFound.replace('{count}', String(totalProperties))}
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
                {isLoadingAny ? (
                    <div className={`grid ${gridClasses}`}>
                        {Array.from({ length: 6 }).map((_, i) => filterControls.view === 'list' ? <PropertyListItemSkeleton key={i} /> : <PropertyCardSkeleton key={i} />)}
                    </div>
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
                        <div className="mt-12">
                            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PropertiesPage;

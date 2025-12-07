
import React, { useState, useMemo } from 'react';
import type { Language, Project, AdminPartner, FilterOption } from '../../types';
import { SearchIcon, ArrowDownIcon, ChevronRightIcon, AdjustmentsHorizontalIcon } from '../ui/Icons';
import type { usePropertyFilters } from '../../hooks/usePropertyFilters';
import { useLanguage } from '../shared/LanguageContext';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { Button } from '../ui/Button';

interface PropertyFiltersProps {
  filters: ReturnType<typeof usePropertyFilters>;
  projects: Project[];
  partners: AdminPartner[];
  propertyTypes: FilterOption[];
  finishingStatuses: FilterOption[];
  amenities: FilterOption[];
}

const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  filters,
  projects = [],
  partners = [],
  propertyTypes = [],
  finishingStatuses = [],
  amenities = [],
}) => {
    const { language, t } = useLanguage();
    // Correctly scope translations
    const t_page = t.propertiesPage;
    const t_card = t.propertyCard;
    
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    const { 
        setFilter, 
        resetFilters,
        status: statusFilter, type: typeFilter, query: queryFilter, 
        minPrice: minPriceFilter, maxPrice: maxPriceFilter, project: projectFilter, 
        finishing: finishingFilter, installments: installmentsFilter, floor: floorFilter, 
        compound: compoundFilter, delivery: deliveryFilter, amenities: amenitiesFilter,
        beds: bedsFilter, baths: bathsFilter, realEstateFinance: realEstateFinanceFilter,
    } = filters;

    const isAnyFilterActive = useMemo(() => {
        return (
            statusFilter !== 'all' || typeFilter !== 'all' || queryFilter !== '' ||
            minPriceFilter !== '' || maxPriceFilter !== '' || projectFilter !== 'all' ||
            finishingFilter !== 'all' || installmentsFilter !== 'all' || realEstateFinanceFilter !== 'all' ||
            floorFilter !== '' || compoundFilter !== 'all' || deliveryFilter !== 'all' ||
            amenitiesFilter.length > 0 || bedsFilter !== '' || bathsFilter !== ''
        );
    }, [filters]);

    const handleAmenitiesChange = (amenityEn: string) => {
        const newAmenities = amenitiesFilter.includes(amenityEn)
            ? amenitiesFilter.filter(a => a !== amenityEn)
            : [...amenitiesFilter, amenityEn];
        setFilter('amenities', newAmenities);
    };

    // Helper to check applicability
    const isApplicable = (option: FilterOption) => {
        if (typeFilter === 'all' || typeFilter === '') return true;
        if (!option.applicableTo || option.applicableTo.length === 0) return true;
        return option.applicableTo.includes(typeFilter);
    };

    const availableAmenities = useMemo(() => {
        return (amenities || []).filter(isApplicable);
    }, [amenities, typeFilter]);

    const availableFinishingStatuses = useMemo(() => {
        return (finishingStatuses || []).filter(isApplicable);
    }, [finishingStatuses, typeFilter]);

    return (
      <>
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">{t_page.title}</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 mt-4 max-w-2xl mx-auto">{t_page.subtitle}</p>
        </div>
        
        <div className="mb-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.searchLabel}</label>
              <div className="relative">
                  <Input 
                    type="text" 
                    id="search-query"
                    value={queryFilter} 
                    onChange={e => setFilter('q', e.target.value)}
                    placeholder={t_page.searchPlaceholder}
                    className="pl-10"
                  />
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.statusLabel}</label>
                <Select value={statusFilter} onChange={e => setFilter('status', e.target.value)}>
                    <option value="all">{t_page.allStatuses}</option>
                    <option value="For Sale">{t_page.forSale}</option>
                    <option value="For Rent">{t_page.forRent}</option>
                </Select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.typeLabel}</label>
                <Select value={typeFilter} onChange={e => setFilter('type', e.target.value)}>
                    <option value="all">{t_page.allTypes}</option>
                    {propertyTypes.map(type => (
                        <option key={type.id} value={type.en}>{type[language]}</option>
                    ))}
                </Select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.priceRange}</label>
                <div className="flex gap-2">
                    <Input 
                        type="number" 
                        placeholder={t_page.minPricePlaceholder} 
                        value={minPriceFilter} 
                        onChange={e => setFilter('minPrice', e.target.value)} 
                    />
                    <Input 
                        type="number" 
                        placeholder={t_page.maxPricePlaceholder} 
                        value={maxPriceFilter} 
                        onChange={e => setFilter('maxPrice', e.target.value)} 
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.finishing}</label>
                <Select value={finishingFilter} onChange={e => setFilter('finishing', e.target.value)} disabled={availableFinishingStatuses.length === 0}>
                    <option value="all">{t_page.allFinishes}</option>
                    {availableFinishingStatuses.map(status => (
                        <option key={status.id} value={status.en}>{status[language]}</option>
                    ))}
                </Select>
            </div>
          </div>
          
          {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.project}</label>
                     <Select value={projectFilter} onChange={e => setFilter('project', e.target.value)}>
                        <option value="all">{t_page.allProjects}</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name[language]}</option>)}
                    </Select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.installments}</label>
                     <Select value={installmentsFilter} onChange={e => setFilter('installments', e.target.value)}>
                        <option value="all">{t_page.allInstallments}</option>
                        <option value="yes">{t_page.installmentsYes}</option>
                        <option value="no">{t_page.installmentsNo}</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.realEstateFinance}</label>
                     <Select value={realEstateFinanceFilter} onChange={e => setFilter('realEstateFinance', e.target.value)}>
                        <option value="all">{t_page.allRealEstateFinance}</option>
                        <option value="yes">{t_page.realEstateFinanceYes}</option>
                        <option value="no">{t_page.realEstateFinanceNo}</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.inCompound}</label>
                     <Select value={compoundFilter} onChange={e => setFilter('compound', e.target.value)}>
                        <option value="all">{t_page.allCompound}</option>
                        <option value="yes">{t_page.compoundYes}</option>
                        <option value="no">{t_page.compoundNo}</option>
                    </Select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.delivery}</label>
                     <Select value={deliveryFilter} onChange={e => setFilter('delivery', e.target.value)}>
                        <option value="all">{t_page.allDelivery}</option>
                        <option value="immediate">{t_page.immediateDelivery}</option>
                    </Select>
                  </div>
                   <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_page.floor}</label>
                        <Input type="number" value={floorFilter} onChange={e => setFilter('floor', e.target.value)} />
                      </div>
                      <div>
                        {/* Safe access to t_card properties */}
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_card?.beds || 'Beds'}</label>
                        <Input type="number" value={bedsFilter} onChange={e => setFilter('beds', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t_card?.baths || 'Baths'}</label>
                        <Input type="number" value={bathsFilter} onChange={e => setFilter('baths', e.target.value)} />
                      </div>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t_page.amenities}</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {availableAmenities.map(amenity => (
                              <div key={amenity.id} className="flex items-center gap-2">
                                  <Checkbox 
                                    id={`amenity-${amenity.id}`}
                                    checked={amenitiesFilter.includes(amenity.en)}
                                    onCheckedChange={() => handleAmenitiesChange(amenity.en)}
                                  />
                                  <label htmlFor={`amenity-${amenity.id}`} className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                                      {amenity[language]}
                                  </label>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          <div className="flex justify-between items-center pt-2">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 focus:outline-none"
              >
                  <AdjustmentsHorizontalIcon className="w-5 h-5" />
                  {showAdvanced ? t_page.hideFilters : t_page.advancedFilters}
                  {showAdvanced ? <ChevronRightIcon className={`w-4 h-4 rotate-90 transition-transform`} /> : <ChevronRightIcon className={`w-4 h-4 transition-transform`} />}
              </button>

              {isAnyFilterActive && (
                  <Button variant="ghost" onClick={resetFilters} size="sm" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                      Reset Filters
                  </Button>
              )}
          </div>
        </div>
      </>
    );
};

export default PropertyFilters;

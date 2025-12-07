
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import type { Language, Property } from '../../types';
import PropertyCard from './PropertyCard';
import PropertyCardSkeleton from '../shared/PropertyCardSkeleton';
import { useLanguage } from '../shared/LanguageContext';
import UnifiedMap, { MapMarker } from '../shared/UnifiedMap';

interface PropertiesMapViewProps {
    properties: Property[];
    loading: boolean;
    activePropertyId: string | null;
    setActivePropertyId: (id: string | null) => void;
}

const MapTooltip: React.FC<{ property: Property, language: Language }> = ({ property, language }) => {
    return (
        <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200 w-48 animate-fadeIn">
            <div className="h-24 bg-gray-200 relative">
                 <img src={property.imageUrl_small || property.imageUrl} alt={property.title[language]} className="w-full h-full object-cover" />
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-1/2"></div>
            </div>
            <div className="p-2">
                <p className="text-amber-600 font-bold text-xs mb-0.5">{property.price[language]}</p>
                <h3 className="font-semibold text-xs truncate text-gray-900">{property.title[language]}</h3>
            </div>
        </div>
    );
};

const PropertiesMapView: React.FC<PropertiesMapViewProps> = ({ properties, loading, activePropertyId, setActivePropertyId }) => {
    const { language, t } = useLanguage();
    const listRef = useRef<HTMLDivElement>(null);

    // Convert properties to UnifiedMap markers
    const markers: MapMarker[] = useMemo(() => {
        return properties.map(p => ({
            id: p.id,
            lat: p.location.lat,
            lng: p.location.lng,
            tooltip: <MapTooltip property={p} language={language} />,
            color: activePropertyId === p.id ? 'amber' : 'red',
            onClick: () => {
                setActivePropertyId(p.id);
                const element = listRef.current?.querySelector(`[data-property-id="${p.id}"]`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }));
    }, [properties, language, activePropertyId, setActivePropertyId]);
    
    const scrollToListing = useCallback((id: string | null) => {
        if (id && listRef.current) {
            const element = listRef.current.querySelector(`[data-property-id="${id}"]`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, []);

    // Scroll list to active property when map pin is clicked (or hovered externally)
    useEffect(() => {
        scrollToListing(activePropertyId);
    }, [activePropertyId, scrollToListing]);

    return (
        <div className="flex flex-col md:flex-row h-full w-full">
            {/* Property List */}
            <div ref={listRef} className="w-full md:w-1/2 lg:w-2/5 xl:w-1/3 h-1/2 md:h-full overflow-y-auto p-4 space-y-4 bg-gray-50 border-r border-gray-200 shadow-inner z-10">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => <PropertyCardSkeleton key={i} />)
                ) : properties.length > 0 ? (
                    properties.map(prop => (
                        <div 
                            key={prop.id}
                            data-property-id={prop.id}
                            onMouseEnter={() => setActivePropertyId(prop.id)}
                            onMouseLeave={() => setActivePropertyId(null)}
                            className={`rounded-lg transition-all duration-300 ${activePropertyId === prop.id ? 'shadow-xl ring-2 ring-amber-500 transform scale-[1.02] z-20 relative' : 'opacity-90 hover:opacity-100'}`}
                        >
                           <PropertyCard {...prop} />
                        </div>
                    ))
                ) : (
                    <div className="text-center p-8 text-gray-500 h-full flex items-center justify-center">
                        {t.propertiesPage.noResults}
                    </div>
                )}
            </div>

            {/* Unified Map */}
            <div className="flex-1 h-1/2 md:h-full relative overflow-hidden">
                <UnifiedMap 
                    markers={markers}
                    activeMarkerId={activePropertyId}
                    onMarkerHover={setActivePropertyId}
                    height="100%"
                />
            </div>
        </div>
    );
};

export default PropertiesMapView;

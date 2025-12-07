
import type { Property, PropertyFiltersType } from '../types';

export const filterProperties = (properties: Property[], filters: PropertyFiltersType): Property[] => {
    return properties.filter(p => {
        // 1. Status Filter
        const statusMatch = filters.status === 'all' || p.status.en === filters.status;
        
        // 2. Type Filter
        const typeMatch = filters.type === 'all' || p.type.en === filters.type;
        
        // 3. Project Filter
        const projectMatch = filters.project === 'all' || p.projectId === filters.project;
        
        // 4. Search Query (Text Search)
        const searchTerm = filters.query.toLowerCase().trim();
        const queryMatch = !searchTerm || 
            p.title.ar.toLowerCase().includes(searchTerm) ||
            p.title.en.toLowerCase().includes(searchTerm) ||
            p.address.ar.toLowerCase().includes(searchTerm) ||
            p.address.en.toLowerCase().includes(searchTerm) ||
            (p.partnerName && p.partnerName.toLowerCase().includes(searchTerm)) || false;

        // 5. Price Range
        const minPrice = parseInt(filters.minPrice, 10);
        const maxPrice = parseInt(filters.maxPrice, 10);
        const priceMatch = 
            (!minPrice || p.priceNumeric >= minPrice) && 
            (!maxPrice || p.priceNumeric <= maxPrice);

        // 6. Finishing Status
        const finishingMatch = filters.finishing === 'all' || p.finishingStatus?.en === filters.finishing;

        // 7. Installments
        const installmentsMatch = filters.installments === 'all' ||
            (filters.installments === 'yes' && p.installmentsAvailable) ||
            (filters.installments === 'no' && !p.installmentsAvailable);
        
        // 8. Real Estate Finance
        const realEstateFinanceMatch = filters.realEstateFinance === 'all' ||
            (filters.realEstateFinance === 'yes' && p.realEstateFinanceAvailable) ||
            (filters.realEstateFinance === 'no' && !p.realEstateFinanceAvailable);

        // 9. Floor
        const floorMatch = !filters.floor || (p.floor !== undefined && p.floor === parseInt(filters.floor, 10));

        // 10. Compound
        const compoundMatch = filters.compound === 'all' || 
            (filters.compound === 'yes' && p.isInCompound) ||
            (filters.compound === 'no' && !p.isInCompound);

        // 11. Delivery
        const deliveryMatch = filters.delivery === 'all' ||
            (filters.delivery === 'immediate' && p.delivery?.isImmediate);
        
        // 12. Amenities (AND Logic: Property must have ALL selected amenities)
        const amenitiesMatch = filters.amenities.length === 0 || 
            filters.amenities.every((amenity: string) => p.amenities.en.includes(amenity));

        // 13. Beds & Baths (Minimum value logic)
        const bedsMatch = !filters.beds || p.beds >= parseInt(filters.beds, 10);
        const bathsMatch = !filters.baths || p.baths >= parseInt(filters.baths, 10);

        return statusMatch && typeMatch && queryMatch && priceMatch && finishingMatch && 
               installmentsMatch && realEstateFinanceMatch && floorMatch && compoundMatch && 
               deliveryMatch && amenitiesMatch && projectMatch && bedsMatch && bathsMatch;
    });
};

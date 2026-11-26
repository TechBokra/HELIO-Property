
import type { Property, PropertyFiltersType } from '../types';

export const filterProperties = (properties: Property[], filters: Partial<PropertyFiltersType>): Property[] => {
    const safeStatus = filters?.status || 'all';
    const safeType = filters?.type || 'all';
    const safeProject = filters?.project || 'all';
    const safeFinishing = filters?.finishing || 'all';
    const safeInstallments = filters?.installments || 'all';
    const safeFinance = filters?.realEstateFinance || 'all';
    const safeCompound = filters?.compound || 'all';
    const safeDelivery = filters?.delivery || 'all';
    const safeAmenities = Array.isArray(filters?.amenities) ? filters.amenities : [];
    const searchTerm = String(filters?.query || '').toLowerCase().trim();
    const minPrice = parseInt(String(filters?.minPrice || ''), 10);
    const maxPrice = parseInt(String(filters?.maxPrice || ''), 10);
    const parsedFloor = filters?.floor !== undefined && filters?.floor !== '' ? parseInt(String(filters.floor), 10) : NaN;
    const minBeds = parseInt(String(filters?.beds || ''), 10);
    const minBaths = parseInt(String(filters?.baths || ''), 10);

    return (properties || []).filter(p => {
        if (!p) return false;

        // 1. Status Filter
        const statusMatch = safeStatus === 'all' || p.status?.en === safeStatus;

        // 2. Type Filter
        const typeMatch = safeType === 'all' || p.type?.en === safeType;

        // 3. Project Filter
        const projectMatch = safeProject === 'all' || p.projectId === safeProject;

        // 4. Search Query (Text Search)
        const queryMatch = !searchTerm ||
            String(p.title?.ar || '').toLowerCase().includes(searchTerm) ||
            String(p.title?.en || '').toLowerCase().includes(searchTerm) ||
            String(p.address?.ar || '').toLowerCase().includes(searchTerm) ||
            String(p.address?.en || '').toLowerCase().includes(searchTerm) ||
            String(p.partnerName || '').toLowerCase().includes(searchTerm);

        // 5. Price Range
        const priceMatch =
            (!minPrice || p.priceNumeric >= minPrice) &&
            (!maxPrice || p.priceNumeric <= maxPrice);

        // 6. Finishing Status
        const finishingMatch = safeFinishing === 'all' || p.finishingStatus?.en === safeFinishing;

        // 7. Installments
        const installmentsMatch = safeInstallments === 'all' ||
            (safeInstallments === 'yes' && p.installmentsAvailable) ||
            (safeInstallments === 'no' && !p.installmentsAvailable);

        // 8. Real Estate Finance
        const realEstateFinanceMatch = safeFinance === 'all' ||
            (safeFinance === 'yes' && p.realEstateFinanceAvailable) ||
            (safeFinance === 'no' && !p.realEstateFinanceAvailable);

        // 9. Floor
        const floorMatch = Number.isNaN(parsedFloor) || (p.floor !== undefined && p.floor === parsedFloor);

        // 10. Compound
        const compoundMatch = safeCompound === 'all' ||
            (safeCompound === 'yes' && p.isInCompound) ||
            (safeCompound === 'no' && !p.isInCompound);

        // 11. Delivery
        const deliveryMatch = safeDelivery === 'all' ||
            (safeDelivery === 'immediate' && p.delivery?.isImmediate);

        // 12. Amenities (AND Logic: Property must have ALL selected amenities)
        const propAmenitiesEn = Array.isArray(p.amenities?.en) ? p.amenities.en : [];
        const amenitiesMatch = safeAmenities.length === 0 ||
            safeAmenities.every((amenity: string) => propAmenitiesEn.includes(amenity));

        // 13. Beds & Baths (Minimum value logic)
        const bedsMatch = !minBeds || (p.beds ?? 0) >= minBeds;
        const bathsMatch = !minBaths || (p.baths ?? 0) >= minBaths;

        return statusMatch && typeMatch && queryMatch && priceMatch && finishingMatch &&
               installmentsMatch && realEstateFinanceMatch && floorMatch && compoundMatch &&
               deliveryMatch && amenitiesMatch && projectMatch && bedsMatch && bathsMatch;
    });
};

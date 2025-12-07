import type { Property } from '../types';

export const isListingActive = (p: Property): boolean => {
    // This function is now simplified to just check the explicit status.
    // The date logic is still available on the property object if needed for display,
    // but it no longer determines if a property is "active" for listing purposes.
    return p.listingStatus === 'active';
};


export const isCommercial = (property: Property): boolean => {
    return property.type.en === 'Commercial';
};
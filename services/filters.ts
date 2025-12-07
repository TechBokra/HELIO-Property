
import { propertyTypesData as initialPropertyTypes, finishingStatusesData as initialFinishingStatuses, amenitiesData as initialAmenities } from '../data/filterOptions';
import type { FilterOption } from '../types';

// Create mutable, in-memory copies of the data to simulate a database.
let propertyTypesData: FilterOption[] = [...initialPropertyTypes];
let finishingStatusesData: FilterOption[] = [...initialFinishingStatuses];
let amenitiesData: FilterOption[] = [...initialAmenities];

const SIMULATED_DELAY = 100;

// Getters
export const getAllPropertyTypes = (): Promise<FilterOption[]> => new Promise(res => setTimeout(() => res([...propertyTypesData]), SIMULATED_DELAY));
export const getAllFinishingStatuses = (): Promise<FilterOption[]> => new Promise(res => setTimeout(() => res([...finishingStatusesData]), SIMULATED_DELAY));
export const getAllAmenities = (): Promise<FilterOption[]> => new Promise(res => setTimeout(() => res([...amenitiesData]), SIMULATED_DELAY));

// Generic Mutator
const mutateOptions = (
    dataType: 'propertyType' | 'finishingStatus' | 'amenity',
    operation: 'add' | 'update' | 'delete',
    item?: FilterOption | Omit<FilterOption, 'id'>,
    itemId?: string
) => {
    let dataArray: FilterOption[];
    switch (dataType) {
        case 'propertyType': dataArray = propertyTypesData; break;
        case 'finishingStatus': dataArray = finishingStatusesData; break;
        case 'amenity': dataArray = amenitiesData; break;
    }

    return new Promise((resolve) => {
        setTimeout(() => {
            switch (operation) {
                case 'add':
                    // Ensure item is present and treat as Omit<FilterOption, 'id'>
                    if (item) {
                         const newItem: FilterOption = { ...(item as Omit<FilterOption, 'id'>), id: `${dataType}-${Date.now()}` } as FilterOption;
                         dataArray.push(newItem);
                         resolve(newItem);
                    } else {
                        resolve(null); // Should handle error better
                    }
                    break;
                case 'update':
                    if (item && 'id' in item) {
                        const index = dataArray.findIndex(i => i.id === (item as FilterOption).id);
                        if (index > -1) {
                            dataArray[index] = item as FilterOption;
                            resolve(dataArray[index]);
                        } else {
                            resolve(null);
                        }
                    } else {
                         resolve(null);
                    }
                    break;
                case 'delete':
                    const initialLength = dataArray.length;
                    const updatedArray = dataArray.filter(i => i.id !== itemId);
                    if (updatedArray.length < initialLength) {
                        // Re-assign the local array variable
                        if (dataType === 'propertyType') propertyTypesData = updatedArray;
                        if (dataType === 'finishingStatus') finishingStatusesData = updatedArray;
                        if (dataType === 'amenity') amenitiesData = updatedArray;
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    break;
            }
        }, SIMULATED_DELAY);
    });
};

export const addFilterOption = (dataType: 'propertyType' | 'finishingStatus' | 'amenity', item: Omit<FilterOption, 'id'>): Promise<FilterOption> => {
    return mutateOptions(dataType, 'add', item) as Promise<FilterOption>;
};
export const updateFilterOption = (dataType: 'propertyType' | 'finishingStatus' | 'amenity', item: FilterOption): Promise<FilterOption | null> => {
    return mutateOptions(dataType, 'update', item) as Promise<FilterOption | null>;
};
export const deleteFilterOption = (dataType: 'propertyType' | 'finishingStatus' | 'amenity', itemId: string): Promise<boolean> => {
    return mutateOptions(dataType, 'delete', undefined, itemId) as Promise<boolean>;
};


import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useLanguage } from '../../shared/LanguageContext';
import FormField, { inputClasses, selectClasses } from '../../ui/FormField';
import { Checkbox } from '../../ui/Checkbox';
import type { FilterOption } from '../../../types';

interface PropertySpecsProps {
    propertyTypes: FilterOption[];
    finishingStatuses: FilterOption[];
    amenities: FilterOption[];
}

const PropertySpecs: React.FC<PropertySpecsProps> = ({ propertyTypes, finishingStatuses, amenities }) => {
    const { register, watch, setValue } = useFormContext();
    const { language, t } = useLanguage();
    const tp = t.propertiesPage;
    const t_prop = t.propertyDetailsPage;

    const watchType = watch('type');
    const watchStatus = watch('status');
    const watchFinishingStatus = watch('finishingStatus');
    const watchAmenities = watch('amenities');

    const handleComplexChange = (field: 'status' | 'type' | 'finishingStatus', valueEn: string) => {
        let valueAr = '';
        let option: FilterOption | undefined;

        if (field === 'status') {
            if (valueEn === 'For Sale') valueAr = 'للبيع';
            if (valueEn === 'For Rent') valueAr = 'إيجار';
        } else if (field === 'type' && propertyTypes) {
            option = propertyTypes.find(opt => opt.en === valueEn);
            valueAr = option ? option.ar : valueEn;
        } else if (field === 'finishingStatus' && finishingStatuses) {
            option = finishingStatuses.find(opt => opt.en === valueEn);
            valueAr = option ? option.ar : valueEn;
        }
        setValue(field, { en: valueEn, ar: valueAr }, { shouldValidate: true, shouldDirty: true });
    };

    const handleAmenityChange = (amenityEn: string) => {
        const currentAmenities = watchAmenities?.en || [];
        const newAmenities = currentAmenities.includes(amenityEn)
            ? currentAmenities.filter((a: string) => a !== amenityEn)
            : [...currentAmenities, amenityEn];
        
        const amenitiesAr = newAmenities.map((en: string) => {
            const amenity = amenities?.find(a => a.en === en);
            return amenity ? amenity.ar : en;
        });

        setValue('amenities', { en: newAmenities, ar: amenitiesAr }, { shouldValidate: true, shouldDirty: true });
    };

    const availableFinishingStatuses = useMemo(() => {
        if (!finishingStatuses) return [];
        const selectedType = watchType?.en;
        // Allow finishing status for everything except maybe Land, but technically even Land doesn't have finishing.
        if (!selectedType || selectedType === 'Land') return [];
        
        return finishingStatuses.filter(status => 
            !status.applicableTo || status.applicableTo.length === 0 || status.applicableTo.includes(selectedType)
        );
    }, [finishingStatuses, watchType]);

    const availableAmenities = useMemo(() => {
        if (!amenities) return [];
        const selectedType = watchType?.en;
        if (!selectedType) return amenities;
        return amenities.filter(amenity => 
            !amenity.applicableTo || amenity.applicableTo.length === 0 || amenity.applicableTo.includes(selectedType)
        );
    }, [amenities, watchType]);

    return (
        <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
                {language === 'ar' ? 'المواصفات والتفاصيل' : 'Specifications & Details'}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <FormField label={tp.statusLabel} id="status.en">
                    <select
                        value={watchStatus?.en || 'For Sale'}
                        onChange={e => handleComplexChange('status', e.target.value)}
                        className={selectClasses}
                    >
                        <option value="For Sale">{tp.forSale}</option>
                        <option value="For Rent">{tp.forRent}</option>
                    </select>
                </FormField>
                <FormField label={tp.typeLabel} id="type.en">
                    <select
                        value={watchType?.en || ''}
                        onChange={e => handleComplexChange('type', e.target.value)}
                        className={selectClasses}
                    >
                        {(propertyTypes || []).map(opt => <option key={opt.id} value={opt.en}>{opt[language]}</option>)}
                    </select>
                </FormField>
                <FormField label={tp.finishing} id="finishingStatus.en">
                    <select
                        value={watchFinishingStatus?.en || ''}
                        onChange={e => handleComplexChange('finishingStatus', e.target.value)}
                        className={selectClasses}
                        disabled={watchType?.en === 'Land' || availableFinishingStatuses.length === 0}
                    >
                         <option value="">{tp.allFinishes}</option>
                         {availableFinishingStatuses.map(opt => <option key={opt.id} value={opt.en}>{opt[language]}</option>)}
                    </select>
                </FormField>
                <FormField label="Area (m²)" id="area">
                    <input type="number" {...register("area", { required: true, valueAsNumber: true })} className={inputClasses} />
                </FormField>
                <FormField label={t_prop.bedrooms} id="beds">
                    <input type="number" {...register("beds", { valueAsNumber: true })} className={inputClasses} disabled={watchType?.en === 'Land' || watchType?.en === 'Commercial'} />
                </FormField>
                <FormField label={t_prop.bathrooms} id="baths">
                    <input type="number" {...register("baths", { valueAsNumber: true })} className={inputClasses} disabled={watchType?.en === 'Land'} />
                </FormField>
                <FormField label={t_prop.floor} id="floor">
                    <input type="number" {...register("floor", { valueAsNumber: true })} className={inputClasses} disabled={watchType?.en === 'Land' || watchType?.en === 'Villa'} />
                </FormField>
                <FormField label="Listing Status" id="listingStatus">
                    <select {...register("listingStatus")} className={selectClasses} >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="draft">Draft</option>
                        <option value="sold">Sold/Rented</option>
                    </select>
                </FormField>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">{tp.amenities}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {availableAmenities.map(amenity => (
                        <label key={amenity.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                                checked={(watchAmenities?.en || []).includes(amenity.en)}
                                onCheckedChange={() => handleAmenityChange(amenity.en)}
                                id={`amenity-${amenity.id}`}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 select-none">{amenity[language]}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PropertySpecs;

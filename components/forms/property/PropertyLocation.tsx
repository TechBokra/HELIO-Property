import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useLanguage } from '../../shared/LanguageContext';
import FormField, { inputClasses } from '../../ui/FormField';
import { Button } from '../../ui/Button';
import { LocationMarkerIcon } from '../../ui/Icons';

interface PropertyLocationProps {
    onOpenMap: () => void;
}

const PropertyLocation: React.FC<PropertyLocationProps> = ({ onOpenMap }) => {
    const { register } = useFormContext();
    const { language } = useLanguage();

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 border-b pb-2 border-gray-100 dark:border-gray-700">
                {language === 'ar' ? 'الموقع على الخريطة' : 'Location Coordinates'}
            </h2>
            <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-grow grid grid-cols-2 gap-4">
                         <FormField label="Latitude" id="lat">
                            <input type="number" step="any" {...register("location.lat", { valueAsNumber: true })} className={inputClasses} placeholder="e.g. 30.123" />
                        </FormField>
                        <FormField label="Longitude" id="lng">
                            <input type="number" step="any" {...register("location.lng", { valueAsNumber: true })} className={inputClasses} placeholder="e.g. 31.123" />
                        </FormField>
                    </div>
                    <Button type="button" variant="outline" onClick={onOpenMap} className="flex items-center gap-2 mb-[2px]">
                        <LocationMarkerIcon className="w-5 h-5" /> 
                        {language === 'ar' ? 'تحديد على الخريطة' : 'Select on Map'}
                    </Button>
                </div>
                <p className="text-xs text-gray-500">
                    {language === 'ar' 
                        ? 'أدخل الإحداثيات يدوياً أو استخدم الخريطة للتحديد الدقيق.' 
                        : 'Enter coordinates manually or use the map picker for precision.'}
                </p>
            </div>
        </div>
    );
};

export default PropertyLocation;
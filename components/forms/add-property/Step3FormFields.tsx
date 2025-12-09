import React from 'react';
import { LocationMarkerIcon, PhotoIcon, CloseIcon } from '../../ui/Icons';
import { useLanguage } from '../../shared/LanguageContext';
import { Checkbox } from '../../ui/Checkbox';
import { Button } from '../../ui/Button';
import { useAddPropertyForm } from '../../../hooks/useAddPropertyForm';
import DynamicForm from '../../shared/DynamicForm';
import FormField from '../../ui/FormField';
import { Input } from '../../ui/Input';
import { RadioGroup, RadioGroupItem } from '../../ui/RadioGroup';

// Derive props type from the return type of the hook
type Step3FormFieldsProps = ReturnType<typeof useAddPropertyForm>;

export const Step3FormFields: React.FC<Step3FormFieldsProps> = (props) => {
    const { language, t } = useLanguage();
    const t_page = t.addPropertyPage;
    const {
        register: registerManual,
        watch: watchManual,
        prevStep,
        imagePreviews, handleImageChange, removeImage,
        setIsLocationModalOpen, availableAmenities,
        handleAmenityChange, isSubmitting, 
        cooperationType,
        errors,
        onSubmit: hookSubmit
    } = props;
    
    const handleDynamicSubmit = (dynamicData: Record<string, unknown>) => {
        hookSubmit(dynamicData);
    };

    const watchContactMethod = watchManual("contactMethod");

    // Header Content: Location Map
    const locationHeader = (
        <div className="col-span-full mb-8 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                     <label className="block text-base font-bold text-gray-900 dark:text-white mb-1">{language === 'ar' ? 'موقع العقار' : 'Property Location'}</label>
                     <p className="text-sm text-gray-500">{language === 'ar' ? 'حدد الموقع الدقيق للعقار على الخريطة.' : 'Pinpoint the exact location on the map.'}</p>
                </div>
                
                <div className="flex items-center gap-3">
                     {(props.watchLatitude && props.watchLongitude) ? (
                        <div className="text-xs font-mono text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            {parseFloat(props.watchLatitude).toFixed(4)}, {parseFloat(props.watchLongitude).toFixed(4)}
                        </div>
                    ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">{language === 'ar' ? 'مطلوب التحديد' : 'Location Required'}</span>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsLocationModalOpen(true)} className="flex items-center gap-2">
                        <LocationMarkerIcon className="w-4 h-4"/> {language === 'ar' ? 'تحديد' : 'Select'}
                    </Button>
                </div>
            </div>
        </div>
    );

    // Footer Content: Back Button
    const footerButtons = (
        <Button type="button" variant="secondary" onClick={prevStep} disabled={isSubmitting} className="w-full sm:w-auto">
            {t_page.back}
        </Button>
    );

    const hiddenFields = language === 'ar' ? ['description.en'] : ['description.ar'];

    return (
        <div className="animate-fadeIn w-full">
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t_page.formTitle}</h2>

             <DynamicForm
                slug="add-property"
                customSubmit={handleDynamicSubmit}
                submitButtonText={t_page.submitButton}
                headerContent={locationHeader}
                footerContent={footerButtons}
                hiddenFields={hiddenFields}
             >
                {/* Amenities Section */}
                <div className="col-span-full pt-6 border-t border-gray-100 dark:border-gray-700">
                     <label className="block text-base font-bold text-gray-900 dark:text-white mb-3">{t.propertiesPage.amenities}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 max-h-60 overflow-y-auto scrollbar-thin">
                        {(availableAmenities || []).map((amenity: any) => (
                            <label key={amenity.id} className="flex items-center gap-2.5 cursor-pointer select-none p-1.5 rounded hover:bg-white dark:hover:bg-gray-700 transition-colors">
                                <Checkbox
                                    checked={(props.watchAmenities?.en || []).includes(amenity.en)}
                                    onCheckedChange={() => handleAmenityChange(amenity.en)}
                                    id={`amenity-${amenity.id}`}
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{amenity[language]}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Image Upload - Compact Bar Design */}
                <div className="col-span-full pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <label className="block text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {t_page.images}
                                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Max 10</span>
                            </label>
                        </div>
                        <div>
                            <input type="file" id="images" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                            <label htmlFor="images" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-sm font-semibold transition-colors border border-amber-200">
                                <PhotoIcon className="w-4 h-4" />
                                {language === 'ar' ? 'إضافة صور' : 'Add Images'}
                            </label>
                        </div>
                    </div>
                    
                    {/* Compact Image Grid */}
                    {imagePreviews.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {imagePreviews.map((preview: string, index: number) => (
                                <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100">
                                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:opacity-100">
                                        <CloseIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 min-h-[120px] flex items-center justify-center">
                             <p className="text-sm text-gray-500">{t_page.imagesHelpText}</p>
                        </div>
                    )}
                </div>
                
                {/* Contact Preference */}
                 {cooperationType === 'paid_listing' && (
                    <div className="col-span-full mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                        <label className="block text-sm font-bold text-blue-900 dark:text-blue-300 mb-2">{t_page.contactPreference.title}:</label>
                        <RadioGroup className="flex flex-wrap gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem {...registerManual("contactMethod")} value="platform" id="contact-platform" />
                                <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{t_page.contactPreference.platform}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem {...registerManual("contactMethod")} value="direct" id="contact-direct" />
                                <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{t_page.contactPreference.direct}</span>
                            </label>
                        </RadioGroup>
                        {watchContactMethod === 'direct' && (
                            <div className="mt-3 animate-fadeIn max-w-sm">
                                <FormField label={`${t_page.phone} (For Public)`} id="ownerPhone">
                                    <Input type="tel" {...registerManual("ownerPhone")} dir="ltr" className="bg-white" placeholder="+20..." />
                                </FormField>
                            </div>
                        )}
                    </div>
                )}

                 <div className="col-span-full pt-6 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <Checkbox id="isOwner" {...registerManual("isOwner", { required: true })} className="mt-1" />
                        <div>
                            <label htmlFor="isOwner" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">{t_page.confirmationLabel}</label>
                            {/* @ts-ignore */}
                            {errors.isOwner && <p className="text-red-500 text-xs mt-1 font-semibold">{t_page.errors.mustBeOwner}</p>}
                        </div>
                    </div>
                </div>
             </DynamicForm>
        </div>
    );
};
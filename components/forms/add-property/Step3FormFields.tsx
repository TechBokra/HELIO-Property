
import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../ui/FormField';
import { CloseIcon, LocationMarkerIcon } from '../../ui/Icons';
import { useLanguage } from '../../shared/LanguageContext';
import { Select } from '../../ui/Select';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { RadioGroup, RadioGroupItem } from '../../ui/RadioGroup';
import { Checkbox } from '../../ui/Checkbox';
import { Button } from '../../ui/Button';
import { useAddPropertyForm } from '../../../hooks/useAddPropertyForm';
import DynamicForm from '../../shared/DynamicForm';

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
    
    const handleDynamicSubmit = (data: Record<string, unknown>) => {
        hookSubmit(data);
    };

    const watchContactMethod = watchManual("contactMethod");

    // Header Content: Location Map (Appears ABOVE the dynamic form fields)
    const locationHeader = (
        <div className="col-span-full mb-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{language === 'ar' ? 'موقع العقار' : 'Property Location'}</label>
             <div className="flex flex-wrap items-center gap-4">
                <Button type="button" variant="outline" onClick={() => setIsLocationModalOpen(true)} className="flex items-center gap-2">
                    <LocationMarkerIcon className="w-5 h-5"/> {language === 'ar' ? 'تحديد على الخريطة' : 'Select on Map'}
                </Button>
                {(props.watchLatitude && props.watchLongitude) ? (
                    <div className="text-sm font-mono text-gray-600 bg-green-50 border border-green-200 px-3 py-1 rounded flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        {parseFloat(props.watchLatitude).toFixed(4)}, {parseFloat(props.watchLongitude).toFixed(4)}
                    </div>
                ) : (
                    <span className="text-xs text-gray-400 italic">{language === 'ar' ? 'لم يتم تحديد الموقع' : 'No location selected'}</span>
                )}
            </div>
        </div>
    );

    // Determine which fields to hide based on the active language
    const hiddenFields = language === 'ar' ? ['description.en'] : ['description.ar'];

    return (
        <div className="animate-fadeIn">
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t_page.formTitle}</h2>

             <DynamicForm
                slug="add-property"
                customSubmit={handleDynamicSubmit}
                submitButtonText={t_page.submitButton}
                headerContent={locationHeader}
                hiddenFields={hiddenFields}
             >
                {/* Children (Injected BELOW the dynamic form fields) */}
                
                {/* Amenities */}
                <div className="col-span-full">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.propertiesPage.amenities}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 border rounded-md max-h-60 overflow-y-auto bg-white dark:bg-gray-800">
                        {(availableAmenities || []).map((amenity: any) => (
                            <label key={amenity.id} className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={(props.watchAmenities?.en || []).includes(amenity.en)}
                                    onCheckedChange={() => handleAmenityChange(amenity.en)}
                                    id={`amenity-${amenity.id}`}
                                />
                                <span className="text-sm">{amenity[language]}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Image Upload */}
                <div className="col-span-full">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t_page.images}</label>
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${imagePreviews.length === 0 ? 'border-gray-300 hover:border-amber-400' : 'border-amber-200 bg-amber-50/30'}`}>
                        <input type="file" id="images" multiple accept="image/*" onChange={handleImageChange} className="hidden" />
                        <label htmlFor="images" className="cursor-pointer flex flex-col items-center justify-center">
                             {imagePreviews.length === 0 && (
                                 <div className="mb-3 p-3 bg-gray-100 rounded-full">
                                     <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                 </div>
                             )}
                             <span className="text-amber-600 font-semibold hover:underline">{language === 'ar' ? 'اضغط لرفع الصور' : 'Click to upload'}</span> 
                             <span className="text-gray-500 text-sm mt-1">{t_page.imagesHelpText}</span>
                        </label>
                        
                        {imagePreviews.length > 0 && (
                            <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {imagePreviews.map((preview: string, index: number) => (
                                    <div key={index} className="relative group">
                                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                                        <button type="button" onClick={() => removeImage(index)} className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"><CloseIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                <label htmlFor="images" className="flex items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-white transition-colors">
                                    <span className="text-2xl text-gray-400">+</span>
                                </label>
                            </div>
                        )}
                    </div>
                </div>
                
                 {cooperationType === 'paid_listing' && (
                    <div className="col-span-full space-y-2 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
                        <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">{t_page.contactPreference.title}:</label>
                        <RadioGroup className="flex gap-4 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem {...registerManual("contactMethod")} value="platform" id="contact-platform" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t_page.contactPreference.platform}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <RadioGroupItem {...registerManual("contactMethod")} value="direct" id="contact-direct" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t_page.contactPreference.direct}</span>
                            </label>
                        </RadioGroup>
                        {watchContactMethod === 'direct' && (
                            <div className="pt-2 animate-fadeIn">
                                <FormField label={`${t_page.phone} (For Public Inquiries)`} id="ownerPhone">
                                    <Input type="tel" {...registerManual("ownerPhone")} dir="ltr" className="bg-white" />
                                </FormField>
                            </div>
                        )}
                    </div>
                )}

                 <div className="col-span-full pt-6 border-t">
                    <div className="flex items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Checkbox id="isOwner" {...registerManual("isOwner", { required: true })} className="mt-1" />
                        <label htmlFor="isOwner" className={`text-sm font-medium text-gray-700 cursor-pointer leading-relaxed ${language === 'ar' ? 'mr-3' : 'ml-3'}`}>{t_page.confirmationLabel}</label>
                    </div>
                    {/* @ts-ignore */}
                    {errors.isOwner && <p className="text-red-500 text-sm mt-2">{t_page.errors.mustBeOwner}</p>}
                </div>

                 <div className="col-span-full flex justify-start -mb-16 relative z-10 pointer-events-none">
                    <Button type="button" variant="secondary" onClick={prevStep} className="pointer-events-auto">{t_page.back}</Button>
                </div>

             </DynamicForm>
        </div>
    );
};

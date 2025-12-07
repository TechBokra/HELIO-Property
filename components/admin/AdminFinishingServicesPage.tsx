
import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { SiteContent } from '../../types';
import { inputClasses } from '../ui/FormField';
import { TrashIcon, PlusIcon, BanknotesIcon } from '../ui/Icons';
import { getContent, updateContent as updateSiteContent } from '../../services/content';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../shared/ToastContext';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';

// Type helper for nested form structure
interface FinishingServicesForm {
    finishingServices: {
        title: { ar: string; en: string };
        description: { ar: string; en: string };
        pricingTiers: {
            unitType: { ar: string; en: string };
            areaRange: { ar: string; en: string };
            price: number;
        }[];
    }[];
}

const AdminFinishingServicesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { data: siteContent, isLoading: dataLoading, refetch } = useQuery({ queryKey: ['siteContent'], queryFn: getContent });
    const { showToast } = useToast();
    
    const { register, control, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<FinishingServicesForm>({
        defaultValues: { finishingServices: [] }
    });
    
    const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
        control,
        name: "finishingServices"
    });
    
    useEffect(() => {
        if (siteContent) {
            reset({ finishingServices: siteContent.finishingServices || [] });
        }
    }, [siteContent, reset]);

    const onSubmit = async (formData: FinishingServicesForm) => {
        await updateSiteContent({ finishingServices: formData.finishingServices });
        await refetch();
        showToast('Services updated successfully!', 'success');
    };

    // Sub-component for managing tiers within a service
    const PricingTiersEditor = ({ serviceIndex }: { serviceIndex: number }) => {
        const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
            control,
            name: `finishingServices.${serviceIndex}.pricingTiers`
        });

        return (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <h5 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-between">
                    <span className="flex items-center gap-2"><BanknotesIcon className="w-4 h-4 text-green-600"/> Pricing Tiers</span>
                    <button 
                        type="button" 
                        onClick={() => appendTier({ unitType: { ar: '', en: '' }, areaRange: { ar: '', en: '' }, price: 0 })} 
                        className="text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md font-bold shadow-sm transition-colors"
                    >
                        + Add Tier
                    </button>
                </h5>
                
                {tierFields.map((tier, tierIndex) => (
                    <div key={tier.id} className="p-4 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 relative shadow-sm group">
                        <button 
                            type="button" 
                            onClick={() => removeTier(tierIndex)} 
                            className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 rounded-full transition-colors"
                            title="Remove Tier"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Unit Type (AR)</label><input {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.unitType.ar` as const)} className={inputClasses} dir="rtl" placeholder="مثال: شقة" /></div>
                                <div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Unit Type (EN)</label><input {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.unitType.en` as const)} className={inputClasses} dir="ltr" placeholder="e.g. Apartment" /></div>
                                <div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Area/Scope (AR)</label><input {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.areaRange.ar` as const)} className={inputClasses} dir="rtl" placeholder="مثال: حتى 150 متر" /></div>
                                <div><label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Area/Scope (EN)</label><input {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.areaRange.en` as const)} className={inputClasses} dir="ltr" placeholder="e.g. Up to 150m" /></div>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Price (EGP)</label>
                                <input type="number" {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.price` as const, { valueAsNumber: true })} className={inputClasses} placeholder="0" />
                            </div>
                        </div>
                    </div>
                ))}
                {tierFields.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No pricing tiers added yet.</p>
                )}
            </div>
        );
    };

    if (dataLoading) {
        return <div className="p-8 text-center">Loading services...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                 <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Service Packages Editor</h2>
                    <p className="text-sm text-gray-500">Define the finishing packages and pricing displayed on the website.</p>
                 </div>
                <Button onClick={() => appendService({ title: { ar: 'خدمة جديدة', en: 'New Service' }, description: { ar: '', en: '' }, pricingTiers: [] })} className="flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Add Package
                </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                    <div className="space-y-8">
                        {serviceFields.map((service, serviceIndex) => (
                            <div key={service.id} className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 relative group transition-all hover:border-amber-300">
                                <button type="button" onClick={() => removeService(serviceIndex)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors z-10">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                                
                                <h4 className="font-bold text-amber-600 dark:text-amber-500 text-lg mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                                    <span className="bg-amber-100 text-amber-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">{serviceIndex + 1}</span>
                                    Package Details
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Package Title (AR)</label>
                                        <input {...register(`finishingServices.${serviceIndex}.title.ar` as const)} className={inputClasses} dir="rtl" placeholder="مثال: باقة الاستشارة الشاملة" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Package Title (EN)</label>
                                        <input {...register(`finishingServices.${serviceIndex}.title.en` as const)} className={inputClasses} dir="ltr" placeholder="e.g. Comprehensive Consultation Package" />
                                    </div>
                                </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (AR)</label>
                                        <textarea {...register(`finishingServices.${serviceIndex}.description.ar` as const)} className={inputClasses} rows={3} dir="rtl"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (EN)</label>
                                        <textarea {...register(`finishingServices.${serviceIndex}.description.en` as const)} className={inputClasses} rows={3} dir="ltr"/>
                                    </div>
                                </div>
                                
                                <PricingTiersEditor serviceIndex={serviceIndex} />
                            </div>
                        ))}
                        
                        {serviceFields.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
                                <p className="text-gray-500 mb-4">No service packages defined.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-end items-center gap-4 sticky bottom-6 z-10">
                    {isDirty && <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 animate-pulse">Unsaved changes</span>}
                    <Button type="submit" disabled={isSubmitting || !isDirty} isLoading={isSubmitting} className="min-w-[150px] shadow-lg">
                        Save All Changes
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AdminFinishingServicesPage;

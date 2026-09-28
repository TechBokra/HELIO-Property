import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { FinishingService, FinishingPricingModel } from '../../types';
import { inputClasses } from '../ui/FormField';
import { TrashIcon, PlusIcon, BanknotesIcon, CheckCircleIcon } from '../ui/Icons';
import { getFinishingServices, saveFinishingServices } from '../../services/finishing';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../shared/ToastContext';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';

interface FinishingServicesForm {
    finishingServices: FinishingService[];
}

const AdminFinishingServicesPage: React.FC = () => {
    const { language } = useLanguage();
    const { data: services, isLoading: dataLoading, refetch } = useQuery({ 
        queryKey: ['adminFinishingServices'], 
        queryFn: getFinishingServices 
    });
    const { showToast } = useToast();
    
    const { register, control, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<FinishingServicesForm>({
        defaultValues: { finishingServices: [] }
    });
    
    const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
        control,
        name: "finishingServices"
    });
    
    useEffect(() => {
        if (services) {
            reset({ finishingServices: services });
        }
    }, [services, reset]);

    const onSubmit = async (formData: FinishingServicesForm) => {
        try {
            await saveFinishingServices(formData.finishingServices);
            await refetch();
            showToast(language === 'ar' ? 'تم حفظ وتحديث باقات التشطيب بنجاح!' : 'Finishing packages saved successfully!', 'success');
        } catch {
            showToast(language === 'ar' ? 'فشل حفظ الباقات. حاول مجدداً.' : 'Failed to save packages.', 'error');
        }
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
                    <span className="flex items-center gap-2">
                        <BanknotesIcon className="w-4 h-4 text-emerald-600"/> 
                        {language === 'ar' ? 'فئات وباقات الأسعار (Pricing Tiers)' : 'Pricing Tiers & Scope'}
                    </span>
                    <button 
                        type="button" 
                        onClick={() => appendTier({ 
                            id: `tier-${Date.now()}`,
                            unitType: { ar: '', en: '' }, 
                            areaRange: { ar: '', en: '' }, 
                            price: 0,
                            priceModel: 'fixed_package'
                        })} 
                        className="text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-md font-bold shadow-sm transition-colors"
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
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Unit Type (AR)</label>
                                    <input {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.unitType.ar` as const)} className={inputClasses} dir="rtl" placeholder="مثال: شقة سكنية" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Unit Type (EN)</label>
                                    <input {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.unitType.en` as const)} className={inputClasses} dir="ltr" placeholder="e.g. Residential Apartment" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Scope / Area (AR)</label>
                                    <input {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.areaRange.ar` as const)} className={inputClasses} dir="rtl" placeholder="مثال: حتى 150 متر مربع" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Scope / Area (EN)</label>
                                    <input {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.areaRange.en` as const)} className={inputClasses} dir="ltr" placeholder="e.g. Up to 150 m²" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Price (EGP)</label>
                                    <input 
                                        type="number" 
                                        {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.price` as const, { valueAsNumber: true })} 
                                        className={inputClasses} 
                                        placeholder="0" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Pricing Basis</label>
                                    <select 
                                        {...register(`finishingServices.${serviceIndex}.pricingTiers.${tierIndex}.priceModel` as const)}
                                        className={inputClasses}
                                    >
                                        <option value="fixed_package">Fixed Package Rate</option>
                                        <option value="per_sqm">Per Square Meter (م²)</option>
                                        <option value="custom_quote">Custom Quote Base</option>
                                    </select>
                                </div>
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
        return (
            <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-500">Loading canonical finishing services...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {language === 'ar' ? 'إدارة باقات ونماذج تسعير التشطيبات' : 'Finishing Packages & Pricing Models'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {language === 'ar' 
                            ? 'التحكم بالباقات المعروضة وفصل نموذج التسعير (بالمتر / باقة ثابتة) عن الأسعار' 
                            : 'Manage canonical finishing domain services with decoupled pricing models.'}
                    </p>
                </div>
                <Button 
                    onClick={() => appendService({ 
                        id: `fs-${Date.now()}`,
                        title: { ar: 'خدمة تشطيب جديدة', en: 'New Finishing Package' }, 
                        description: { ar: '', en: '' }, 
                        category: 'turnkey',
                        pricingModel: 'per_sqm',
                        basePrice: 0,
                        currency: 'EGP',
                        pricingTiers: [],
                        features: [
                            { ar: 'إشراف هندسي معتمد', en: 'Certified engineering supervision', included: true }
                        ],
                        isActive: true,
                        displayOrder: serviceFields.length + 1
                    })} 
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold"
                >
                    <PlusIcon className="w-5 h-5" />
                    {language === 'ar' ? 'إضافة باقة جديدة' : 'Add Package'}
                </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="space-y-8">
                        {serviceFields.map((service, serviceIndex) => (
                            <div key={service.id} className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/40 relative group transition-all hover:border-amber-300">
                                <button 
                                    type="button" 
                                    onClick={() => removeService(serviceIndex)} 
                                    className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors z-10"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                                
                                <div className="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                                    <span className="bg-amber-500 text-gray-950 font-bold w-7 h-7 rounded-full flex items-center justify-center text-xs">
                                        {serviceIndex + 1}
                                    </span>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                                        {language === 'ar' ? 'بيانات الباقة الأساسية' : 'Package Specifications'}
                                    </h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Package Title (AR)</label>
                                        <input {...register(`finishingServices.${serviceIndex}.title.ar` as const)} className={inputClasses} dir="rtl" placeholder="مثال: باقة التنفيذ والإشراف الكامل" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Package Title (EN)</label>
                                        <input {...register(`finishingServices.${serviceIndex}.title.en` as const)} className={inputClasses} dir="ltr" placeholder="e.g. Turnkey Execution & Supervision" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {language === 'ar' ? 'نموذج التسعير (Pricing Model)' : 'Pricing Model'}
                                        </label>
                                        <select {...register(`finishingServices.${serviceIndex}.pricingModel` as const)} className={inputClasses}>
                                            <option value="per_sqm">Per Square Meter (سعر بالمتر المربع)</option>
                                            <option value="fixed_package">Fixed Package (باقة بسعر محدد)</option>
                                            <option value="custom_quote">Custom Quote (مقايسة معتمدة حسب الطلب)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {language === 'ar' ? 'تصنيف الخدمة' : 'Service Category'}
                                        </label>
                                        <select {...register(`finishingServices.${serviceIndex}.category` as const)} className={inputClasses}>
                                            <option value="turnkey">Turnkey Execution (تشطيب متكامل)</option>
                                            <option value="architectural">3D & Architectural (تصميم معماري وديكور)</option>
                                            <option value="consultation">Consultation & Planning (استشارات ومعاينة)</option>
                                            <option value="commercial">Commercial Finishing (تشطيب تجاري وإداري)</option>
                                            <option value="renovation">Renovation & Remodeling (تجديد وترميم)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {language === 'ar' ? 'السعر الأساسي / يبدأ من' : 'Base / Starting Price (EGP)'}
                                        </label>
                                        <input 
                                            type="number" 
                                            {...register(`finishingServices.${serviceIndex}.basePrice` as const, { valueAsNumber: true })} 
                                            className={inputClasses} 
                                            placeholder="4500" 
                                        />
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
                                <p className="text-gray-500 mb-4">No finishing service packages defined.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-end items-center gap-4 sticky bottom-6 z-10">
                    {isDirty && (
                        <span className="text-sm font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">
                            {language === 'ar' ? 'يوجد تعديلات غير محفوظة' : 'Unsaved changes'}
                        </span>
                    )}
                    <Button 
                        type="submit" 
                        disabled={isSubmitting || !isDirty} 
                        isLoading={isSubmitting} 
                        className="min-w-[160px] shadow-lg bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold"
                    >
                        {language === 'ar' ? 'حفظ جميع التعديلات' : 'Save All Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AdminFinishingServicesPage;

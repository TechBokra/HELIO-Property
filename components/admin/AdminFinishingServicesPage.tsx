import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { FinishingService } from '../../types';
import { inputClasses } from '../ui/FormField';
import { TrashIcon, PlusIcon, BanknotesIcon, ExclamationTriangleIcon } from '../ui/Icons';
import { getFinishingServices, getFinishingPartners, saveFinishingServices } from '../../services/finishing';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../shared/ToastContext';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';
import { resolveServiceReferenceCode } from '../../utils/propertyFormShared';

interface FinishingServicesForm {
    finishingServices: FinishingService[];
}

const AdminFinishingServicesPage: React.FC = () => {
    const { language } = useLanguage();
    const queryClient = useQueryClient();
    const [saveError, setSaveError] = useState<string | null>(null);

    const {
        data: services,
        isLoading: dataLoading,
        isError: loadFailed,
        error: loadError,
        refetch
    } = useQuery({
        queryKey: ['adminFinishingServices'],
        queryFn: () => getFinishingServices({ includeInactive: true, forceRefresh: true })
    });

    const { data: finishingPartners = [] } = useQuery({
        queryKey: ['finishingPartnersForAdmin'],
        queryFn: getFinishingPartners
    });

    const { showToast } = useToast();

    const { register, control, watch, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<FinishingServicesForm>({
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
        setSaveError(null);
        try {
            const saved = await saveFinishingServices(formData.finishingServices);
            reset({ finishingServices: saved });
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['adminFinishingServices'] }),
                queryClient.invalidateQueries({ queryKey: ['canonicalFinishingServices'] }),
            ]);
            showToast(language === 'ar' ? 'تم حفظ وتحديث باقات التشطيب بنجاح!' : 'Finishing packages saved successfully!', 'success');
        } catch (err: any) {
            const msg = err?.message || (language === 'ar' ? 'تعذر حفظ التعديلات في قاعدة البيانات.' : 'Failed to save changes to database.');
            setSaveError(msg);
            showToast(language === 'ar' ? `فشل الحفظ: ${msg}` : `Save failed: ${msg}`, 'error');
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
                            ? 'المصدر التشغيلي للخدمات المعروضة للجمهور: التعديل، التسعير، الإظهار أو الإخفاء، وتعيين الشريك المنفذ.'
                            : 'Authoritative operational catalog for finishing packages, pricing, visibility, and partner routing.'}
                    </p>
                </div>
                <Button
                    type="button"
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

            {loadFailed && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                        <span>
                            {language === 'ar'
                                ? `تعذر تحميل خدمات التشطيب: ${(loadError as Error)?.message || 'خطأ غير معروف'}`
                                : `Failed to load finishing services: ${(loadError as Error)?.message || 'Unknown error'}`}
                        </span>
                    </div>
                    <Button type="button" size="sm" variant="secondary" onClick={() => refetch()}>
                        {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                    </Button>
                </div>
            )}

            {saveError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 flex items-start gap-3 text-red-800 dark:text-red-200 text-sm">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">
                            {language === 'ar' ? 'فشل حفظ التعديلات — تم الإبقاء على مدخلاتك للمراجعة' : 'Save failed — your unsaved edits were preserved'}
                        </p>
                        <p className="font-mono text-xs mt-1 opacity-90">{saveError}</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="space-y-8">
                        {serviceFields.map((service, serviceIndex) => {
                            const isServiceActive = watch(`finishingServices.${serviceIndex}.isActive`) !== false;
                            const refCode = resolveServiceReferenceCode('finishing', service.id);

                            return (
                            <div key={service.id} className={`p-6 border rounded-xl relative group transition-all ${isServiceActive ? 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 hover:border-amber-300' : 'border-gray-300 dark:border-gray-700 bg-gray-100/80 dark:bg-gray-800/70 opacity-85'}`}>
                                <button
                                    type="button"
                                    onClick={() => removeService(serviceIndex)}
                                    className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors z-10"
                                    title={language === 'ar' ? 'حذف الباقة' : 'Remove Package'}
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>

                                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-gray-200 dark:border-gray-700 pe-10">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-amber-500 text-gray-950 font-bold w-7 h-7 rounded-full flex items-center justify-center text-xs">
                                            {serviceIndex + 1}
                                        </span>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                                            {language === 'ar' ? 'بيانات الباقة الأساسية' : 'Package Specifications'}
                                        </h4>
                                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                            {refCode}
                                        </span>
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isServiceActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                            {isServiceActive
                                                ? (language === 'ar' ? 'نشط وظاهر للعامة' : 'Active (Public)')
                                                : (language === 'ar' ? 'مخفي عن العامة' : 'Hidden from Public')}
                                        </span>
                                    </div>

                                    <label className="inline-flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-bold">
                                        <input
                                            type="checkbox"
                                            {...register(`finishingServices.${serviceIndex}.isActive` as const)}
                                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                                        />
                                        <span>{language === 'ar' ? 'إظهار في صفحة التشطيبات العامة' : 'Visible on Public Page'}</span>
                                    </label>
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
                                            {language === 'ar' ? 'السعر الأساسي / يبدأ من (ج.م)' : 'Base / Starting Price (EGP)'}
                                        </label>
                                        <input
                                            type="number"
                                            {...register(`finishingServices.${serviceIndex}.basePrice` as const, { valueAsNumber: true })}
                                            className={inputClasses}
                                            placeholder="4500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {language === 'ar' ? 'ترتيب العرض' : 'Display Order'}
                                        </label>
                                        <input
                                            type="number"
                                            {...register(`finishingServices.${serviceIndex}.displayOrder` as const, { valueAsNumber: true })}
                                            className={inputClasses}
                                            placeholder="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {language === 'ar' ? 'الشريك المنفذ الافتراضي (اختياري)' : 'Target Partner (Optional)'}
                                        </label>
                                        <select {...register(`finishingServices.${serviceIndex}.targetPartnerId` as const)} className={inputClasses}>
                                            <option value="">{language === 'ar' ? 'إدارة التشطيبات بالمنصة (افتراضي)' : 'Platform Finishing Manager (Default)'}</option>
                                            {finishingPartners.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {language === 'ar' ? (p.nameAr || p.name) : p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            {language === 'ar' ? 'رابط صورة الباقة (اختياري)' : 'Package Image URL (Optional)'}
                                        </label>
                                        <input
                                            type="url"
                                            {...register(`finishingServices.${serviceIndex}.imageUrl` as const)}
                                            className={inputClasses}
                                            dir="ltr"
                                            placeholder="https://..."
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
                        );
                        })}
                        
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

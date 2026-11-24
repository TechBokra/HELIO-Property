import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useLanguage } from '../../shared/LanguageContext';
import FormField, { inputClasses } from '../../ui/FormField';
import { RadioGroup, RadioGroupItem } from '../../ui/RadioGroup';
import { PROPERTY_VALIDATION_RULES } from '../../../utils/propertyFormShared';

const PropertyFinancials: React.FC = () => {
    const { register, watch, formState: { errors } } = useFormContext<any>();
    const { language, t } = useLanguage();
    const td = t.dashboard.propertyForm;

    const watchInstallments = watch('installmentsAvailable');
    const watchDelivery = watch('delivery');
    const watchPrice = watch('priceNumeric');
    const watchArea = watch('area');
    const watchStatus = watch('status');

    const pricePerMeter = useMemo(() => {
        if (!watchPrice || !watchArea || watchArea === 0) return 0;
        return Math.round(watchPrice / watchArea);
    }, [watchPrice, watchArea]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b pb-2 border-gray-100 dark:border-gray-700">
                {language === 'ar' ? 'البيانات المالية والاستلام' : 'Financials & Delivery'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField label={language === 'ar' ? 'السعر (ج.م)' : 'Price'} id="priceNumeric" error={typeof errors?.priceNumeric?.message === 'string' ? errors.priceNumeric.message : undefined}>
                    <input
                        type="number"
                        {...register("priceNumeric", {
                            required: language === 'ar' ? 'السعر مطلوب' : 'Price is required',
                            valueAsNumber: true,
                            min: {
                                value: PROPERTY_VALIDATION_RULES.MIN_PRICE,
                                message: language === 'ar' ? 'يجب أن يكون السعر أكبر من صفر' : 'Price must be greater than zero',
                            },
                            max: {
                                value: PROPERTY_VALIDATION_RULES.MAX_PRICE,
                                message: language === 'ar' ? 'قيمة السعر تتجاوز الحد الأقصى' : 'Price exceeds maximum limit',
                            },
                        })}
                        className={inputClasses}
                    />
                </FormField>
                {watchStatus?.en === 'For Sale' && (
                     <FormField label={td.pricePerMeter} id="pricePerMeter">
                        <input type="text" value={`${pricePerMeter.toLocaleString(language)} EGP/m²`} readOnly className={`${inputClasses} bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-500`} />
                    </FormField>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                    <FormField label={td.isInCompound} id="isInCompound">
                        <RadioGroup className="flex gap-4 pt-2">
                            <label className="flex items-center gap-2"><RadioGroupItem {...register("isInCompound")} value="true" id="compound-yes" /> Yes</label>
                            <label className="flex items-center gap-2"><RadioGroupItem {...register("isInCompound")} value="false" id="compound-no" /> No</label>
                        </RadioGroup>
                    </FormField>
                </div>
                 <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                     <FormField label={td.realEstateFinanceAvailable} id="realEstateFinanceAvailable">
                        <RadioGroup className="flex gap-4 pt-2">
                            <label className="flex items-center gap-2"><RadioGroupItem {...register("realEstateFinanceAvailable")} value="true" id="finance-yes" /> Yes</label>
                            <label className="flex items-center gap-2"><RadioGroupItem {...register("realEstateFinanceAvailable")} value="false" id="finance-no" /> No</label>
                        </RadioGroup>
                    </FormField>
                </div>
                 <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                     <FormField label={td.deliveryInfo} id="delivery.isImmediate">
                         <RadioGroup className="flex gap-4 pt-2">
                            <label className="flex items-center gap-2"><RadioGroupItem {...register("delivery.isImmediate")} value="true" id="delivery-immediate"/> {td.immediateDelivery}</label>
                            <label className="flex items-center gap-2"><RadioGroupItem {...register("delivery.isImmediate")} value="false" id="delivery-future"/> {td.futureDelivery}</label>
                        </RadioGroup>
                    </FormField>
                    {watchDelivery && watchDelivery.isImmediate === 'false' && (
                        <div className="mt-2">
                            <input type="month" {...register("delivery.date")} className={inputClasses} />
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                <FormField label={td.installmentsInfo} id="installmentsAvailable">
                     <RadioGroup className="flex gap-4 pt-2">
                        <label className="flex items-center gap-2"><RadioGroupItem {...register("installmentsAvailable")} value="true" id="installments-yes" /> {td.installmentsAvailable}</label>
                        <label className="flex items-center gap-2"><RadioGroupItem {...register("installmentsAvailable")} value="false" id="installments-no" /> Not Available</label>
                    </RadioGroup>
                </FormField>
                {watchInstallments === 'true' && (
                    <div className="grid grid-cols-3 gap-4 mt-4 animate-fadeIn">
                        <FormField label={td.downPayment} id="installments.downPayment"><input type="number" {...register("installments.downPayment")} className={inputClasses}/></FormField>
                        <FormField label={td.monthlyInstallment} id="installments.monthlyInstallment"><input type="number" {...register("installments.monthlyInstallment")} className={inputClasses}/></FormField>
                        <FormField label={td.years} id="installments.years"><input type="number" {...register("installments.years")} className={inputClasses}/></FormField>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertyFinancials;
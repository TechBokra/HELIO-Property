



import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SubscriptionPlan, PlanCategory, SubscriptionPlanDetails } from '../../types';
import FormField, { inputClasses } from '../ui/FormField';
import { CloseIcon } from '../ui/Icons';
import { getPlans, updatePlan as apiUpdatePlan } from '../../services/plans';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../shared/LanguageContext';

interface AdminPlanEditModalProps {
    planType: PlanCategory;
    planKey: SubscriptionPlan;
    // FIX: Added optional subCategory to props to handle 'individual' plan types ('sale' or 'rent').
    subCategory?: 'sale' | 'rent';
    onClose: () => void;
    onSave: () => void;
}

const AdminPlanEditModal: React.FC<AdminPlanEditModalProps> = ({ planType, planKey, subCategory, onClose, onSave }) => {
    const { language, t } = useLanguage();
    const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
    const t_page = t.adminDashboard.plans;
    const t_shared = t.adminShared;
    const modalRef = useRef<HTMLDivElement>(null);

    const [arData, setArData] = useState({ price: '', description: '', features: '' });
    const [enData, setEnData] = useState({ price: '', description: '', features: '' });
    const [commissionRate, setCommissionRate] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const planSource = subCategory ? (plans as any)?.[planType]?.[subCategory] : plans?.[planType];
        const plan = planSource?.[planKey as keyof typeof planSource];

        if (plan) {
            const typedPlan = plan as { ar: SubscriptionPlanDetails, en: SubscriptionPlanDetails };
            setArData({
                price: typedPlan.ar.price,
                description: typedPlan.ar.description,
                features: typedPlan.ar.features.join('\n'),
            });
            setEnData({
                price: typedPlan.en.price,
                description: typedPlan.en.description,
                features: typedPlan.en.features.join('\n'),
            });
            setCommissionRate(String(typedPlan.en.commissionRate || ''));
        }
    }, [planType, planKey, subCategory, plans]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const rate = commissionRate ? parseFloat(commissionRate) : undefined;
        await apiUpdatePlan(planType, planKey, {
            ar: {
                price: arData.price,
                description: arData.description,
                features: arData.features.split('\n').filter(f => f.trim() !== ''),
                commissionRate: rate,
            },
            en: {
                price: enData.price,
                description: enData.description,
                features: enData.features.split('\n').filter(f => f.trim() !== ''),
                commissionRate: rate,
            }
        }, subCategory);
        setLoading(false);
        onSave();
    };
    
    const planName = useMemo(() => {
        const planSource = subCategory ? (plans as any)?.[planType]?.[subCategory] : plans?.[planType];
        return planSource?.[planKey as keyof typeof planSource]?.en.name;
    }, [planType, planKey, subCategory, plans]);

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fadeIn" onClick={onClose}>
            <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave} className="flex-grow contents">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-amber-500">{t_page.editPlanTitle}: {planName}</h3>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {/* Arabic Fields */}
                            <div className="space-y-4 md:col-span-1">
                                <h4 className="font-semibold text-lg text-gray-900 dark:text-white">Arabic Content</h4>
                                <FormField label={`${t_page.price} (AR)`} id="arPrice">
                                    <input value={arData.price} onChange={e => setArData({...arData, price: e.target.value})} className={inputClasses} />
                                </FormField>
                                <FormField label={`${t_page.description} (AR)`} id="arDesc">
                                    <textarea value={arData.description} onChange={e => setArData({...arData, description: e.target.value})} className={inputClasses} rows={3} />
                                </FormField>
                                <FormField label={`${t_page.features} (AR)`} id="arFeatures">
                                    <textarea value={arData.features} onChange={e => setArData({...arData, features: e.target.value})} className={inputClasses} rows={5} />
                                    <p className="text-xs text-gray-500 mt-1">{t_page.featuresHelpText}</p>
                                </FormField>
                            </div>
                            {/* English Fields */}
                            <div className="space-y-4 md:col-span-1">
                                <h4 className="font-semibold text-lg text-gray-900 dark:text-white">English Content</h4>
                                <FormField label={`${t_page.price} (EN)`} id="enPrice">
                                    <input value={enData.price} onChange={e => setEnData({...enData, price: e.target.value})} className={inputClasses} />
                                </FormField>
                                <FormField label={`${t_page.description} (EN)`} id="enDesc">
                                    <textarea value={enData.description} onChange={e => setEnData({...enData, description: e.target.value})} className={inputClasses} rows={3} />
                                </FormField>
                                <FormField label={`${t_page.features} (EN)`} id="enFeatures">
                                    <textarea value={enData.features} onChange={e => setEnData({...enData, features: e.target.value})} className={inputClasses} rows={5} />
                                    <p className="text-xs text-gray-500 mt-1">{t_page.featuresHelpText}</p>
                                </FormField>
                            </div>
                            {/* Shared Fields */}
                             <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                                <FormField label={t_page.commissionRate} id="commissionRate">
                                    <input type="number" step="0.1" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className={inputClasses + " max-w-xs"} />
                                </FormField>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">{t_shared.cancel}</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-amber-500 text-gray-900 font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50">
                            {loading ? '...' : t_shared.save}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminPlanEditModal;

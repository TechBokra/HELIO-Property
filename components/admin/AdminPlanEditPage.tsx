
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { SubscriptionPlan, PlanCategory, SubscriptionPlanDetails } from '../../types';
import FormField, { inputClasses } from '../ui/FormField';
import { ArrowLeftIcon, BanknotesIcon } from '../ui/Icons';
import { getPlans, updatePlan as apiUpdatePlan } from '../../services/plans';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

const AdminPlanEditPage: React.FC = () => {
    const { planCategory, planKey } = useParams<{ planCategory: string, planKey: string }>();
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const { data: plans, isLoading } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
    const t_page = t.adminDashboard.plans;
    const t_shared = t.adminShared;

    const [arData, setArData] = useState({ price: '', description: '', features: '' });
    const [enData, setEnData] = useState({ price: '', description: '', features: '' });
    const [commissionRate, setCommissionRate] = useState('');
    const [loadingSave, setLoadingSave] = useState(false);

    // Determine actual plan type and subCategory (for individual-sale/rent)
    const { realPlanType, subCategory } = useMemo(() => {
        if (planCategory === 'individual-sale') return { realPlanType: 'individual' as PlanCategory, subCategory: 'sale' as 'sale' };
        if (planCategory === 'individual-rent') return { realPlanType: 'individual' as PlanCategory, subCategory: 'rent' as 'rent' };
        return { realPlanType: planCategory as PlanCategory, subCategory: undefined };
    }, [planCategory]);

    useEffect(() => {
        if (plans && realPlanType && planKey) {
            const planSource = subCategory ? (plans as any)?.[realPlanType]?.[subCategory] : plans?.[realPlanType];
            const plan = planSource?.[planKey];

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
        }
    }, [realPlanType, planKey, subCategory, plans]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!realPlanType || !planKey) return;
        
        setLoadingSave(true);
        const rate = commissionRate ? parseFloat(commissionRate) : undefined;
        await apiUpdatePlan(realPlanType, planKey as SubscriptionPlan, {
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
        
        setLoadingSave(false);
        navigate('/admin/partners/plans');
    };
    
    const planName = useMemo(() => {
        if (!plans || !realPlanType || !planKey) return '';
        const planSource = subCategory ? (plans as any)?.[realPlanType]?.[subCategory] : plans?.[realPlanType];
        return planSource?.[planKey as string]?.en.name || planKey;
    }, [realPlanType, planKey, subCategory, plans]);

    if (isLoading) return <div>Loading...</div>;
    if (!plans) return <div>Plan not found</div>;

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="mb-6">
                <Link to="/admin/partners/plans" className="inline-flex items-center gap-2 text-amber-600 hover:underline mb-4">
                    <ArrowLeftIcon className="w-5 h-5" />
                    {t_shared.backToList}
                </Link>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t_page.editPlanTitle}: {planName}</h1>
            </div>

            <Card>
                <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <BanknotesIcon className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <CardTitle>Plan Details</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Arabic Fields */}
                            <div className="space-y-4 md:col-span-1">
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white border-b pb-2">Arabic Content</h4>
                                <FormField label={`${t_page.price} (AR)`} id="arPrice">
                                    <input value={arData.price} onChange={e => setArData({...arData, price: e.target.value})} className={inputClasses} dir="rtl" />
                                </FormField>
                                <FormField label={`${t_page.description} (AR)`} id="arDesc">
                                    <textarea value={arData.description} onChange={e => setArData({...arData, description: e.target.value})} className={inputClasses} rows={3} dir="rtl" />
                                </FormField>
                                <FormField label={`${t_page.features} (AR)`} id="arFeatures">
                                    <textarea value={arData.features} onChange={e => setArData({...arData, features: e.target.value})} className={inputClasses} rows={6} dir="rtl" />
                                    <p className="text-xs text-gray-500 mt-1">{t_page.featuresHelpText}</p>
                                </FormField>
                            </div>

                            {/* English Fields */}
                            <div className="space-y-4 md:col-span-1">
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white border-b pb-2">English Content</h4>
                                <FormField label={`${t_page.price} (EN)`} id="enPrice">
                                    <input value={enData.price} onChange={e => setEnData({...enData, price: e.target.value})} className={inputClasses} dir="ltr" />
                                </FormField>
                                <FormField label={`${t_page.description} (EN)`} id="enDesc">
                                    <textarea value={enData.description} onChange={e => setEnData({...enData, description: e.target.value})} className={inputClasses} rows={3} dir="ltr" />
                                </FormField>
                                <FormField label={`${t_page.features} (EN)`} id="enFeatures">
                                    <textarea value={enData.features} onChange={e => setEnData({...enData, features: e.target.value})} className={inputClasses} rows={6} dir="ltr" />
                                    <p className="text-xs text-gray-500 mt-1">{t_page.featuresHelpText}</p>
                                </FormField>
                            </div>
                            
                            {/* Shared Fields */}
                             <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-6">
                                <div className="max-w-xs">
                                     <FormField label={t_page.commissionRate} id="commissionRate">
                                        <input type="number" step="0.1" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className={inputClasses} />
                                    </FormField>
                                </div>
                            </div>
                        </div>

                         <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700 gap-3">
                            <Button type="button" variant="secondary" onClick={() => navigate('/admin/partners/plans')}>{t_shared.cancel}</Button>
                            <Button type="submit" isLoading={loadingSave}>
                                {t_shared.save}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminPlanEditPage;

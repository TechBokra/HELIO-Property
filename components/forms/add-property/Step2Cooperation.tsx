
import React from 'react';
import CooperationCard from '../../shared/CooperationCard';
import { useLanguage } from '../../shared/LanguageContext';
import { SubscriptionPlan } from '../../../types';

interface Step2CooperationProps {
    purpose: 'For Sale' | 'For Rent' | null;
    plans: any;
    isLoading: boolean;
    selectedPlan: 'paid_listing' | 'commission' | null;
    onSelectPlan: (plan: 'paid_listing' | 'commission') => void;
    onBack: () => void;
}

export const Step2Cooperation: React.FC<Step2CooperationProps> = ({ purpose, plans, isLoading, selectedPlan, onSelectPlan, onBack }) => {
    const { language, t } = useLanguage();
    const t_page = t.addPropertyPage;

    return (
        <fieldset className="space-y-4 animate-fadeIn">
            <legend className="text-lg font-semibold text-amber-500 mb-2">{t_page.cooperation.title}</legend>
            <p className="text-sm text-gray-500 -mt-2 mb-4">{t_page.cooperation.subtitle}</p>
            <div className="grid sm:grid-cols-2 gap-6">
                {isLoading ? (
                    <>
                        <div className="border-2 rounded-lg p-6 h-full bg-gray-100 animate-pulse"></div>
                        <div className="border-2 rounded-lg p-6 h-full bg-gray-100 animate-pulse"></div>
                    </>
                ) : (Object.keys(plans).map((planKey) => (
                    <CooperationCard
                        key={planKey}
                        planDetails={plans[planKey][language]}
                        isSelected={selectedPlan === planKey}
                        onSelect={() => onSelectPlan(planKey as any)}
                    />
                )))}
            </div>
            <button type="button" onClick={onBack} className="text-sm font-semibold">{t_page.back}</button>
        </fieldset>
    );
};

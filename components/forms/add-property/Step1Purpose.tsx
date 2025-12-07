
import React from 'react';
import { useLanguage } from '../../shared/LanguageContext';

interface Step1PurposeProps {
    onSelectPurpose: (purpose: 'For Sale' | 'For Rent') => void;
}

export const Step1Purpose: React.FC<Step1PurposeProps> = ({ onSelectPurpose }) => {
    const { t } = useLanguage();
    const t_page = t.addPropertyPage;

    return (
        <fieldset className="space-y-4 animate-fadeIn">
            <legend className="text-lg font-semibold text-amber-500 mb-2">{t_page.purposeStep.title}</legend>
            <p className="text-sm text-gray-500 -mt-2 mb-4">{t_page.purposeStep.subtitle}</p>
            <div className="grid sm:grid-cols-2 gap-6">
                <div 
                    onClick={() => onSelectPurpose('For Sale')} 
                    className="p-8 border-2 rounded-lg text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition-colors"
                >
                    <h3 className="text-2xl font-bold">{t_page.purposeStep.forSale}</h3>
                </div>
                <div 
                    onClick={() => onSelectPurpose('For Rent')} 
                    className="p-8 border-2 rounded-lg text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition-colors"
                >
                    <h3 className="text-2xl font-bold">{t_page.purposeStep.forRent}</h3>
                </div>
            </div>
        </fieldset>
    );
};


import React from 'react';
import { CheckCircleIcon } from '../../ui/Icons';
import { useLanguage } from '../../shared/LanguageContext';
import { Button } from '../../ui/Button';

interface SuccessViewProps {
    onReset: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({ onReset }) => {
    const { t } = useLanguage();
    const t_page = t.addPropertyPage;

    return (
        <div className="py-20 bg-white dark:bg-gray-900 flex items-center justify-center text-center">
            <div className="max-w-xl">
                <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-6" />
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t_page.successTitle}</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">{t_page.successMessage}</p>
                <Button onClick={onReset} size="lg">
                    {t_page.backToHome}
                </Button>
            </div>
        </div>
    );
};

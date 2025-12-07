
import React from 'react';
import { useAddPropertyForm } from '../../hooks/useAddPropertyForm';
import { useLanguage } from '../shared/LanguageContext';
import { Step1Purpose } from './add-property/Step1Purpose';
import { Step2Cooperation } from './add-property/Step2Cooperation';
import { Step3FormFields } from './add-property/Step3FormFields';
import { SuccessView } from './add-property/SuccessView';
import LocationPickerModal from '../shared/LocationPickerModal';

const AddPropertyPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_page = t.addPropertyPage;

    const formLogic = useAddPropertyForm();

    if (formLogic.formSubmitted) {
        return <SuccessView onReset={formLogic.resetForm} />;
    }

    const renderStep = () => {
        switch (formLogic.currentStep) {
            case 1:
                return <Step1Purpose onSelectPurpose={formLogic.handlePurposeSelect} />;
            case 2:
                return (
                    <Step2Cooperation
                        purpose={formLogic.purpose}
                        plans={formLogic.plansForPurpose}
                        isLoading={formLogic.isLoadingContext}
                        selectedPlan={formLogic.cooperationType}
                        onSelectPlan={formLogic.handleCooperationSelect}
                        onBack={formLogic.prevStep}
                    />
                );
            case 3:
                return <Step3FormFields {...formLogic} />;
            default:
                return null;
        }
    };

    return (
        <div className="py-20 bg-gray-50 dark:bg-gray-800">
            {formLogic.isLocationModalOpen && (
                <LocationPickerModal 
                    onClose={() => formLogic.setIsLocationModalOpen(false)}
                    onLocationSelect={formLogic.handleLocationSelect}
                    initialLocation={
                        formLogic.watchLatitude && formLogic.watchLongitude 
                        ? { lat: parseFloat(formLogic.watchLatitude), lng: parseFloat(formLogic.watchLongitude) } 
                        : undefined
                    }
                />
            )}
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">{t_page.title}</h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 mt-4 max-w-3xl mx-auto">{t_page.subtitle}</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-900 p-8 rounded-lg border border-gray-200 dark:border-gray-700 sticky top-28">
                            <h2 className="text-2xl font-bold text-amber-500 mb-6">{t_page.howItWorksTitle}</h2>
                            <ul className="space-y-5">
                                {[1, 2, 3, 4].map(num => (
                                     <li key={num} className="flex items-start">
                                        <div className={`flex-shrink-0 rounded-full h-8 w-8 flex items-center justify-center font-bold transition-colors ${formLogic.currentStep >= num ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{num}</div>
                                        <p className={`text-gray-600 dark:text-gray-300 ${language === 'ar' ? 'mr-4' : 'ml-4'}`}>{t_page[`step${num}`]}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-900 p-8 rounded-lg border border-gray-200 dark:border-gray-700">
                            {renderStep()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddPropertyPage;

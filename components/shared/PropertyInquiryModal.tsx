
import React, { useEffect } from 'react';
import { useLanguage } from './LanguageContext';
import { CloseIcon } from '../ui/Icons';
import DynamicForm from './DynamicForm';

interface PropertyInquiryModalProps {
    onClose: () => void;
}

const PropertyInquiryModal: React.FC<PropertyInquiryModalProps> = ({ onClose }) => {
    const { language, t } = useLanguage();
    const t_modal = t.propertyInquiryModal;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [onClose]);
    

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-fadeIn"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white border border-gray-200 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8">
                    <button onClick={onClose} className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} text-gray-500 hover:text-gray-800 transition-colors`}>
                        <CloseIcon className="h-6 w-6" />
                    </button>
                    
                    <h2 className="text-3xl font-bold text-amber-500 mb-2 text-center">{t_modal.title}</h2>
                    <p className="text-gray-500 text-center mb-8">{t_modal.subtitle}</p>
                    
                    {/* Using the Dynamic Form Engine */}
                    <DynamicForm 
                        slug="property-inquiry" 
                        onSuccess={onClose}
                        contextData={{ serviceType: 'property_search' }} 
                    />
                </div>
            </div>
        </div>
    );
};

export default PropertyInquiryModal;

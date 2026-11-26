
import React, { useEffect } from 'react';
import { CloseIcon } from '../ui/Icons';
import DynamicForm from './DynamicForm';
import { resolvePropertyReferenceCode } from '../../utils/propertyFormShared';
import { useCityStore } from '../../store/useCityStore';

interface ServiceRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    partnerId: string;
    serviceTitle: string;
    propertyId?: string;
    propertyReference?: string;
    propertyTitle?: string;
    cityId?: string;
}

const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
    isOpen,
    onClose,
    partnerId,
    serviceTitle,
    propertyId,
    propertyReference,
    propertyTitle,
    cityId,
}) => {
    const activeCityId = useCityStore((state) => state.activeCityId);
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;

    const resolvedPropertyReference = propertyId
        ? resolvePropertyReferenceCode(propertyId, propertyReference)
        : propertyReference;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{serviceTitle}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6">
                    {/* Using Dynamic Form Engine with Context Data */}
                    <DynamicForm 
                        slug="service-request" 
                        onSuccess={onClose}
                        contextData={{
                            partnerId,
                            serviceTitle,
                            propertyId,
                            propertyReference: resolvedPropertyReference,
                            propertyTitle,
                            cityId: cityId || activeCityId || 'heliopolis',
                            serviceType: 'finishing'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default ServiceRequestModal;

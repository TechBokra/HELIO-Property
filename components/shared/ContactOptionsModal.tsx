import React, { useEffect, useRef } from 'react';
import type { AdminPartner, Language } from '../../types';
import { CloseIcon, WhatsAppIcon, PhoneIcon, ClipboardDocumentListIcon } from '../ui/Icons';
import { useLanguage } from './LanguageContext';

interface ContactOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    contactMethods: {
        whatsapp: { enabled: boolean; number: string; };
        phone: { enabled: boolean; number: string; };
        form: { enabled: boolean; };
    };
    onSelectForm: () => void;
}

const ContactOptionsModal: React.FC<ContactOptionsModalProps> = ({ isOpen, onClose, contactMethods, onSelectForm }) => {
    const { language, t } = useLanguage();
    const t_modal = t.contactOptionsModal;
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    
    const handleWhatsAppClick = () => {
        if (contactMethods.whatsapp?.number) {
            window.open(`https://wa.me/${contactMethods.whatsapp.number.replace(/\D/g, '')}`, '_blank');
            onClose();
        }
    };
    
    const handlePhoneClick = () => {
        if (contactMethods.phone?.number) {
            window.location.href = `tel:${contactMethods.phone.number.replace(/\s/g, '')}`;
            onClose();
        }
    };

    const handleFormClick = () => {
        onSelectForm();
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-options-title"
        >
            <div
                ref={modalRef}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 id="contact-options-title" className="text-xl font-bold text-gray-900 dark:text-white">
                        {t_modal.title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {contactMethods.whatsapp?.enabled && contactMethods.whatsapp.number && (
                        <button 
                            onClick={handleWhatsAppClick}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors"
                        >
                            <WhatsAppIcon className="w-6 h-6" />
                            {t_modal.whatsapp}
                        </button>
                    )}
                     {contactMethods.phone?.enabled && contactMethods.phone.number && (
                        <button
                            onClick={handlePhoneClick}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            <PhoneIcon className="w-6 h-6" />
                            {t_modal.phone}
                        </button>
                    )}
                     {contactMethods.form?.enabled && (
                        <button
                            onClick={handleFormClick}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-amber-500 text-gray-900 font-bold rounded-lg hover:bg-amber-600 transition-colors"
                        >
                            <ClipboardDocumentListIcon className="w-6 h-6" />
                            {t_modal.form}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactOptionsModal;
import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloseIcon } from '../ui/Icons';
import { useLanguage } from './LanguageContext';

interface UpgradePlanModalProps {
    onClose: () => void;
}

const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({ onClose }) => {
    const { language, t } = useLanguage();
    const t_modal = t.upgradePlanModal;
    const modalRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleUpgrade = () => {
        navigate('/dashboard/subscription');
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-fadeIn"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                ref={modalRef}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-md p-8 text-center relative"
                onClick={(e) => e.stopPropagation()}
            >
                 <button onClick={onClose} className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors z-10`}>
                    <CloseIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-amber-500 mb-4">{t_modal.title}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{t_modal.message}</p>
                <div className="flex justify-center gap-4">
                     <button 
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 font-bold"
                    >
                        {t_modal.closeButton}
                    </button>
                    <button 
                        onClick={handleUpgrade}
                        className="bg-amber-500 text-gray-900 font-bold px-6 py-2 rounded-lg hover:bg-amber-600 transition-colors"
                    >
                        {t_modal.upgradeButton}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpgradePlanModal;
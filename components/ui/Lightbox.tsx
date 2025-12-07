
import React, { useState, useEffect, useRef } from 'react';
import { CloseIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { useLanguage } from '../shared/LanguageContext';

interface LightboxProps {
    images: string[];
    startIndex: number;
    onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ images, startIndex, onClose }) => {
    const { language } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === 'ArrowLeft') goToPrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden'; 

        const firstFocusableElement = modalRef.current?.querySelector('button');
        firstFocusableElement?.focus();

        const preloadImage = (index: number) => {
            if (index >= 0 && index < images.length) {
                const img = new Image();
                img.src = images[index];
            }
        };

        preloadImage((currentIndex + 1) % images.length);
        preloadImage((currentIndex - 1 + images.length) % images.length);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [currentIndex, images, onClose]);

    const goToPrev = () => {
        setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            ref={modalRef}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-fadeIn"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-label="Image Viewer"
        >
            <button
                className="absolute top-5 right-5 text-white p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors z-20"
                onClick={onClose}
                aria-label={language === 'ar' ? 'إغلاق عارض الصور' : 'Close image viewer'}
            >
                <CloseIcon className="h-7 w-7" />
            </button>

            {images.length > 1 && (
                <>
                    <button
                        className={`absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 text-white p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors z-20 ${language === 'ar' ? 'order-last' : ''}`}
                        onClick={language === 'ar' ? goToNext : goToPrev}
                        aria-label={language === 'ar' ? 'الصورة السابقة' : 'Previous image'}
                    >
                        <ChevronLeftIcon className="h-8 w-8" />
                    </button>
                    <button
                        className={`absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 text-white p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors z-20 ${language === 'ar' ? 'order-first' : ''}`}
                        onClick={language === 'ar' ? goToPrev : goToNext}
                        aria-label={language === 'ar' ? 'الصورة التالية' : 'Next image'}
                    >
                        <ChevronRightIcon className="h-8 w-8" />
                    </button>
                </>
            )}

            <div className="relative w-full h-full flex items-center justify-center">
                <div className="relative watermarked">
                    <img
                        src={images[currentIndex]}
                        alt={`View ${currentIndex + 1} of ${images.length}`}
                        className="max-w-[90vw] max-h-[90vh] object-contain select-none disable-image-interaction"
                        onContextMenu={(e) => e.preventDefault()}
                    />
                </div>
            </div>
            
             <div className="absolute bottom-5 text-white bg-black/30 px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {images.length}
            </div>

        </div>
    );
};

export default Lightbox;

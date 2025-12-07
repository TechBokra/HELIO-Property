import React, { useState, useEffect, useRef } from 'react';
import type { Language } from '../../types';
import { CloseIcon } from '../ui/Icons';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useLanguage } from './LanguageContext';
import { Button } from '../ui/Button';

interface QuietZoneProps {
  onClose: () => void;
}

const QuietZone: React.FC<QuietZoneProps> = ({ onClose }) => {
  const { language } = useLanguage();
  const { data: siteContent, isLoading } = useSiteContent();
  const [currentQuote, setCurrentQuote] = useState({ quote: '', author: '' });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (siteContent && siteContent.quotes && siteContent.quotes.length > 0) {
        const randomQuote = siteContent.quotes[Math.floor(Math.random() * siteContent.quotes.length)];
        setCurrentQuote({
          quote: randomQuote.quote[language],
          author: randomQuote.author[language],
        });
    }
  }, [language, siteContent]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    };
    document.addEventListener('keydown', handleKeyDown);

    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    firstElement.focus();

    const handleTabKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    event.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    event.preventDefault();
                }
            }
        }
    };
    
    const currentModalRef = modalRef.current;
    currentModalRef?.addEventListener('keydown', handleTabKeyPress);

    return () => {
        document.removeEventListener('keydown', handleKeyDown);
        currentModalRef?.removeEventListener('keydown', handleTabKeyPress);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiet-zone-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl p-12 rounded-2xl shadow-2xl bg-white flex flex-col items-center text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10"
          aria-label="Close Quiet Zone"
        >
          <CloseIcon className="h-6 w-6" />
        </Button>

        <blockquote className="relative">
          {isLoading ? (
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded w-full mb-4"></div>
                    <div className="h-8 bg-gray-300 rounded w-3/4 mx-auto"></div>
                </div>
            ) : (
                <p id="quiet-zone-title" className="text-2xl md:text-3xl font-semibold leading-normal text-gray-800">
                    "{currentQuote.quote}"
                </p>
            )}
        </blockquote>
        {!isLoading && (
            <cite className="mt-6 text-lg text-amber-500 font-medium tracking-wide">
                - {currentQuote.author}
            </cite>
        )}
      </div>
    </div>
  );
};

export default QuietZone;
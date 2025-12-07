
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import type { Language } from '../../types';
import { arTranslations, enTranslations } from '../../data/translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: any; // Represents the loaded translation object for the current language
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
    ar: arTranslations,
    en: enTranslations,
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        try {
            const savedLang = localStorage.getItem('onlyhelio-lang') as Language;
            // Ensure the saved language is one of the valid options
            return savedLang && (savedLang === 'ar' || savedLang === 'en') ? savedLang : 'ar';
        } catch (error) {
            console.error("Failed to read language from localStorage", error);
            return 'ar'; // Default to Arabic on error
        }
    });

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        try {
            localStorage.setItem('onlyhelio-lang', language);
        } catch (error) {
            console.error("Failed to save language to localStorage", error);
        }
    }, [language]);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
    }, []);

    const value = useMemo(() => ({ 
        language, 
        setLanguage, 
        t: translations[language] 
    }), [language, setLanguage]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

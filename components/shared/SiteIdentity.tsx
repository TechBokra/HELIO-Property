import React from 'react';
import { useSiteContent } from '../../hooks/useSiteContent';
import { HelioLogo } from '../ui/HelioLogo';
import { useLanguage } from './LanguageContext';
import { useCityStore } from '../../store/useCityStore';

interface SiteIdentityProps {
    className?: string;
    logoClassName?: string;
    textClassName?: string;
    hideTextOnMobile?: boolean;
    showText?: boolean;
}

export const SiteIdentity: React.FC<SiteIdentityProps> = ({ 
    className = "", 
    logoClassName = "h-10 w-10", 
    textClassName = "text-2xl",
    hideTextOnMobile = true,
    showText = true
}) => {
    const { data: siteContent } = useSiteContent();
    const { language } = useLanguage();
    const portalMode = useCityStore((s) => s.portalMode);
    const activeCity = useCityStore((s) => s.getActiveCity());
    
    const logoUrl = siteContent?.logoUrl;
    const defaultHelioName = siteContent?.siteName?.[language] || "ONLY HELIO";

    const displaySiteName =
        portalMode === 'hub'
            ? (language === 'ar' ? 'أونلي بروبرتي' : 'ONLY PROPERTY')
            : activeCity && activeCity.id !== 'heliopolis'
                ? activeCity.brandTitle[language]
                : defaultHelioName;

    return (
        <div className={`flex items-center gap-3 font-bold ${className}`}>
            {logoUrl ? (
                <img 
                    src={logoUrl} 
                    alt="Site Logo" 
                    className={`${logoClassName} object-contain`} 
                />
            ) : (
                <HelioLogo className={logoClassName} />
            )}
            
            {showText && (
                <span className={`${textClassName} ${hideTextOnMobile ? 'hidden sm:block' : 'block'}`}>
                    {displaySiteName}
                </span>
            )}
        </div>
    );
};


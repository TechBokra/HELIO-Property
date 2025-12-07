import React from 'react';
import { useSiteContent } from '../../hooks/useSiteContent';
import { HelioLogo } from '../ui/HelioLogo';
import { useLanguage } from './LanguageContext';

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
    
    // Safely access properties even if data is still loading
    const logoUrl = siteContent?.logoUrl;
    const siteName = siteContent?.siteName?.[language] || "ONLY HELIO";

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
                    {siteName}
                </span>
            )}
        </div>
    );
};




import React from 'react';
import { useSiteContent } from '../../hooks/useSiteContent';
import { HelioLogo } from '../ui/HelioLogo';

interface SiteLogoProps {
    className?: string;
}

export const SiteLogo: React.FC<SiteLogoProps> = ({ className }) => {
    const { data: siteContent } = useSiteContent();
    const logoUrl = siteContent?.logoUrl;

    if (logoUrl) {
        return (
            <img 
                src={logoUrl} 
                alt="Site Logo" 
                className={`${className} object-contain`} 
            />
        );
    }

    return <HelioLogo className={className} />;
};

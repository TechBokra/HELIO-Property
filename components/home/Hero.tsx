import React, { useState, useEffect } from 'react';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useLanguage } from '../shared/LanguageContext';
import { getOptimizedImageUrl } from '../../utils/imageUtils';
import SmartActionLink from '../shared/SmartActionLink';

import { siteContentData as fallbackData } from '../../data/content';
import { useCityStore } from '../../store/useCityStore';

const Hero: React.FC = () => {
    const { language, t } = useLanguage();
    const { data: siteContent } = useSiteContent();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const activeCity = useCityStore((s) => s.getActiveCity());
    const isCustomCity = activeCity && activeCity.id !== 'heliopolis';
    
    const baseHeroImages = (siteContent?.hero?.images && siteContent.hero.images.length > 0)
        ? siteContent.hero.images 
        : fallbackData.hero.images;

    const heroImages = isCustomCity
        ? [{ src: activeCity.heroImageUrl, alt: activeCity.name }]
        : baseHeroImages;

    useEffect(() => {
        if (heroImages.length === 0) return;
        const timer = setTimeout(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
        }, 5000); // Change image every 5 seconds
        return () => clearTimeout(timer);
    }, [currentImageIndex, heroImages.length]);

    const activeImage = heroImages[currentImageIndex] || heroImages[0];
    const currentImageAlt = activeImage?.alt?.[language] || activeImage?.alt?.en || `${t.nav.properties} ${currentImageIndex + 1}`;

    const heroTitle = isCustomCity
        ? (language === 'ar'
            ? `بوابتك المتخصصة لعقارات وخدمات ${activeCity.name.ar}`
            : `Your Dedicated Real Estate & Service Portal for ${activeCity.name.en}`)
        : (siteContent?.hero?.[language]?.title || fallbackData.hero[language].title);

    const heroSubtitle = isCustomCity
        ? activeCity.tagline[language]
        : (siteContent?.hero?.[language]?.subtitle || fallbackData.hero[language].subtitle);

    const primaryBtn = siteContent?.hero?.primaryButton || fallbackData.hero.primaryButton;
    const secondaryBtn = siteContent?.hero?.secondaryButton || fallbackData.hero.secondaryButton;
    const showPrimaryBtn = primaryBtn?.visible ?? true;
    const showSecondaryBtn = secondaryBtn?.visible ?? true;
    const primaryLabel = primaryBtn?.text?.[language] || t.heroButtons.availableProperties;
    const secondaryLabel = secondaryBtn?.text?.[language] || t.addProperty;

    return (
        <section className="relative h-[85vh] flex items-center justify-center text-center text-white overflow-hidden">
            {heroImages.map((image, index) => {
                const isDataUri = typeof image.src === 'string' && image.src.startsWith('data:');
                const optimizedSmall = isDataUri ? image.src : getOptimizedImageUrl(image.src, 768, 70);
                const optimizedLarge = isDataUri ? image.src : getOptimizedImageUrl(image.src, 1400, 75);

                return (
                    <div key={image.src?.substring(0, 50) || index} className={`slider-image ${index === currentImageIndex ? 'active' : ''}`}>
                        <div className="watermarked w-full h-full">
                            <img
                                src={optimizedLarge}
                                {...(!isDataUri ? { srcSet: `${optimizedSmall} 768w, ${optimizedLarge} 1400w`, sizes: '100vw' } : {})}
                                alt={image.alt?.[language] || image.alt?.en || ''}
                                className="w-full h-full object-cover disable-image-interaction"
                                onContextMenu={(e) => e.preventDefault()}
                                loading={index === 0 ? "eager" : "lazy"}
                                {...(index === 0 ? { fetchpriority: "high" } : {})}
                                decoding={index === 0 ? "sync" : "async"}
                                aria-hidden={index !== currentImageIndex}
                                role="img"
                            />
                        </div>
                    </div>
                );
            })}
            <div className="absolute top-0 left-0 w-full h-full bg-black/60 z-10"></div>

            {/* Accessibility enhancement for screen readers */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
                New background image: {currentImageAlt}
            </div>

            <div className="relative z-20 px-4 container mx-auto flex flex-col items-center">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-shadow animate-slideInUp" style={{ animationDelay: '100ms' }}>
                    {heroTitle}
                </h1>
                <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-200 mb-10 text-shadow animate-slideInUp" style={{ animationDelay: '200ms' }}>
                    {heroSubtitle}
                </p>

                {(showPrimaryBtn || showSecondaryBtn) && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-10 animate-slideInUp" style={{ animationDelay: '300ms' }}>
                        {showPrimaryBtn && (
                            <SmartActionLink
                                to={primaryBtn?.link}
                                fallback="/properties"
                                className="w-full sm:w-auto bg-amber-500 text-gray-900 font-semibold px-10 py-4 rounded-lg text-lg hover:bg-amber-600 transition-colors duration-200 shadow-lg shadow-amber-500/20 transform hover:scale-105"
                            >
                                {primaryLabel}
                            </SmartActionLink>
                        )}
                        {showSecondaryBtn && (
                            <SmartActionLink
                                to={secondaryBtn?.link}
                                fallback="/add-property"
                                className="w-full sm:w-auto bg-transparent border-2 border-white text-white font-semibold px-10 py-4 rounded-lg text-lg hover:bg-white/10 transition-colors duration-200 backdrop-blur-sm transform hover:scale-105"
                            >
                                {secondaryLabel}
                            </SmartActionLink>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Hero;
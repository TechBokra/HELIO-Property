
import React, { useMemo } from 'react';
import Hero from './Hero';
import Services from './Services';
import Partners from './Partners';
import Integrations from './Integrations';
import CTA from './CTA';
import BannerDisplay from '../shared/BannerDisplay';
import AboutCity from './AboutCity';
import LatestProperties from './LatestProperties';
import SEO from '../shared/SEO';
import { useLanguage } from '../shared/LanguageContext';
import SocialProof from './SocialProof';
import Testimonial from './Testimonial';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useCityStore } from '../../store/useCityStore';
import { resolveHomeSections } from '../../utils/siteContentHelpers';
import type { HomeSectionId } from '../../types';

const HomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const { data: siteContent } = useSiteContent();
    const activeCity = useCityStore((s) => s.getActiveCity());
    const brandTitle = activeCity?.brandTitle?.[language] || 'ONLY HELIO';
    const pageTitle = `${brandTitle} | ${t.nav.home}`;
    const pageDescription =
        activeCity && activeCity.id !== 'heliopolis'
            ? activeCity.tagline[language]
            : language === 'ar'
                ? 'بوابتك الحصرية لأرقى العقارات والخدمات في هليوبوليس الجديدة. اكتشف روائع معمارية وخدمات تشطيب وديكور متكاملة.'
                : 'Your exclusive gateway to the finest properties and services in New Heliopolis. Discover architectural masterpieces and integrated finishing and decoration services.';

    const orderedSections = useMemo(() => resolveHomeSections(siteContent), [siteContent]);

    const renderSection = (sectionId: HomeSectionId) => {
        switch (sectionId) {
            case 'hero':
                return <Hero key="hero" />;
            case 'homeBanner':
                return <BannerDisplay key="homeBanner" location="home" />;
            case 'socialProof':
                return <SocialProof key="socialProof" />;
            case 'services':
                return <Services key="services" />;
            case 'whyNewHeliopolis':
                return <AboutCity key="whyNewHeliopolis" />;
            case 'whyUs':
                return <Integrations key="whyUs" />;
            case 'homeListings':
                return <LatestProperties key="homeListings" />;
            case 'partners':
                return <Partners key="partners" />;
            case 'testimonials':
                return <Testimonial key="testimonials" />;
            case 'homeCTA':
                return <CTA key="homeCTA" />;
            default:
                return null;
        }
    };

    return (
        <>
            <SEO title={pageTitle} description={pageDescription} />
            {orderedSections.map((section) => renderSection(section.id))}
        </>
    );
};

export default HomePage;

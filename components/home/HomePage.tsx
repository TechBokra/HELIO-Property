
import React from 'react';
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

const HomePage: React.FC = () => {
    const { language, t } = useLanguage();
    const { data: siteContent } = useSiteContent();
    const pageTitle = `ONLY HELIO | ${t.nav.home}`;
    const pageDescription =
        language === 'ar'
            ? 'بوابتك الحصرية لأرقى العقارات والخدمات في هليوبوليس الجديدة. اكتشف روائع معمارية وخدمات تشطيب وديكور متكاملة.'
            : 'Your exclusive gateway to the finest properties and services in New Heliopolis. Discover architectural masterpieces and integrated finishing and decoration services.';

    return (
        <>
            <SEO title={pageTitle} description={pageDescription} />
            <Hero />
            <BannerDisplay location="home" />
            {siteContent?.socialProof?.enabled && <SocialProof />}
            {siteContent?.services?.enabled && <Services />}
            {siteContent?.whyNewHeliopolis?.enabled && <AboutCity />}
            {siteContent?.whyUs?.enabled && <Integrations />}
            <LatestProperties />
            {siteContent?.partners?.enabled && <Partners />}
            {siteContent?.testimonials?.enabled && <Testimonial />}
            <CTA />
        </>
    );
};

export default HomePage;

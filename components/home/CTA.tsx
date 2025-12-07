
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../shared/LanguageContext';
import { useSiteContent } from '../../hooks/useSiteContent';

const CTA: React.FC = () => {
    const { language, t } = useLanguage();
    const { data: siteContent } = useSiteContent();

    const ctaConfig = siteContent?.homeCTA;

    if (!ctaConfig?.enabled) {
        return null;
    }

    const content = ctaConfig[language];

    return (
        <section className="py-20 md:py-32 bg-white subtle-bg">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-gray-900">
                    {content.title}
                </h2>
                <p className="max-w-3xl mx-auto text-lg text-gray-500 mb-8">{content.subtitle}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        to={content.link}
                        className="w-full sm:w-auto bg-amber-500 text-gray-900 font-semibold px-8 py-4 rounded-lg text-lg hover:bg-amber-600 transition-colors duration-200 shadow-lg shadow-amber-500/20"
                    >
                        {content.button}
                    </Link>
                    <Link
                        to="/register"
                        className="w-full sm:w-auto text-amber-500 border border-amber-500 font-semibold px-8 py-4 rounded-lg text-lg hover:bg-amber-500 hover:text-gray-900 transition-colors duration-200"
                    >
                        {t.joinAsPartner}
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default CTA;

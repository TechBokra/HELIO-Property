import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { AdminPartner } from '../../types';
import { usePartners } from '../../hooks/usePartners';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';

const PartnerCard: React.FC<{ partner: AdminPartner }> = ({ partner }) => {
    const { t } = useLanguage();
    const localizedPartner = t.partnerInfo[partner.id];

    if (!localizedPartner) return null;

    return (
        <Link to={`/partners/${partner.id}`} className="block h-full">
            <Card className="transform hover:-translate-y-2 transition-transform duration-300 group h-full flex flex-col overflow-hidden p-0 card-glow">
                <picture>
                    <source
                        type="image/webp"
                        srcSet={`${partner.imageUrl_small}&fm=webp 480w, ${partner.imageUrl_medium}&fm=webp 800w, ${
                            partner.imageUrl_large || partner.imageUrl
                        }&fm=webp 1200w`}
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
                    />
                    <img
                        src={partner.imageUrl_large || partner.imageUrl}
                        srcSet={`${partner.imageUrl_small} 480w, ${partner.imageUrl_medium} 800w, ${
                            partner.imageUrl_large || partner.imageUrl
                        } 1200w`}
                        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
                        alt={localizedPartner.name}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                    />
                </picture>
                <CardContent className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-amber-500 mb-2 group-hover:text-amber-400 transition-colors">
                        {localizedPartner.name}
                    </h3>
                    <p className="text-gray-600 text-sm flex-grow">
                        {localizedPartner.description}
                    </p>
                </CardContent>
            </Card>
        </Link>
    );
};

const Partners: React.FC = () => {
    const { language } = useLanguage();
    const { data: partners, isLoading: isLoadingPartners } = usePartners();
    const { data: siteContent, isLoading: isLoadingContent } = useSiteContent();
    const isLoading = isLoadingPartners || isLoadingContent;

    const content = useMemo(() => {
        if (!siteContent) return null;
        return siteContent.partners[language];
    }, [siteContent, language]);

    const categorizedPartners = useMemo(() => {
        if (!partners || !content) return { majorDevelopers: [], cityDevelopers: [], sections: [] };

        const activePartners = (partners || []).filter((p) => p.status === 'active');

        const majorDevelopers = activePartners.filter((p) => p.type === 'developer' && p.displayType === 'mega_project');
        const cityDevelopers = activePartners.filter((p) => p.type === 'developer' && p.displayType !== 'mega_project');
        const otherPartners = activePartners.filter(
            (p) => p.type !== 'developer' && p.type !== 'admin' && p.id !== 'individual-listings',
        );

        const sections = [
            { title: content.finishing_companies_title, partners: otherPartners.filter((p) => p.type === 'finishing') },
            { title: content.agencies_title, partners: otherPartners.filter((p) => p.type === 'agency') },
        ].filter((section) => section.partners.length > 0);

        return { majorDevelopers, cityDevelopers, sections };
    }, [partners, content]);

    if (isLoading || !content) {
        return <div className="py-20 bg-gray-50 animate-pulse h-[500px]"></div>;
    }

    return (
        <div className="py-20 bg-gray-50 subtle-bg">
            <div className="container mx-auto px-6">
                <div className="text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{content.title}</h2>
                    <p className="max-w-3xl mx-auto text-lg text-gray-500 mb-12">
                        {content.description}
                    </p>
                </div>

                {categorizedPartners.majorDevelopers.length > 0 && (
                    <div className="mb-16">
                        <div className="border-b-2 border-amber-500/20 pb-4 mb-12">
                            <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-800">
                                {content.mega_projects_title}
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {categorizedPartners.majorDevelopers.map((partner) => (
                                <PartnerCard key={partner.id} partner={partner} />
                            ))}
                        </div>
                    </div>
                )}

                {categorizedPartners.cityDevelopers.length > 0 && (
                    <div className="mb-16">
                        <div className="border-b-2 border-amber-500/20 pb-4 mb-12">
                            <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-800">
                                {content.developers_title}
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {categorizedPartners.cityDevelopers.map((partner) => (
                                <PartnerCard key={partner.id} partner={partner} />
                            ))}
                        </div>
                    </div>
                )}

                {categorizedPartners.sections.map((section) => (
                    <div key={section.title} className="mb-16">
                        <div className="border-b-2 border-amber-500/20 pb-4 mb-12">
                            <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-800">
                                {section.title}
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {section.partners.map((partner) => (
                                <PartnerCard key={partner.id} partner={partner} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Partners;
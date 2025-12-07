
import React from 'react';
import { BuildingIcon, CheckCircleIcon, PriceIcon, LocationMarkerIcon } from '../ui/Icons';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
    icon,
    title,
    description,
}) => (
    <Card className="border-transparent hover:border-amber-500/30 transition-all duration-300 transform hover:-translate-y-1 h-full hover:shadow-lg p-0">
        <CardContent className="p-8">
            <div className="flex-shrink-0 bg-amber-500/10 text-amber-500 p-4 rounded-full mb-6 inline-block">
                {icon}
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500">{description}</p>
            </div>
        </CardContent>
    </Card>
);

const Integrations: React.FC = () => {
    const { language } = useLanguage();
    const { data: siteContent, isLoading } = useSiteContent();

    if (isLoading || !siteContent) {
        return <section className="py-20 bg-white animate-pulse h-96"></section>;
    }

    const t = siteContent.whyUs[language];

    const icons = [
        <BuildingIcon className="w-8 h-8" />,
        <PriceIcon className="w-8 h-8" />,
        <CheckCircleIcon className="w-8 h-8" />,
        <LocationMarkerIcon className="w-8 h-8" />,
    ];

    return (
        <section className="py-20 bg-white subtle-bg">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t.title}</h2>
                    <p className="text-lg text-gray-500 mt-4 max-w-3xl mx-auto">{t.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {t.features.map((feature: any, index: number) => (
                        <FeatureCard key={feature.title} {...feature} icon={icons[index]} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Integrations;

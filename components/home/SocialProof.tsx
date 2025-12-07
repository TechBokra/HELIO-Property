
import React from 'react';
import { useLanguage } from '../shared/LanguageContext';
import { useSiteContent } from '../../hooks/useSiteContent';

const SocialProof: React.FC = () => {
    const { language } = useLanguage();
    const { data: siteContent, isLoading } = useSiteContent();

    if (isLoading) {
        return (
            <section className="bg-gray-50 py-20 animate-pulse">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index}>
                                <div className="h-12 w-24 bg-gray-200 rounded mx-auto mb-2"></div>
                                <div className="h-6 w-32 bg-gray-200 rounded mx-auto"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }
    
    if (!siteContent?.socialProof?.stats || siteContent.socialProof.stats.length === 0) {
        return null;
    }
    
    const stats = siteContent.socialProof.stats;

    return (
        <section className="bg-gray-50 py-20">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {stats.map((stat: any, index: number) => (
                        <div key={index}>
                            <p className="text-4xl md:text-5xl font-bold text-amber-500">{stat.value}</p>
                            <p className="mt-2 text-lg text-gray-600">{stat.name[language]}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SocialProof;

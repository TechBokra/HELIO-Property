




import React from 'react';
import { useLanguage } from '../shared/LanguageContext';
import { QuoteIcon } from '../ui/Icons';
import { useSiteContent } from '../../hooks/useSiteContent';

import { siteContentData as fallbackData } from '../../data/content';

const Testimonial: React.FC = () => {
    const { language } = useLanguage();
    const { data: siteContent, isLoading } = useSiteContent();

    const testimonialsContent = siteContent?.testimonials || fallbackData.testimonials;
    const testimonialItems = testimonialsContent?.items || [];

    if (isLoading && testimonialItems.length === 0) {
        return (
            <section className="py-20 bg-white subtle-bg animate-pulse">
                <div className="container mx-auto px-6 h-64"></div>
            </section>
        );
    }
    
    if (testimonialItems.length === 0) {
        return null;
    }
    
    const sectionTitle = testimonialsContent[language]?.title || fallbackData.testimonials[language].title;
    const sectionSubtitle = testimonialsContent[language]?.subtitle || fallbackData.testimonials[language].subtitle;

    return (
        <section className="py-20 bg-white subtle-bg">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{sectionTitle}</h2>
                    <p className="text-lg text-gray-500 mt-4 max-w-3xl mx-auto">{sectionSubtitle}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonialItems.map((testimonial: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-8 rounded-lg shadow-md border border-gray-200 flex flex-col h-full transition-transform hover:-translate-y-1 duration-300">
                            <QuoteIcon className="w-10 h-10 text-amber-400 mb-6" />
                            <blockquote className="text-lg text-gray-700 italic mb-6 flex-grow leading-relaxed">
                                "{testimonial.quote[language]}"
                            </blockquote>
                            <footer className="font-semibold border-t border-gray-200 pt-4">
                                <p className="text-gray-900">{testimonial.author[language]}</p>
                                <p className="text-gray-500 text-sm">{testimonial.location[language]}</p>
                            </footer>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonial;

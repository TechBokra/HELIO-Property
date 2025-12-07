
import React, { useState, useEffect, useRef } from 'react';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useLanguage } from '../shared/LanguageContext';

const AboutCity: React.FC = () => {
    const { language } = useLanguage();
    const { data: siteContent, isLoading } = useSiteContent();
    const [currentSlide, setCurrentSlide] = useState(0);
    const timeoutRef = useRef<number | null>(null);

    const images = siteContent?.whyNewHeliopolis.images || [];

    useEffect(() => {
        if (images.length === 0) return;
        const resetTimeout = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
        resetTimeout();
        timeoutRef.current = window.setTimeout(() => setCurrentSlide((prev) => (prev === images.length - 1 ? 0 : prev + 1)), 5000);
        return () => resetTimeout();
    }, [currentSlide, images.length]);
    
    const goToSlide = (slideIndex: number) => setCurrentSlide(slideIndex);

    if (isLoading || !siteContent) {
        return (
            <section className="py-20 bg-gray-50 animate-pulse">
                <div className="container mx-auto px-6">
                    <div className="h-8 w-1/2 mx-auto bg-gray-200 rounded mb-16"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <div className="h-8 w-3/4 bg-gray-200 rounded"></div>
                            <div className="h-24 w-full bg-gray-200 rounded"></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-20 bg-gray-200 rounded-lg"></div>
                                <div className="h-20 bg-gray-200 rounded-lg"></div>
                                <div className="h-20 bg-gray-200 rounded-lg"></div>
                                <div className="h-20 bg-gray-200 rounded-lg"></div>
                            </div>
                        </div>
                        <div className="h-[500px] bg-gray-200 rounded-2xl"></div>
                    </div>
                </div>
            </section>
        );
    }

    const t = siteContent.whyNewHeliopolis[language];
    
    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                       {t.title}
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900">{t.location.title}</h3>
                        <p className="text-gray-600 text-lg">{t.location.description}</p>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            {t.location.stats.map((stat: any, index: number) => (
                                <div key={index} className="bg-white p-4 rounded-lg">
                                    <p className="text-amber-500 text-2xl font-bold">{stat.value}</p>
                                    <p className="text-gray-500 text-sm">{stat.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="relative w-full h-[500px] rounded-2xl shadow-xl overflow-hidden border-4 border-white">
                        {images.map((image: any, index: number) => (
                            <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
                                <img src={image.src} alt={image.alt[language]} className="w-full h-full object-cover" />
                            </div>
                        ))}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
                             {images.map((_: any, index: number) => (
                                <button key={index} onClick={() => goToSlide(index)} className={`w-3 h-3 rounded-full transition-colors ${currentSlide === index ? 'bg-amber-500' : 'bg-gray-400/50 hover:bg-gray-400'}`} aria-label={`${language === 'ar' ? 'اذهب إلى الشريحة' : 'Go to slide'} ${index + 1}`}></button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutCity;

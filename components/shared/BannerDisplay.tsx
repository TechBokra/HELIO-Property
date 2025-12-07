

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Banner } from '../../types';
import { getAllBanners } from '../../services/banners';
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/Icons';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from './LanguageContext';

interface BannerDisplayProps {
    location: 'home' | 'properties' | 'details' | 'finishing' | 'decorations';
}

const BannerDisplay: React.FC<BannerDisplayProps> = ({ location }) => {
    const { language } = useLanguage();
    const { data: banners, isLoading: loading } = useQuery({ queryKey: ['banners'], queryFn: getAllBanners });
    const [currentIndex, setCurrentIndex] = useState(0);

    const activeBanners = useMemo(() => {
        const now = new Date();
        return (banners || []).filter(banner => {
            if (banner.status !== 'active') return false;
            if (!banner.locations.includes(location)) return false;
            
            const startDate = banner.startDate ? new Date(banner.startDate) : null;
            const endDate = banner.endDate ? new Date(banner.endDate) : null;

            if (startDate && now < startDate) return false;
            if (endDate) {
                endDate.setHours(23, 59, 59, 999);
                if (now > endDate) return false;
            }

            return true;
        });
    }, [banners, location]);

    const goToNext = useCallback(() => {
        setCurrentIndex(prevIndex => (prevIndex === activeBanners.length - 1 ? 0 : prevIndex + 1));
    }, [activeBanners.length]);

    const goToPrev = () => {
        setCurrentIndex(prevIndex => (prevIndex === 0 ? activeBanners.length - 1 : prevIndex - 1));
    };
    
    useEffect(() => {
        if (activeBanners.length > 1) {
            const timer = setTimeout(goToNext, 5000);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, activeBanners.length, goToNext]);


    if (loading || activeBanners.length === 0) {
        return null;
    }

    const BannerContent = ({ banner }: { banner: Banner }) => {
        const content = (
            <div className="relative w-full h-full">
                <img 
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                />
                 <div className="absolute inset-0 bg-black/30"></div>
            </div>
        );
        return banner.link && banner.link !== '#' ? <Link to={banner.link} className="block w-full h-full">{content}</Link> : content;
    }
    
    const wrapperClass = location === 'details' ? "my-8" : "py-12";
    const paddingBottom = location === 'home' ? '33.33%' : (location === 'properties' || location === 'finishing' || location === 'decorations' ? '25%' : '56.25%');


    return (
        <div className={wrapperClass}>
            <div
                className="container mx-auto px-6"
                role="region"
                aria-roledescription="carousel"
                aria-label={language === 'ar' ? 'إعلانات ترويجية' : 'Promotional Banners'}
            >
                <div className="relative group overflow-hidden rounded-lg shadow-lg" style={{paddingBottom}}>
                    {activeBanners.map((banner, index) => (
                        <div key={banner.id} className={`slider-image ${index === currentIndex ? 'active' : ''}`}>
                            <BannerContent banner={banner} />
                        </div>
                    ))}

                    {activeBanners.length > 1 && (
                        <>
                            <button
                                onClick={goToPrev}
                                className={`absolute top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 z-10 ${language === 'ar' ? 'right-4' : 'left-4'}`}
                                aria-label={language === 'ar' ? 'الإعلان السابق' : 'Previous Ad'}
                            >
                                <ChevronLeftIcon className="w-6 h-6" />
                            </button>
                             <button
                                onClick={goToNext}
                                className={`absolute top-1/2 -translate-y-1/2 p-2 bg-black/40 text-white rounded-full transition-opacity opacity-0 group-hover:opacity-100 z-10 ${language === 'ar' ? 'left-4' : 'right-4'}`}
                                aria-label={language === 'ar' ? 'الإعلان التالي' : 'Next Ad'}
                            >
                                <ChevronRightIcon className="w-6 h-6" />
                            </button>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                                {activeBanners.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentIndex(index)}
                                        className={`w-3 h-3 rounded-full transition-colors ${index === currentIndex ? 'bg-white' : 'bg-white/50 hover:bg-white'}`}
                                        aria-label={`${language === 'ar' ? 'اذهب إلى الإعلان' : 'Go to ad'} ${index + 1}`}
                                    ></button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BannerDisplay;
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import PropertyCard from '../properties/PropertyCard';
import type { Language, FavoriteItem } from '../../types';
import { useFavorites } from '../shared/FavoritesContext';
import { HeartIcon } from '../ui/Icons';
import PropertyCardSkeleton from '../shared/PropertyCardSkeleton';
import { useProperties } from '../../hooks/useProperties';
import { usePortfolioItems } from '../../hooks/usePortfolioItems';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';

const PortfolioItemCard: React.FC<{ item: any }> = ({ item }) => {
    const { language, t } = useLanguage();
    return (
        <Card className="group flex flex-col p-0 overflow-hidden transform hover:-translate-y-2 transition-transform duration-300">
            <div className="relative aspect-video bg-gray-100">
                <img src={item.imageUrl} alt={item.alt} className="w-full h-full object-cover" />
            </div>
            <CardContent className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-gray-900 truncate mb-1">{item.title[language]}</h3>
                <p className="text-sm text-gray-500">{item.category[language]}</p>
            </CardContent>
        </Card>
    );
};

const ServiceCard: React.FC<{ item: any }> = ({ item }) => {
    const { language, t } = useLanguage();
    return (
        <Link to="/finishing">
            <Card className="group flex flex-col p-0 overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 h-full">
                <CardContent className="p-4 flex flex-col flex-grow">
                    <h3 className="font-bold text-lg text-amber-600 mb-2">{item.title[language]}</h3>
                    <p className="text-sm text-gray-600 line-clamp-3">{item.description[language]}</p>
                </CardContent>
            </Card>
        </Link>
    );
};


const FavoritesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_fav = t.favoritesPage;
    const { favorites, isFavorite } = useFavorites();
    const { data: properties, isLoading: isLoadingProps } = useProperties();
    const { data: portfolioItems, isLoading: isLoadingPortfolio } = usePortfolioItems();
    const { data: siteContent, isLoading: isLoadingContent } = useSiteContent();
    const isLoading = isLoadingProps || isLoadingPortfolio || isLoadingContent;

    const favoriteProperties = useMemo(() => (properties || []).filter(p => isFavorite(p.id, 'property')), [properties, favorites]);
    const favoriteServices = useMemo(() => (siteContent?.finishingServices || []).filter(s => isFavorite(s.title.en, 'service')), [siteContent, favorites]);
    const favoritePortfolioItems = useMemo(() => (portfolioItems || []).filter(i => isFavorite(i.id, 'portfolio')), [portfolioItems, favorites]);

    const hasFavorites = favoriteProperties.length > 0 || favoriteServices.length > 0 || favoritePortfolioItems.length > 0;

    return (
        <div className="py-20 bg-white min-h-[60vh]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{t_fav.title}</h1>
                <p className="text-lg text-gray-500 mt-4 max-w-2xl mx-auto">{t_fav.subtitle}</p>
            </div>
            
            {isLoading ? (
                <div className="animate-fadeIn grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                    {Array.from({ length: favorites.length || 3 }).map((_, index) => <PropertyCardSkeleton key={index} />)}
                </div>
            ) : (
              <div className="animate-fadeIn space-y-12">
                {!hasFavorites ? (
                    <div className="text-center py-16 flex flex-col items-center">
                        <HeartIcon className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-xl text-gray-500 mb-6">{t_fav.noFavorites}</p>
                        <Link to="/properties" className="bg-amber-500 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-amber-600 transition-colors duration-200">
                            {t_fav.browseButton}
                        </Link>
                    </div>
                ) : (
                    <>
                        {favoriteProperties.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold mb-6">{language === 'ar' ? 'العقارات المفضلة' : 'Favorite Properties'}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                                    {favoriteProperties.map((prop) => <PropertyCard key={prop.id} {...prop} />)}
                                </div>
                            </section>
                        )}
                         {favoriteServices.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold mb-6">{language === 'ar' ? 'باقات التشطيب المفضلة' : 'Favorite Finishing Packages'}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {favoriteServices.map((service) => <ServiceCard key={service.title.en} item={service} />)}
                                </div>
                            </section>
                        )}
                        {favoritePortfolioItems.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold mb-6">{language === 'ar' ? 'الأعمال المفضلة' : 'Favorite Works'}</h2>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {favoritePortfolioItems.map((item) => <PortfolioItemCard key={item.id} item={item} />)}
                                </div>
                            </section>
                        )}
                    </>
                )}
              </div>
            )}
          </div>
        </div>
    );
};

export default FavoritesPage;
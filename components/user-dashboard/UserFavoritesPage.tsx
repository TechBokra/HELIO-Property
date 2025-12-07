import { useMemo } from 'react';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useProperties } from '../../hooks/useProperties';
import { useLanguage } from '../shared/LanguageContext';
import PropertyCard from '../properties/PropertyCard';
import PropertyCardSkeleton from '../shared/PropertyCardSkeleton';
import { HeartIcon } from '../ui/Icons';
import { Link } from 'react-router-dom';

const UserFavoritesPage = () => {
    const { language, t } = useLanguage();
    const t_fav = t.favoritesPage;
    const { favorites } = useFavoritesStore();
    const { data: properties, isLoading } = useProperties();

    const favoriteProperties = useMemo(() => 
        (properties || []).filter(p => favorites.some(fav => fav.id === p.id && fav.type === 'property')), 
    [properties, favorites]);

    return (
        <div className="animate-fadeIn space-y-8">
             <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_fav.title}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t_fav.subtitle}</p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, index) => <PropertyCardSkeleton key={index} />)}
                </div>
            ) : favoriteProperties.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {favoriteProperties.map((prop) => (
                        <PropertyCard key={prop.id} {...prop} />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center">
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
                        <HeartIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t_fav.noFavorites}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">Browse properties and save the ones you like to view them later here.</p>
                    <Link to="/properties" className="bg-amber-500 text-gray-900 font-semibold px-6 py-2.5 rounded-lg hover:bg-amber-600 transition-colors">
                        {t_fav.browseButton}
                    </Link>
                </div>
            )}
        </div>
    );
};

export default UserFavoritesPage;
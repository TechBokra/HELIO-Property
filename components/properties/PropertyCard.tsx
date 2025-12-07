import { useMemo, memo, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { BedIcon, BathIcon, AreaIcon, HeartIcon, HeartIconSolid, FloorIcon, CompoundIcon, WalletIcon, BanknotesIcon } from '../ui/Icons';
import type { Property } from '../../types';
import { useFavorites } from '../shared/FavoritesContext';
import { isCommercial } from '../../utils/propertyUtils';
import { useToast } from '../shared/ToastContext';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';

type PropertyCardProps = Property;

const PropertyCard = memo<PropertyCardProps>((props) => {
  const { language, t } = useLanguage();
  const {
    id,
    imageUrl,
    imageUrl_small,
    imageUrl_medium,
    imageUrl_large,
    status,
    price,
    priceNumeric,
    pricePerMeter,
    title,
    beds,
    baths,
    area,
    floor,
    type,
    finishingStatus,
    isInCompound,
    partnerId,
    partnerName,
    installmentsAvailable,
    realEstateFinanceAvailable,
    projectId,
    projectName,
  } = props;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showToast } = useToast();
  const isForSale = status.en === 'For Sale';
  const isFav = isFavorite(id, 'property');
  const isCommercialProp = isCommercial(props);

  const handleFavoriteClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(id, 'property');
    if (!isFav) {
        showToast(t.favoritesPage.addedToFavorites, 'success');
    } else {
        showToast(t.favoritesPage.removedFromFavorites, 'success');
    }
  };

  const displayPricePerMeter = useMemo(() => {
      if (pricePerMeter?.[language]) {
          return pricePerMeter[language];
      }
      if (status?.en === 'For Sale' && priceNumeric && area && area > 0) {
          const perMeter = Math.round(priceNumeric / area);
          if (language === 'ar') {
              return `${perMeter.toLocaleString('ar-EG')} ج.م/م²`;
          }
          return `EGP ${perMeter.toLocaleString('en-US')}/m²`;
      }
      return null;
  }, [pricePerMeter, status, priceNumeric, area, language]);


  return (
    <Card className="relative transform hover:-translate-y-2 transition-transform duration-300 group h-full flex flex-col overflow-hidden p-0">
        {/* Main Stretched Link for the entire card click */}
        <Link 
            to={`/properties/${id}`} 
            className="absolute inset-0 z-0 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg"
            aria-label={`${title[language]} - ${t.propertyCard.viewProject}`}
        >
            <span className="sr-only">View details</span>
        </Link>

        <div className="relative watermarked z-0">
            <picture>
                <source
                    type="image/webp"
                    srcSet={`${imageUrl_small}&fm=webp 480w, ${imageUrl_medium}&fm=webp 800w, ${imageUrl_large || imageUrl}&fm=webp 1200w`}
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
                />
                <img 
                    src={imageUrl_large || imageUrl}
                    srcSet={`${imageUrl_small} 480w, ${imageUrl_medium} 800w, ${imageUrl_large || imageUrl} 1200w`}
                    alt={title[language]} 
                    className="w-full h-56 object-cover disable-image-interaction"
                    onContextMenu={(e) => e.preventDefault()}
                    loading="lazy"
                />
            </picture>
          <span className="absolute top-4 left-4 z-10 text-white font-semibold px-3 py-1 rounded-md text-sm shadow-sm bg-sky-600/90 backdrop-blur-sm" style={{ backgroundColor: isForSale ? '#16a34a' : '#0284c7' }}>
            {status[language]}
          </span>
           {isInCompound && (
             <span className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} p-2 rounded-full bg-black/50 z-10`} title={t.propertiesPage.inCompound}>
                <CompoundIcon className="w-5 h-5 text-white" />
             </span>
           )}
          <div className={`absolute top-14 ${language === 'ar' ? 'right-4' : 'left-4'} flex flex-col gap-2 items-center z-20`}>
            <button
              onClick={handleFavoriteClick}
              className="p-2 rounded-full bg-black/50 hover:bg-black/75 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label={isFav ? t.favoritesPage.removeFromFavorites : t.favoritesPage.addToFavorites}
            >
              {isFav ? (
                <HeartIconSolid className="w-6 h-6 text-red-500" />
              ) : (
                <HeartIcon className="w-6 h-6 text-white" />
              )}
            </button>
            {installmentsAvailable && isForSale && (
                <div className="p-2 rounded-full bg-black/50" title={t.propertiesPage.installments}>
                    <WalletIcon className="w-6 h-6 text-white" />
                </div>
            )}
             {realEstateFinanceAvailable && isForSale && (
                <div className="p-2 rounded-full bg-black/50" title={t.propertiesPage.realEstateFinance}>
                    <BanknotesIcon className="w-6 h-6 text-white" />
                </div>
            )}
          </div>
        </div>
        <CardContent className="p-5 flex flex-col flex-grow relative z-10 pointer-events-none">
          <p className="text-2xl font-bold text-amber-500 mb-1">{price[language]}</p>
          {displayPricePerMeter && (
            <p className="text-sm text-gray-500 mb-2">{displayPricePerMeter}</p>
          )}
          <h3 className="text-lg font-bold text-gray-900 truncate mb-1 group-hover:text-amber-500 transition-colors">{title[language]}</h3>
          
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
              {finishingStatus && (
                <span className="bg-gray-100 px-2 py-1 rounded">{finishingStatus[language]}</span>
              )}
          </div>
          
          <div className="text-sm text-gray-500 mb-4 flex-grow">
            {partnerName && partnerId !== 'individual-listings' ? (
                <p className="pointer-events-auto">
                    {t.propertyCard.by}{' '}
                    <Link to={`/partners/${partnerId}`} className="font-semibold text-gray-700 hover:text-amber-500 hover:underline relative z-20">
                        {partnerName}
                    </Link>
                </p>
            ) : partnerName ? (
                 <p>{t.propertyCard.by} {partnerName}</p>
            ) : null}

            {projectName && projectId && (
                <p className="pointer-events-auto">
                    <Link to={`/projects/${projectId}`} className="text-amber-600 hover:underline text-xs relative z-20">
                        {t.propertyCard.viewProject}
                    </Link>
                </p>
            )}
          </div>

          <div className="flex justify-around items-center text-gray-500 border-t border-gray-200 pt-4 mt-auto">
            {!isCommercialProp && (
                <>
                    <div className="flex items-center gap-2" title={`${beds} ${t.propertyCard.beds}`}>
                        <BedIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium">{beds}</span>
                    </div>
                    <div className="flex items-center gap-2" title={`${baths} ${t.propertyCard.baths}`}>
                        <BathIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium">{baths}</span>
                    </div>
                </>
            )}
            <div className="flex items-center gap-2" title={`${area} ${t.propertyCard.area}`}>
                <AreaIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium">{area} {t.propertyCard.area}</span>
            </div>
            {floor !== undefined && (type.en === 'Apartment' || type.en === 'Commercial') && (
                 <div className="flex items-center gap-2" title={`${floor} ${t.propertyCard.floor}`}>
                    <FloorIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium">{floor}</span>
                </div>
            )}
          </div>
        </CardContent>
    </Card>
  );
});
PropertyCard.displayName = 'PropertyCard';
export default PropertyCard;
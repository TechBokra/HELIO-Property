import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { BedIcon, BathIcon, AreaIcon, LocationMarkerIcon } from '../ui/Icons';
import type { Property } from '../../types';
import { isCommercial } from '../../utils/propertyUtils';
import { useLanguage } from '../shared/LanguageContext';

const StatItem: React.FC<{ icon: React.ReactNode; value: string | number; label: string }> = ({ icon, value, label }) => (
    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300" title={`${value} ${label}`}>
        <div className="text-gray-400 dark:text-gray-500">{icon}</div>
        <span className="font-bold text-sm">{value}</span>
        <span className="text-xs text-gray-500 hidden sm:inline">{label}</span>
    </div>
);

const PropertyListItem = memo<Property>((props) => {
    const { language, t } = useLanguage();
    const t_card = t.propertyCard;
    const { 
        id, imageUrl, imageUrl_small, imageUrl_medium, status, price, title, address, beds, baths, area, 
        partnerId, partnerName, partnerImageUrl, type 
    } = props;
    
    const isForSale = status.en === 'For Sale';
    const isCommercialProp = isCommercial(props);

    return (
        <Link to={`/properties/${id}`} className="block group">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row overflow-hidden h-full">
                
                {/* Image Section */}
                <div className="relative w-full sm:w-48 md:w-64 h-48 sm:h-auto flex-shrink-0">
                    <picture>
                         <source
                            type="image/webp"
                            srcSet={`${imageUrl_small}&fm=webp 480w, ${imageUrl_medium || imageUrl}&fm=webp 800w`}
                            sizes="(max-width: 640px) 100vw, 300px"
                        />
                        <img 
                            src={imageUrl_medium || imageUrl}
                            srcSet={`${imageUrl_small} 480w, ${imageUrl_medium || imageUrl} 800w`}
                            alt={title[language]} 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            loading="lazy"
                        />
                    </picture>
                    <div className={`absolute top-3 ${language === 'ar' ? 'left-3' : 'right-3'} flex flex-col gap-1 items-start`}>
                        <span 
                            className={`text-white font-bold px-2 py-1 rounded text-xs shadow-sm ${isForSale ? 'bg-green-600' : 'bg-sky-600'}`}
                        >
                            {status[language]}
                        </span>
                        {props.availabilityStatus === 'sold' && (
                            <span className="bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm">
                                {language === 'ar' ? 'تم البيع' : 'Sold'}
                            </span>
                        )}
                        {props.availabilityStatus === 'reserved' && (
                            <span className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm">
                                {language === 'ar' ? 'محجوز' : 'Reserved'}
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Content Section */}
                <div className="p-4 flex flex-col flex-grow justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded dark:bg-amber-900/30">{type[language]}</p>
                            <p className="text-lg font-bold text-amber-500 whitespace-nowrap">{price[language]}</p>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-amber-600 transition-colors mb-2">
                            {title[language]}
                        </h3>
                        
                        <div className="flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
                            <LocationMarkerIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p className="line-clamp-1">{address[language]}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4 sm:gap-6">
                            {!isCommercialProp && (
                                <>
                                    <StatItem icon={<BedIcon className="w-5 h-5" />} value={beds} label={t_card.beds} />
                                    <StatItem icon={<BathIcon className="w-5 h-5" />} value={baths} label={t_card.baths} />
                                </>
                            )}
                            <StatItem icon={<AreaIcon className="w-5 h-5" />} value={area} label={t_card.area} />
                        </div>
                        
                        {partnerName && (
                            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                                {partnerImageUrl ? <img src={partnerImageUrl} alt={partnerName} className="w-6 h-6 rounded-full object-cover" /> : null}
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 hidden md:inline truncate max-w-[100px]">{partnerName}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
});
PropertyListItem.displayName = 'PropertyListItem';
export default PropertyListItem;
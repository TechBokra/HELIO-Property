
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import PropertyCard from '../properties/PropertyCard';
import PropertyCardSkeleton from '../shared/PropertyCardSkeleton';
import { isListingActive } from '../../utils/propertyUtils';
import { useProperties } from '../../hooks/useProperties';
import { useLanguage } from '../shared/LanguageContext';
import { useSiteContent } from '../../hooks/useSiteContent';

const LatestProperties: React.FC = () => {
  const { language, t } = useLanguage();
  const { data: properties, isLoading } = useProperties();
  const { data: siteContent } = useSiteContent();
  
  const config = siteContent?.homeListings;

  const featuredProperties = useMemo(() => {
    if (!properties) return [];
    const limit = config?.count || 4;
    return properties
      .filter(isListingActive)
      .sort((a, b) => new Date(b.listingStartDate || 0).getTime() - new Date(a.listingStartDate || 0).getTime())
      .slice(0, limit);
  }, [properties, config]);

  if (config?.enabled === false) {
      return null;
  }

  const title = config?.[language]?.title || t.latestProperties;

  return (
    <div className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {title}
            </h2>
            <Link to="/properties" className="text-amber-500 font-semibold hover:underline">
                {t.viewAll}
            </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <PropertyCardSkeleton key={index} />)
          ) : (
            featuredProperties.map((prop) => (
              <PropertyCard key={prop.id} {...prop} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LatestProperties;

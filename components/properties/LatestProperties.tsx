import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import PropertyCard from './PropertyCard';
import PropertyCardSkeleton from '../shared/PropertyCardSkeleton';
import type { Project } from '../../types';
import { isListingActive } from '../../utils/propertyUtils';
import { useQuery } from '@tanstack/react-query';
import { useProperties } from '../../hooks/useProperties';
import { useLanguage } from '../shared/LanguageContext';

const LatestProperties: React.FC = () => {
  const { language, t } = useLanguage();
  const { data: properties, isLoading } = useProperties();

  const featuredProperties = useMemo(() => {
    if (!properties) return [];
    return properties
      .filter(isListingActive)
      .sort((a, b) => new Date(b.listingStartDate || 0).getTime() - new Date(a.listingStartDate || 0).getTime())
      .slice(0, 4);
  }, [properties]);

  return (
    <div className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {t.latestProperties}
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
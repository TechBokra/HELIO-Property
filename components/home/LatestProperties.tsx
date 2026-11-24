import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import PropertyCard from '../properties/PropertyCard';
import PropertyCardSkeleton from '../shared/PropertyCardSkeleton';
import ErrorState from '../shared/ErrorState';
import SmartActionLink from '../shared/SmartActionLink';
import { isListingActive } from '../../utils/propertyUtils';
import { useProperties } from '../../hooks/useProperties';
import { useLanguage } from '../shared/LanguageContext';
import { useSiteContent } from '../../hooks/useSiteContent';

const LatestProperties: React.FC = () => {
  const { language, t } = useLanguage();
  const { data: properties, isLoading, isError, refetch } = useProperties();
  const { data: siteContent } = useSiteContent();

  const config = siteContent?.homeListings;

  const featuredProperties = useMemo(() => {
    if (!properties) return [];
    const limit = config?.count || 4;
    return properties
      .filter(isListingActive)
      .sort(
        (a, b) =>
          new Date(b.listingStartDate || b.createdAt || b.updatedAt || 0).getTime() -
          new Date(a.listingStartDate || a.createdAt || a.updatedAt || 0).getTime()
      )
      .slice(0, limit);
  }, [properties, config]);

  if (config?.enabled === false) {
    return null;
  }

  const title = config?.[language]?.title || t.latestProperties;
  const viewAllBtn = config?.viewAllButton;
  const showViewAll = viewAllBtn?.visible !== false;
  const viewAllLabel = viewAllBtn?.text?.[language] || t.viewAll;
  const viewAllLink = viewAllBtn?.link || '/properties';

  return (
    <div className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {title}
          </h2>
          {showViewAll && (
            <SmartActionLink to={viewAllLink} fallback="/properties" className="text-amber-500 font-semibold hover:underline">
              {viewAllLabel}
            </SmartActionLink>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <PropertyCardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title={language === 'ar' ? 'تعذر تحميل أحدث العقارات' : 'Failed to load latest properties'}
            message={language === 'ar' ? 'حدث خطأ أثناء الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.' : 'A database connection error occurred. Please try again.'}
            retryLabel={language === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
            onRetry={() => refetch()}
            className="max-w-xl mx-auto"
          />
        ) : featuredProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {featuredProperties.map((prop) => (
              <PropertyCard key={prop.id} {...prop} />
            ))}
          </div>
        ) : (
          <div className="text-center py-14 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-600 text-lg">
              {language === 'ar'
                ? 'لا توجد عقارات منشورة متاحة حالياً.'
                : 'No published properties are currently available.'}
            </p>
            {showViewAll && (
              <SmartActionLink
                to={viewAllLink}
                fallback="/properties"
                className="mt-4 inline-block text-amber-600 font-semibold hover:underline text-sm"
              >
                {viewAllLabel}
              </SmartActionLink>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestProperties;

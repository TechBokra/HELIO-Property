import React from 'react';
import PropertyCardSkeleton from '../shared/PropertyCardSkeleton';

const PropertyDetailsSkeleton: React.FC = () => {
  return (
    <div className="py-12 animate-pulse">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="h-12 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
          <div className="h-6 w-1/2 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div>
              <div className="w-full h-[500px] bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                ))}
              </div>
            </div>
            {/* Detail Sections */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="h-6 w-1/3 bg-gray-300 dark:bg-gray-600 rounded mb-6"></div>
                <div className="space-y-4">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="h-10 w-1/2 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                <div className="flex items-center gap-3 my-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex-grow space-y-2">
                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
                <div className="h-12 w-full bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PropertyDetailsSkeleton;
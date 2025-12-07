import React from 'react';

const PropertyListItemSkeleton: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden flex h-full animate-pulse">
            <div className="w-28 md:w-40 flex-shrink-0 bg-gray-200 dark:bg-gray-700"></div>
            <div className="p-3 md:p-4 flex flex-col flex-grow w-full">
                <div className="h-4 md:h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-5 md:h-6 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="flex-grow"></div>
                <div className="flex items-center gap-3 md:gap-4 mt-2">
                    <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        </div>
    );
};

export default PropertyListItemSkeleton;
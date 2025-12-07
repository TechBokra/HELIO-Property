
import React from 'react';

const PortfolioItemSkeleton: React.FC = () => {
    return (
        <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse bg-white dark:bg-gray-800">
            <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700"></div>
            <div className="p-4 space-y-3">
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
                <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        </div>
    );
};

export default PortfolioItemSkeleton;

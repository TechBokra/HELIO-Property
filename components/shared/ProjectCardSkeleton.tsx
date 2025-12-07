
import React from 'react';

const ProjectCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden animate-pulse">
            <div className="w-full h-64 bg-gray-200 dark:bg-gray-700"></div>
            <div className="p-6">
                <div className="h-7 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                </div>
            </div>
             <div className="p-6 border-t border-gray-200 dark:border-gray-700 mt-auto">
                <div className="flex justify-between items-center">
                    <div className="h-5 w-1/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        </div>
    );
};

export default ProjectCardSkeleton;

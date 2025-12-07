import React from 'react';
import PropertyCardSkeleton from './PropertyCardSkeleton';

const ProjectDetailsSkeleton: React.FC = () => {
    return (
        <div className="animate-pulse">
            {/* Hero */}
            <div className="h-[60vh] bg-gray-200 dark:bg-gray-700"></div>
            
            <div className="container mx-auto px-6 py-20">
                {/* Description */}
                <div className="max-w-4xl mx-auto mb-20">
                    <div className="h-8 w-1/3 mx-auto bg-gray-300 dark:bg-gray-600 rounded mb-6"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                    </div>
                </div>

                {/* Features */}
                <div className="mb-20">
                    <div className="h-8 w-1/3 mx-auto bg-gray-300 dark:bg-gray-600 rounded mb-12"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 mb-4"></div>
                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Units */}
                <div>
                     <div className="h-8 w-1/3 mx-auto bg-gray-300 dark:bg-gray-600 rounded mb-12"></div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <PropertyCardSkeleton key={index} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetailsSkeleton;



import React from 'react';

const ProjectListItemSkeleton: React.FC = () => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex h-full animate-pulse">
            <div className="w-28 md:w-48 flex-shrink-0 bg-gray-200"></div>
            <div className="p-3 md:p-4 flex flex-col flex-grow w-full">
                <div className="h-5 md:h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-3"></div>
                <div className="h-3 w-full bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-5/6 bg-gray-200 rounded mb-auto"></div>
                <div className="h-5 w-1/3 bg-gray-200 rounded"></div>
            </div>
        </div>
    );
};

export default ProjectListItemSkeleton;
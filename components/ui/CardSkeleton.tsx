import React from 'react';

const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`p-4 border border-gray-200 rounded-lg shadow-sm animate-pulse ${className}`}>
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
            </div>
            <div className="mt-4 border-t border-gray-200 pt-3 space-y-3">
                <div className="h-4 w-full bg-gray-200 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                <div className="h-4 w-1/3 bg-gray-200 rounded"></div>
            </div>
        </div>
    );
};

export default CardSkeleton;
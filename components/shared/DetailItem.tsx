
import React from 'react';

interface DetailItemProps {
    label: string;
    value?: string | number | null | boolean | React.ReactNode;
    layout?: 'stacked' | 'grid';
    icon?: React.ReactNode;
    className?: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value, layout = 'stacked', icon, className = '' }) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const formattedValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;

    if (layout === 'grid') {
        return (
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 py-2 ${className}`}>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    {icon}
                    {label}
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white sm:col-span-2">{formattedValue}</dd>
            </div>
        );
    }
    
    // Default 'stacked' layout
    return (
        <div className={`flex items-start gap-3 ${className}`}>
            {icon && <div className="flex-shrink-0 text-gray-400 dark:text-gray-500 mt-1">{icon}</div>}
            <div className="flex-grow">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
                <dd className="mt-1 text-md font-semibold text-gray-900 dark:text-white">{formattedValue}</dd>
            </div>
        </div>
    );
};

export default DetailItem;

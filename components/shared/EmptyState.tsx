
import React from 'react';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle, action }) => {
    return (
        <div className="text-center py-16 px-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
                {icon}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
};

export default EmptyState;

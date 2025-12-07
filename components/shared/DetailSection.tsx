
import React from 'react';

interface DetailSectionProps {
    title: string;
    children: React.ReactNode;
}

const DetailSection: React.FC<DetailSectionProps> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-amber-500 mb-4">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

export default DetailSection;

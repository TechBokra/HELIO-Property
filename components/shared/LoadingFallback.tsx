import React from 'react';
import { Spinner } from '../ui/Spinner';

const LoadingFallback: React.FC = () => (
    <div className="flex flex-col justify-center items-center gap-4 bg-gray-50 dark:bg-gray-900 transition-colors" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <Spinner size="lg" className="text-amber-500" />
        <p className="text-gray-500 text-sm animate-pulse">Loading...</p>
    </div>
);

export default LoadingFallback;
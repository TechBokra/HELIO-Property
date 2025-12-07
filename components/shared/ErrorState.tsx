
import React from 'react';
import { ExclamationCircleIcon } from '../ui/Icons';
import { Button } from '../ui/Button';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({ 
    title = "Error Loading Data", 
    message = "We couldn't load the information. Please try again.", 
    onRetry,
    className 
}) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center rounded-lg border-2 border-dashed border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 ${className}`}>
            <ExclamationCircleIcon className="w-10 h-10 text-red-500 mb-3" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-1">{title}</h3>
            <p className="text-sm text-red-600 dark:text-red-300 mb-4 max-w-sm">{message}</p>
            {onRetry && (
                <Button onClick={onRetry} variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30">
                    Try Again
                </Button>
            )}
        </div>
    );
};

export default ErrorState;


import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import LoadingFallback from './LoadingFallback';
import ErrorState from './ErrorState';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';

interface AsyncBoundaryProps {
    children: React.ReactNode;
    loadingFallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
}

const AsyncBoundary: React.FC<AsyncBoundaryProps> = ({
    children,
    loadingFallback = <LoadingFallback />,
    errorFallback
}) => {
    const { reset } = useQueryErrorResetBoundary();

    return (
        <ErrorBoundary 
            onReset={reset}
            fallback={errorFallback || <ErrorState onRetry={reset} className="h-full min-h-[300px]" />}
        >
            <Suspense fallback={loadingFallback}>
                {children}
            </Suspense>
        </ErrorBoundary>
    );
};

export default AsyncBoundary;

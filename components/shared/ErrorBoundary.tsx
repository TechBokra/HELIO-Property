import React, { ErrorInfo, ReactNode, Component } from 'react';
import { Button } from '../ui/Button';
import { ExclamationCircleIcon, HomeIcon, ArrowRightIcon } from '../ui/Icons';

interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  handleRetry = () => {
      this.props.onReset?.();
      this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
      window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
            className="min-h-[400px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 rounded-lg"
            role="alert" 
            aria-live="assertive"
        >
          <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center border border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <ExclamationCircleIcon className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Something went wrong
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
              We encountered an unexpected error while rendering this component.
            </p>
            
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg mb-8 text-left overflow-hidden border border-red-100 dark:border-red-900/20">
                <p className="text-xs font-bold text-red-800 dark:text-red-300 mb-1 uppercase tracking-wider">Error Details:</p>
                <code className="text-xs text-red-600 dark:text-red-400 font-mono break-words block">
                    {this.state.error?.message || 'Unknown Error'}
                </code>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} variant="primary" className="w-full sm:w-auto">
                    <ArrowRightIcon className="w-4 h-4 mr-2" />
                    Try Again
                </Button>
                <Button onClick={this.handleGoHome} variant="secondary" className="w-full sm:w-auto">
                    <HomeIcon className="w-4 h-4 mr-2" />
                    Go Home
                </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
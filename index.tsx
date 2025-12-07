
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/shared/ToastContext';
import { LanguageProvider } from './components/shared/LanguageContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { ThemeProvider } from './components/shared/ThemeContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Could not find root element to mount to');
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60 * 5,
            throwOnError: false,
        },
        mutations: {
            retry: 0,
        }
    }
});

const root = createRoot(rootElement);
root.render(
    <ErrorBoundary>
        <HashRouter>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <ToastProvider>
                        <LanguageProvider>
                            <App />
                        </LanguageProvider>
                    </ToastProvider>
                </ThemeProvider>
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </HashRouter>
    </ErrorBoundary>
);

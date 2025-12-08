
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/shared/ToastContext';
import { LanguageProvider } from './components/shared/LanguageContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { ThemeProvider } from './components/shared/ThemeContext';
import './index.css'; // Ensure CSS is imported

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

// Determine which router to use based on the hostname.
// Use BrowserRouter for Vercel/Production for clean URLs.
// Use HashRouter for local preview/development to prevent routing errors.
const isProduction = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('onlyhelio.com');
const Router = isProduction ? BrowserRouter : HashRouter;

const root = createRoot(rootElement);
root.render(
    <ErrorBoundary>
        <Router>
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
        </Router>
    </ErrorBoundary>
);

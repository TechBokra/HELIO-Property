
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, './') },
            // Redirect 'api' imports to 'services' to bypass Vercel serverless function limits
            { find: /^api\//, replacement: path.resolve(__dirname, './services/') + '/' },
            { find: /^api$/, replacement: path.resolve(__dirname, './services') },
        ],
    },
    build: {
        target: 'esnext',
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('scheduler')) {
                            return 'vendor-core';
                        }
                        if (id.includes('@tanstack') || id.includes('zustand') || id.includes('react-hook-form') || id.includes('zod')) {
                            return 'vendor-utils';
                        }
                        if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                            return 'vendor-charts';
                        }
                        if (id.includes('jspdf') || id.includes('jspdf-autotable')) {
                            return 'vendor-pdf';
                        }
                        return 'vendor-libs';
                    }
                },
            },
        },
    },
});

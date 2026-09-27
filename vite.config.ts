
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 3000,
        strictPort: true,
    },
    resolve: {
        alias: [
            { find: '@', replacement: path.resolve(__dirname, './') },
            { find: /^api\//, replacement: path.resolve(__dirname, './services/') + '/' },
            { find: /^api$/, replacement: path.resolve(__dirname, './services') },
        ],
    },
    build: {
        target: 'es2020',
        outDir: 'dist',
        sourcemap: false,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
                    charts: ['chart.js', 'react-chartjs-2'],
                    utils: ['zod', 'jspdf', 'jspdf-autotable']
                }
            }
        }
    },
});

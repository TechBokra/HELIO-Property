
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cloudinaryServerProxyPlugin() {
    return {
        name: 'cloudinary-proxy',
        configureServer(server: any) {
            server.middlewares.use((req: any, res: any, next: any) => {
                if (req.url === '/api/cloudinary/destroy' && req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk: any) => { body += chunk; });
                    req.on('end', async () => {
                        try {
                            const { public_id, cloud_name, api_key, api_secret } = JSON.parse(body || '{}');
                            if (!public_id || !cloud_name) {
                                res.statusCode = 400;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: 'Missing public_id or cloud_name' }));
                                return;
                            }
                            if (!api_key || !api_secret) {
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ result: 'unlinked_without_api_secret' }));
                                return;
                            }

                            const crypto = await import('crypto');
                            const timestamp = Math.round(new Date().getTime() / 1000);
                            const stringToSign = `public_id=${public_id}&timestamp=${timestamp}${api_secret}`;
                            const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

                            const formData = new URLSearchParams();
                            formData.append('public_id', public_id);
                            formData.append('timestamp', String(timestamp));
                            formData.append('api_key', api_key);
                            formData.append('signature', signature);

                            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/destroy`, {
                                method: 'POST',
                                body: formData
                            });

                            const data = await response.json();
                            res.statusCode = response.ok ? 200 : response.status;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(data));
                        } catch (err: any) {
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: err?.message || 'Server error during destroy' }));
                        }
                    });
                    return;
                }
                // --- Site Content API ---
                if (req.url === '/api/site-content') {
                    const contentDbPath = path.resolve(__dirname, 'data/site_content_db.json');
                    if (req.method === 'GET') {
                        try {
                            if (fs.existsSync(contentDbPath)) {
                                const content = fs.readFileSync(contentDbPath, 'utf8');
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(content);
                                return;
                            }
                        } catch(e) {}
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({}));
                        return;
                    }
                    if (req.method === 'POST') {
                        let body = '';
                        req.on('data', (chunk: any) => { body += chunk; });
                        req.on('end', () => {
                            try {
                                const parsed = JSON.parse(body || '{}');
                                fs.writeFileSync(contentDbPath, JSON.stringify(parsed, null, 2), 'utf8');
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
                            } catch (e: any) {
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: e?.message || 'Failed to save site content' }));
                            }
                        });
                        return;
                    }
                }

                // --- Role Permissions API ---
                if (req.url === '/api/role-permissions') {
                    const rolesDbPath = path.resolve(__dirname, 'data/role_permissions_db.json');
                    if (req.method === 'GET') {
                        try {
                            if (fs.existsSync(rolesDbPath)) {
                                const content = fs.readFileSync(rolesDbPath, 'utf8');
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(content);
                                return;
                            }
                        } catch(e) {}
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify([]));
                        return;
                    }
                    if (req.method === 'POST') {
                        let body = '';
                        req.on('data', (chunk: any) => { body += chunk; });
                        req.on('end', () => {
                            try {
                                const parsed = JSON.parse(body || '[]');
                                fs.writeFileSync(rolesDbPath, JSON.stringify(parsed, null, 2), 'utf8');
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ success: true, timestamp: Date.now() }));
                            } catch (e: any) {
                                res.statusCode = 500;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: e?.message || 'Failed to save role permissions' }));
                            }
                        });
                        return;
                    }
                }

                next();
            });
        }
    };
}

export default defineConfig({
    plugins: [react(), cloudinaryServerProxyPlugin()],
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
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg')) {
                            return 'pdf-export';
                        }
                        if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                            return 'charts';
                        }
                        if (id.includes('@supabase')) {
                            return 'supabase';
                        }
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('@tanstack/react-query')) {
                            return 'vendor';
                        }
                    }
                }
            }
        }
    },
});

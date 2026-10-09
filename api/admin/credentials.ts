import type { IncomingMessage, ServerResponse } from 'http';
import { handleAdminCredentialsRequest } from '../../server/credentialsEndpoint';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        if (typeof res.status === 'function') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
    }

    // Parse body if not already parsed by serverless runtime
    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch {
            body = {};
        }
    } else if (!body) {
        body = await new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk: any) => { data += chunk; });
            req.on('end', () => {
                try {
                    resolve(JSON.parse(data || '{}'));
                } catch {
                    resolve({});
                }
            });
        });
    }

    const authHeader = req.headers.authorization || req.headers['authorization'];

    const result = await handleAdminCredentialsRequest(
        authHeader,
        body,
        {
            supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
            supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
        }
    );

    if (typeof res.status === 'function') {
        return res.status(result.status).json(result.body);
    }

    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.body));
}

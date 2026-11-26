import { handleNeonCatalogRequest } from '../../server/neonCatalogEndpoint';

export default async function handler(req: any, res: any) {
    const result = await handleNeonCatalogRequest(req.method, req.url || '/api/catalog/partners', {
        connectionString: process.env.NEON_DATABASE_URL,
    });

    if (result.status === 405) {
        res.setHeader('Allow', ['GET']);
    }
    res.setHeader('Cache-Control', 'no-store');

    if (typeof res.status === 'function') {
        return res.status(result.status).json(result.body);
    }

    res.statusCode = result.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.body));
}

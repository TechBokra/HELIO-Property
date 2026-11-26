import { neon } from '@neondatabase/serverless';

export interface NeonCatalogApiResult {
    status: number;
    body: Record<string, any>;
}

export type NeonReadOnlyQueryExecutor = (sqlText: string, params?: any[]) => Promise<any[]>;

export interface NeonCatalogHandlerOptions {
    connectionString?: string;
    queryExecutor?: NeonReadOnlyQueryExecutor;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Authoritative SQL-level public visibility predicate.
 * Only 'active' or 'sold' listings whose publication_status is not in a hidden/draft state are exposed.
 */
const PUBLIC_PROPERTY_VISIBILITY_SQL = `
    p.listing_status IN ('active', 'sold')
    AND (
        p.publication_status IS NULL
        OR p.publication_status NOT IN ('draft', 'pending_review', 'rejected', 'archived')
    )
`;

const PROPERTY_SELECT_SQL = `
    SELECT
        p.id,
        p.partner_id,
        p.project_id,
        p.city_id,
        p.title_en,
        p.title_ar,
        p.description_en,
        p.description_ar,
        p.address_en,
        p.address_ar,
        p.main_image,
        p.gallery,
        p.status,
        p.type,
        p.price,
        p.area,
        p.beds,
        p.baths,
        p.floor,
        p.finishing_status,
        p.amenities,
        p.location,
        p.is_in_compound,
        p.installments_available,
        p.finance_available,
        p.delivery_immediate,
        p.delivery_date,
        p.installments_info,
        p.listing_status,
        p.publication_status,
        p.availability_status,
        p.verification_status,
        p.is_verified,
        p.verified_at,
        p.last_verified_at,
        p.listing_start_date,
        p.listing_end_date,
        p.contact_method,
        p.owner_phone,
        p.reference_number,
        p.slug,
        p.source_type,
        p.price_updated_at,
        p.last_price_confirmed_at,
        p.last_availability_confirmed_at,
        p.created_at,
        p.updated_at,
        pr.name_en AS partner_name_en,
        pr.name_ar AS partner_name_ar,
        pr.image_url AS partner_image_url,
        pj.name_en AS project_name_en,
        pj.name_ar AS project_name_ar
    FROM public.properties p
    LEFT JOIN public.partners pr ON pr.id = p.partner_id
    LEFT JOIN public.projects pj ON pj.id = p.project_id
`;

const PROJECT_SELECT_SQL = `
    SELECT
        pj.id,
        pj.partner_id,
        pj.city_id,
        pj.name_en,
        pj.name_ar,
        pj.description_en,
        pj.description_ar,
        pj.image_url,
        pj.features,
        pj.created_at,
        pj.updated_at
    FROM public.projects pj
`;

const PARTNER_SELECT_SQL = `
    SELECT
        pr.id,
        pr.email,
        pr.name_en,
        pr.name_ar,
        pr.description_en,
        pr.description_ar,
        pr.image_url,
        pr.type,
        pr.role,
        pr.status,
        pr.subscription_plan,
        pr.subscription_end_date,
        pr.display_type,
        pr.contact_methods,
        pr.allowed_cities,
        pr.parent_id,
        pr.created_at
    FROM public.partners pr
`;

/**
 * Executes a single parameterized SQL query strictly inside a PostgreSQL READ ONLY transaction.
 */
export const createNeonReadOnlyExecutor = (connectionString: string): NeonReadOnlyQueryExecutor => {
    const sql = neon(connectionString);
    return async (sqlText: string, params: any[] = []) => {
        const [rows] = await sql.transaction(
            [sql.query(sqlText, params)],
            { readOnly: true }
        );
        return Array.isArray(rows) ? rows : [];
    };
};

const normalizeCityFilter = (rawCityId: string | null): string | null => {
    if (!rawCityId) return null;
    const trimmed = rawCityId.trim().toLowerCase();
    if (!trimmed || trimmed === 'all' || trimmed === 'hub') return null;
    return trimmed;
};

const parseRouteAndParams = (rawUrl: string) => {
    const parsed = new URL(rawUrl || '/api/catalog/properties', 'http://localhost');
    const pathname = parsed.pathname.replace(/\/+$/, '');
    const searchParams = parsed.searchParams;
    return { pathname, searchParams };
};

export async function handleNeonCatalogRequest(
    method: string | undefined,
    rawUrl: string,
    options?: NeonCatalogHandlerOptions
): Promise<NeonCatalogApiResult> {
    if ((method || 'GET').toUpperCase() !== 'GET') {
        return {
            status: 405,
            body: {
                error: 'Method Not Allowed. Neon catalog endpoints are strictly read-only.',
                code: 'METHOD_NOT_ALLOWED',
            },
        };
    }

    const connectionString = (options?.connectionString ?? process.env.NEON_DATABASE_URL ?? '').trim();
    if (!options?.queryExecutor && !connectionString) {
        return {
            status: 503,
            body: {
                error: 'Neon read-only catalog connection is not configured.',
                code: 'NEON_NOT_CONFIGURED',
            },
        };
    }

    const executeReadOnly = options?.queryExecutor || createNeonReadOnlyExecutor(connectionString);
    const { pathname, searchParams } = parseRouteAndParams(rawUrl);

    try {
        // ---------------------------------------------------------------------
        // 1. Properties Routes: /api/catalog/properties and /api/catalog/properties/:id
        // ---------------------------------------------------------------------
        if (pathname === '/api/catalog/properties' || pathname.startsWith('/api/catalog/properties/')) {
            const pathId = pathname.startsWith('/api/catalog/properties/')
                ? decodeURIComponent(pathname.slice('/api/catalog/properties/'.length))
                : null;
            const requestedId = pathId || searchParams.get('id');

            if (requestedId) {
                const cleanId = requestedId.trim();
                if (!UUID_REGEX.test(cleanId)) {
                    return {
                        status: 404,
                        body: { error: 'Property not found.', code: 'NOT_FOUND' },
                    };
                }

                const rows = await executeReadOnly(
                    `${PROPERTY_SELECT_SQL}
                     WHERE p.id = $1
                       AND ${PUBLIC_PROPERTY_VISIBILITY_SQL}
                     LIMIT 1`,
                    [cleanId]
                );

                if (!rows || rows.length === 0) {
                    return {
                        status: 404,
                        body: { error: 'Property not found.', code: 'NOT_FOUND' },
                    };
                }

                return {
                    status: 200,
                    body: {
                        source: 'neon',
                        readOnly: true,
                        property: rows[0],
                    },
                };
            }

            const conditions: string[] = [PUBLIC_PROPERTY_VISIBILITY_SQL];
            const params: any[] = [];

            const cityId = normalizeCityFilter(searchParams.get('cityId'));
            if (cityId) {
                params.push(cityId);
                conditions.push(`LOWER(COALESCE(p.city_id, 'heliopolis')) = $${params.length}`);
            }

            const projectId = searchParams.get('projectId')?.trim();
            if (projectId) {
                if (!UUID_REGEX.test(projectId)) {
                    return {
                        status: 200,
                        body: { source: 'neon', readOnly: true, properties: [] },
                    };
                }
                params.push(projectId);
                conditions.push(`p.project_id = $${params.length}`);
            }

            const partnerId = searchParams.get('partnerId')?.trim();
            if (partnerId) {
                if (!UUID_REGEX.test(partnerId)) {
                    return {
                        status: 200,
                        body: { source: 'neon', readOnly: true, properties: [] },
                    };
                }
                params.push(partnerId);
                conditions.push(`p.partner_id = $${params.length}`);
            }

            const rows = await executeReadOnly(
                `${PROPERTY_SELECT_SQL}
                 WHERE ${conditions.join(' AND ')}
                 ORDER BY COALESCE(p.listing_start_date, p.created_at) DESC, p.created_at DESC`,
                params
            );

            return {
                status: 200,
                body: {
                    source: 'neon',
                    readOnly: true,
                    properties: rows,
                },
            };
        }

        // ---------------------------------------------------------------------
        // 2. Projects Routes: /api/catalog/projects and /api/catalog/projects/:id
        // ---------------------------------------------------------------------
        if (pathname === '/api/catalog/projects' || pathname.startsWith('/api/catalog/projects/')) {
            const pathId = pathname.startsWith('/api/catalog/projects/')
                ? decodeURIComponent(pathname.slice('/api/catalog/projects/'.length))
                : null;
            const requestedId = pathId || searchParams.get('id');

            if (requestedId) {
                const cleanId = requestedId.trim();
                if (!UUID_REGEX.test(cleanId)) {
                    return { status: 404, body: { error: 'Project not found.', code: 'NOT_FOUND' } };
                }

                const rows = await executeReadOnly(
                    `${PROJECT_SELECT_SQL}
                     WHERE pj.id = $1
                     LIMIT 1`,
                    [cleanId]
                );

                if (!rows || rows.length === 0) {
                    return { status: 404, body: { error: 'Project not found.', code: 'NOT_FOUND' } };
                }

                return {
                    status: 200,
                    body: { source: 'neon', readOnly: true, project: rows[0] },
                };
            }

            const conditions: string[] = [];
            const params: any[] = [];

            const cityId = normalizeCityFilter(searchParams.get('cityId'));
            if (cityId) {
                params.push(cityId);
                conditions.push(`LOWER(COALESCE(pj.city_id, 'heliopolis')) = $${params.length}`);
            }

            const partnerId = searchParams.get('partnerId')?.trim();
            if (partnerId) {
                if (!UUID_REGEX.test(partnerId)) {
                    return { status: 200, body: { source: 'neon', readOnly: true, projects: [] } };
                }
                params.push(partnerId);
                conditions.push(`pj.partner_id = $${params.length}`);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const rows = await executeReadOnly(
                `${PROJECT_SELECT_SQL}
                 ${whereClause}
                 ORDER BY pj.created_at DESC`,
                params
            );

            return {
                status: 200,
                body: { source: 'neon', readOnly: true, projects: rows },
            };
        }

        // ---------------------------------------------------------------------
        // 3. Partners Routes: /api/catalog/partners and /api/catalog/partners/:id
        // ---------------------------------------------------------------------
        if (pathname === '/api/catalog/partners' || pathname.startsWith('/api/catalog/partners/')) {
            const pathId = pathname.startsWith('/api/catalog/partners/')
                ? decodeURIComponent(pathname.slice('/api/catalog/partners/'.length))
                : null;
            const requestedId = pathId || searchParams.get('id');

            if (requestedId) {
                const cleanId = requestedId.trim();
                if (!UUID_REGEX.test(cleanId)) {
                    return { status: 404, body: { error: 'Partner not found.', code: 'NOT_FOUND' } };
                }

                const rows = await executeReadOnly(
                    `${PARTNER_SELECT_SQL}
                     WHERE pr.id = $1
                       AND pr.status = 'active'
                     LIMIT 1`,
                    [cleanId]
                );

                if (!rows || rows.length === 0) {
                    return { status: 404, body: { error: 'Partner not found.', code: 'NOT_FOUND' } };
                }

                return {
                    status: 200,
                    body: { source: 'neon', readOnly: true, partner: rows[0] },
                };
            }

            const rows = await executeReadOnly(
                `${PARTNER_SELECT_SQL}
                 WHERE pr.status = 'active'
                 ORDER BY pr.created_at DESC`,
                []
            );

            return {
                status: 200,
                body: { source: 'neon', readOnly: true, partners: rows },
            };
        }

        return {
            status: 404,
            body: { error: 'Catalog route not found.', code: 'NOT_FOUND' },
        };
    } catch (err: any) {
        console.error('[NeonCatalog] Read-only query failed:', err?.code || 'NEON_READ_ERROR');
        return {
            status: 503,
            body: {
                error: 'Neon read-only catalog query failed.',
                code: 'NEON_READ_ERROR',
            },
        };
    }
}

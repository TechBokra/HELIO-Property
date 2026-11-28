/**
 * Server-side adapters that give the credentials endpoint the same small interface it
 * used with supabase-js (auth.getUser, from().select().eq().maybeSingle(), from().insert(),
 * auth.admin.updateUserById), implemented on Neon:
 *   - tokens are verified against Neon Auth's JWKS,
 *   - privileged reads/writes use NEON_DATABASE_URL (owner role, server only),
 *   - passwords are hashed the way Better Auth expects (scrypt, "salt:key" hex).
 */
import { neon } from '@neondatabase/serverless';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { randomBytes, scrypt as scryptCb } from 'node:crypto';

export const DEFAULT_NEON_AUTH_URL =
    'https://ep-red-thunder-bgarx58x.neonauth.c-9.eu-central-1.aws.neon.tech/helio/auth';
export const DEFAULT_SITE_ORIGIN = 'https://helio-property.vercel.app';

const IDENT_RE = /^[a-z_][a-z0-9_]*$/;
const ident = (name: string): string => {
    if (!IDENT_RE.test(name)) throw new Error(`Unsafe identifier: ${name}`);
    return `"${name}"`;
};

/** Better Auth's password format: scrypt(N=16384, r=16, p=1, 64 bytes) with a hex salt string. */
export const hashPasswordForBetterAuth = (password: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const salt = randomBytes(16).toString('hex');
        scryptCb(
            password.normalize('NFKC'),
            salt,
            64,
            { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
            (err, key) => (err ? reject(err) : resolve(`${salt}:${key.toString('hex')}`))
        );
    });

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export const createNeonAuthVerifyClient = (authUrl: string = DEFAULT_NEON_AUTH_URL, siteOrigin: string = DEFAULT_SITE_ORIGIN) => {
    const base = authUrl.replace(/\/+$/, '');
    const issuer = new URL(base).origin;
    if (!jwksCache.has(base)) jwksCache.set(base, createRemoteJWKSet(new URL(`${base}/.well-known/jwks.json`)));
    const jwks = jwksCache.get(base)!;

    return {
        auth: {
            getUser: async (token: string) => {
                try {
                    const { payload } = await jwtVerify(token, jwks, { issuer });
                    if (!payload.sub || payload.role !== 'authenticated') {
                        return { data: { user: null }, error: { message: 'Token is not an authenticated user token' } };
                    }
                    return { data: { user: { id: String(payload.sub), email: payload.email ? String(payload.email) : undefined } }, error: null };
                } catch (e: any) {
                    return { data: { user: null }, error: { message: e?.message || 'Invalid token' } };
                }
            },
            resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }) => {
                const res = await fetch(`${base}/request-password-reset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Origin: siteOrigin },
                    body: JSON.stringify({ email, redirectTo: options?.redirectTo || `${siteOrigin}/#/reset-password` }),
                });
                if (!res.ok) {
                    const body: any = await res.json().catch(() => ({}));
                    return { error: { message: body?.message || `HTTP ${res.status}` } };
                }
                return { error: null };
            },
        },
    };
};

export const createNeonServerClient = (connectionString: string) => {
    const sql = neon(connectionString);
    return {
        from: (table: string) => ({
            select: (cols: string) => ({
                eq: (col: string, val: string) => ({
                    maybeSingle: async () => {
                        try {
                            const colList = cols.split(',').map((c) => ident(c.trim())).join(', ');
                            const rows = await sql.query(
                                `SELECT ${colList} FROM public.${ident(table)} WHERE ${ident(col)} = $1 LIMIT 1`,
                                [val]
                            );
                            return { data: (rows as any[])[0] ?? null, error: null };
                        } catch (e: any) {
                            return { data: null, error: { message: e?.message || 'Query failed' } };
                        }
                    },
                }),
            }),
            insert: async (row: Record<string, any>) => {
                try {
                    const keys = Object.keys(row);
                    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                    await sql.query(
                        `INSERT INTO public.${ident(table)} (${keys.map(ident).join(', ')}) VALUES (${placeholders})`,
                        keys.map((k) => row[k])
                    );
                    return { error: null };
                } catch (e: any) {
                    return { error: { message: e?.message || 'Insert failed' } };
                }
            },
        }),
    };
};

export const createNeonAdminAuthClient = (
    connectionString: string,
    authUrl: string = DEFAULT_NEON_AUTH_URL,
    siteOrigin: string = DEFAULT_SITE_ORIGIN
) => {
    const sql = neon(connectionString);
    const base = authUrl.replace(/\/+$/, '');
    return {
        auth: {
            admin: {
                /** Sets a new password and signs the user out everywhere. */
                updateUserById: async (userId: string, updates: { password?: string }) => {
                    try {
                        if (!updates.password) return { error: { message: 'Only password updates are supported' } };
                        const hash = await hashPasswordForBetterAuth(updates.password);
                        const updated = await sql.query(
                            `UPDATE neon_auth.account SET password = $1, "updatedAt" = now()
                              WHERE "userId" = $2 AND "providerId" = 'credential' RETURNING id`,
                            [hash, userId]
                        );
                        if ((updated as any[]).length === 0) {
                            const users = await sql.query('SELECT id FROM neon_auth."user" WHERE id = $1', [userId]);
                            if ((users as any[]).length === 0) return { error: { message: 'User not found' } };
                            await sql.query(
                                `INSERT INTO neon_auth.account ("accountId", "providerId", "userId", password, "createdAt", "updatedAt")
                                 VALUES ($1, 'credential', $2, $3, now(), now())`,
                                [userId, userId, hash]
                            );
                        }
                        await sql.query('DELETE FROM neon_auth.session WHERE "userId" = $1', [userId]);
                        return { data: { user: { id: userId } }, error: null };
                    } catch (e: any) {
                        return { error: { message: e?.message || 'Password update failed' } };
                    }
                },
                /**
                 * Creates an account server-side, so the admin who triggers it stays signed in
                 * (a browser sign-up would replace the admin's session cookie).
                 */
                createUser: async (input: { email: string; password: string; name?: string }) => {
                    const res = await fetch(`${base}/sign-up/email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Origin: siteOrigin },
                        body: JSON.stringify({
                            email: input.email,
                            password: input.password,
                            name: input.name || input.email.split('@')[0],
                        }),
                    });
                    const body: any = await res.json().catch(() => ({}));
                    if (!res.ok || !body?.user?.id) {
                        return { data: null, error: { message: body?.message || `Sign-up failed (HTTP ${res.status})` } };
                    }
                    return { data: { user: { id: String(body.user.id), email: body.user.email } }, error: null };
                },
            },
        },
    };
};

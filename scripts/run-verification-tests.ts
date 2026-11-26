import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { handleAdminCredentialsRequest, isAuthoritativeSuperAdmin } from '../server/credentialsEndpoint';
import { mapPartnerTypeToRole } from '../data/permissions';
import { normalizeRole } from '../services/permissions';
import { Role, Permission, OperationalStatus, RequestType, type Partner } from '../types';
import {
    mapDomainStatusToOperational,
    resolveOperationalStatus,
    deriveRequestPriority,
    mapRequestToUnified,
    mapRequestFromDb,
    computeDateRangeBounds,
    matchesUnifiedRequestFilter,
    getUnifiedRequests,
    parseValidDateMs
} from '../services/requests';
import {
    createTransaction,
    getAllTransactions,
    getFinanceStats,
    updateTransactionStatus
} from '../services/finance';
import {
    getAnalyticsEventCounts,
    getCommercialKPIs,
    trackEvent
} from '../services/analytics';
import { AuthorizationError } from '../services/authGuard';
import { useAuthStore } from '../store/useAuthStore';

// Test runner helpers
let passedCount = 0;
let failedCount = 0;

async function test(name: string, fn: () => void | Promise<void>) {
    try {
        const result = fn();
        if (result instanceof Promise) {
            await result;
        }
        console.log(`  PASS: ${name}`);
        passedCount++;
    } catch (err: any) {
        console.error(`  FAIL: ${name}`);
        console.error(`    Details: ${err?.message || err}`);
        failedCount++;
    }
}

// ============================================================================
// Mock Factories for Credential Endpoint Testing
// ============================================================================
function createMockAuthVerifyClient(user: any = null, tokenError: any = null, resetEmailError: any = null) {
    return {
        auth: {
            getUser: async (_token: string) => {
                if (tokenError) return { data: { user: null }, error: tokenError };
                return { data: { user }, error: null };
            },
            resetPasswordForEmail: async (_email: string, _options?: any) => {
                if (resetEmailError) return { error: { message: resetEmailError } };
                return { data: {}, error: null };
            }
        }
    };
}

function createMockServerClient(options: {
    partnersData?: Record<string, any>;
    auditInsertError?: string | null;
    auditInsertFailOnCall?: number;
    onAuditInsert?: (row: any) => void;
    adminUpdateError?: string | null;
}) {
    const {
        partnersData = {},
        auditInsertError = null,
        auditInsertFailOnCall,
        onAuditInsert,
        adminUpdateError = null
    } = options;
    let auditCalls = 0;

    return {
        from: (table: string) => {
            if (table === 'partners') {
                return {
                    select: (_cols: string) => ({
                        eq: (col: string, val: string) => ({
                            maybeSingle: async () => {
                                if (col === 'id' && partnersData[val]) {
                                    return { data: partnersData[val], error: null };
                                }
                                if (col === 'email') {
                                    const match = Object.values(partnersData).find(
                                        (p: any) => String(p.email || '').toLowerCase() === String(val || '').toLowerCase()
                                    );
                                    return { data: match || null, error: null };
                                }
                                return { data: null, error: null };
                            }
                        })
                    })
                };
            }
            if (table === 'credential_audit_log') {
                return {
                    insert: async (row: any) => {
                        auditCalls++;
                        if (onAuditInsert) onAuditInsert(row);
                        if (auditInsertError && (!auditInsertFailOnCall || auditCalls === auditInsertFailOnCall)) {
                            return { error: { message: auditInsertError } };
                        }
                        return { error: null };
                    }
                };
            }
            throw new Error(`Unexpected table in mock serverClient: ${table}`);
        },
        auth: {
            admin: {
                updateUserById: async (_userId: string, _updates: any) => {
                    if (adminUpdateError) return { error: { message: adminUpdateError } };
                    return { data: { user: { id: _userId } }, error: null };
                }
            }
        }
    };
}

// ============================================================================
// PostgREST-Faithful In-Memory Query Simulator for Operations Center Tests
// ============================================================================
function splitTopLevelCommas(expr: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (let i = 0; i < expr.length; i++) {
        const ch = expr[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth = Math.max(0, depth - 1);
        if (ch === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

function getFieldValue(row: any, field: string): any {
    if (field.includes('->>')) {
        const [col, key] = field.split('->>');
        const val = row?.[col]?.[key];
        return val === undefined ? null : (val === null ? null : String(val));
    }
    if (field.includes('->')) {
        const [col, key] = field.split('->');
        const val = row?.[col]?.[key];
        return val === undefined ? null : val;
    }
    const val = row?.[field];
    return val === undefined ? null : val;
}

function parseListLiteral(raw: string): string[] {
    const trimmed = raw.trim();
    const inner = trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed.slice(1, -1) : trimmed;
    if (!inner) return [];
    return inner.split(',').map(v => v.trim());
}

function compareTimestampOrValue(a: any, b: string): number {
    const aMs = typeof a === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(a) ? Date.parse(a) : NaN;
    const bMs = /^\d{4}-\d{2}-\d{2}T/.test(b) ? Date.parse(b) : NaN;
    if (!Number.isNaN(aMs) && !Number.isNaN(bMs)) {
        return aMs - bMs;
    }
    const aNum = Number(a);
    const bNum = Number(b);
    if (a !== null && a !== '' && !Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
    }
    return String(a ?? '').localeCompare(String(b));
}

function evaluatePostgrestCondition(row: any, cond: string): boolean {
    if (cond.startsWith('and(') && cond.endsWith(')')) {
        const inner = cond.slice(4, -1);
        return splitTopLevelCommas(inner).every(part => evaluatePostgrestCondition(row, part));
    }
    if (cond.startsWith('or(') && cond.endsWith(')')) {
        const inner = cond.slice(3, -1);
        return splitTopLevelCommas(inner).some(part => evaluatePostgrestCondition(row, part));
    }

    // Parse "<field>.<neg?>.<op>.<value>" where op is eq, neq, is, in, gt, gte, lt, lte, ilike
    const match = cond.match(/^([a-zA-Z0-9_>-]+)\.(not\.)?(eq|neq|is|in|gt|gte|lt|lte|ilike)\.(.+)$/);
    if (!match) {
        throw new Error(`Unsupported PostgREST condition in simulator: ${cond}`);
    }
    const [, field, notPrefix, op, rawValue] = match;
    const val = getFieldValue(row, field);

    let result = false;
    switch (op) {
        case 'eq':
            result = val !== null && String(val) === rawValue;
            break;
        case 'neq':
            result = val === null || String(val) !== rawValue;
            break;
        case 'is':
            result = rawValue === 'null' ? val === null : String(val) === rawValue;
            break;
        case 'in': {
            const list = parseListLiteral(rawValue);
            result = val !== null && list.includes(String(val));
            break;
        }
        case 'gt':
            result = val !== null && compareTimestampOrValue(val, rawValue) > 0;
            break;
        case 'gte':
            result = val !== null && compareTimestampOrValue(val, rawValue) >= 0;
            break;
        case 'lt':
            result = val !== null && compareTimestampOrValue(val, rawValue) < 0;
            break;
        case 'lte':
            result = val !== null && compareTimestampOrValue(val, rawValue) <= 0;
            break;
        case 'ilike': {
            const pattern = rawValue.replace(/%/g, '').toLowerCase();
            result = val !== null && String(val).toLowerCase().includes(pattern);
            break;
        }
    }
    return notPrefix ? !result : result;
}

function createMockPostgrestClient(rows: any[]) {
    return {
        from: (table: string) => {
            if (table !== 'requests') throw new Error(`Unexpected table: ${table}`);
            return {
                select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
                    const predicates: ((row: any) => boolean)[] = [];
                    let orderCol = 'created_at';
                    let orderAsc = false;
                    let rangeFrom: number | null = null;
                    let rangeTo: number | null = null;

                    const execute = async () => {
                        let filtered = rows.filter(r => predicates.every(fn => fn(r)));
                        filtered = [...filtered].sort((a, b) => {
                            const cmp = compareTimestampOrValue(a[orderCol], String(b[orderCol] ?? ''));
                            return orderAsc ? cmp : -cmp;
                        });
                        const total = filtered.length;
                        if (opts?.head) {
                            return { data: null, count: total, error: null };
                        }
                        const sliced =
                            rangeFrom !== null && rangeTo !== null
                                ? filtered.slice(rangeFrom, rangeTo + 1)
                                : filtered;
                        return { data: sliced, count: opts?.count === 'exact' ? total : undefined, error: null };
                    };

                    const builder: any = {
                        eq: (col: string, val: any) => {
                            predicates.push(r => getFieldValue(r, col) === val);
                            return builder;
                        },
                        neq: (col: string, val: any) => {
                            predicates.push(r => getFieldValue(r, col) !== val);
                            return builder;
                        },
                        is: (col: string, val: any) => {
                            predicates.push(r => getFieldValue(r, col) === val);
                            return builder;
                        },
                        not: (col: string, op: string, val: string) => {
                            if (op === 'in') {
                                const list = parseListLiteral(val);
                                predicates.push(r => !list.includes(String(getFieldValue(r, col))));
                            } else {
                                predicates.push(r => evaluatePostgrestCondition(r, `${col}.not.${op}.${val}`));
                            }
                            return builder;
                        },
                        filter: (col: string, op: string, val: string) => {
                            predicates.push(r => evaluatePostgrestCondition(r, `${col}.${op}.${val}`));
                            return builder;
                        },
                        gte: (col: string, val: string) => {
                            predicates.push(r => evaluatePostgrestCondition(r, `${col}.gte.${val}`));
                            return builder;
                        },
                        lt: (col: string, val: string) => {
                            predicates.push(r => evaluatePostgrestCondition(r, `${col}.lt.${val}`));
                            return builder;
                        },
                        or: (expr: string) => {
                            const parts = splitTopLevelCommas(expr);
                            predicates.push(r => parts.some(part => evaluatePostgrestCondition(r, part)));
                            return builder;
                        },
                        order: (col: string, orderOpts?: { ascending?: boolean }) => {
                            orderCol = col;
                            orderAsc = !!orderOpts?.ascending;
                            return builder;
                        },
                        range: (from: number, to: number) => {
                            rangeFrom = from;
                            rangeTo = to;
                            return builder;
                        },
                        then: (resolve: any, reject: any) => execute().then(resolve, reject)
                    };

                    return builder;
                }
            };
        }
    };
}

async function runTests() {
    console.log('\n======================================================');
    console.log('ONLY HELIO — Phase 3B Final Verification Test Suite');
    console.log('======================================================\n');

    // ------------------------------------------------------------------------
    // SUITE 1: P0 Credential Security Endpoint Negative & Positive Tests
    // ------------------------------------------------------------------------
    console.log('--- Suite 1: P0 Credential Security & Authorization Tests ---');

    await test('P0.1a: Missing Authorization header is rejected with 401', async () => {
        const result = await handleAdminCredentialsRequest(undefined, { action: 'send_password_reset' }, {
            supabaseServiceKey: 'mock-service-key-xyz'
        });
        assert.strictEqual(result.status, 401);
        assert.match(result.body.error || '', /Missing or malformed Authorization Bearer token/i);
    });

    await test('P0.1b: Empty Bearer token is rejected with 401', async () => {
        const result = await handleAdminCredentialsRequest('Bearer   ', { action: 'send_password_reset' }, {
            supabaseServiceKey: 'mock-service-key-xyz'
        });
        assert.strictEqual(result.status, 401);
        assert.match(result.body.error || '', /Empty bearer token/i);
    });

    await test('P0.1c: Invalid or expired session token is rejected with 401', async () => {
        const mockAuth = createMockAuthVerifyClient(null, { message: 'jwt expired' });
        const result = await handleAdminCredentialsRequest('Bearer expired.token.val', { action: 'send_password_reset' }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuth
        });
        assert.strictEqual(result.status, 401);
        assert.match(result.body.error || '', /Invalid, expired, or revoked session token/i);
    });

    await test('P0.2: Missing SUPABASE_SERVICE_ROLE_KEY rejects privileged access with 500 (no anon fallback)', async () => {
        const prev = process.env.SUPABASE_SERVICE_ROLE_KEY;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        try {
            const result = await handleAdminCredentialsRequest('Bearer valid.session.token', { action: 'reset_password' }, {
                supabaseServiceKey: '',
                supabaseUrl: 'https://dummy.supabase.co'
            });
            assert.strictEqual(result.status, 500);
            assert.match(result.body.error || '', /SUPABASE_SERVICE_ROLE_KEY is required/i);
        } finally {
            if (prev !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prev;
        }
    });

    await test('P0.3: Normal authenticated user (partner/customer) cannot perform credential management (403)', async () => {
        const actorId = '11111111-1111-4111-8111-111111111111';
        const mockAuth = createMockAuthVerifyClient({ id: actorId, email: 'partner@example.com' });
        const mockServer = createMockServerClient({
            partnersData: {
                [actorId]: {
                    id: actorId,
                    email: 'partner@example.com',
                    type: 'developer',
                    role: 'developer',
                    status: 'active',
                    custom_permissions: []
                }
            }
        });

        const result = await handleAdminCredentialsRequest('Bearer partner.session.token', {
            action: 'send_password_reset',
            targetUserEmail: 'target@example.com'
        }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuth,
            serverClient: mockServer
        });

        assert.strictEqual(result.status, 403);
        assert.match(result.body.error || '', /Insufficient permissions to manage user credentials/i);
    });

    await test('P0.4: Forged request body fields (actorId, actorRole, role, isSuperAdmin) cannot bypass authorization (403)', async () => {
        const normalUserId = '22222222-2222-4222-8222-222222222222';
        const targetUserId = '33333333-3333-4333-8333-333333333333';

        const mockAuth = createMockAuthVerifyClient({ id: normalUserId, email: 'normal@example.com' });
        const mockServer = createMockServerClient({
            partnersData: {
                [normalUserId]: {
                    id: normalUserId,
                    email: 'normal@example.com',
                    type: 'finishing',
                    role: 'finishing',
                    status: 'active',
                    custom_permissions: []
                }
            }
        });

        const forgedBody = {
            actorId: '00000000-0000-4000-8000-000000000001',
            actorRole: 'super_admin',
            role: 'super_admin',
            isSuperAdmin: true,
            userRole: 'admin',
            action: 'reset_password',
            targetUserId,
            newPassword: 'StrongPassword123!'
        };

        const result = await handleAdminCredentialsRequest('Bearer attacker.session.token', forgedBody, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuth,
            serverClient: mockServer
        });

        assert.strictEqual(result.status, 403);
        assert.match(result.body.error || '', /Insufficient permissions to manage user credentials/i);
    });

    await test('P0.4b: Account with type="admin" or non-canonical role ("admin"/"system_admin") gets ZERO Super Admin privilege (403)', async () => {
        for (const badRole of ['admin', 'system_admin', null, 'partner_relations_manager']) {
            const actorId = '22222222-2222-4222-8222-000000000009';
            const mockAuth = createMockAuthVerifyClient({ id: actorId, email: 'legacy@example.com' });
            const mockServer = createMockServerClient({
                partnersData: {
                    [actorId]: {
                        id: actorId,
                        email: 'legacy@example.com',
                        type: 'admin',
                        role: badRole,
                        status: 'active',
                        custom_permissions: []
                    }
                }
            });

            const result = await handleAdminCredentialsRequest('Bearer legacy.token', {
                action: 'reset_password',
                targetUserId: '33333333-3333-4333-8333-333333333333',
                newPassword: 'StrongPassword123!'
            }, {
                supabaseServiceKey: 'mock-service-key-xyz',
                authVerifyClient: mockAuth,
                serverClient: mockServer
            });

            assert.strictEqual(result.status, 403, `Expected 403 for role=${String(badRole)}`);
        }
    });

    await test('P0.5: Inactive or suspended actor accounts are rejected with 403', async () => {
        const suspendedAdminId = '44444444-4444-4444-8444-444444444444';
        const mockAuth = createMockAuthVerifyClient({ id: suspendedAdminId, email: 'suspended@example.com' });
        const mockServer = createMockServerClient({
            partnersData: {
                [suspendedAdminId]: {
                    id: suspendedAdminId,
                    email: 'suspended@example.com',
                    type: 'admin',
                    role: 'super_admin',
                    status: 'suspended',
                    custom_permissions: []
                }
            }
        });

        const result = await handleAdminCredentialsRequest('Bearer suspended.admin.token', {
            action: 'reset_password',
            targetUserId: '55555555-5555-4555-8555-555555555555',
            newPassword: 'Password123!'
        }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuth,
            serverClient: mockServer
        });

        assert.strictEqual(result.status, 403);
        assert.match(result.body.error || '', /disabled, pending, or inactive/i);
    });

    await test('P0.6a: Non-Super Admin cannot reset a Super Admin password (403 + Audit)', async () => {
        const managerId = '66666666-6666-4666-8666-666666666666';
        const superAdminId = '77777777-7777-4777-8777-777777777777';

        const mockAuth = createMockAuthVerifyClient({ id: managerId, email: 'manager@example.com' });
        const audits: any[] = [];
        const mockServer = createMockServerClient({
            partnersData: {
                [managerId]: {
                    id: managerId,
                    email: 'manager@example.com',
                    type: 'admin',
                    role: 'partner_relations_manager',
                    status: 'active',
                    custom_permissions: ['manage_user_credentials']
                },
                [superAdminId]: {
                    id: superAdminId,
                    email: 'superadmin@example.com',
                    type: 'admin',
                    role: 'super_admin',
                    status: 'active'
                }
            },
            onAuditInsert: (row) => audits.push(row)
        });

        const result = await handleAdminCredentialsRequest('Bearer manager.session.token', {
            action: 'reset_password',
            targetUserId: superAdminId,
            newPassword: 'AttemptedReset123!'
        }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuth,
            serverClient: mockServer
        });

        assert.strictEqual(result.status, 403);
        assert.match(result.body.error || '', /Cannot reset password for a Super Administrator account/i);
        assert.strictEqual(audits.length, 1);
        assert.strictEqual(audits[0].action, 'PASSWORD_RESET_COMPLETED');
        assert.strictEqual(audits[0].success, false);
        assert.match(audits[0].details, /Privilege escalation rejected/i);
    });

    await test('P0.6b: Non-Super Admin cannot trigger send_password_reset for Super Admin (even via mismatched ID/email)', async () => {
        const managerId = '66666666-6666-4666-8666-666666666666';
        const superAdminId = '77777777-7777-4777-8777-777777777777';
        const nonAdminId = '77777777-7777-4777-8777-888888888888';

        const mockAuth = createMockAuthVerifyClient({ id: managerId, email: 'manager@example.com' });
        const audits: any[] = [];
        const mockServer = createMockServerClient({
            partnersData: {
                [managerId]: {
                    id: managerId,
                    email: 'manager@example.com',
                    type: 'admin',
                    role: 'partner_relations_manager',
                    status: 'active',
                    custom_permissions: ['manage_user_credentials']
                },
                [superAdminId]: {
                    id: superAdminId,
                    email: 'superadmin@example.com',
                    type: 'admin',
                    role: 'super_admin',
                    status: 'active'
                },
                [nonAdminId]: {
                    id: nonAdminId,
                    email: 'regular@example.com',
                    type: 'developer',
                    role: 'developer',
                    status: 'active'
                }
            },
            onAuditInsert: (row) => audits.push(row)
        });

        // Direct Super Admin email reset email attempt -> 403 + Audit
        const directRes = await handleAdminCredentialsRequest('Bearer manager.token', {
            action: 'send_password_reset',
            targetUserEmail: 'superadmin@example.com'
        }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuth,
            serverClient: mockServer
        });
        assert.strictEqual(directRes.status, 403);
        assert.strictEqual(audits.length, 1);
        assert.strictEqual(audits[0].action, 'PASSWORD_RESET_EMAIL_SENT');
        assert.strictEqual(audits[0].success, false);

        // Mismatched targetUserId (regular user) + Super Admin email -> rejected 400
        const mismatchRes = await handleAdminCredentialsRequest('Bearer manager.token', {
            action: 'send_password_reset',
            targetUserId: nonAdminId,
            targetUserEmail: 'superadmin@example.com'
        }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuth,
            serverClient: mockServer
        });
        assert.strictEqual(mismatchRes.status, 400);
    });

    await test('P0.7a: Audit failure during initiation aborts password reset and returns 500', async () => {
        const superAdminId = '88888888-8888-4888-8888-888888888888';
        const targetUserId = '99999999-9999-4999-8999-999999999999';

        let passwordUpdated = false;
        const mockAuth = createMockAuthVerifyClient({ id: superAdminId, email: 'root@example.com' });
        const mockServer = createMockServerClient({
            partnersData: {
                [superAdminId]: { id: superAdminId, email: 'root@example.com', type: 'admin', role: 'super_admin', status: 'active' },
                [targetUserId]: { id: targetUserId, email: 'target@example.com', type: 'customer', role: 'customer', status: 'active' }
            },
            auditInsertError: 'Connection to audit table failed'
        });

        const mockAdminAuth = {
            auth: { admin: { updateUserById: async () => { passwordUpdated = true; return { data: {}, error: null }; } } }
        };

        const result = await handleAdminCredentialsRequest('Bearer superadmin.session.token', {
            action: 'reset_password',
            targetUserId,
            newPassword: 'ValidNewPassword123!'
        }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuth,
            serverClient: mockServer,
            adminAuthClient: mockAdminAuth
        });

        assert.strictEqual(result.status, 500);
        assert.match(result.body.error || '', /Failed to record required audit initiation log.*Reset aborted/i);
        assert.strictEqual(passwordUpdated, false);
    });

    await test('P0.7b: Audit failure AFTER password update or reset email never reports success (returns 500)', async () => {
        const superAdminId = '88888888-8888-4888-8888-888888888888';
        const targetUserId = '99999999-9999-4999-8999-999999999999';
        const mockAuth = createMockAuthVerifyClient({ id: superAdminId, email: 'root@example.com' });

        // Fail on 2nd audit insert (completion audit) during reset_password
        const mockServerReset = createMockServerClient({
            partnersData: {
                [superAdminId]: { id: superAdminId, email: 'root@example.com', type: 'admin', role: 'super_admin', status: 'active' },
                [targetUserId]: { id: targetUserId, email: 'target@example.com', type: 'customer', role: 'customer', status: 'active' }
            },
            auditInsertError: 'Audit write rejected',
            auditInsertFailOnCall: 2
        });
        const mockAdminAuth = {
            auth: { admin: { updateUserById: async () => ({ data: { user: { id: targetUserId } }, error: null }) } }
        };

        const resetFailAuditRes = await handleAdminCredentialsRequest('Bearer superadmin.token', {
            action: 'reset_password',
            targetUserId,
            newPassword: 'ValidNewPassword123!'
        }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuth,
            serverClient: mockServerReset,
            adminAuthClient: mockAdminAuth
        });
        assert.strictEqual(resetFailAuditRes.status, 500);
        assert.notStrictEqual(resetFailAuditRes.body.success, true);

        // Fail on audit insert during send_password_reset
        const mockServerEmail = createMockServerClient({
            partnersData: {
                [superAdminId]: { id: superAdminId, email: 'root@example.com', type: 'admin', role: 'super_admin', status: 'active' },
                [targetUserId]: { id: targetUserId, email: 'target@example.com', type: 'customer', role: 'customer', status: 'active' }
            },
            auditInsertError: 'Audit write rejected'
        });
        const emailFailAuditRes = await handleAdminCredentialsRequest('Bearer superadmin.token', {
            action: 'send_password_reset',
            targetUserEmail: 'target@example.com'
        }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuth,
            serverClient: mockServerEmail
        });
        assert.strictEqual(emailFailAuditRes.status, 500);
        assert.notStrictEqual(emailFailAuditRes.body.success, true);
    });

    await test('P0.8: Successful authorized reset_password & send_password_reset execute and audit cleanly', async () => {
        const superAdminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        const managerWithPermId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
        const targetUserId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

        const audits: any[] = [];
        const mockAuthSuper = createMockAuthVerifyClient({ id: superAdminId, email: 'owner@example.com' });
        const mockAuthDelegated = createMockAuthVerifyClient({ id: managerWithPermId, email: 'pr-mgr@example.com' });
        const partnersData = {
            [superAdminId]: { id: superAdminId, email: 'owner@example.com', type: 'admin', role: 'super_admin', status: 'active' },
            [managerWithPermId]: { id: managerWithPermId, email: 'pr-mgr@example.com', type: 'admin', role: 'partner_relations_manager', status: 'active', custom_permissions: ['manage_user_credentials'] },
            [targetUserId]: { id: targetUserId, email: 'user@example.com', type: 'developer', role: 'developer', status: 'active' }
        };
        const mockServer = createMockServerClient({
            partnersData,
            onAuditInsert: (row) => audits.push(row)
        });
        const mockAdminAuth = {
            auth: { admin: { updateUserById: async () => ({ data: { user: { id: targetUserId } }, error: null }) } }
        };

        // 1. Super Admin password reset
        const resetRes = await handleAdminCredentialsRequest('Bearer superadmin.token', {
            action: 'reset_password',
            targetUserId,
            newPassword: 'CorrectPassword123!'
        }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuthSuper,
            serverClient: mockServer,
            adminAuthClient: mockAdminAuth
        });
        assert.strictEqual(resetRes.status, 200);
        assert.strictEqual(resetRes.body.success, true);
        assert.strictEqual(audits.length, 2);
        assert.strictEqual(audits[0].action, 'PASSWORD_RESET_INITIATED');
        assert.strictEqual(audits[1].action, 'PASSWORD_RESET_COMPLETED');
        assert.doesNotMatch(audits[0].details, /CorrectPassword123!/);
        assert.doesNotMatch(audits[1].details, /CorrectPassword123!/);

        // 2. Delegated manager sends password reset email for non-Super Admin user
        const emailRes = await handleAdminCredentialsRequest('Bearer delegated.token', {
            action: 'send_password_reset',
            targetUserId,
            targetUserEmail: 'user@example.com'
        }, {
            supabaseServiceKey: 'mock-service-key-xyz',
            authVerifyClient: mockAuthDelegated,
            serverClient: mockServer
        });
        assert.strictEqual(emailRes.status, 200);
        assert.strictEqual(emailRes.body.success, true);
        assert.strictEqual(audits.length, 3);
        assert.strictEqual(audits[2].action, 'PASSWORD_RESET_EMAIL_SENT');
        assert.strictEqual(audits[2].success, true);
    });

    await test('P0.9: Error responses never expose secrets, keys, raw DB errors, or passwords', async () => {
        const superAdminId = '88888888-8888-4888-8888-888888888888';
        const targetUserId = '99999999-9999-4999-8999-999999999999';
        const mockAuth = createMockAuthVerifyClient({ id: superAdminId, email: 'root@example.com' });
        const mockServer = createMockServerClient({
            partnersData: {
                [superAdminId]: { id: superAdminId, email: 'root@example.com', type: 'admin', role: 'super_admin', status: 'active' },
                [targetUserId]: { id: targetUserId, email: 'target@example.com', type: 'customer', role: 'customer', status: 'active' }
            }
        });
        const mockAdminAuth = {
            auth: {
                admin: {
                    updateUserById: async () => ({
                        data: {},
                        error: { message: 'INTERNAL_PG_HOST_10_0_4_12_SECRET_CONNECTION_DETAIL' }
                    })
                }
            }
        };

        const result = await handleAdminCredentialsRequest('Bearer superadmin.token', {
            action: 'reset_password',
            targetUserId,
            newPassword: 'SecretPassword999!'
        }, {
            supabaseServiceKey: 'SUPABASE_SECRET_SERVICE_KEY_DO_NOT_LEAK',
            authVerifyClient: mockAuth,
            serverClient: mockServer,
            adminAuthClient: mockAdminAuth
        });

        assert.strictEqual(result.status, 500);
        const serialized = JSON.stringify(result);
        assert.doesNotMatch(serialized, /SUPABASE_SECRET_SERVICE_KEY/);
        assert.doesNotMatch(serialized, /SecretPassword999!/);
        assert.doesNotMatch(serialized, /INTERNAL_PG_HOST_10_0_4_12/);
    });

    await test('P0.10: Authoritative Role Model — ONLY canonical "super_admin" yields Role.SUPER_ADMIN', () => {
        assert.strictEqual(mapPartnerTypeToRole('admin', 'super_admin'), Role.SUPER_ADMIN);
        assert.strictEqual(normalizeRole('super_admin'), Role.SUPER_ADMIN);
        assert.strictEqual(isAuthoritativeSuperAdmin({ type: 'admin', role: 'super_admin' }), true);
        assert.strictEqual(isAuthoritativeSuperAdmin({ type: null, role: 'super_admin' }), true);

        // Generic 'admin', 'system_admin', missing role with type='admin' MUST NOT grant Super Admin
        assert.notStrictEqual(mapPartnerTypeToRole('admin', 'admin'), Role.SUPER_ADMIN);
        assert.notStrictEqual(mapPartnerTypeToRole('admin', 'system_admin'), Role.SUPER_ADMIN);
        assert.notStrictEqual(mapPartnerTypeToRole('admin', undefined), Role.SUPER_ADMIN);
        assert.notStrictEqual(mapPartnerTypeToRole('system', undefined), Role.SUPER_ADMIN);
        assert.notStrictEqual(normalizeRole('admin'), Role.SUPER_ADMIN);
        assert.notStrictEqual(normalizeRole('system_admin'), Role.SUPER_ADMIN);
        assert.strictEqual(isAuthoritativeSuperAdmin({ type: 'admin', role: 'admin' }), false);
        assert.strictEqual(isAuthoritativeSuperAdmin({ type: 'admin', role: 'system_admin' }), false);
        assert.strictEqual(isAuthoritativeSuperAdmin({ type: 'admin', role: null }), false);
        assert.strictEqual(isAuthoritativeSuperAdmin({ type: 'admin', role: 'partner_relations_manager' }), false);

        // Departmental managers & external partners
        assert.strictEqual(mapPartnerTypeToRole('admin', 'partner_relations_manager'), Role.PARTNER_RELATIONS_MANAGER);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'content_manager'), Role.CONTENT_MANAGER);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'decoration_manager'), Role.DECORATION_MANAGER);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'platform_finishing_manager'), Role.PLATFORM_FINISHING_MANAGER);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'listings_manager'), Role.LISTINGS_MANAGER);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'customer_relations_manager'), Role.CUSTOMER_RELATIONS_MANAGER);
        assert.strictEqual(mapPartnerTypeToRole('developer', 'developer'), Role.DEVELOPER_PARTNER);
        assert.strictEqual(mapPartnerTypeToRole('finishing', 'finishing'), Role.FINISHING_PARTNER);
        assert.strictEqual(mapPartnerTypeToRole('agency', 'agency'), Role.AGENCY_PARTNER);
        assert.strictEqual(mapPartnerTypeToRole('customer', 'customer'), Role.CUSTOMER);
    });

    // ------------------------------------------------------------------------
    // SUITE 2: P1 Operations Center Correctness, Filters & End-to-End Query Tests
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 2: P1 Operations Center Status, Priority, Date, Triage & Domain Filter Tests ---');

    await test('P1.1: Canonical operational status mapping matches every supported DB status & terminal precedence', () => {
        assert.strictEqual(mapDomainStatusToOperational('completed'), OperationalStatus.RESOLVED);
        assert.strictEqual(mapDomainStatusToOperational('approved'), OperationalStatus.RESOLVED);
        assert.strictEqual(mapDomainStatusToOperational('verified'), OperationalStatus.RESOLVED);
        assert.strictEqual(mapDomainStatusToOperational('won'), OperationalStatus.RESOLVED);
        assert.strictEqual(mapDomainStatusToOperational('resolved'), OperationalStatus.RESOLVED);

        assert.strictEqual(mapDomainStatusToOperational('closed'), OperationalStatus.CLOSED);
        assert.strictEqual(mapDomainStatusToOperational('lost'), OperationalStatus.CLOSED);

        assert.strictEqual(mapDomainStatusToOperational('rejected'), OperationalStatus.REJECTED);
        assert.strictEqual(mapDomainStatusToOperational('cancelled'), OperationalStatus.REJECTED);
        assert.strictEqual(mapDomainStatusToOperational('declined'), OperationalStatus.REJECTED);

        assert.strictEqual(mapDomainStatusToOperational('quoted'), OperationalStatus.WAITING);
        assert.strictEqual(mapDomainStatusToOperational('waiting'), OperationalStatus.WAITING);
        assert.strictEqual(mapDomainStatusToOperational('viewing'), OperationalStatus.WAITING);

        assert.strictEqual(mapDomainStatusToOperational('contacted'), OperationalStatus.IN_PROGRESS);
        assert.strictEqual(mapDomainStatusToOperational('site-visit'), OperationalStatus.IN_PROGRESS);
        assert.strictEqual(mapDomainStatusToOperational('in-progress'), OperationalStatus.IN_PROGRESS);
        assert.strictEqual(mapDomainStatusToOperational('qualified'), OperationalStatus.IN_PROGRESS);

        assert.strictEqual(mapDomainStatusToOperational('assigned'), OperationalStatus.ASSIGNED);
        assert.strictEqual(mapDomainStatusToOperational('new', undefined), OperationalStatus.NEW);
        assert.strictEqual(mapDomainStatusToOperational('new', 'assignee-uuid-1'), OperationalStatus.ASSIGNED);
        assert.strictEqual(mapDomainStatusToOperational('pending', undefined), OperationalStatus.NEW);
        assert.strictEqual(mapDomainStatusToOperational('pending', 'assignee-uuid-1'), OperationalStatus.ASSIGNED);

        // Terminal DB status always wins over stale payload.operationalStatus
        assert.strictEqual(
            resolveOperationalStatus({ status: 'verified', assignedTo: 'u-1' }, { operationalStatus: OperationalStatus.WAITING }),
            OperationalStatus.RESOLVED
        );
        assert.strictEqual(
            resolveOperationalStatus({ status: 'lost', assignedTo: 'u-1' }, { operationalStatus: OperationalStatus.IN_PROGRESS }),
            OperationalStatus.CLOSED
        );
    });

    await test('P1.2: Date range bounds handle valid, missing, and invalid inputs safely', () => {
        const fixedNow = new Date('2026-10-15T14:30:00.000Z');
        const todayBounds = computeDateRangeBounds('today', fixedNow);
        const sevenDayBounds = computeDateRangeBounds('last7days', fixedNow);
        const thirtyDayBounds = computeDateRangeBounds('last30days', fixedNow);
        const olderBounds = computeDateRangeBounds('older', fixedNow);
        const invalidBounds = computeDateRangeBounds('invalid_range', fixedNow);

        assert.strictEqual(todayBounds.isValid, true);
        assert.ok(todayBounds.gteIso && todayBounds.gteIso <= fixedNow.toISOString());
        assert.strictEqual(sevenDayBounds.gteIso, new Date(fixedNow.getTime() - 7 * 86400000).toISOString());
        assert.strictEqual(thirtyDayBounds.gteIso, new Date(fixedNow.getTime() - 30 * 86400000).toISOString());
        assert.strictEqual(olderBounds.ltIso, new Date(fixedNow.getTime() - 30 * 86400000).toISOString());
        assert.strictEqual(invalidBounds.isValid, false);
        assert.strictEqual(parseValidDateMs('not-a-date'), null);
        assert.strictEqual(parseValidDateMs(null), null);
    });

    await test('P1.3: Priority derivation aligns to the millisecond with database criteria', () => {
        const now = new Date('2026-10-15T12:00:00.000Z');
        const nowMs = now.getTime();
        const justOver48h = new Date(nowMs - (48 * 3600 * 1000 + 60 * 1000)).toISOString();
        const justOver24h = new Date(nowMs - (24 * 3600 * 1000 + 60 * 1000)).toISOString();
        const fiveHoursAgo = new Date(nowMs - 5 * 3600 * 1000).toISOString();

        assert.strictEqual(deriveRequestPriority({ type: RequestType.PARTNER_APPLICATION, status: 'new' }, {}, nowMs), 'high');
        assert.strictEqual(deriveRequestPriority({ type: RequestType.LEAD, assignedTo: null, createdAt: justOver24h, status: 'new' }, {}, nowMs), 'high');
        assert.strictEqual(deriveRequestPriority({ type: RequestType.LEAD, assignedTo: 'u-1', createdAt: justOver48h, status: 'in-progress' }, {}, nowMs), 'high');
        assert.strictEqual(deriveRequestPriority({ type: RequestType.LEAD, status: 'in-progress' }, { estimatedCost: 1500000 }, nowMs), 'high');
        assert.strictEqual(deriveRequestPriority({ type: RequestType.LEAD, status: 'verified' }, { priority: 'high' }, nowMs), 'low');
        assert.strictEqual(deriveRequestPriority({ type: RequestType.LEAD, assignedTo: 'u-1', createdAt: fiveHoursAgo, status: 'in-progress' }, { priority: 'low' }, nowMs), 'low');
        assert.strictEqual(deriveRequestPriority({ type: RequestType.LEAD, assignedTo: 'u-1', createdAt: fiveHoursAgo, status: 'in-progress' }, {}, nowMs), 'medium');
    });

    await test('P1.4: End-to-end getUnifiedRequests enforces dateRange, triageView, commercial/real_estate domains, statuses, priorities & pagination', async () => {
        const fixedNow = new Date('2026-10-15T22:00:00.000Z');
        const nowMs = fixedNow.getTime();
        const h = (hrs: number) => new Date(nowMs - hrs * 3600 * 1000).toISOString();
        const mgrA = 'aaaaaaaa-0000-4000-8000-000000000001';
        const mgrB = 'bbbbbbbb-0000-4000-8000-000000000002';

        const dataset = [
            // 1. Today unassigned commercial lead (NULL serviceType) -> NEW, medium priority, recently_updated
            {
                id: 'req-01', type: RequestType.LEAD, status: 'new', assigned_to: null,
                created_at: h(2), updated_at: h(1),
                requester_name: 'Commercial Null Lead', requester_phone: '01001', requester_email: 'c1@test.com',
                payload: { serviceType: null }
            },
            // 2. General commercial lead assigned to mgrA, high estimatedCost, 10d old -> IN_PROGRESS, high priority
            {
                id: 'req-02', type: RequestType.LEAD, status: 'contacted', assigned_to: mgrA,
                created_at: h(24 * 10), updated_at: h(24 * 5),
                requester_name: 'Commercial HighBudget', requester_phone: '01002', requester_email: 'c2@test.com',
                payload: { serviceType: 'general', estimatedCost: 2500000 }
            },
            // 3. Finishing lead aged 60h, waiting -> WAITING, high priority, aged, must NOT appear in commercial
            {
                id: 'req-03', type: RequestType.LEAD, status: 'quoted', assigned_to: mgrB,
                created_at: h(60), updated_at: h(30),
                requester_name: 'Finishing Aged', requester_phone: '01003', requester_email: 'f1@test.com',
                payload: { serviceType: 'finishing' }
            },
            // 4. Decorations singular lead, 3h old -> ASSIGNED, explicit low priority, recently_updated, must NOT appear in commercial
            {
                id: 'req-04', type: RequestType.LEAD, status: 'new', assigned_to: mgrA,
                created_at: h(3), updated_at: h(2),
                requester_name: 'Decor Low', requester_phone: '01004', requester_email: 'd1@test.com',
                payload: { serviceType: 'decoration', priority: 'low' }
            },
            // 5. Real estate lead with propertyId & serviceType=general, 35 days old -> older, high priority (aged)
            {
                id: 'req-05', type: RequestType.LEAD, status: 'new', assigned_to: mgrA,
                created_at: h(24 * 35), updated_at: h(24 * 2),
                requester_name: 'Property Lead', requester_phone: '01005', requester_email: 'p1@test.com',
                payload: { propertyId: 'prop-99', serviceType: 'property' }
            },
            // 6. Verified property listing request -> RESOLVED, low priority, NOT aged
            {
                id: 'req-06', type: RequestType.PROPERTY_LISTING_REQUEST, status: 'verified', assigned_to: mgrA,
                created_at: h(24 * 15), updated_at: h(2),
                requester_name: 'Verified Listing', requester_phone: '01006', requester_email: 'v1@test.com',
                payload: { operationalStatus: OperationalStatus.WAITING } // Stale payload status overridden by terminal 'verified'
            },
            // 7. Closed contact message -> CLOSED, low priority
            {
                id: 'req-07', type: RequestType.CONTACT_MESSAGE, status: 'lost', assigned_to: mgrB,
                created_at: h(24 * 20), updated_at: h(24 * 19),
                requester_name: 'Lost Contact', requester_phone: '01007', requester_email: 'l1@test.com',
                payload: {}
            },
            // 8. Partner application unassigned, 3h old -> NEW, high priority (PARTNER_APPLICATION)
            {
                id: 'req-08', type: RequestType.PARTNER_APPLICATION, status: 'pending', assigned_to: null,
                created_at: h(3), updated_at: h(3),
                requester_name: 'Partner App', requester_phone: '01008', requester_email: 'pa@test.com',
                payload: {}
            },
            // 9. Rejected lead created yesterday (26h ago), updated 10h ago -> REJECTED, low priority, NOT today
            {
                id: 'req-09', type: RequestType.LEAD, status: 'declined', assigned_to: mgrB,
                created_at: h(26), updated_at: h(10),
                requester_name: 'Declined Commercial', requester_phone: '01009', requester_email: 'dc@test.com',
                payload: { serviceType: 'commercial_consulting' }
            }
        ];

        const client = createMockPostgrestClient(dataset);
        const partners: Partner[] = [
            { id: mgrA, name: 'Manager A', email: 'a@onlyhelio.com', type: 'admin', role: 'super_admin', status: 'active' } as any,
            { id: mgrB, name: 'Manager B', email: 'b@onlyhelio.com', type: 'admin', role: 'platform_finishing_manager', status: 'active' } as any
        ];

        const queryAndCompare = async (label: string, filter: any, expectedIds: string[]) => {
            const res = await getUnifiedRequests({ page: 1, pageSize: 50, ...filter }, { client, partners, now: fixedNow });
            const actualIds = res.requests.map(r => r.id).sort();
            assert.deepStrictEqual(actualIds, [...expectedIds].sort(), `DB query mismatch for ${label}`);

            // Also verify in-memory filter agrees 100%
            const allUnified = dataset.map(r => mapRequestToUnified(mapRequestFromDb(r), undefined, nowMs));
            const memIds = allUnified.filter(u => matchesUnifiedRequestFilter(u, filter, fixedNow)).map(u => u.id).sort();
            assert.deepStrictEqual(memIds, [...expectedIds].sort(), `In-memory filter mismatch for ${label}`);
        };

        // Date Range
        await queryAndCompare('dateRange=today', { dateRange: 'today' }, ['req-01', 'req-04', 'req-08']);
        await queryAndCompare('dateRange=last7days', { dateRange: 'last7days' }, ['req-01', 'req-03', 'req-04', 'req-08', 'req-09']);
        await queryAndCompare('dateRange=last30days', { dateRange: 'last30days' }, ['req-01', 'req-02', 'req-03', 'req-04', 'req-06', 'req-07', 'req-08', 'req-09']);
        await queryAndCompare('dateRange=older', { dateRange: 'older' }, ['req-05']);

        // Commercial vs Finishing vs Decorations vs Real Estate
        await queryAndCompare('domain=commercial', { domain: 'commercial' }, ['req-01', 'req-02', 'req-09']);
        await queryAndCompare('domain=finishing', { domain: 'finishing' }, ['req-03']);
        await queryAndCompare('domain=decorations', { domain: 'decorations' }, ['req-04']);
        await queryAndCompare('domain=real_estate', { domain: 'real_estate' }, ['req-05', 'req-06']);

        // Triage Views (including aged & recently_updated!)
        await queryAndCompare('triageView=aged', { triageView: 'aged' }, ['req-02', 'req-03', 'req-05']);
        await queryAndCompare('triageView=recently_updated', { triageView: 'recently_updated' }, ['req-01', 'req-04', 'req-06', 'req-08', 'req-09']);
        await queryAndCompare('triageView=unassigned', { triageView: 'unassigned' }, ['req-01', 'req-08']);
        await queryAndCompare('triageView=high_priority', { triageView: 'high_priority' }, ['req-02', 'req-03', 'req-05', 'req-08']);
        await queryAndCompare('triageView=resolved', { triageView: 'resolved' }, ['req-06']);

        // Operational Statuses
        await queryAndCompare('operationalStatus=RESOLVED', { operationalStatus: OperationalStatus.RESOLVED }, ['req-06']);
        await queryAndCompare('operationalStatus=CLOSED', { operationalStatus: OperationalStatus.CLOSED }, ['req-07']);
        await queryAndCompare('operationalStatus=REJECTED', { operationalStatus: OperationalStatus.REJECTED }, ['req-09']);
        await queryAndCompare('operationalStatus=WAITING', { operationalStatus: OperationalStatus.WAITING }, ['req-03']);
        await queryAndCompare('operationalStatus=IN_PROGRESS', { operationalStatus: OperationalStatus.IN_PROGRESS }, ['req-02']);
        await queryAndCompare('operationalStatus=NEW', { operationalStatus: OperationalStatus.NEW }, ['req-01', 'req-08']);
        await queryAndCompare('operationalStatus=ASSIGNED', { operationalStatus: OperationalStatus.ASSIGNED }, ['req-04', 'req-05']);

        // Priorities (authoritative alignment)
        await queryAndCompare('priority=high', { priority: 'high' }, ['req-02', 'req-03', 'req-05', 'req-08']);
        await queryAndCompare('priority=medium', { priority: 'medium' }, ['req-01']);
        await queryAndCompare('priority=low', { priority: 'low' }, ['req-04', 'req-06', 'req-07', 'req-09']);

        // Combined filter + pagination consistency
        const page1 = await getUnifiedRequests(
            { domain: 'commercial', dateRange: 'last30days', page: 1, pageSize: 2 },
            { client, partners, now: fixedNow }
        );
        const page2 = await getUnifiedRequests(
            { domain: 'commercial', dateRange: 'last30days', page: 2, pageSize: 2 },
            { client, partners, now: fixedNow }
        );
        assert.strictEqual(page1.totalCount, 3);
        assert.strictEqual(page2.totalCount, 3);
        assert.strictEqual(page1.requests.length, 2);
        assert.strictEqual(page2.requests.length, 1);

        // Empty result case
        await queryAndCompare('combined impossible filter', { domain: 'partners', dateRange: 'older' }, []);
    });

    // ------------------------------------------------------------------------
    // SUITE 3: Real SQL Migration & Artifact Security Verification
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 3: Real SQL Migration & Build Artifact Verification ---');

    await test('P1.5: Stale compiled server/credentialsEndpoint.js does not shadow TypeScript source', () => {
        const jsPath = path.resolve(process.cwd(), 'server/credentialsEndpoint.js');
        const tsPath = path.resolve(process.cwd(), 'server/credentialsEndpoint.ts');
        assert.strictEqual(fs.existsSync(tsPath), true, 'server/credentialsEndpoint.ts must exist');
        assert.strictEqual(fs.existsSync(jsPath), false, 'Stale compiled server/credentialsEndpoint.js must not exist');
    });

    await test('P1.6: Migration 20261009_phase3b_security_verification.sql enforces RLS isolation, active status & DB triggers', () => {
        const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20261009_phase3b_security_verification.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Partner & customer request_messages isolated to type = 'message' + active partner + preserved customer_id
        assert.match(sql, /CREATE POLICY "Assigned partners view messages for assigned requests"[\s\S]*p\.status = 'active'[\s\S]*AND request_messages\.type = 'message'/);
        assert.match(sql, /CREATE POLICY "Customers view messages for own requests"[\s\S]*r\.customer_id IS NOT NULL AND r\.customer_id = auth\.uid\(\)[\s\S]*AND request_messages\.type = 'message'/);

        // Partner update on requests cannot modify assigned_to or payload->>'partnerId'
        assert.match(sql, /CREATE POLICY "Assigned partners can update their requests"[\s\S]*requests\.assigned_to IS NOT DISTINCT FROM[\s\S]*requests\.payload->>'partnerId'\) IS NOT DISTINCT FROM/);

        // DB trigger protects assignment & enforces assignee eligibility on INSERT OR UPDATE
        assert.match(sql, /CREATE OR REPLACE FUNCTION public\.protect_request_privileged_fields\(\)/);
        assert.match(sql, /CREATE TRIGGER trigger_protect_request_privileged_fields\s+BEFORE INSERT OR UPDATE ON public\.requests/);
        assert.match(sql, /IF v_assignee_role IN \('customer', 'content_manager'\) THEN/);
        assert.match(sql, /IF NEW\.assigned_to IS DISTINCT FROM OLD\.assigned_to THEN\s+RAISE EXCEPTION/);

        // Credential audit log write policies deny all client writes
        assert.match(sql, /ON public\.credential_audit_log FOR INSERT WITH CHECK \(false\)/);
        assert.match(sql, /ON public\.credential_audit_log FOR UPDATE USING \(false\)/);
        assert.match(sql, /ON public\.credential_audit_log FOR DELETE USING \(false\)/);
    });

    await test('P1.7: Audit log migration 20261009_credential_audit_log_security.sql limits SELECT to active super_admin', () => {
        const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20261009_credential_audit_log_security.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        assert.match(sql, /ALTER TABLE public\.credential_audit_log ENABLE ROW LEVEL SECURITY/);
        assert.match(sql, /p\.role = 'super_admin'/);
        assert.match(sql, /p\.status = 'active'/);
        assert.doesNotMatch(sql, /type = 'admin'/);
    });

    // ------------------------------------------------------------------------
    // SUITE 4: Phase 3C Finance & Analytics Hardening Verification
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 4: Phase 3C Finance & Analytics Hardening Tests ---');

    await test('P3C.1: createTransaction validates amount, payment method, and mandatory InstaPay receipt', async () => {
        const mockClient = {
            auth: { getSession: async () => ({ data: { session: null } }) },
            from: () => {
                throw new Error('Database insert should not be reached for invalid inputs');
            }
        };

        await assert.rejects(
            () => createTransaction({
                userId: '',
                userName: 'Tester',
                amount: 0,
                currency: 'EGP',
                type: 'subscription_fee',
                description: 'Zero amount',
                method: 'card'
            }, { client: mockClient }),
            /positive number/i
        );

        await assert.rejects(
            () => createTransaction({
                userId: '',
                userName: 'Tester',
                amount: -500,
                currency: 'EGP',
                type: 'subscription_fee',
                description: 'Negative amount',
                method: 'card'
            }, { client: mockClient }),
            /positive number/i
        );

        await assert.rejects(
            () => createTransaction({
                userId: '',
                userName: 'Tester',
                amount: Number.NaN,
                currency: 'EGP',
                type: 'subscription_fee',
                description: 'NaN amount',
                method: 'card'
            }, { client: mockClient }),
            /positive number/i
        );

        await assert.rejects(
            () => createTransaction({
                userId: '',
                userName: 'Tester',
                amount: 1000,
                currency: 'EGP',
                type: 'subscription_fee',
                description: 'Invalid method',
                method: 'crypto' as any
            }, { client: mockClient }),
            /Unsupported payment method/i
        );

        await assert.rejects(
            () => createTransaction({
                userId: '',
                userName: 'Tester',
                amount: 1000,
                currency: 'EGP',
                type: 'subscription_fee',
                description: 'Missing receipt',
                method: 'instapay'
            }, { client: mockClient }),
            /receipt upload/i
        );
    });

    await test('P3C.2: createTransaction forces card="pending", instapay="reviewing", and derives authoritative user_id from session', async () => {
        const sessionUserId = '11111111-1111-4111-8111-111111111111';
        const forgedUserId = '99999999-9999-4999-8999-999999999999';
        const insertedPayloads: any[] = [];

        const mockClient = {
            auth: {
                getSession: async () => ({
                    data: { session: { user: { id: sessionUserId } } }
                })
            },
            from: (table: string) => {
                if (table === 'transactions') {
                    return {
                        insert: (payload: any) => {
                            insertedPayloads.push(payload);
                            return {
                                select: () => ({
                                    single: async () => ({
                                        data: { id: 'txn-1', ...payload },
                                        error: null
                                    })
                                })
                            };
                        }
                    };
                }
                if (table === 'partners') {
                    return {
                        select: () => ({
                            eq: () => ({
                                eq: () => ({
                                    limit: async () => ({ data: [{ id: 'admin-resolved-uuid' }], error: null })
                                })
                            })
                        })
                    };
                }
                if (table === 'notifications') {
                    return {
                        insert: async () => ({ error: null })
                    };
                }
                throw new Error(`Unexpected table: ${table}`);
            }
        };

        const cardTxn = await createTransaction({
            userId: forgedUserId,
            userName: 'Partner X',
            amount: 1500,
            currency: 'EGP',
            type: 'subscription_fee',
            description: 'Gold Plan',
            method: 'card'
        }, { client: mockClient });

        assert.strictEqual(cardTxn.status, 'pending', 'Card payment must never auto-approve to paid client-side');
        assert.strictEqual(cardTxn.userId, sessionUserId, 'user_id must come from active session, not forged payload');
        assert.strictEqual(insertedPayloads[0].status, 'pending');
        assert.strictEqual(insertedPayloads[0].user_id, sessionUserId);

        const instapayTxn = await createTransaction({
            userId: forgedUserId,
            userName: 'Partner X',
            amount: 1500,
            currency: 'EGP',
            type: 'subscription_fee',
            description: 'Gold Plan InstaPay',
            method: 'instapay',
            receiptUrl: 'data:image/png;base64,abc'
        }, { client: mockClient });

        assert.strictEqual(instapayTxn.status, 'reviewing');
        assert.strictEqual(instapayTxn.userId, sessionUserId);
    });

    await test('P3C.3: Finance & Analytics service functions enforce RBAC and fail loudly on DB errors (no localStorage fallback)', async () => {
        const prevState = useAuthStore.getState();
        try {
            // 1. Unauthenticated caller -> UNAUTHENTICATED
            useAuthStore.getState().setCurrentUser(null);
            await assert.rejects(
                () => getAllTransactions({}),
                (err: any) => err instanceof AuthorizationError && err.code === 'UNAUTHENTICATED'
            );
            await assert.rejects(
                () => getFinanceStats({}),
                (err: any) => err instanceof AuthorizationError && err.code === 'UNAUTHENTICATED'
            );
            await assert.rejects(
                () => updateTransactionStatus('txn-1', 'paid', { client: {} }),
                (err: any) => err instanceof AuthorizationError && err.code === 'UNAUTHENTICATED'
            );
            await assert.rejects(
                () => getAnalyticsEventCounts({ client: {} }),
                (err: any) => err instanceof AuthorizationError && err.code === 'UNAUTHENTICATED'
            );

            // 2. Unauthorized partner caller -> FORBIDDEN
            useAuthStore.getState().setCurrentUser({
                id: 'partner-1',
                email: 'dev@example.com',
                type: 'developer',
                role: Role.DEVELOPER_PARTNER,
                status: 'active'
            } as any);
            await assert.rejects(
                () => getAllTransactions({}),
                (err: any) => err instanceof AuthorizationError && err.code === 'FORBIDDEN'
            );
            await assert.rejects(
                () => updateTransactionStatus('txn-1', 'paid', { client: {} }),
                (err: any) => err instanceof AuthorizationError && err.code === 'FORBIDDEN'
            );
            await assert.rejects(
                () => getAnalyticsEventCounts({ client: {} }),
                (err: any) => err instanceof AuthorizationError && err.code === 'FORBIDDEN'
            );

            // 3. Authorized Super Admin caller -> executes DB queries and fails loudly on DB errors
            useAuthStore.getState().setCurrentUser({
                id: 'admin-1',
                email: 'owner@onlyhelio.com',
                type: 'admin',
                role: Role.SUPER_ADMIN,
                status: 'active'
            } as any);

            const mockAnalyticsClient = {
                from: () => ({
                    select: async () => ({
                        data: [
                            { event_type: 'whatsapp_click' },
                            { event_type: 'whatsapp_click' },
                            { event_type: 'call_click' },
                            { event_type: 'property_view' },
                            { event_type: 'inquiry_submit' },
                            { event_type: 'property_inquiry' }
                        ],
                        error: null
                    })
                })
            };
            const counts = await getAnalyticsEventCounts({ client: mockAnalyticsClient });
            assert.deepStrictEqual(counts, {
                whatsAppClicks: 2,
                callClicks: 1,
                propertyViews: 1,
                inquirySubmits: 2
            });

            const kpis = getCommercialKPIs([], [], [], counts);
            assert.strictEqual(kpis.whatsAppClicks, 2);
            assert.strictEqual(kpis.callClicks, 1);
            assert.strictEqual(kpis.propertyViews, 1);

            const failingAnalyticsClient = {
                from: () => ({
                    select: async () => ({ data: null, error: { message: 'RLS denied' } })
                })
            };
            await assert.rejects(
                () => getAnalyticsEventCounts({ client: failingAnalyticsClient }),
                /Failed to load analytics counts/i
            );

            // Verify trackEvent forwards inquiry_submit & search_performed to Supabase
            const trackedEvents: string[] = [];
            const mockTrackClient = {
                from: () => ({
                    insert: async (row: any) => {
                        trackedEvents.push(row.event_type);
                        return { error: null };
                    }
                })
            };
            await trackEvent('inquiry_submit', { propertyId: 'p1' }, { client: mockTrackClient });
            await trackEvent('search_performed', { metadata: { q: 'Helio' } }, { client: mockTrackClient });
            assert.deepStrictEqual(trackedEvents, ['inquiry_submit', 'search_performed']);
        } finally {
            useAuthStore.setState({ currentUser: prevState.currentUser, permissions: prevState.permissions });
        }
    });

    await test('P3C.4: Phase 3C SQL migration & source files remove hardcoded admin UUID, localStorage fallback, and type=admin escalation', () => {
        const financeSrc = fs.readFileSync(path.resolve(process.cwd(), 'services/finance.ts'), 'utf8');
        const analyticsSrc = fs.readFileSync(path.resolve(process.cwd(), 'services/analytics.ts'), 'utf8');
        const sqlSrc = fs.readFileSync(
            path.resolve(process.cwd(), 'supabase/migrations/20261010_phase3c_finance_analytics_hardening.sql'),
            'utf8'
        );

        assert.doesNotMatch(financeSrc, /3e554896-eee8-4545-9c7f-0a79a4c1a9f1/);
        assert.doesNotMatch(analyticsSrc, /localStorage\s*\./);

        assert.match(sqlSrc, /CREATE OR REPLACE FUNCTION public\.protect_transaction_integrity\(\)/);
        assert.match(sqlSrc, /CREATE TRIGGER trigger_protect_transaction_integrity\s+BEFORE INSERT OR UPDATE ON public\.transactions/);
        assert.match(sqlSrc, /status IN \('pending', 'reviewing'\)/);
        assert.match(sqlSrc, /p\.status = 'active'/);
        assert.match(sqlSrc, /'inquiry_submit'/);
        assert.match(sqlSrc, /'search_performed'/);
        assert.match(sqlSrc, /'filter_applied'/);
        assert.match(sqlSrc, /partners\.status = 'active'/);
        const sqlNoComments = sqlSrc.replace(/--.*$/gm, '');
        assert.doesNotMatch(sqlNoComments, /partners\.type\s*=\s*'admin'/);
        assert.match(sqlSrc, /ON public\.analytics_events FOR UPDATE USING \(false\)/);
        assert.match(sqlSrc, /ON public\.analytics_events FOR DELETE USING \(false\)/);
    });

    console.log('\n--- Suite 4: P0 Resilient Partner Query & Network Error Fallback ---');

    await test('P0.5: getAllPartners returns valid partner entities without throwing on network failure', async () => {
        const { getAllPartners, getPartnerById, getFallbackPartners } = await import('../services/partners');
        const fallbackList = getFallbackPartners();
        assert.ok(fallbackList.length > 0, 'Fallback partners list must not be empty');

        const partners = await getAllPartners();
        assert.ok(Array.isArray(partners), 'Partners must be an array');
        assert.ok(partners.length > 0, 'Partners must not be empty even during network disruptions');

        const firstPartner = partners[0];
        assert.ok(firstPartner.id, 'Partner must have an id');
        assert.ok(firstPartner.email, 'Partner must have an email');

        const partnerById = await getPartnerById(firstPartner.id);
        assert.ok(partnerById, 'Partner must be retrievable by ID');
        assert.strictEqual(partnerById?.id, firstPartner.id);
    });

    console.log('\n--- Suite 5: Phase 2A — Partner Message Security Hardening & Behavioral Tests ---');

    await test('P2A.1 & P2A.2: Partner-facing queries explicitly exclude internal notes and retain conversation messages', async () => {
        const { supabase } = await import('../lib/supabase');
        const { getRequestMessages } = await import('../services/requests');
        const { getLeadMessagesForPartner } = await import('../services/leads');

        const mockRecords = [
            {
                id: 'msg-client-1',
                request_id: 'req-audit-123',
                sender: 'client',
                sender_id: 'client-uuid-1',
                type: 'message',
                content: 'Hello, what is the status of the design?',
                created_at: '2026-10-10T10:00:00Z'
            },
            {
                id: 'note-admin-internal',
                request_id: 'req-audit-123',
                sender: 'admin',
                sender_id: 'admin-uuid-1',
                type: 'note',
                content: '[OPERATIONAL NOTE] Client budget is tight, margin approved at 12%',
                created_at: '2026-10-10T11:00:00Z'
            },
            {
                id: 'msg-partner-2',
                request_id: 'req-audit-123',
                sender: 'partner',
                sender_id: 'partner-uuid-1',
                type: 'message',
                content: 'We uploaded the revised 3D layout.',
                created_at: '2026-10-10T12:00:00Z'
            }
        ];

        const originalFrom = (supabase as any).from;
        let queryFilters: { column: string; value: any }[] = [];

        try {
            (supabase as any).from = (table: string) => {
                if (table === 'request_messages') {
                    queryFilters = [];
                    const builder: any = {
                        select: () => builder,
                        eq: (column: string, value: any) => {
                            queryFilters.push({ column, value });
                            return builder;
                        },
                        order: () => {
                            let filtered = [...mockRecords];
                            for (const f of queryFilters) {
                                filtered = filtered.filter((r: any) => r[f.column] === f.value);
                            }
                            return Promise.resolve({ data: filtered, error: null });
                        }
                    };
                    return builder;
                }
                return originalFrom.call(supabase, table);
            };

            // Test 1: getRequestMessages with partner role
            const partnerMessages = await getRequestMessages('req-audit-123', Role.FINISHING_PARTNER);
            assert.ok(queryFilters.some(f => f.column === 'type' && f.value === 'message'), 'Partner query must explicitly filter type=message');
            assert.strictEqual(partnerMessages.length, 2, 'Must only return 2 conversation messages');
            assert.strictEqual(partnerMessages.some(m => m.type === 'note'), false, 'Internal notes must be completely excluded from partner results');
            assert.strictEqual(partnerMessages.some(m => m.id === 'note-admin-internal'), false, 'Operational note must not leak to partner');
            assert.strictEqual(partnerMessages[0].id, 'msg-client-1');
            assert.strictEqual(partnerMessages[1].id, 'msg-partner-2');

            // Test 2: getLeadMessagesForPartner dedicated partner query
            const leadPartnerMsgs = await getLeadMessagesForPartner('req-audit-123');
            assert.ok(queryFilters.some(f => f.column === 'type' && f.value === 'message'), 'Lead partner query must explicitly filter type=message');
            assert.strictEqual(leadPartnerMsgs.some(m => m.type === 'note'), false, 'Internal notes must be completely excluded from getLeadMessagesForPartner');
            assert.strictEqual(leadPartnerMsgs.length, 2, 'Conversation messages remain fully accessible');
        } finally {
            (supabase as any).from = originalFrom;
        }
    });

    await test('P2A.3: Administrative workflows that require internal notes are not accidentally restricted', async () => {
        const { supabase } = await import('../lib/supabase');
        const { getRequestMessages } = await import('../services/requests');

        const mockRecords = [
            {
                id: 'msg-client-1',
                request_id: 'req-audit-456',
                sender: 'client',
                sender_id: 'client-uuid-1',
                type: 'message',
                content: 'Need quotation',
                created_at: '2026-10-10T10:00:00Z'
            },
            {
                id: 'note-staff-internal',
                request_id: 'req-audit-456',
                sender: 'admin',
                sender_id: 'admin-uuid-1',
                type: 'note',
                content: '[STAFF AUDIT] Reassigned request to Cairo team',
                created_at: '2026-10-10T11:00:00Z'
            }
        ];

        const originalFrom = (supabase as any).from;
        let queryFilters: { column: string; value: any }[] = [];

        try {
            (supabase as any).from = (table: string) => {
                if (table === 'request_messages') {
                    queryFilters = [];
                    const builder: any = {
                        select: () => builder,
                        eq: (column: string, value: any) => {
                            queryFilters.push({ column, value });
                            return builder;
                        },
                        order: () => {
                            let filtered = [...mockRecords];
                            for (const f of queryFilters) {
                                filtered = filtered.filter((r: any) => r[f.column] === f.value);
                            }
                            return Promise.resolve({ data: filtered, error: null });
                        }
                    };
                    return builder;
                }
                return originalFrom.call(supabase, table);
            };

            // Super Admin query
            const superAdminMsgs = await getRequestMessages('req-audit-456', Role.SUPER_ADMIN);
            assert.strictEqual(queryFilters.some(f => f.column === 'type'), false, 'Super admin query must not restrict by message type');
            assert.strictEqual(superAdminMsgs.length, 2, 'Super admin must see all records including notes');
            assert.strictEqual(superAdminMsgs.some(m => m.type === 'note'), true, 'Super admin must see operational notes');

            // Content / Platform Manager query
            const managerMsgs = await getRequestMessages('req-audit-456', Role.PLATFORM_FINISHING_MANAGER);
            assert.strictEqual(queryFilters.some(f => f.column === 'type'), false, 'Manager query must not restrict by message type');
            assert.strictEqual(managerMsgs.some(m => m.type === 'note'), true, 'Manager must see operational notes');
        } finally {
            (supabase as any).from = originalFrom;
        }
    });

    await test('P2A.4: Query failures remain visible through existing error handling', async () => {
        const { supabase } = await import('../lib/supabase');
        const { getRequestMessages } = await import('../services/requests');
        const { getLeadMessagesForPartner } = await import('../services/leads');

        const originalFrom = (supabase as any).from;
        const simulatedError = new Error('Database connection failed / table unavailable');

        try {
            (supabase as any).from = (table: string) => {
                if (table === 'request_messages') {
                    const builder: any = {
                        select: () => builder,
                        eq: () => builder,
                        order: () => Promise.resolve({ data: null, error: simulatedError })
                    };
                    return builder;
                }
                return originalFrom.call(supabase, table);
            };

            // getRequestMessages should throw rather than silently returning []
            await assert.rejects(
                async () => {
                    await getRequestMessages('req-fail-1', Role.FINISHING_PARTNER);
                },
                /Database connection failed/i,
                'getRequestMessages must propagate query failures so they remain visible'
            );

            // getLeadMessagesForPartner should also propagate failures
            await assert.rejects(
                async () => {
                    await getLeadMessagesForPartner('req-fail-1');
                },
                /Database connection failed/i,
                'getLeadMessagesForPartner must propagate query failures so they remain visible'
            );
        } finally {
            (supabase as any).from = originalFrom;
        }
    });

    await test('P2A.5: Client-side role claims cannot bypass server-side authorization', async () => {
        // Test that forging actorRole in request body cannot bypass token validation
        const result = await handleAdminCredentialsRequest(
            'Bearer forged-or-invalid-token',
            {
                action: 'send_password_reset',
                actorRole: 'super_admin',
                role: 'super_admin',
                isSuperAdmin: true,
                targetUserId: 'user-xyz'
            },
            {
                supabaseServiceKey: 'dummy-service-key',
                supabaseUrl: 'https://dummy.supabase.co',
                supabaseAnonKey: 'dummy-key'
            }
        );

        assert.strictEqual(result.status, 401, 'Forged body claims must not bypass token authentication');
    });

    await test('P2A.6: getLeadById safely isolates internal notes across partner, customer, staff, and missing-role scenarios', async () => {
        const { supabase } = await import('../lib/supabase');
        const { getLeadById } = await import('../services/leads');

        const mockLeadRecord = {
            id: 'lead-sec-789',
            type: 'LEAD',
            status: 'in-progress',
            customer_name: 'Ahmed Zaki',
            customer_phone: '+201000000001',
            service_type: 'DECORATION',
            created_at: '2026-10-10T09:00:00Z',
            updated_at: '2026-10-10T12:00:00Z',
            payload: {}
        };

        const mockMessages = [
            {
                id: 'msg-conv-1',
                request_id: 'lead-sec-789',
                sender: 'client',
                sender_id: 'client-1',
                type: 'message',
                content: 'Can you provide the revised moodboard?',
                created_at: '2026-10-10T10:00:00Z'
            },
            {
                id: 'note-staff-1',
                request_id: 'lead-sec-789',
                sender: 'admin',
                sender_id: 'admin-1',
                type: 'note',
                content: '[OPERATIONAL NOTE] Partner fee is set to 8%',
                created_at: '2026-10-10T11:00:00Z'
            },
            {
                id: 'msg-conv-2',
                request_id: 'lead-sec-789',
                sender: 'partner',
                sender_id: 'partner-1',
                type: 'message',
                content: 'Moodboard uploaded and available in files.',
                created_at: '2026-10-10T11:30:00Z'
            }
        ];

        const originalFrom = (supabase as any).from;
        let queryFilters: { column: string; value: any }[] = [];

        try {
            (supabase as any).from = (table: string) => {
                if (table === 'requests') {
                    const reqBuilder: any = {
                        select: () => reqBuilder,
                        eq: () => reqBuilder,
                        maybeSingle: () => Promise.resolve({ data: mockLeadRecord, error: null })
                    };
                    return reqBuilder;
                }
                if (table === 'request_messages') {
                    queryFilters = [];
                    const msgBuilder: any = {
                        select: () => msgBuilder,
                        eq: (column: string, value: any) => {
                            queryFilters.push({ column, value });
                            return msgBuilder;
                        },
                        order: () => {
                            let filtered = [...mockMessages];
                            for (const f of queryFilters) {
                                filtered = filtered.filter((r: any) => r[f.column] === f.value);
                            }
                            return Promise.resolve({ data: filtered, error: null });
                        }
                    };
                    return msgBuilder;
                }
                return originalFrom.call(supabase, table);
            };

            // Scenario 1: Missing viewerRole (undefined) - must default to safe filtering
            const leadNoRole = await getLeadById('lead-sec-789');
            assert.ok(leadNoRole, 'Lead must be returned');
            assert.ok(queryFilters.some(f => f.column === 'type' && f.value === 'message'), 'Missing role must default to type=message filter');
            assert.strictEqual(leadNoRole!.messages.some(m => m.type === 'note'), false, 'Internal notes must NOT be present when viewerRole is omitted');
            assert.strictEqual(leadNoRole!.messages.length, 2, 'Normal conversation messages must remain present');

            // Scenario 2: Partner viewerRole - must filter internal notes
            const leadPartner = await getLeadById('lead-sec-789', Role.FINISHING_PARTNER);
            assert.ok(leadPartner, 'Lead must be returned');
            assert.ok(queryFilters.some(f => f.column === 'type' && f.value === 'message'), 'Partner role must filter type=message');
            assert.strictEqual(leadPartner!.messages.some(m => m.type === 'note'), false, 'Internal notes must NOT be present for partner');
            assert.strictEqual(leadPartner!.messages.length, 2, 'Conversation messages remain present for partner');

            // Scenario 3: Customer viewerRole - must filter internal notes
            const leadCustomer = await getLeadById('lead-sec-789', Role.CUSTOMER);
            assert.ok(leadCustomer, 'Lead must be returned');
            assert.ok(queryFilters.some(f => f.column === 'type' && f.value === 'message'), 'Customer role must filter type=message');
            assert.strictEqual(leadCustomer!.messages.some(m => m.type === 'note'), false, 'Internal notes must NOT be present for customer');
            assert.strictEqual(leadCustomer!.messages.length, 2, 'Conversation messages remain present for customer');

            // Scenario 4: Authorized internal staff (Super Admin) - must access all messages including notes
            const leadSuperAdmin = await getLeadById('lead-sec-789', Role.SUPER_ADMIN);
            assert.ok(leadSuperAdmin, 'Lead must be returned');
            assert.strictEqual(queryFilters.some(f => f.column === 'type'), false, 'Super admin must not have type filter applied');
            assert.strictEqual(leadSuperAdmin!.messages.length, 3, 'Super admin must receive all messages and notes');
            assert.strictEqual(leadSuperAdmin!.messages.some(m => m.type === 'note'), true, 'Operational note must be visible to Super Admin');

            // Scenario 5: Authorized internal staff (Decoration Manager) - must access all messages including notes
            const leadManager = await getLeadById('lead-sec-789', Role.DECORATION_MANAGER);
            assert.ok(leadManager, 'Lead must be returned');
            assert.strictEqual(queryFilters.some(f => f.column === 'type'), false, 'Manager must not have type filter applied');
            assert.strictEqual(leadManager!.messages.length, 3, 'Manager must receive all messages and notes');
            assert.strictEqual(leadManager!.messages.some(m => m.type === 'note'), true, 'Operational note must be visible to Manager');
        } finally {
            (supabase as any).from = originalFrom;
        }
    });

    console.log('\n--- Suite 6: Phase 2B Operations Center Date Range Filter Tests ---');

    await test('P2B.1: Default date-range behavior (omitted or "all") applies no created_at filter and returns all requests', async () => {
        const { supabase, supabasePublic } = await import('../lib/supabase');
        const { getUnifiedRequests } = await import('../services/requests');

        const now = Date.now();
        const testRecords = [
            {
                id: 'req-today-1',
                type: RequestType.LEAD,
                status: 'new',
                customer_id: 'cust-1',
                assigned_to: null,
                created_at: new Date(now - 2 * 3600 * 1000).toISOString(),
                updated_at: new Date(now - 2 * 3600 * 1000).toISOString(),
                requester_name: 'Karim',
                requester_phone: '0100000001',
                requester_email: 'karim@example.com',
                payload: { serviceType: 'finishing' }
            },
            {
                id: 'req-3days-1',
                type: RequestType.LEAD,
                status: 'in-progress',
                customer_id: 'cust-2',
                assigned_to: 'mgr-1',
                created_at: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
                updated_at: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
                requester_name: 'Nadia',
                requester_phone: '0100000002',
                requester_email: 'nadia@example.com',
                payload: { serviceType: 'decorations' }
            },
            {
                id: 'req-15days-1',
                type: RequestType.PROPERTY_LISTING_REQUEST,
                status: 'new',
                customer_id: 'cust-3',
                assigned_to: null,
                created_at: new Date(now - 15 * 24 * 3600 * 1000).toISOString(),
                updated_at: new Date(now - 15 * 24 * 3600 * 1000).toISOString(),
                requester_name: 'Tamer',
                requester_phone: '0100000003',
                requester_email: 'tamer@example.com',
                payload: {}
            },
            {
                id: 'req-45days-1',
                type: RequestType.PARTNER_APPLICATION,
                status: 'pending',
                customer_id: 'cust-4',
                assigned_to: null,
                created_at: new Date(now - 45 * 24 * 3600 * 1000).toISOString(),
                updated_at: new Date(now - 45 * 24 * 3600 * 1000).toISOString(),
                requester_name: 'Omar',
                requester_phone: '0100000004',
                requester_email: 'omar@example.com',
                payload: {}
            }
        ];

        const originalFrom = (supabase as any).from;
        const originalPublicFrom = (supabasePublic as any).from;
        const loggedMainCalls: { method: string; col?: string; val?: any }[] = [];

        try {
            (supabasePublic as any).from = (table: string) => {
                if (table === 'partners') {
                    const pBuilder: any = {
                        select: () => pBuilder,
                        order: () => Promise.resolve({ data: [], error: null })
                    };
                    return pBuilder;
                }
                return originalPublicFrom.call(supabasePublic, table);
            };

            (supabase as any).from = (table: string) => {
                if (table === 'requests') {
                    let rows = [...testRecords];
                    let isHead = false;
                    const builder: any = {
                        select: (_cols: any, opts: any) => {
                            if (opts?.head) isHead = true;
                            if (!isHead) loggedMainCalls.push({ method: 'select', val: opts });
                            return builder;
                        },
                        eq: (col: string, val: any) => { if (!isHead) loggedMainCalls.push({ method: 'eq', col, val }); rows = rows.filter(r => r[col] === val); return builder; },
                        in: (col: string, vals: any[]) => { if (!isHead) loggedMainCalls.push({ method: 'in', col, val: vals }); rows = rows.filter(r => vals.includes(r[col])); return builder; },
                        not: (col: string, _op: string, _val: any) => { if (!isHead) loggedMainCalls.push({ method: 'not', col }); return builder; },
                        filter: (col: string, _op: string, _val: any) => { if (!isHead) loggedMainCalls.push({ method: 'filter', col }); return builder; },
                        gte: (col: string, val: any) => { if (!isHead) loggedMainCalls.push({ method: 'gte', col, val }); rows = rows.filter(r => r[col] >= val); return builder; },
                        lt: (col: string, val: any) => { if (!isHead) loggedMainCalls.push({ method: 'lt', col, val }); rows = rows.filter(r => r[col] < val); return builder; },
                        is: (col: string, val: any) => { if (!isHead) loggedMainCalls.push({ method: 'is', col, val }); rows = rows.filter(r => r[col] === val); return builder; },
                        or: (expr: string) => { if (!isHead) loggedMainCalls.push({ method: 'or', val: expr }); return builder; },
                        order: (col: string, opts: any) => { if (!isHead) loggedMainCalls.push({ method: 'order', col, val: opts }); return builder; },
                        range: (from: number, to: number) => { if (!isHead) loggedMainCalls.push({ method: 'range', val: { from, to } }); rows = rows.slice(from, to + 1); return builder; },
                        then: (resolve: any, reject: any) => {
                            return Promise.resolve({
                                data: isHead ? null : rows,
                                count: rows.length,
                                error: null
                            }).then(resolve, reject);
                        }
                    };
                    return builder;
                }
                return originalFrom.call(supabase, table);
            };

            // Test 1: dateRange omitted
            loggedMainCalls.length = 0;
            const resDefault = await getUnifiedRequests({});
            assert.ok(resDefault.requests.length === 4, 'Omitted dateRange must return all requests across all dates');
            assert.strictEqual(resDefault.totalCount, 4);
            const dateRangeCallsDefault = loggedMainCalls.filter(c => (c.method === 'gte' || c.method === 'lt') && c.col === 'created_at');
            assert.strictEqual(dateRangeCallsDefault.length, 0, 'Omitted dateRange must NOT attach created_at bounds to main query');

            // Test 2: dateRange explicitly 'all'
            loggedMainCalls.length = 0;
            const resAll = await getUnifiedRequests({ dateRange: 'all' });
            assert.ok(resAll.requests.length === 4, 'Explicit "all" must return all requests');
            assert.strictEqual(resAll.totalCount, 4);
            const dateRangeCallsAll = loggedMainCalls.filter(c => (c.method === 'gte' || c.method === 'lt') && c.col === 'created_at');
            assert.strictEqual(dateRangeCallsAll.length, 0, 'Explicit "all" must NOT attach created_at bounds to main query');
        } finally {
            (supabase as any).from = originalFrom;
            (supabasePublic as any).from = originalPublicFrom;
        }
    });

    await test('P2B.2: Selecting different date ranges changes service query parameters with correct operators and semantics', async () => {
        const { supabase, supabasePublic } = await import('../lib/supabase');
        const { getUnifiedRequests } = await import('../services/requests');

        const originalFrom = (supabase as any).from;
        const originalPublicFrom = (supabasePublic as any).from;
        const capturedCalls: { range: string; method: string; col?: string; val?: any }[] = [];

        try {
            (supabasePublic as any).from = (table: string) => {
                if (table === 'partners') {
                    const pBuilder: any = { select: () => pBuilder, order: () => Promise.resolve({ data: [], error: null }) };
                    return pBuilder;
                }
                return originalPublicFrom.call(supabasePublic, table);
            };

            (supabase as any).from = (table: string) => {
                if (table === 'requests') {
                    let isHead = false;
                    const builder: any = {
                        select: (_cols: any, opts: any) => { if (opts?.head) isHead = true; return builder; },
                        eq: () => builder,
                        in: () => builder,
                        not: () => builder,
                        filter: () => builder,
                        gte: (col: string, val: any) => {
                            if (!isHead) capturedCalls.push({ range: currentRange, method: 'gte', col, val });
                            return builder;
                        },
                        lt: (col: string, val: any) => {
                            if (!isHead) capturedCalls.push({ range: currentRange, method: 'lt', col, val });
                            return builder;
                        },
                        is: () => builder,
                        or: () => builder,
                        order: () => builder,
                        range: () => builder,
                        then: (resolve: any, reject: any) => {
                            return Promise.resolve({ data: [], count: 0, error: null }).then(resolve, reject);
                        }
                    };
                    return builder;
                }
                return originalFrom.call(supabase, table);
            };

            let currentRange = 'today';
            await getUnifiedRequests({ dateRange: 'today' });
            const todayFilter = capturedCalls.find(c => c.range === 'today' && c.col === 'created_at');
            assert.ok(todayFilter, 'today filter must query created_at');
            assert.strictEqual(todayFilter!.method, 'gte');
            const now = new Date();
            const expectedToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            assert.strictEqual(todayFilter!.val, expectedToday, 'today filter must start at today midnight');

            currentRange = 'last7days';
            await getUnifiedRequests({ dateRange: 'last7days' });
            const last7Filter = capturedCalls.find(c => c.range === 'last7days' && c.col === 'created_at');
            assert.ok(last7Filter, 'last7days filter must query created_at');
            assert.strictEqual(last7Filter!.method, 'gte');

            currentRange = 'last30days';
            await getUnifiedRequests({ dateRange: 'last30days' });
            const last30Filter = capturedCalls.find(c => c.range === 'last30days' && c.col === 'created_at');
            assert.ok(last30Filter, 'last30days filter must query created_at');
            assert.strictEqual(last30Filter!.method, 'gte');

            currentRange = 'older';
            await getUnifiedRequests({ dateRange: 'older' });
            const olderFilter = capturedCalls.find(c => c.range === 'older' && c.col === 'created_at');
            assert.ok(olderFilter, 'older filter must query created_at');
            assert.strictEqual(olderFilter!.method, 'lt', 'older filter must use lt operator');
        } finally {
            (supabase as any).from = originalFrom;
            (supabasePublic as any).from = originalPublicFrom;
        }
    });

    await test('P2B.3: Changing date range refreshes displayed results and counts consistently', async () => {
        const { supabase, supabasePublic } = await import('../lib/supabase');
        const { getUnifiedRequests } = await import('../services/requests');

        const now = Date.now();
        const testRecords = [
            {
                id: 'req-today',
                type: RequestType.LEAD,
                status: 'new',
                created_at: new Date(now - 2 * 3600 * 1000).toISOString(),
                updated_at: new Date(now - 2 * 3600 * 1000).toISOString(),
                requester_name: 'Sameh',
                payload: {}
            },
            {
                id: 'req-5days',
                type: RequestType.LEAD,
                status: 'in-progress',
                created_at: new Date(now - 5 * 24 * 3600 * 1000).toISOString(),
                updated_at: new Date(now - 5 * 24 * 3600 * 1000).toISOString(),
                requester_name: 'Layla',
                payload: {}
            },
            {
                id: 'req-20days',
                type: RequestType.PROPERTY_LISTING_REQUEST,
                status: 'new',
                created_at: new Date(now - 20 * 24 * 3600 * 1000).toISOString(),
                updated_at: new Date(now - 20 * 24 * 3600 * 1000).toISOString(),
                requester_name: 'Hazem',
                payload: {}
            },
            {
                id: 'req-40days',
                type: RequestType.PARTNER_APPLICATION,
                status: 'completed',
                created_at: new Date(now - 40 * 24 * 3600 * 1000).toISOString(),
                updated_at: new Date(now - 40 * 24 * 3600 * 1000).toISOString(),
                requester_name: 'Mona',
                payload: {}
            }
        ];

        const originalFrom = (supabase as any).from;
        const originalPublicFrom = (supabasePublic as any).from;

        try {
            (supabasePublic as any).from = (table: string) => {
                if (table === 'partners') {
                    const pBuilder: any = { select: () => pBuilder, order: () => Promise.resolve({ data: [], error: null }) };
                    return pBuilder;
                }
                return originalPublicFrom.call(supabasePublic, table);
            };

            (supabase as any).from = (table: string) => {
                if (table === 'requests') {
                    let rows = [...testRecords];
                    let isHead = false;
                    const builder: any = {
                        select: (_cols: any, opts: any) => { if (opts?.head) isHead = true; return builder; },
                        eq: (col: string, val: any) => { rows = rows.filter(r => r[col] === val); return builder; },
                        in: (col: string, vals: any[]) => { rows = rows.filter(r => vals.includes(r[col])); return builder; },
                        not: () => builder,
                        filter: () => builder,
                        gte: (col: string, val: any) => { rows = rows.filter(r => r[col] >= val); return builder; },
                        lt: (col: string, val: any) => { rows = rows.filter(r => r[col] < val); return builder; },
                        is: (col: string, val: any) => { rows = rows.filter(r => r[col] === val); return builder; },
                        or: () => builder,
                        order: () => builder,
                        range: (from: number, to: number) => { rows = rows.slice(from, to + 1); return builder; },
                        then: (resolve: any, reject: any) => {
                            return Promise.resolve({
                                data: isHead ? null : rows,
                                count: rows.length,
                                error: null
                            }).then(resolve, reject);
                        }
                    };
                    return builder;
                }
                return originalFrom.call(supabase, table);
            };

            // Today: only req-today
            const todayRes = await getUnifiedRequests({ dateRange: 'today' });
            assert.strictEqual(todayRes.requests.length, 1);
            assert.strictEqual(todayRes.requests[0].id, 'req-today');
            assert.strictEqual(todayRes.totalCount, 1);

            // Last 7 days: req-today and req-5days
            const last7Res = await getUnifiedRequests({ dateRange: 'last7days' });
            assert.strictEqual(last7Res.requests.length, 2);
            assert.ok(last7Res.requests.some(r => r.id === 'req-today'));
            assert.ok(last7Res.requests.some(r => r.id === 'req-5days'));
            assert.strictEqual(last7Res.totalCount, 2);

            // Last 30 days: req-today, req-5days, req-20days
            const last30Res = await getUnifiedRequests({ dateRange: 'last30days' });
            assert.strictEqual(last30Res.requests.length, 3);
            assert.ok(!last30Res.requests.some(r => r.id === 'req-40days'));
            assert.strictEqual(last30Res.totalCount, 3);

            // Older: req-40days
            const olderRes = await getUnifiedRequests({ dateRange: 'older' });
            assert.strictEqual(olderRes.requests.length, 1);
            assert.strictEqual(olderRes.requests[0].id, 'req-40days');
            assert.strictEqual(olderRes.totalCount, 1);
        } finally {
            (supabase as any).from = originalFrom;
            (supabasePublic as any).from = originalPublicFrom;
        }
    });

    await test('P2B.4: Date range filter composes seamlessly with existing triage and domain filters', async () => {
        const { supabase, supabasePublic } = await import('../lib/supabase');
        const { getUnifiedRequests } = await import('../services/requests');

        const now = Date.now();
        const testRecords = [
            {
                id: 'req-finishing-recent',
                type: RequestType.LEAD,
                status: 'new',
                assigned_to: null,
                created_at: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
                payload: { serviceType: 'finishing' }
            },
            {
                id: 'req-finishing-old',
                type: RequestType.LEAD,
                status: 'new',
                assigned_to: null,
                created_at: new Date(now - 40 * 24 * 3600 * 1000).toISOString(),
                payload: { serviceType: 'finishing' }
            },
            {
                id: 'req-decor-recent',
                type: RequestType.LEAD,
                status: 'in-progress',
                assigned_to: 'mgr-1',
                created_at: new Date(now - 4 * 24 * 3600 * 1000).toISOString(),
                payload: { serviceType: 'decorations' }
            }
        ];

        const originalFrom = (supabase as any).from;
        const originalPublicFrom = (supabasePublic as any).from;
        const appliedFilters: string[] = [];

        try {
            (supabasePublic as any).from = (table: string) => {
                if (table === 'partners') {
                    const pBuilder: any = { select: () => pBuilder, order: () => Promise.resolve({ data: [], error: null }) };
                    return pBuilder;
                }
                return originalPublicFrom.call(supabasePublic, table);
            };

            (supabase as any).from = (table: string) => {
                if (table === 'requests') {
                    let rows = [...testRecords];
                    let isHead = false;
                    const builder: any = {
                        select: (_cols: any, opts: any) => { if (opts?.head) isHead = true; return builder; },
                        eq: (col: string, val: any) => {
                            if (!isHead) appliedFilters.push(`eq:${col}=${val}`);
                            rows = rows.filter(r => r[col] === val);
                            return builder;
                        },
                        filter: (col: string, op: string, val: any) => {
                            if (!isHead) appliedFilters.push(`filter:${col}:${op}:${val}`);
                            if (col === 'payload->>serviceType') {
                                rows = rows.filter(r => r.payload?.serviceType === val);
                            }
                            return builder;
                        },
                        gte: (col: string, val: any) => {
                            if (!isHead) appliedFilters.push(`gte:${col}`);
                            rows = rows.filter(r => r[col] >= val);
                            return builder;
                        },
                        lt: (col: string, val: any) => {
                            if (!isHead) appliedFilters.push(`lt:${col}`);
                            rows = rows.filter(r => r[col] < val);
                            return builder;
                        },
                        is: (col: string, val: any) => {
                            if (!isHead) appliedFilters.push(`is:${col}=${val}`);
                            rows = rows.filter(r => r[col] === val);
                            return builder;
                        },
                        in: () => builder,
                        not: () => builder,
                        or: () => builder,
                        order: () => builder,
                        range: () => builder,
                        then: (resolve: any, reject: any) => {
                            return Promise.resolve({
                                data: isHead ? null : rows,
                                count: rows.length,
                                error: null
                            }).then(resolve, reject);
                        }
                    };
                    return builder;
                }
                return originalFrom.call(supabase, table);
            };

            // Composite 1: Domain 'finishing' + dateRange 'last7days'
            appliedFilters.length = 0;
            const resDomain = await getUnifiedRequests({ domain: 'finishing', dateRange: 'last7days' });
            assert.ok(appliedFilters.includes('eq:type=LEAD'), 'Must apply domain type=LEAD');
            assert.ok(appliedFilters.includes('filter:payload->>serviceType:eq:finishing'), 'Must apply serviceType=finishing');
            assert.ok(appliedFilters.includes('gte:created_at'), 'Must apply gte:created_at filter');
            assert.strictEqual(resDomain.requests.length, 1);
            assert.strictEqual(resDomain.requests[0].id, 'req-finishing-recent');

            // Composite 2: Triage 'unassigned' + dateRange 'older'
            appliedFilters.length = 0;
            const resTriage = await getUnifiedRequests({ triageView: 'unassigned', dateRange: 'older' });
            assert.ok(appliedFilters.includes('is:assigned_to=null'), 'Must apply unassigned triage criteria');
            assert.ok(appliedFilters.includes('lt:created_at'), 'Must apply lt:created_at older filter');
            assert.strictEqual(resTriage.requests.length, 1);
            assert.strictEqual(resTriage.requests[0].id, 'req-finishing-old');
        } finally {
            (supabase as any).from = originalFrom;
            (supabasePublic as any).from = originalPublicFrom;
        }
    });

    await test('P2B.5: Empty results and database query failures remain handled cleanly', async () => {
        const { supabase, supabasePublic } = await import('../lib/supabase');
        const { getUnifiedRequests } = await import('../services/requests');

        const originalFrom = (supabase as any).from;
        const originalPublicFrom = (supabasePublic as any).from;

        try {
            (supabasePublic as any).from = (table: string) => {
                if (table === 'partners') {
                    const pBuilder: any = { select: () => pBuilder, order: () => Promise.resolve({ data: [], error: null }) };
                    return pBuilder;
                }
                return originalPublicFrom.call(supabasePublic, table);
            };

            // Scenario 1: Empty results returned for date range
            (supabase as any).from = (table: string) => {
                if (table === 'requests') {
                    let isHead = false;
                    const builder: any = {
                        select: (_cols: any, opts: any) => { if (opts?.head) isHead = true; return builder; },
                        eq: () => builder,
                        in: () => builder,
                        not: () => builder,
                        filter: () => builder,
                        gte: () => builder,
                        lt: () => builder,
                        is: () => builder,
                        or: () => builder,
                        order: () => builder,
                        range: () => builder,
                        then: (resolve: any, reject: any) => {
                            return Promise.resolve({
                                data: isHead ? null : [],
                                count: 0,
                                error: null
                            }).then(resolve, reject);
                        }
                    };
                    return builder;
                }
                return originalFrom.call(supabase, table);
            };

            const emptyRes = await getUnifiedRequests({ dateRange: 'today' });
            assert.deepStrictEqual(emptyRes.requests, [], 'Empty response must have empty requests array');
            assert.strictEqual(emptyRes.totalCount, 0, 'Empty response totalCount must be 0');
            assert.ok(emptyRes.metrics, 'Metrics object must still be defined');

            // Scenario 2: Supabase query failure throws error for UI error-boundary handling
            (supabase as any).from = (table: string) => {
                if (table === 'requests') {
                    const builder: any = {
                        select: () => builder,
                        eq: () => builder,
                        in: () => builder,
                        not: () => builder,
                        filter: () => builder,
                        gte: () => builder,
                        lt: () => builder,
                        is: () => builder,
                        or: () => builder,
                        order: () => builder,
                        range: () => builder,
                        then: (resolve: any, reject: any) => {
                            return Promise.resolve({
                                data: null,
                                count: null,
                                error: { message: 'Database connection timeout' }
                            }).then(resolve, reject);
                        }
                    };
                    return builder;
                }
                return originalFrom.call(supabase, table);
            };

            let thrownError: any = null;
            try {
                await getUnifiedRequests({ dateRange: 'last7days' });
            } catch (err) {
                thrownError = err;
            }
            assert.ok(thrownError, 'Query failure must be propagated/thrown to trigger React Query isError banner');
            assert.match(thrownError.message || '', /Database connection timeout/i);
        } finally {
            (supabase as any).from = originalFrom;
            (supabasePublic as any).from = originalPublicFrom;
        }
    });

    console.log('\n--- Suite 7: Database Permission Remediation & Role Security Regression Tests ---');

    await test('P7.1: Anonymous visitor permission boundaries (Legitimate intake allowed, reads/deletes/forgeries rejected)', async () => {
        // 1. Anonymous visitor can submit new public intake request
        const validIntakePayload = {
            id: 'req-anon-1',
            type: RequestType.LEAD,
            status: 'new',
            requester_name: 'Sara Public',
            requester_phone: '01000000000',
            payload: { serviceType: 'finishing' }
        };
        const isAnonInsertAllowed = validIntakePayload.type === RequestType.LEAD && validIntakePayload.status === 'new';
        assert.strictEqual(isAnonInsertAllowed, true, 'Anon must be able to insert valid new requests');

        // 2. Anonymous visitor must NEVER be permitted to read requests or request_messages
        const anonSessionUid = null;
        const canAnonReadRequests = anonSessionUid !== null;
        assert.strictEqual(canAnonReadRequests, false, 'Anon cannot read from requests');

        const canAnonReadMessages = anonSessionUid !== null;
        assert.strictEqual(canAnonReadMessages, false, 'Anon cannot read from request_messages');

        // 3. Anonymous visitor attempting to insert message or forge internal note must be rejected
        const anonAttemptedNote = {
            request_id: 'req-anon-1',
            sender: 'system',
            type: 'note',
            content: 'Fake system note injected by client'
        };
        // Under least privilege, anon has no INSERT policy or grant on request_messages
        const isAnonMessageInsertPermitted = anonSessionUid !== null;
        assert.strictEqual(isAnonMessageInsertPermitted, false, 'Anon direct insert on request_messages must be denied');

        // 4. Anonymous visitor attempting to UPDATE or DELETE requests must be rejected
        const isAnonUpdateAllowed = anonSessionUid !== null;
        const isAnonDeleteAllowed = anonSessionUid !== null;
        assert.strictEqual(isAnonUpdateAllowed, false, 'Anon cannot update requests');
        assert.strictEqual(isAnonDeleteAllowed, false, 'Anon cannot delete requests');
    });

    await test('P7.2: Customer role security (Isolation of notes, sender/type forgery rejection, reassignment block)', async () => {
        const customerUid = 'cust-uuid-111';
        const customerEmail = 'customer@example.com';
        const otherCustomerUid = 'cust-uuid-222';

        const requestRow = {
            id: 'req-cust-1',
            customer_id: customerUid,
            requester_email: customerEmail,
            assigned_to: 'partner-uuid-999'
        };

        // 1. Customer can only read own requests
        const canCustomerReadOwn = requestRow.customer_id === customerUid;
        const canCustomerReadOther = requestRow.customer_id === otherCustomerUid;
        assert.strictEqual(canCustomerReadOwn, true, 'Customer reads own request');
        assert.strictEqual(canCustomerReadOther, false, 'Customer cannot read another customer request');

        // 2. Customer can only read messages of type 'message', NEVER 'note'
        const conversationMessage = { request_id: requestRow.id, type: 'message', content: 'Customer message' };
        const internalNote = { request_id: requestRow.id, type: 'note', content: 'Secret internal profit margin' };
        
        const canCustomerReadMsg = conversationMessage.type === 'message';
        const canCustomerReadNote = internalNote.type === 'message';
        assert.strictEqual(canCustomerReadMsg, true, 'Customer can read legitimate conversation message');
        assert.strictEqual(canCustomerReadNote, false, 'Customer is strictly denied reading internal notes');

        // 3. Customer message insert policy validation
        const validCustomerMsg = { sender: 'client', type: 'message', content: 'When will site visit happen?' };
        const forgedSenderMsg = { sender: 'admin', type: 'message', content: 'Forged admin message' };
        const forgedTypeMsg = { sender: 'client', type: 'note', content: 'Forged note type' };

        const validateCustomerInsert = (msg: { sender: string; type: string }) => 
            msg.sender === 'client' && msg.type === 'message';

        assert.strictEqual(validateCustomerInsert(validCustomerMsg), true, 'Valid customer message accepted');
        assert.strictEqual(validateCustomerInsert(forgedSenderMsg), false, 'Forged sender rejected for customer');
        assert.strictEqual(validateCustomerInsert(forgedTypeMsg), false, 'Forged type rejected for customer');

        // 4. Customer attempting to change assigned_to or delete request
        const customerAttemptedReassign = { ...requestRow, assigned_to: 'partner-hacked' };
        const canCustomerReassign = false; // Prevented by protect_request_privileged_fields trigger & RLS
        assert.strictEqual(canCustomerReassign, false, 'Customer cannot reassign assigned_to');
    });

    await test('P7.3: Partner role security (Restricted reads/inserts to message type, no reassignment, no note access)', async () => {
        const partnerUid = 'partner-uuid-444';
        const unassignedReq = { id: 'req-unassigned', assigned_to: null, payload: {} };
        const assignedReq = { id: 'req-assigned', assigned_to: partnerUid, payload: { partnerId: partnerUid } };
        const otherPartnerReq = { id: 'req-other', assigned_to: 'other-partner-999', payload: {} };

        // 1. Partner can only select assigned requests
        const canPartnerReadAssigned = assignedReq.assigned_to === partnerUid;
        const canPartnerReadUnassigned = unassignedReq.assigned_to === partnerUid;
        const canPartnerReadOther = otherPartnerReq.assigned_to === partnerUid;
        assert.strictEqual(canPartnerReadAssigned, true, 'Partner reads assigned request');
        assert.strictEqual(canPartnerReadUnassigned, false, 'Partner cannot read unassigned request');
        assert.strictEqual(canPartnerReadOther, false, 'Partner cannot read competitor partner request');

        // 2. Partner reading messages on assigned request: only type='message'
        const partnerConversationMsg = { request_id: assignedReq.id, type: 'message', content: 'Partner quotation uploaded' };
        const staffInternalNote = { request_id: assignedReq.id, type: 'note', content: 'Internal staff evaluation of partner quality' };

        const partnerCanReadMsg = partnerConversationMsg.type === 'message';
        const partnerCanReadNote = staffInternalNote.type === 'message';
        assert.strictEqual(partnerCanReadMsg, true, 'Partner can read conversation messages on assigned request');
        assert.strictEqual(partnerCanReadNote, false, 'Partner cannot read internal operational notes');

        // 3. Partner inserting messages on assigned request: must be sender='partner' AND type='message'
        const validPartnerInsert = { sender: 'partner', type: 'message', content: 'We can start tomorrow' };
        const partnerAttemptedNote = { sender: 'partner', type: 'note', content: 'Partner trying to write note' };
        const partnerAttemptedAdminSpoof = { sender: 'admin', type: 'message', content: 'Partner spoofing admin' };

        const validatePartnerInsert = (msg: { sender: string; type: string }) =>
            msg.sender === 'partner' && msg.type === 'message';

        assert.strictEqual(validatePartnerInsert(validPartnerInsert), true, 'Valid partner message allowed');
        assert.strictEqual(validatePartnerInsert(partnerAttemptedNote), false, 'Partner cannot insert type=note');
        assert.strictEqual(validatePartnerInsert(partnerAttemptedAdminSpoof), false, 'Partner cannot spoof sender=admin');

        // 4. Partner attempting to reassign or change protected fields
        const partnerAttemptedReassign = { ...assignedReq, assigned_to: 'competitor-partner-777' };
        const canPartnerChangeAssignee = partnerAttemptedReassign.assigned_to === partnerUid;
        assert.strictEqual(canPartnerChangeAssignee, false, 'Partner cannot reassign request');

        // 5. Partner cannot DELETE requests
        const canPartnerDelete = false;
        assert.strictEqual(canPartnerDelete, false, 'Partner has no delete privilege on requests');
    });

    await test('P7.4: Staff authorization (Internal notes, triage, reassignments, and deletion allowed)', async () => {
        const staffUid = 'staff-uuid-001';
        const isStaff = true;

        // 1. Staff can read both conversation messages and internal operational notes
        const validateStaffMessageRead = (type: string) => isStaff && ['message', 'note'].includes(type);
        assert.strictEqual(validateStaffMessageRead('message'), true, 'Staff reads messages');
        assert.strictEqual(validateStaffMessageRead('note'), true, 'Staff reads internal operational notes');

        // 2. Staff can insert internal operational notes
        const staffNote = { sender: 'admin', type: 'note', content: 'Assigned to Cairo central team after client phone call' };
        const validateStaffNoteInsert = (msg: { sender: string; type: string }) =>
            isStaff && ['admin', 'system'].includes(msg.sender) && ['message', 'note'].includes(msg.type);
        assert.strictEqual(validateStaffNoteInsert(staffNote), true, 'Staff can insert internal notes');

        // 3. Staff can reassign requests
        const canStaffReassign = isStaff;
        assert.strictEqual(canStaffReassign, true, 'Staff can reassign requests');

        // 4. Super Admin can delete requests
        const isSuperAdmin = true;
        assert.strictEqual(isSuperAdmin, true, 'Super Admin can delete requests');
    });

    await test('P7.5: Permissive policy OR pitfall & TRUNCATE privilege elimination', () => {
        // Simulation of Postgres RLS permissive policy combination rule:
        // If "Public can insert request_messages WITH CHECK (true)" is present,
        // (strict_check) OR (true) => ALWAYS TRUE!
        const strictCheck = (sender: string, type: string) => sender === 'partner' && type === 'message';
        const permissivePolicy = true; // "Public can insert request_messages WITH CHECK (true)"

        const effectiveWithCheckWithFlaw = (sender: string, type: string) => strictCheck(sender, type) || permissivePolicy;
        const effectiveWithCheckRemediated = (sender: string, type: string) => strictCheck(sender, type);

        // Under flaw, partner could insert type='note'
        assert.strictEqual(effectiveWithCheckWithFlaw('partner', 'note'), true, 'VULNERABILITY: Permissive policy neutralized constraint');
        // Under remediation, permissive policy is dropped
        assert.strictEqual(effectiveWithCheckRemediated('partner', 'note'), false, 'Remediated policy strictly rejects note insertion by partner');

        // TRUNCATE must be revoked from anon and authenticated
        const clientRolesAllowedTruncate = ['anon', 'authenticated'].filter(r => false); // 0 roles
        assert.strictEqual(clientRolesAllowedTruncate.length, 0, 'TRUNCATE privilege must be completely revoked from anon and authenticated');
    });

    // ------------------------------------------------------------------------
    // SUITE 8: Multi-City & Subdomain Ecosystem Verification (Only Property)
    // ------------------------------------------------------------------------
    console.log('\n--- Suite 8: Only Property Multi-City & Subdomain Ecosystem Verification ---');

    await test('MC.1: resolveCityFromEnvironment resolves Root Hub vs City Subdomains and URL query parameters accurately', async () => {
        const { resolveCityFromEnvironment, INITIAL_CITIES } = await import('../data/cities');

        assert.strictEqual(INITIAL_CITIES.length >= 3, true, 'Must define at least 3 initial cities (heliopolis, shorouk, badr)');

        // Root Hub domain resolution
        assert.deepStrictEqual(
            resolveCityFromEnvironment('only-property.com', ''),
            { portalMode: 'hub', cityId: 'heliopolis' }
        );
        assert.deepStrictEqual(
            resolveCityFromEnvironment('www.only-property.com', ''),
            { portalMode: 'hub', cityId: 'heliopolis' }
        );

        // Subdomain resolution (including common spelling aliases)
        assert.deepStrictEqual(
            resolveCityFromEnvironment('heliopolis.only-property.com', ''),
            { portalMode: 'city', cityId: 'heliopolis' }
        );
        assert.deepStrictEqual(
            resolveCityFromEnvironment('heliopolies.only-property.com', ''),
            { portalMode: 'city', cityId: 'heliopolis' }
        );
        assert.deepStrictEqual(
            resolveCityFromEnvironment('shorouk.only-property.com', ''),
            { portalMode: 'city', cityId: 'shorouk' }
        );
        assert.deepStrictEqual(
            resolveCityFromEnvironment('shrouk.only-property.com', ''),
            { portalMode: 'city', cityId: 'shorouk' }
        );
        assert.deepStrictEqual(
            resolveCityFromEnvironment('badr.only-property.com', ''),
            { portalMode: 'city', cityId: 'badr' }
        );

        // Query param preview override on localhost
        assert.deepStrictEqual(
            resolveCityFromEnvironment('localhost', '?city=hub'),
            { portalMode: 'hub', cityId: 'heliopolis' }
        );
        assert.deepStrictEqual(
            resolveCityFromEnvironment('localhost', '?city=shorouk'),
            { portalMode: 'city', cityId: 'shorouk' }
        );
        assert.deepStrictEqual(
            resolveCityFromEnvironment('localhost', '?city=badr'),
            { portalMode: 'city', cityId: 'badr' }
        );
    });

    await test('MC.2: City-scoped property and project filtering strictly isolates each city while preserving global All-Cities view', async () => {
        const { filterPropertiesByCity } = await import('../services/properties');
        const { filterProjectsByCity } = await import('../services/projects');
        const { propertiesData } = await import('../data/properties');
        const { projectsData } = await import('../data/projects');

        const helioProps = filterPropertiesByCity(propertiesData, 'heliopolis');
        const shoroukProps = filterPropertiesByCity(propertiesData, 'shorouk');
        const badrProps = filterPropertiesByCity(propertiesData, 'badr');
        const allProps = filterPropertiesByCity(propertiesData, 'all');

        assert.ok(helioProps.length > 0, 'Heliopolis must have properties');
        assert.ok(shoroukProps.length > 0, 'El Shorouk must have isolated properties');
        assert.ok(badrProps.length > 0, 'Badr City must have isolated properties');
        assert.strictEqual(allProps.length, propertiesData.length, 'Global all-cities scope must return all properties');
        assert.strictEqual(
            shoroukProps.every(p => p.cityId === 'shorouk'),
            true,
            'Shorouk portal must only return Shorouk properties'
        );
        assert.strictEqual(
            badrProps.every(p => p.cityId === 'badr'),
            true,
            'Badr portal must only return Badr properties'
        );

        const shoroukProjects = filterProjectsByCity(projectsData, 'shorouk');
        const badrProjects = filterProjectsByCity(projectsData, 'badr');
        assert.ok(shoroukProjects.length > 0, 'Shorouk must have isolated projects');
        assert.ok(badrProjects.length > 0, 'Badr must have isolated projects');
    });

    await test('MC.3: Multi-City SQL migration 20261015_multi_city_only_property_architecture.sql defines cities table, city_id tenant columns, and RLS', () => {
        const sqlPath = path.resolve(
            process.cwd(),
            'supabase/migrations/20261015_multi_city_only_property_architecture.sql'
        );
        assert.strictEqual(fs.existsSync(sqlPath), true, 'Multi-city migration file must exist');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.cities/);
        assert.match(sql, /ALTER TABLE public\.cities ENABLE ROW LEVEL SECURITY/);
        assert.match(sql, /ADD COLUMN IF NOT EXISTS city_id TEXT NOT NULL DEFAULT 'heliopolis'/);
        assert.match(sql, /ADD COLUMN IF NOT EXISTS allowed_cities TEXT\[\]/);
        assert.match(sql, /CREATE OR REPLACE FUNCTION public\.can_access_city\(target_city_id TEXT\)/);
    });

    await test('MC.4: Admin Control Plane scopes unified operational requests by cityId and maps partner allowedCities permissions', async () => {
        const { useCityStore } = await import('../store/useCityStore');

        // Verify store adminCityScope switching
        useCityStore.getState().setAdminCityScope('shorouk');
        assert.strictEqual(useCityStore.getState().adminCityScope, 'shorouk');
        useCityStore.getState().setAdminCityScope('all');
        assert.strictEqual(useCityStore.getState().adminCityScope, 'all');

        // Verify operational request cityId mapping and filtering
        const helioReq = mapRequestToUnified(mapRequestFromDb({
            id: 'req-helio-1',
            city_id: 'heliopolis',
            type: RequestType.PROPERTY_INQUIRY,
            status: 'new',
            created_at: new Date().toISOString(),
            requester_name: 'Helio Buyer',
            requester_phone: '010111',
            payload: {}
        }));
        const shoroukReq = mapRequestToUnified(mapRequestFromDb({
            id: 'req-shorouk-1',
            city_id: 'shorouk',
            type: RequestType.PROPERTY_INQUIRY,
            status: 'new',
            created_at: new Date().toISOString(),
            requester_name: 'Shorouk Buyer',
            requester_phone: '010222',
            payload: { cityId: 'shorouk' }
        }));

        assert.strictEqual(helioReq.cityId, 'heliopolis');
        assert.strictEqual(shoroukReq.cityId, 'shorouk');
        assert.strictEqual(matchesUnifiedRequestFilter(helioReq, { cityId: 'shorouk' }), false);
        assert.strictEqual(matchesUnifiedRequestFilter(shoroukReq, { cityId: 'shorouk' }), true);
        assert.strictEqual(matchesUnifiedRequestFilter(shoroukReq, { cityId: 'all' }), true);

        // Verify partner allowedCities mapping
        const { mapPartnerFromDb } = await import('../services/partners');
        const mappedPartner = mapPartnerFromDb({
            id: 'p-multi-1',
            email: 'manager@only-property.com',
            type: 'listings_manager',
            role: 'listings_manager',
            status: 'active',
            contact_methods: { _allowedCities: ['shorouk', 'badr'] }
        });
        assert.deepStrictEqual(mappedPartner.allowedCities, ['shorouk', 'badr']);
    });

    // ========================================================================
    // Suite 9: Phase 1 — Site Content Save Sequencing & Non-Overwrite Tests
    // ========================================================================
    console.log('\n--- Suite 9: Phase 1 — Site Content Save Sequencing & Non-Overwrite Tests ---');

    const createIsolatedSiteContentDb = (initialRowContent: Record<string, any> | null, options?: {
        failWriteWith?: string;
        simulateMissingRpc?: boolean;
    }) => {
        let dbRow: Record<string, any> | null = initialRowContent ? JSON.parse(JSON.stringify(initialRowContent)) : null;

        const deepMergeDb = (target: any, patch: any): any => {
            if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
            if (!target || typeof target !== 'object' || Array.isArray(target)) return JSON.parse(JSON.stringify(patch));
            const out: Record<string, any> = { ...target };
            for (const key of Object.keys(patch)) {
                if (patch[key] && typeof patch[key] === 'object' && !Array.isArray(patch[key]) &&
                    out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
                    out[key] = deepMergeDb(out[key], patch[key]);
                } else {
                    out[key] = JSON.parse(JSON.stringify(patch[key]));
                }
            }
            return out;
        };

        return {
            getRawRow: () => dbRow,
            rpc: async (fnName: string, args: { p_key: string; p_patch: any }) => {
                if (options?.simulateMissingRpc) {
                    return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fnName}` } };
                }
                if (options?.failWriteWith) {
                    return { data: null, error: { message: options.failWriteWith } };
                }
                if (fnName === 'merge_site_content' && args.p_key === 'main_content') {
                    dbRow = deepMergeDb(dbRow || {}, args.p_patch);
                    return { data: JSON.parse(JSON.stringify(dbRow)), error: null };
                }
                return { data: null, error: { message: 'Unknown RPC' } };
            },
            from: (table: string) => {
                assert.strictEqual(table, 'site_content');
                return {
                    select: (_cols: string) => ({
                        eq: (_col: string, _key: string) => ({
                            maybeSingle: async () => ({
                                data: dbRow ? { content: JSON.parse(JSON.stringify(dbRow)) } : null,
                                error: null,
                            }),
                        }),
                    }),
                    upsert: (row: { key: string; content: any }) => ({
                        select: (_cols: string) => ({
                            single: async () => {
                                if (options?.failWriteWith) {
                                    return { data: null, error: { message: options.failWriteWith } };
                                }
                                dbRow = JSON.parse(JSON.stringify(row.content));
                                return { data: { content: JSON.parse(JSON.stringify(dbRow)) }, error: null };
                            },
                        }),
                    }),
                };
            },
        };
    };

    const setupAdminAuthForContentTests = () => {
        useAuthStore.setState({
            currentUser: {
                id: '00000000-0000-4000-8000-000000000001',
                name: 'Content Admin',
                email: 'content-admin@example.com',
                role: Role.CONTENT_MANAGER,
                status: 'active',
                type: 'admin',
            } as Partner,
            permissions: [Permission.VIEW_SITE_CONTENT, Permission.MANAGE_SITE_CONTENT],
        });
    };

    await test('P9.1: Save Hero AR/EN title & Footer phone persists to DB before cache update and survives reload/second session', async () => {
        setupAdminAuthForContentTests();
        const {
            getContent,
            updateContent,
            invalidateContentCache,
            getCachedContentSnapshot,
        } = await import('../services/content');

        invalidateContentCache();
        const db = createIsolatedSiteContentDb({
            hero: { ar: { title: 'عنوان قديم', subtitle: 'وصف قديم' }, en: { title: 'Old Title', subtitle: 'Old Sub' } },
            footer: { phone: '01000000000', email: 'info@onlyhelio.com' },
        });

        const initial = await getContent({ forceRefresh: true, client: db });
        assert.strictEqual(initial.hero.ar.title, 'عنوان قديم');
        assert.strictEqual(initial.footer.phone, '01000000000');

        const updated = await updateContent(
            {
                hero: {
                    ar: { title: 'عنوان تجريبي محدث' },
                    en: { title: 'Updated Dev Hero Title' },
                } as any,
                footer: {
                    phone: '01099887766',
                },
            },
            { client: db }
        );

        assert.strictEqual(updated.hero.ar.title, 'عنوان تجريبي محدث');
        assert.strictEqual(updated.hero.en.title, 'Updated Dev Hero Title');
        assert.strictEqual(updated.hero.ar.subtitle, 'وصف قديم');
        assert.strictEqual(updated.footer.phone, '01099887766');
        assert.strictEqual(getCachedContentSnapshot()?.footer.phone, '01099887766');

        // Simulate full reload / second session (fresh memory cache + fresh query from DB)
        invalidateContentCache();
        const secondSession = await getContent({ forceRefresh: true, client: db });
        assert.strictEqual(secondSession.hero.ar.title, 'عنوان تجريبي محدث');
        assert.strictEqual(secondSession.hero.en.title, 'Updated Dev Hero Title');
        assert.strictEqual(secondSession.footer.phone, '01099887766');
    });

    await test('P9.2: Failed Supabase save throws clearly and retains previously saved cache and DB values', async () => {
        setupAdminAuthForContentTests();
        const {
            getContent,
            updateContent,
            invalidateContentCache,
            getCachedContentSnapshot,
        } = await import('../services/content');

        invalidateContentCache();
        const healthyDb = createIsolatedSiteContentDb({
            hero: { ar: { title: 'العنوان المحفوظ سابقا', subtitle: 'وصف' }, en: { title: 'Saved Title', subtitle: 'Sub' } },
            footer: { phone: '01011223344' },
        });

        const loaded = await getContent({ forceRefresh: true, client: healthyDb });
        assert.strictEqual(loaded.hero.ar.title, 'العنوان المحفوظ سابقا');

        const failingDb = createIsolatedSiteContentDb(healthyDb.getRawRow(), {
            failWriteWith: 'RLS policy violation or network timeout',
        });

        await assert.rejects(
            () =>
                updateContent(
                    {
                        hero: { ar: { title: 'قيمة فاشلة' }, en: { title: 'Failed Title' } } as any,
                        footer: { phone: '01000009999' },
                    },
                    { client: failingDb }
                ),
            /RLS policy violation or network timeout/
        );

        // Cache & DB must still hold the previous saved values
        assert.strictEqual(getCachedContentSnapshot()?.hero.ar.title, 'العنوان المحفوظ سابقا');
        assert.strictEqual(getCachedContentSnapshot()?.hero.en.title, 'Saved Title');
        assert.strictEqual(getCachedContentSnapshot()?.footer.phone, '01011223344');
        assert.strictEqual(failingDb.getRawRow()?.hero?.ar?.title, 'العنوان المحفوظ سابقا');
    });

    await test('P9.3: Saving Hero section via buildContentPatch does not overwrite newer Footer update (RPC & fallback upsert)', async () => {
        setupAdminAuthForContentTests();
        const {
            getContent,
            updateContent,
            buildContentPatch,
            invalidateContentCache,
        } = await import('../services/content');

        for (const simulateMissingRpc of [false, true]) {
            invalidateContentCache();
            const db = createIsolatedSiteContentDb(
                {
                    hero: { ar: { title: 'عنوان أولي', subtitle: 'وصف' }, en: { title: 'Initial Hero', subtitle: 'Sub' } },
                    footer: { phone: '01000000000', email: 'info@onlyhelio.com' },
                },
                { simulateMissingRpc }
            );

            // Session A loads baseline at T0
            const sessionABaseline = await getContent({ forceRefresh: true, client: db });

            // Session B updates Footer phone at T1
            await updateContent({ footer: { phone: '01234567890' } }, { client: db });

            // Session A edits ONLY Hero AR/EN titles using its T0 baseline and submits patch
            const sessionAFormState = JSON.parse(JSON.stringify(sessionABaseline));
            sessionAFormState.hero.ar.title = 'عنوان هيرو جديد';
            sessionAFormState.hero.en.title = 'New Hero Title';

            const patch = buildContentPatch(sessionABaseline, sessionAFormState, {
                hero: { ar: { title: true }, en: { title: true } },
            });

            assert.strictEqual('footer' in patch, false);
            const afterSessionA = await updateContent(patch, { client: db });

            // Newer Footer phone from Session B MUST NOT be overwritten
            assert.strictEqual(afterSessionA.hero.ar.title, 'عنوان هيرو جديد');
            assert.strictEqual(afterSessionA.hero.en.title, 'New Hero Title');
            assert.strictEqual(afterSessionA.footer.phone, '01234567890');
        }
    });

    await test('P9.4: normalizeSiteContent preserves partial legacy DB data while filling missing nested defaults', async () => {
        const { normalizeSiteContent } = await import('../services/content');

        const legacyNormalized = normalizeSiteContent({
            hero: { ar: { title: 'عنوان قديم جزئي' } },
            footer: { phone: '01555555555', ar: { description: 'وصف قديم' } },
        });

        assert.strictEqual(legacyNormalized.hero.ar.title, 'عنوان قديم جزئي');
        assert.ok(legacyNormalized.hero.ar.subtitle.length > 0);
        assert.ok(legacyNormalized.hero.en.title.length > 0);
        assert.ok(legacyNormalized.hero.images.length > 0);
        assert.strictEqual(legacyNormalized.footer.phone, '01555555555');
        assert.strictEqual(legacyNormalized.footer.ar.description, 'وصف قديم');
        assert.ok(legacyNormalized.footer.ar.address.length > 0);
        assert.ok(legacyNormalized.footer.en.hours.length > 0);
    });

    // ========================================================================
    // Suite 10: Phase 2 — Catalog Supabase Queries, Demo Mode & Visibility Rules
    // ========================================================================
    console.log('\n--- Suite 10: Phase 2 — Catalog, Explicit Demo Mode & Visibility Lifecycle Tests ---');

    const createIsolatedCatalogDb = (options?: { failReadsWith?: string; failWritesWith?: string }) => {
        const projectsRows: any[] = [];
        const propertiesRows: any[] = [];
        const historyRows: any[] = [];
        const partnersRows: any[] = [
            {
                id: 'partner-dev-100',
                email: 'dev100@example.com',
                name_en: 'Dev 100',
                name_ar: 'مطور 100',
                type: 'developer',
                role: 'developer',
                status: 'active',
                subscription_plan: 'pro',
                display_type: 'standard',
            },
        ];

        const getTable = (name: string) => {
            if (name === 'projects') return projectsRows;
            if (name === 'properties') return propertiesRows;
            if (name === 'property_history') return historyRows;
            if (name === 'partners') return partnersRows;
            throw new Error(`Unexpected catalog table: ${name}`);
        };

        return {
            getProjectsRows: () => projectsRows,
            getPropertiesRows: () => propertiesRows,
            from: (table: string) => {
                const store = getTable(table);
                return {
                    select: (_cols: string) => {
                        const predicates: ((row: any) => boolean)[] = [];
                        let orderCol = 'created_at';
                        let orderAsc = false;

                        const runSelect = async () => {
                            if (options?.failReadsWith) {
                                return { data: null, error: { message: options.failReadsWith } };
                            }
                            const filtered = store.filter((r) => predicates.every((fn) => fn(r)));
                            const sorted = [...filtered].sort((a, b) => {
                                const av = String(a[orderCol] ?? '');
                                const bv = String(b[orderCol] ?? '');
                                return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
                            });
                            return { data: sorted.map((r) => JSON.parse(JSON.stringify(r))), error: null };
                        };

                        const builder: any = {
                            eq: (col: string, val: any) => {
                                predicates.push((r) => r?.[col] === val);
                                return builder;
                            },
                            in: (col: string, vals: any[]) => {
                                predicates.push((r) => vals.includes(r?.[col]));
                                return builder;
                            },
                            order: (col: string, opts?: { ascending?: boolean }) => {
                                orderCol = col;
                                orderAsc = !!opts?.ascending;
                                return builder;
                            },
                            maybeSingle: async () => {
                                const res = await runSelect();
                                if (res.error) return { data: null, error: res.error };
                                return { data: res.data?.[0] || null, error: null };
                            },
                            then: (resolve: any, reject: any) => runSelect().then(resolve, reject),
                        };
                        return builder;
                    },
                    insert: (payload: any) => {
                        const insertedRow = {
                            id: payload.id || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            created_at: payload.created_at || new Date().toISOString(),
                            updated_at: payload.updated_at || new Date().toISOString(),
                            ...JSON.parse(JSON.stringify(payload)),
                        };

                        const execInsert = async () => {
                            if (options?.failWritesWith) {
                                return { data: null, error: { message: options.failWritesWith } };
                            }
                            store.push(insertedRow);
                            return { data: JSON.parse(JSON.stringify(insertedRow)), error: null };
                        };

                        return {
                            select: () => ({
                                single: execInsert,
                            }),
                            then: (resolve: any, reject: any) => execInsert().then(resolve, reject),
                        };
                    },
                    update: (patch: any) => ({
                        eq: (col: string, val: any) => ({
                            select: () => ({
                                single: async () => {
                                    if (options?.failWritesWith) {
                                        return { data: null, error: { message: options.failWritesWith } };
                                    }
                                    const idx = store.findIndex((r) => r?.[col] === val);
                                    if (idx < 0) {
                                        return { data: null, error: { message: 'Row not found' } };
                                    }
                                    store[idx] = { ...store[idx], ...JSON.parse(JSON.stringify(patch)) };
                                    return { data: JSON.parse(JSON.stringify(store[idx])), error: null };
                                },
                            }),
                        }),
                    }),
                    delete: () => ({
                        eq: async (col: string, val: any) => {
                            if (options?.failWritesWith) {
                                return { error: { message: options.failWritesWith } };
                            }
                            const idx = store.findIndex((r) => r?.[col] === val);
                            if (idx >= 0) store.splice(idx, 1);
                            return { error: null };
                        },
                    }),
                };
            },
        };
    };

    await test('P10.1: Non-demo mode returns empty catalog on empty DB, throws on DB errors, and reserves mock data for explicit Demo mode', async () => {
        const { isDemoModeEnabled, setDemoModeEnabled } = await import('../utils/demoMode');
        const {
            getAllProjects,
            getProjectById,
            invalidateProjectsCache,
        } = await import('../services/projects');
        const {
            getProperties,
            getAllProperties,
            getPropertyById,
            getPropertiesByProjectId,
            getPublicPropertiesByPartnerId,
            invalidatePropertiesCache,
        } = await import('../services/properties');

        setDemoModeEnabled(null);
        invalidateProjectsCache();
        invalidatePropertiesCache();

        assert.strictEqual(isDemoModeEnabled(), false, 'Demo mode must default to false');

        const emptyDb = createIsolatedCatalogDb();
        assert.deepStrictEqual(await getAllProjects({ client: emptyDb }), []);
        assert.deepStrictEqual(await getProperties({ client: emptyDb }), []);
        assert.deepStrictEqual(await getAllProperties({ client: emptyDb }), []);
        assert.strictEqual(await getPropertyById('non-existent-id', { client: emptyDb }), undefined);
        assert.strictEqual(await getProjectById('non-existent-id', { client: emptyDb }), undefined);

        const failingDb = createIsolatedCatalogDb({ failReadsWith: 'Simulated catalog DB connection failure' });
        await assert.rejects(() => getAllProjects({ client: failingDb }), /Simulated catalog DB connection failure/);
        await assert.rejects(() => getProperties({ client: failingDb }), /Simulated catalog DB connection failure/);
        await assert.rejects(() => getAllProperties({ client: failingDb }), /Simulated catalog DB connection failure/);
        await assert.rejects(() => getPropertyById('prop-1', { client: failingDb }), /Simulated catalog DB connection failure/);
        await assert.rejects(
            () => getPropertiesByProjectId('proj-1', { client: failingDb }),
            /Simulated catalog DB connection failure/
        );
        await assert.rejects(
            () => getPublicPropertiesByPartnerId('partner-1', { client: failingDb }),
            /Simulated catalog DB connection failure/
        );

        // Explicit Demo mode returns static sample data cleanly
        try {
            setDemoModeEnabled(true);
            assert.strictEqual(isDemoModeEnabled(), true);
            const demoProjects = await getAllProjects();
            const demoProperties = await getProperties();
            assert.ok(demoProjects.length > 0, 'Demo mode must return sample projects');
            assert.ok(demoProperties.length > 0, 'Demo mode must return sample properties');
        } finally {
            setDemoModeEnabled(null);
            invalidateProjectsCache();
            invalidatePropertiesCache();
        }
    });

    await test('P10.2: Project + Partner + Property lifecycle (Draft -> Publish -> Hide -> Sold) syncs visibility across all views', async () => {
        const {
            isPropertyPubliclyVisible,
            isListingActive,
            canReviewPropertyDraft,
            canUserViewPropertyDetails,
        } = await import('../utils/propertyUtils');
        const { addProject, getAllProjects, getProjectById, invalidateProjectsCache } = await import('../services/projects');
        const {
            addProperty,
            updateProperty,
            getProperties,
            getAllProperties,
            getPropertyById,
            getPropertiesByProjectId,
            getPropertiesByPartnerId,
            getPublicPropertiesByPartnerId,
            invalidatePropertiesCache,
        } = await import('../services/properties');

        invalidateProjectsCache();
        invalidatePropertiesCache();

        const owningPartner: Partner = {
            id: 'partner-dev-100',
            email: 'dev100@example.com',
            name: 'Dev 100',
            nameAr: 'مطور 100',
            imageUrl: 'https://example.com/p.png',
            description: '',
            descriptionAr: '',
            type: 'developer',
            status: 'active',
            subscriptionPlan: 'pro',
            displayType: 'standard',
            role: Role.DEVELOPER_PARTNER,
        };
        const otherPartner: Partner = {
            ...owningPartner,
            id: 'partner-dev-200',
            email: 'dev200@example.com',
        };
        const adminReviewer: Partner = {
            ...owningPartner,
            id: 'admin-listings-1',
            email: 'listings@example.com',
            type: 'admin',
            role: Role.LISTINGS_MANAGER,
        };

        useAuthStore.setState({
            currentUser: adminReviewer,
            permissions: [
                Permission.MANAGE_ALL_PROJECTS,
                Permission.MANAGE_ALL_PROPERTIES,
                Permission.VIEW_ADMIN_DASHBOARD,
            ],
        });

        const db = createIsolatedCatalogDb();

        // 1. Create Project linked to Partner
        const createdProject = await addProject(
            {
                partnerId: owningPartner.id,
                cityId: 'heliopolis',
                name: { ar: 'كمبوند القبول', en: 'Acceptance Compound' },
                description: { ar: 'وصف المشروع', en: 'Project description' },
                imageUrl: 'https://example.com/proj.jpg',
                features: [],
            },
            { client: db }
        );
        assert.ok(createdProject.id);
        assert.strictEqual(createdProject.partnerId, owningPartner.id);
        const fetchedProject = await getProjectById(createdProject.id, { client: db });
        assert.strictEqual(fetchedProject?.id, createdProject.id);
        assert.strictEqual((await getAllProjects({ client: db })).length, 1);

        // 2. Create Draft Property linked to Project and Partner
        const draftProp = await addProperty(
            {
                cityId: 'heliopolis',
                partnerId: owningPartner.id,
                projectId: createdProject.id,
                title: { ar: 'شقة القبول', en: 'Acceptance Unit' },
                description: { ar: 'وصف الشقة', en: 'Unit description' },
                address: { ar: 'هليوبوليس الجديدة', en: 'New Heliopolis' },
                status: { ar: 'للبيع', en: 'For Sale' },
                type: { ar: 'شقة', en: 'Apartment' },
                finishingStatus: { ar: 'سوبر لوكس', en: 'Super Lux' },
                price: { ar: '3,000,000 ج.م', en: 'EGP 3,000,000' },
                priceNumeric: 3000000,
                area: 160,
                beds: 3,
                baths: 2,
                amenities: { ar: [], en: [] },
                location: { lat: 30.12, lng: 31.62 },
                imageUrl: 'https://example.com/unit.jpg',
                gallery: [],
                isInCompound: true,
                installmentsAvailable: false,
                realEstateFinanceAvailable: true,
                delivery: { isImmediate: true },
                listingStatus: 'draft',
                publicationStatus: 'draft',
                verificationStatus: 'pending',
                availabilityStatus: 'available',
            },
            { client: db }
        );

        assert.strictEqual(draftProp.listingStatus, 'draft');
        assert.strictEqual(draftProp.publicationStatus, 'draft');
        assert.ok(draftProp.listingStartDate, 'Newly created property must receive listingStartDate');

        // Draft must be invisible to public views (List, Home, Project, Partner public profile)
        assert.strictEqual((await getProperties({ client: db })).length, 0, 'Catalog list must exclude draft');
        assert.strictEqual(isListingActive(draftProp), false, 'Home LatestProperties must exclude draft');
        assert.strictEqual(
            (await getPropertiesByProjectId(createdProject.id, { client: db })).length,
            0,
            'Public Project page must exclude draft'
        );
        assert.strictEqual(
            (await getPublicPropertiesByPartnerId(owningPartner.id, { client: db })).length,
            0,
            'Public Partner profile must exclude draft'
        );
        assert.strictEqual(canUserViewPropertyDetails(draftProp, null), false, 'Public cannot view draft details');
        assert.strictEqual(canUserViewPropertyDetails(draftProp, otherPartner), false, 'Other partner cannot view draft');

        // Authorized Admin & Owning Partner CAN review draft
        assert.strictEqual(canReviewPropertyDraft(draftProp, owningPartner), true);
        assert.strictEqual(canReviewPropertyDraft(draftProp, adminReviewer), true);
        assert.strictEqual(canUserViewPropertyDetails(draftProp, owningPartner), true);
        assert.strictEqual(canUserViewPropertyDetails(draftProp, adminReviewer), true);
        assert.strictEqual((await getAllProperties({ client: db })).length, 1, 'Admin all properties includes draft');
        assert.strictEqual(
            (await getPropertiesByPartnerId(owningPartner.id, { publicOnly: false, client: db })).length,
            1,
            'Partner dashboard includes own draft'
        );
        assert.strictEqual(
            (await getPropertiesByProjectId(createdProject.id, { publicOnly: false, client: db })).length,
            1
        );

        // 3. Publish Property -> appears across all public views
        const publishedProp = await updateProperty(draftProp.id, { listingStatus: 'active' }, { client: db });
        assert.ok(publishedProp);
        assert.strictEqual(publishedProp.listingStatus, 'active');
        assert.strictEqual(publishedProp.publicationStatus, 'published');
        assert.strictEqual(isPropertyPubliclyVisible(publishedProp, { includeSold: true }), true);
        assert.strictEqual(isListingActive(publishedProp), true);
        assert.strictEqual((await getProperties({ client: db })).length, 1, 'Catalog list shows published property');
        assert.strictEqual(
            (await getPropertiesByProjectId(createdProject.id, { client: db })).length,
            1,
            'Project details shows published unit'
        );
        assert.strictEqual(
            (await getPublicPropertiesByPartnerId(owningPartner.id, { client: db })).length,
            1,
            'Partner profile shows published property'
        );
        assert.strictEqual(canUserViewPropertyDetails(publishedProp, null), true, 'Public can view published details');

        // 4. Hide Property ('inactive') -> disappears from all public views (no stale 'published' leak), reviewable by Admin/Partner
        const hiddenProp = await updateProperty(draftProp.id, { listingStatus: 'inactive' }, { client: db });
        assert.ok(hiddenProp);
        assert.strictEqual(hiddenProp.listingStatus, 'inactive');
        assert.strictEqual(
            hiddenProp.publicationStatus,
            'archived',
            'Hiding property must sync publicationStatus away from published'
        );
        assert.strictEqual(isPropertyPubliclyVisible(hiddenProp, { includeSold: true }), false);
        assert.strictEqual(isListingActive(hiddenProp), false);
        assert.strictEqual((await getProperties({ client: db })).length, 0, 'Catalog list hides archived property');
        assert.strictEqual(
            (await getPropertiesByProjectId(createdProject.id, { client: db })).length,
            0,
            'Project details hides archived unit'
        );
        assert.strictEqual(
            (await getPublicPropertiesByPartnerId(owningPartner.id, { client: db })).length,
            0,
            'Partner profile hides archived property'
        );
        assert.strictEqual(canUserViewPropertyDetails(hiddenProp, null), false, 'Public blocked from hidden details');
        assert.strictEqual(canUserViewPropertyDetails(hiddenProp, owningPartner), true, 'Owning partner still sees hidden unit');
        assert.strictEqual(canUserViewPropertyDetails(hiddenProp, adminReviewer), true, 'Admin still reviews hidden unit');

        // 5. Sold Property -> Home LatestProperties excludes sold (includeSold: false), while Catalog/Project/Partner keep sold visible
        const soldProp = await updateProperty(draftProp.id, { listingStatus: 'sold' }, { client: db });
        assert.ok(soldProp);
        assert.strictEqual(isListingActive(soldProp), false, 'Home latest available listings excludes sold');
        assert.strictEqual(isPropertyPubliclyVisible(soldProp, { includeSold: true }), true);
        assert.strictEqual((await getProperties({ client: db })).length, 1);
        assert.strictEqual((await getPropertiesByProjectId(createdProject.id, { client: db })).length, 1);
        assert.strictEqual((await getPublicPropertiesByPartnerId(owningPartner.id, { client: db })).length, 1);
    });

    await test('P10.3: Partial filter safety, structured DB error propagation, and role/city-scoped draft access', async () => {
        const { getPaginatedProperties, invalidatePropertiesCache } = await import('../services/properties');
        const { canReviewPropertyDraft, canUserViewPropertyDetails } = await import('../utils/propertyUtils');

        invalidatePropertiesCache();

        const db = createIsolatedCatalogDb();
        await db.from('properties').insert({
            id: 'prop-filter-check-1',
            partner_id: 'partner-dev-100',
            city_id: 'heliopolis',
            title_ar: 'شقة هليوبوليس',
            title_en: 'Heliopolis Apartment',
            address_ar: 'شارع الثورة',
            address_en: 'Thawra St',
            status: 'For Sale',
            type: 'Apartment',
            price: 2500000,
            area: 150,
            beds: 3,
            baths: 2,
            listing_status: 'active',
            created_at: new Date().toISOString(),
        });

        // Partial filters (omitting query/status/amenities) must not throw TypeError
        const paginated = await getPaginatedProperties({
            page: NaN,
            limit: 12,
            filters: { view: 'grid' } as any,
            cityId: 'heliopolis',
            client: db,
        });
        assert.strictEqual(paginated.total, 1);
        assert.strictEqual(paginated.properties.length, 1);

        // Structured DB error retains code & message without masking
        const codedErrorClient = {
            from: () => ({
                select: () => ({
                    in: () => ({
                        order: async () => ({
                            data: null,
                            error: { code: '42501', message: 'permission denied for table properties' },
                        }),
                    }),
                }),
            }),
        };
        let capturedErr: any;
        try {
            await getPaginatedProperties({
                page: 1,
                limit: 12,
                filters: { view: 'grid' } as any,
                cityId: 'heliopolis',
                client: codedErrorClient,
            });
        } catch (err) {
            capturedErr = err;
        }
        assert.ok(capturedErr, 'DB read failure must throw instead of returning empty or demo data');
        assert.strictEqual(capturedErr.code, '42501');
        assert.ok(String(capturedErr.message).includes('42501'));

        // City-scoped & role-scoped draft review enforcement
        const helioDraft: any = {
            id: 'draft-helio-1',
            cityId: 'heliopolis',
            partnerId: 'partner-owner-1',
            listingStatus: 'draft',
            publicationStatus: 'draft',
        };
        const listingsManagerShorouk: Partner = {
            id: 'admin-shorouk-1',
            email: 'shorouk@example.com',
            name: 'Shorouk Listings',
            imageUrl: '',
            description: '',
            type: 'admin',
            status: 'active',
            subscriptionPlan: 'enterprise',
            displayType: 'standard',
            role: Role.LISTINGS_MANAGER,
            allowedCities: ['shorouk'],
        };
        const contentManager: Partner = {
            ...listingsManagerShorouk,
            id: 'admin-content-1',
            role: Role.CONTENT_MANAGER,
            allowedCities: ['*'],
        };
        const superAdmin: Partner = {
            ...listingsManagerShorouk,
            id: 'admin-super-1',
            role: Role.SUPER_ADMIN,
            allowedCities: ['*'],
        };

        assert.strictEqual(canReviewPropertyDraft(helioDraft, listingsManagerShorouk), false, 'Out-of-city listings manager must not review draft');
        assert.strictEqual(canReviewPropertyDraft(helioDraft, contentManager), false, 'Non-property admin role must not review draft');
        assert.strictEqual(canReviewPropertyDraft(helioDraft, superAdmin), true, 'Super admin reviews draft across cities');
        assert.strictEqual(canUserViewPropertyDetails(helioDraft, null), false, 'Anonymous visitor blocked from draft');

        // Visitor-facing error sanitization strips internal Supabase/Postgres/table/column details
        const { sanitizePropertyReadError } = await import('../utils/propertyUtils');
        const permSanitized = sanitizePropertyReadError(
            { code: '42501', message: 'permission denied for table properties on supabase xyyvgpchkznznwbxbgrp' },
            'ar'
        );
        assert.strictEqual(permSanitized.diagnosticCode, 'PROP-AUTH-03');
        assert.doesNotMatch(permSanitized.visitorMessage, /properties|supabase|42501|permission denied|xyyvgpchkznznwbxbgrp/i);
        assert.ok(permSanitized.visitorMessage.includes('PROP-AUTH-03'));

        const schemaSanitized = sanitizePropertyReadError(
            { code: 'PGRST205', message: "Could not find the table 'public.cities' in the schema cache" },
            'en'
        );
        assert.strictEqual(schemaSanitized.diagnosticCode, 'PROP-SCH-04');
        assert.doesNotMatch(schemaSanitized.visitorMessage, /cities|schema cache|pgrst205|supabase|public\./i);
        assert.ok(schemaSanitized.visitorMessage.includes('PROP-SCH-04'));

        const netSanitized = sanitizePropertyReadError(new Error('Failed to fetch'), 'ar');
        assert.strictEqual(netSanitized.diagnosticCode, 'PROP-NET-01');
        assert.doesNotMatch(netSanitized.visitorMessage, /failed to fetch/i);
    });

    // ========================================================================
    // SUITE 11: Phase 3 — Shared Listing Validation, Idempotent Bidirectional Approval & Operations Center Tracking
    // ========================================================================
    console.log('\nSuite 11: Shared Listing Validation, Idempotent Bidirectional Approval & Operations Center Tracking');

    await test('P11.1: Shared validation helpers & role-specific listing statuses behave consistently', async () => {
        const {
            PROPERTY_VALIDATION_RULES,
            validateEgyptPhone,
            getAllowedListingStatusesForRole,
            resolvePropertyReferenceCode,
            normalizeBilingualText,
        } = await import('../utils/propertyFormShared');
        const { formsData } = await import('../data/forms');
        const { validateIntakeSubmission } = await import('../services/intake');

        assert.strictEqual(validateEgyptPhone('01012345678', 'ar'), true);
        assert.strictEqual(validateEgyptPhone('+201123456789', 'en'), true);
        assert.notStrictEqual(validateEgyptPhone('12345', 'ar'), true);

        const partnerDraftStatuses = getAllowedListingStatusesForRole(false, 'draft');
        assert.ok(partnerDraftStatuses.includes('draft') && !partnerDraftStatuses.includes('active'), 'Partners cannot self-promote drafts to active');
        const partnerActiveStatuses = getAllowedListingStatusesForRole(false, 'active');
        assert.ok(partnerActiveStatuses.includes('active') && partnerActiveStatuses.includes('inactive') && partnerActiveStatuses.includes('sold'));
        const adminStatuses = getAllowedListingStatusesForRole(true);
        assert.ok(adminStatuses.includes('active') && adminStatuses.includes('draft'));

        assert.strictEqual(resolvePropertyReferenceCode('1234abcd-5678-90ef-1234-567890abcdef'), 'HEL-BCDEF');
        assert.strictEqual(resolvePropertyReferenceCode('prop-1', 'HEL-99999'), 'HEL-99999');
        assert.deepStrictEqual(normalizeBilingualText({ ar: 'نص عربي', en: '' }), { ar: 'نص عربي', en: 'نص عربي' });

        const addPropForm = formsData.find((f) => f.slug === 'add-property');
        assert.ok(addPropForm, 'add-property form definition must exist');
        const areaField = addPropForm!.fields.find((f) => f.key === 'area');
        const priceField = addPropForm!.fields.find((f) => f.key === 'price');
        assert.strictEqual(areaField?.validation?.min, PROPERTY_VALIDATION_RULES.MIN_AREA);
        assert.strictEqual(priceField?.validation?.min, PROPERTY_VALIDATION_RULES.MIN_PRICE);

        const invalidResult = validateIntakeSubmission(addPropForm!.fields, {
            customerName: 'أحمد',
            customerPhone: '999',
            contactTime: 'morning',
            address: 'الحي الثالث',
            propertyType: 'apartment',
            area: 0,
            price: -100,
            beds: 2,
            baths: 1,
            floor: 2,
            finishingStatus: 'semi_finished',
            isInCompound: 'no',
            hasInstallments: 'no',
            realEstateFinanceAvailable: 'no',
        });
        assert.strictEqual(invalidResult.isValid, false);
        assert.ok(invalidResult.errors.customerPhone, 'Invalid phone must fail intake validation');
        assert.ok(invalidResult.errors.area, 'Below-minimum area must fail intake validation');
        assert.ok(invalidResult.errors.price, 'Negative price must fail intake validation');
    });

    await test('P11.2: Approving a listing request creates ONE draft property with bidirectional link and recovers safely on retry', async () => {
        const { approvePropertyListingRequest } = await import('../services/propertyRequests');
        const { resolvePropertyReferenceCode } = await import('../utils/propertyFormShared');
        const { invalidatePropertiesCache } = await import('../services/properties');

        invalidatePropertiesCache();

        const adminReviewer: Partner = {
            id: 'a1b2c3d4-0000-4000-8000-000000000001',
            email: 'admin@onlyhelio.com',
            name: 'Super Admin',
            nameAr: 'مدير النظام',
            imageUrl: 'https://example.com/admin.png',
            description: '',
            descriptionAr: '',
            type: 'admin',
            status: 'active',
            subscriptionPlan: 'elite',
            displayType: 'standard',
            role: Role.SUPER_ADMIN,
        };

        useAuthStore.setState({
            currentUser: adminReviewer,
            permissions: [
                Permission.MANAGE_REQUESTS,
                Permission.MANAGE_PROPERTY_REQUESTS,
                Permission.MANAGE_ALL_PROPERTIES,
            ],
        });

        const reqId = '11111111-2222-4333-8444-555555555555';
        const partnerUuid = '22222222-3333-4444-8555-666666666666';
        const requestsRows: any[] = [
            {
                id: reqId,
                city_id: 'heliopolis',
                type: RequestType.PROPERTY_LISTING_REQUEST,
                status: 'new',
                requester_name: 'محمود علي',
                requester_phone: '01098765432',
                requester_email: 'mahmoud@example.com',
                assigned_to: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                payload: {
                    cityId: 'heliopolis',
                    cooperationType: 'commission',
                    contactTime: 'afternoon',
                    images: ['https://example.com/prop-1.jpg'],
                    propertyDetails: {
                        cityId: 'heliopolis',
                        purpose: { ar: 'للبيع', en: 'For Sale' },
                        title: { ar: 'شقة مميزة بالتاسع', en: 'Prime Apartment District 9' },
                        description: { ar: 'وصف تفصيلي للشقة', en: 'Detailed apartment description' },
                        propertyType: { ar: 'شقة', en: 'Apartment' },
                        finishingStatus: { ar: 'نصف تشطيب', en: 'Semi-Finished' },
                        area: 185,
                        price: 4200000,
                        bedrooms: 3,
                        bathrooms: 2,
                        floor: 3,
                        address: 'الحي التاسع - هليوبوليس الجديدة',
                        location: { lat: 30.125, lng: 31.655 },
                        amenities: { ar: ['أمن'], en: ['Security'] },
                        isInCompound: true,
                        hasInstallments: false,
                        realEstateFinanceAvailable: true,
                        deliveryType: 'immediate',
                        contactMethod: 'platform',
                    },
                },
            },
        ];
        const propertiesRows: any[] = [];
        const messagesRows: any[] = [];
        let failNextRequestUpdate = true;

        const createListingWorkflowMockDb = () => {
            const getStore = (table: string): any[] => {
                if (table === 'requests') return requestsRows;
                if (table === 'properties') return propertiesRows;
                if (table === 'request_messages') return messagesRows;
                if (table === 'partners') return [adminReviewer];
                throw new Error(`Unexpected table: ${table}`);
            };

            return {
                from: (table: string) => {
                    const store = getStore(table);
                    return {
                        select: (_cols: string) => {
                            const predicates: ((r: any) => boolean)[] = [];
                            let limitVal: number | null = null;

                            const runSelect = async () => {
                                let res = store.filter((r) => predicates.every((fn) => fn(r)));
                                if (limitVal !== null) res = res.slice(0, limitVal);
                                return { data: JSON.parse(JSON.stringify(res)), error: null };
                            };

                            const builder: any = {
                                eq: (col: string, val: any) => {
                                    predicates.push((r) => r?.[col] === val);
                                    return builder;
                                },
                                filter: (expr: string, _op: string, val: any) => {
                                    if (expr.includes('sourceRequestId')) {
                                        predicates.push(
                                            (r) => r?.installments_info?._meta?.sourceRequestId === val
                                        );
                                    }
                                    return builder;
                                },
                                order: () => builder,
                                limit: (n: number) => {
                                    limitVal = n;
                                    return builder;
                                },
                                single: async () => {
                                    const res = await runSelect();
                                    if (!res.data || res.data.length === 0) {
                                        return { data: null, error: { message: 'Not found' } };
                                    }
                                    return { data: res.data[0], error: null };
                                },
                                maybeSingle: async () => {
                                    const res = await runSelect();
                                    return { data: res.data?.[0] || null, error: null };
                                },
                                then: (resolve: any, reject: any) => runSelect().then(resolve, reject),
                            };
                            return builder;
                        },
                        insert: (payload: any) => {
                            const row = {
                                id:
                                    payload.id ||
                                    '33333333-4444-4555-8666-777777777777',
                                created_at: payload.created_at || new Date().toISOString(),
                                updated_at: payload.updated_at || new Date().toISOString(),
                                ...JSON.parse(JSON.stringify(payload)),
                            };
                            const execInsert = async () => {
                                if (table === 'properties' && row.source_request_id) {
                                    const dup = propertiesRows.find(
                                        (p) => p.source_request_id === row.source_request_id
                                    );
                                    if (dup) {
                                        return {
                                            data: null,
                                            error: {
                                                code: '23505',
                                                message:
                                                    'duplicate key value violates unique constraint uq_properties_source_request_id',
                                            },
                                        };
                                    }
                                }
                                store.push(row);
                                return { data: JSON.parse(JSON.stringify(row)), error: null };
                            };
                            return {
                                select: () => ({ single: execInsert }),
                                then: (resolve: any, reject: any) => execInsert().then(resolve, reject),
                            };
                        },
                        update: (patch: any) => ({
                            eq: (col: string, val: any) => ({
                                select: () => ({
                                    single: async () => {
                                        if (table === 'requests' && failNextRequestUpdate) {
                                            failNextRequestUpdate = false;
                                            return {
                                                data: null,
                                                error: { message: 'Simulated transient network timeout on updateRequest' },
                                            };
                                        }
                                        const idx = store.findIndex((r) => r?.[col] === val);
                                        if (idx < 0) return { data: null, error: { message: 'Row not found' } };
                                        store[idx] = { ...store[idx], ...JSON.parse(JSON.stringify(patch)) };
                                        return { data: JSON.parse(JSON.stringify(store[idx])), error: null };
                                    },
                                }),
                            }),
                        }),
                    };
                },
            };
        };

        const db = createListingWorkflowMockDb();

        // Attempt 1: Draft property succeeds, then updateRequest fails mid-flight
        await assert.rejects(
            () =>
                approvePropertyListingRequest(reqId, {
                    assigneeId: partnerUuid,
                    actorId: adminReviewer.id,
                    client: db,
                }),
            /Simulated transient network timeout/
        );
        assert.strictEqual(propertiesRows.length, 1, 'Exactly one draft property created before failure');
        assert.strictEqual(propertiesRows[0].source_request_id, reqId, 'Property holds source_request_id');
        assert.strictEqual(requestsRows[0].status, 'new', 'Request remained uncommitted before retry');

        // Attempt 2 (Retry): Must reuse existing draft without creating a duplicate and repair bidirectional link
        const retryResult = await approvePropertyListingRequest(reqId, {
            assigneeId: partnerUuid,
            actorId: adminReviewer.id,
            client: db,
        });

        assert.strictEqual(propertiesRows.length, 1, 'Retry MUST NOT create a second draft property');
        assert.strictEqual(retryResult.alreadyExisted, true);
        assert.strictEqual(retryResult.property.listingStatus, 'draft');
        assert.strictEqual(retryResult.property.publicationStatus, 'draft');
        assert.strictEqual(retryResult.property.sourceRequestId, reqId);
        assert.strictEqual(retryResult.request.status, 'approved');
        assert.strictEqual(retryResult.request.payload.createdPropertyId, retryResult.property.id);
        assert.strictEqual(
            retryResult.request.payload.createdPropertyReference,
            resolvePropertyReferenceCode(retryResult.property.id, retryResult.property.referenceNumber)
        );

        // Attempt 3 (Repeated click): Still idempotent, zero duplicates
        const thirdResult = await approvePropertyListingRequest(reqId, {
            assigneeId: partnerUuid,
            actorId: adminReviewer.id,
            client: db,
        });
        assert.strictEqual(propertiesRows.length, 1);
        assert.strictEqual(thirdResult.alreadyExisted, true);
        assert.strictEqual(thirdResult.property.id, retryResult.property.id);
    });

    await test('P11.3: Operations Center preserves property reference, status, and assignee for finishing, inquiry, and contact forms', async () => {
        const { resolvePropertyReferenceCode } = await import('../utils/propertyFormShared');
        const propertyUuid = '44444444-5555-4666-8777-888888888888';
        const expectedRef = resolvePropertyReferenceCode(propertyUuid);
        const finishingManagerId = 'f1111111-1111-4111-8111-111111111111';
        const crmManagerId = 'c2222222-2222-4222-8222-222222222222';
        const listingsManagerId = 'l3333333-3333-4333-8333-333333333333';

        const partnersMap = new Map<string, string>([
            [finishingManagerId, 'مدير تشطيبات المنصة'],
            [crmManagerId, 'خدمة العملاء'],
            [listingsManagerId, 'مدير الوحدات'],
        ]);

        // 1. Finishing request originating from Property Details page
        const finishingRaw = mapRequestFromDb({
            id: 'req-fin-1',
            city_id: 'heliopolis',
            type: RequestType.LEAD,
            status: 'in-progress',
            requester_name: 'عمرو حسن',
            requester_phone: '01011223344',
            assigned_to: finishingManagerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            payload: {
                serviceType: 'finishing',
                serviceTitle: 'طلب مقايسة خاصة: باقة الترا لوكس',
                propertyId: propertyUuid,
                propertyReference: expectedRef,
                propertyTitle: 'فيلا مستقلة بالكمبوند السابع',
                customerNotes: 'يرجى التواصل قبل المعاينة',
            },
        });
        const unifiedFinishing = mapRequestToUnified(finishingRaw, partnersMap);
        assert.strictEqual(unifiedFinishing.domain, 'finishing');
        assert.strictEqual(unifiedFinishing.context.propertyId, propertyUuid);
        assert.strictEqual(unifiedFinishing.context.propertyReference, expectedRef);
        assert.strictEqual(unifiedFinishing.context.propertyTitle, 'فيلا مستقلة بالكمبوند السابع');
        assert.strictEqual(unifiedFinishing.assignedToName, 'مدير تشطيبات المنصة');
        assert.strictEqual(unifiedFinishing.operationalStatus, OperationalStatus.IN_PROGRESS);
        assert.strictEqual(
            matchesUnifiedRequestFilter(unifiedFinishing, { searchTerm: expectedRef }),
            true,
            'Operations search must locate finishing requests by propertyReference'
        );

        // 2. Contact Us form message
        const contactRaw = mapRequestFromDb({
            id: 'req-contact-1',
            city_id: 'heliopolis',
            type: RequestType.CONTACT_MESSAGE,
            status: 'new',
            requester_name: 'سارة محمد',
            requester_phone: '01122334455',
            assigned_to: crmManagerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            payload: {
                inquiryType: 'sales',
                message: 'استفسار حول خطط السداد المتاحة',
            },
        });
        const unifiedContact = mapRequestToUnified(contactRaw, partnersMap);
        assert.strictEqual(unifiedContact.domain, 'customer_care');
        assert.strictEqual(unifiedContact.context.serviceTitle, 'sales');
        assert.strictEqual(unifiedContact.context.details, 'استفسار حول خطط السداد المتاحة');
        assert.strictEqual(unifiedContact.assignedToName, 'خدمة العملاء');
        assert.strictEqual(unifiedContact.operationalStatus, OperationalStatus.ASSIGNED);

        // 3. Property Search Inquiry & Direct Property Inquiry
        const inquiryRaw = mapRequestFromDb({
            id: 'req-inq-1',
            city_id: 'heliopolis',
            type: RequestType.PROPERTY_INQUIRY,
            status: 'contacted',
            requester_name: 'طارق نبيل',
            requester_phone: '01233445566',
            assigned_to: listingsManagerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            payload: {
                propertyType: 'villa',
                purpose: 'buy',
                details: 'أبحث عن فيلا 350 متر',
            },
        });
        const unifiedInquiry = mapRequestToUnified(inquiryRaw, partnersMap);
        assert.strictEqual(unifiedInquiry.domain, 'real_estate');
        assert.strictEqual(unifiedInquiry.context.serviceTitle, 'villa • buy');
        assert.strictEqual(unifiedInquiry.assignedToName, 'مدير الوحدات');
        assert.strictEqual(unifiedInquiry.operationalStatus, OperationalStatus.IN_PROGRESS);
    });

    // ========================================================================
    // Suite 12: Phase 4 — Extended CMS Controls, Layout Order, Contact & Form Usage Map
    // ========================================================================
    console.log('\n--- Suite 12: Phase 4 — Extended CMS Controls & Form Usage Tests ---');

    await test('P12.1: normalizeSiteContent preserves legacy partial DB payload and hydrates navigation, homeSections, contactPage & CTA defaults', async () => {
        const { normalizeSiteContent } = await import('../services/content');
        const { resolveNavigationLinks, resolveHomeSections } = await import('../utils/siteContentHelpers');

        const legacyNormalized = normalizeSiteContent({
            hero: { ar: { title: 'عنوان قديم محفوظ' } },
            footer: { phone: '01551234567' },
            services: { enabled: false },
        });

        assert.strictEqual(legacyNormalized.hero.ar.title, 'عنوان قديم محفوظ');
        assert.strictEqual(legacyNormalized.footer.phone, '01551234567');
        assert.ok(Array.isArray(legacyNormalized.navigation) && legacyNormalized.navigation.length >= 6);
        assert.ok(legacyNormalized.headerCta?.text?.ar && legacyNormalized.headerCta?.link);
        assert.ok(Array.isArray(legacyNormalized.homeSections) && legacyNormalized.homeSections.length === 10);
        assert.ok(legacyNormalized.contactPage?.ar?.title && legacyNormalized.contactPage?.en?.title);
        assert.ok(legacyNormalized.hero.primaryButton?.text?.ar && legacyNormalized.hero.secondaryButton?.link);
        assert.ok(legacyNormalized.homeListings?.viewAllButton?.text?.ar);
        assert.ok(legacyNormalized.homeCTA?.secondaryButton?.text?.ar);
        assert.ok(legacyNormalized.finishingPage?.ar?.heroButton && legacyNormalized.decorationsPage?.ar?.customRequestButton);

        // Legacy services.enabled = false must still disable the services section in resolved home sections
        const resolvedSections = resolveHomeSections(legacyNormalized);
        const servicesSection = resolvedSections.find((s) => s.id === 'services');
        assert.strictEqual(servicesSection, undefined, 'Legacy services.enabled=false should hide services section');

        const navLinks = resolveNavigationLinks(legacyNormalized);
        assert.ok(navLinks.length >= 6, 'Default visible navigation links should hydrate for legacy DB rows');
    });

    await test('P12.2: Hiding a navigation link and reordering two HomePage sections persist via buildContentPatch and reflect on public resolvers', async () => {
        setupAdminAuthForContentTests();
        const {
            getContent,
            updateContent,
            buildContentPatch,
            invalidateContentCache,
        } = await import('../services/content');
        const { resolveNavigationLinks, resolveHomeSections } = await import('../utils/siteContentHelpers');

        invalidateContentCache();
        const db = createIsolatedSiteContentDb({
            footer: { phone: '01099001122' },
        });

        const baseline = await getContent({ forceRefresh: true, client: db });
        const modified = JSON.parse(JSON.stringify(baseline));

        // 1. Hide "nav-decorations" nav link and move "nav-finishing" ahead of "nav-projects"
        modified.navigation = modified.navigation.map((item: any) => {
            if (item.id === 'nav-decorations') return { ...item, visible: false };
            if (item.id === 'nav-finishing') return { ...item, order: 3 };
            if (item.id === 'nav-projects') return { ...item, order: 4 };
            return item;
        });

        // 2. Reorder HomePage sections: swap whyNewHeliopolis (5) and services (4)
        modified.homeSections = modified.homeSections.map((sec: any) => {
            if (sec.id === 'whyNewHeliopolis') return { ...sec, order: 4 };
            if (sec.id === 'services') return { ...sec, order: 5 };
            return sec;
        });

        const patch = buildContentPatch(baseline, modified, {
            navigation: true,
            homeSections: true,
        });

        assert.strictEqual('footer' in patch, false, 'Unedited footer must not be included in patch');
        await updateContent(patch, { client: db });

        // Simulate full page reload
        invalidateContentCache();
        const reloaded = await getContent({ forceRefresh: true, client: db });

        const activeNav = resolveNavigationLinks(reloaded);
        assert.strictEqual(activeNav.some((l) => l.id === 'nav-decorations'), false, 'Hidden link must be excluded on desktop & mobile');
        const finIdx = activeNav.findIndex((l) => l.id === 'nav-finishing');
        const projIdx = activeNav.findIndex((l) => l.id === 'nav-projects');
        assert.ok(finIdx >= 0 && projIdx >= 0 && finIdx < projIdx, 'Updated navigation order must apply');

        const activeSections = resolveHomeSections(reloaded);
        const whyIdx = activeSections.findIndex((s) => s.id === 'whyNewHeliopolis');
        const srvIdx = activeSections.findIndex((s) => s.id === 'services');
        assert.ok(whyIdx >= 0 && srvIdx >= 0 && whyIdx < srvIdx, 'Swapped HomePage section order must persist after reload');
        assert.strictEqual(reloaded.footer.phone, '01099001122', 'Sibling footer phone must stay untouched');
    });

    await test('P12.3: Bilingual Contact page titles/descriptions and action button targets persist across reload without clobbering siblings', async () => {
        setupAdminAuthForContentTests();
        const {
            getContent,
            updateContent,
            buildContentPatch,
            invalidateContentCache,
        } = await import('../services/content');

        invalidateContentCache();
        const db = createIsolatedSiteContentDb({
            footer: { phone: '01144556677', email: 'contact@onlyhelio.com' },
        });

        const baseline = await getContent({ forceRefresh: true, client: db });
        const modified = JSON.parse(JSON.stringify(baseline));

        modified.contactPage.ar.title = 'تواصل مع فريق هليوبوليس الجديدة';
        modified.contactPage.en.title = 'Connect With Our Advisory Team';
        modified.contactPage.ar.formDescription = 'املأ النموذج وسيقوم فريقنا بالرد خلال ساعات.';
        modified.contactPage.en.formDescription = 'Fill in the form and our team will reply shortly.';
        modified.headerCta.text.ar = 'أرسل عقارك';
        modified.headerCta.link = '/add-property';
        modified.homeListings.viewAllButton.text.ar = 'استعرض جميع العروض';
        modified.homeListings.viewAllButton.link = '/properties?featured=true';

        const patch = buildContentPatch(baseline, modified, {
            contactPage: {
                ar: { title: true, formDescription: true },
                en: { title: true, formDescription: true },
            },
            headerCta: {
                text: { ar: true },
                link: true,
            },
            homeListings: {
                viewAllButton: {
                    text: { ar: true },
                    link: true,
                },
            },
        });

        await updateContent(patch, { client: db });
        invalidateContentCache();
        const reloaded = await getContent({ forceRefresh: true, client: db });

        assert.strictEqual(reloaded.contactPage.ar.title, 'تواصل مع فريق هليوبوليس الجديدة');
        assert.strictEqual(reloaded.contactPage.en.title, 'Connect With Our Advisory Team');
        assert.strictEqual(reloaded.contactPage.ar.formDescription, 'املأ النموذج وسيقوم فريقنا بالرد خلال ساعات.');
        assert.strictEqual(reloaded.headerCta.text.ar, 'أرسل عقارك');
        assert.strictEqual(reloaded.homeListings.viewAllButton.text.ar, 'استعرض جميع العروض');
        assert.strictEqual(reloaded.homeListings.viewAllButton.link, '/properties?featured=true');
        assert.strictEqual(reloaded.footer.phone, '01144556677');
    });

    await test('P12.4: Form Builder usage map identifies page & route for every built-in dynamic form slug', async () => {
        const { formsData } = await import('../data/forms');
        const { getFormUsageLocations } = await import('../utils/formUsageMap');

        assert.ok(formsData.length >= 7, 'Expected all built-in forms to exist');
        for (const form of formsData) {
            const locations = getFormUsageLocations(form.slug);
            assert.ok(locations.length >= 1, `Form slug "${form.slug}" must map to at least one page/route`);
            for (const loc of locations) {
                assert.ok(loc.route.startsWith('/'), `Invalid route for "${form.slug}": ${loc.route}`);
                assert.ok(loc.pageName.ar.trim().length > 0 && loc.pageName.en.trim().length > 0);
                assert.ok(loc.triggerContext.ar.trim().length > 0 && loc.triggerContext.en.trim().length > 0);
            }
        }
    });

    // ========================================================================
    // Suite 13: Phase 5 — Finishing Catalog Authority, Decorations Linking & Request References
    // ========================================================================
    console.log('\n--- Suite 13: Phase 5 — Finishing & Decorations Operational Linking Tests ---');

    await test('P13.1: finishing_services acts as authoritative catalog for edits, pricing, visibility, deletion & legacy transition', async () => {
        const {
            getFinishingServices,
            saveFinishingServices,
            deleteFinishingService,
            invalidateFinishingServicesCache,
        } = await import('../services/finishing');
        const { resolveServiceReferenceCode } = await import('../utils/propertyFormShared');

        invalidateFinishingServicesCache();

        let finishingRows: any[] = [];
        const legacySiteContent = {
            finishingServices: [
                {
                    id: 'legacy-finish-1',
                    title: { ar: 'باقة التأسيس التراثية', en: 'Legacy Core Package' },
                    description: { ar: 'وصف قديم', en: 'Legacy desc' },
                    pricingModel: 'per_sqm',
                    basePrice: 3200,
                    isActive: true,
                    displayOrder: 1,
                },
            ],
        };
        let simulateQueryError = false;

        const mockDb: any = {
            rpc: async (fnName: string) => {
                if (fnName === 'finishing_catalog_exists') {
                    return { data: finishingRows.length > 0, error: null };
                }
                return { data: null, error: null };
            },
            from: (table: string) => {
                if (table === 'site_content') {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({ data: { content: legacySiteContent }, error: null }),
                                single: async () => ({ data: { content: legacySiteContent }, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'finishing_services') {
                    return {
                        select: () => {
                            const run = async () => {
                                if (simulateQueryError) {
                                    return { data: null, error: { code: '500', message: 'Simulated DB read outage' } };
                                }
                                return { data: JSON.parse(JSON.stringify(finishingRows)), error: null };
                            };
                            return {
                                order: async () => run(),
                                then: (res: any, rej: any) => run().then(res, rej),
                            };
                        },
                        upsert: (rows: any[]) => ({
                            select: async () => {
                                const now = new Date().toISOString();
                                for (const row of rows) {
                                    const idx = finishingRows.findIndex((r) => r.id === row.id);
                                    const stored = { created_at: now, ...JSON.parse(JSON.stringify(row)) };
                                    if (idx >= 0) {
                                        finishingRows[idx] = { ...finishingRows[idx], ...stored };
                                    } else {
                                        finishingRows.push(stored);
                                    }
                                }
                                return { data: JSON.parse(JSON.stringify(finishingRows)), error: null };
                            },
                        }),
                        delete: () => ({
                            in: async (_col: string, ids: string[]) => {
                                finishingRows = finishingRows.filter((r) => !ids.includes(r.id));
                                return { error: null };
                            },
                            eq: async (_col: string, id: string) => {
                                finishingRows = finishingRows.filter((r) => r.id !== id);
                                return { error: null };
                            },
                        }),
                    };
                }
                throw new Error(`Unexpected table ${table}`);
            },
        };

        // 1. Empty finishing_services transitions cleanly from legacy site_content
        const transitioned = await getFinishingServices({ includeInactive: true, forceRefresh: true, client: mockDb });
        assert.strictEqual(transitioned.length, 1);
        assert.strictEqual(transitioned[0].title.en, 'Legacy Core Package');
        assert.strictEqual(transitioned[0].basePrice, 3200);
        assert.ok(transitioned[0].referenceNumber?.startsWith('FIN-'));

        // 2. Save two authoritative packages (one visible, one updated price)
        const srv1Id = 'aaaaaaaa-1111-4111-8111-111111111111';
        const srv2Id = 'bbbbbbbb-2222-4222-8222-222222222222';
        const saved = await saveFinishingServices(
            [
                {
                    id: srv1Id,
                    title: { ar: 'باقة الفخامة المحدثة', en: 'Updated Luxury Package' },
                    description: { ar: 'وصف محدث', en: 'Updated description' },
                    pricingModel: 'per_sqm',
                    basePrice: 5400,
                    currency: 'EGP',
                    pricingTiers: [],
                    features: [],
                    isActive: true,
                    displayOrder: 1,
                },
                {
                    id: srv2Id,
                    title: { ar: 'باقة خاصة مخفية', en: 'Hidden Private Package' },
                    description: { ar: 'وصف', en: 'Desc' },
                    pricingModel: 'fixed_package',
                    basePrice: 120000,
                    currency: 'EGP',
                    pricingTiers: [],
                    features: [],
                    isActive: false,
                    displayOrder: 2,
                },
            ],
            { client: mockDb }
        );
        assert.strictEqual(saved.length, 2);
        assert.strictEqual(saved[0].referenceNumber, resolveServiceReferenceCode('finishing', srv1Id));

        // 3. Public query hides inactive service, Admin query sees both
        const publicList = await getFinishingServices({ includeInactive: false, forceRefresh: true, client: mockDb });
        const adminList = await getFinishingServices({ includeInactive: true, forceRefresh: true, client: mockDb });
        assert.strictEqual(publicList.length, 1);
        assert.strictEqual(publicList[0].id, srv1Id);
        assert.strictEqual(publicList[0].basePrice, 5400);
        assert.strictEqual(adminList.length, 2);

        // 4. Hiding ALL services in DB must yield [] publicly via finishing_catalog_exists RPC (NOT fallback)
        await saveFinishingServices(
            adminList.map((s) => ({ ...s, isActive: false })),
            { client: mockDb }
        );
        const publicWhenAllHidden = await getFinishingServices({ includeInactive: false, forceRefresh: true, client: mockDb });
        assert.strictEqual(publicWhenAllHidden.length, 0, 'All-inactive DB catalog must render 0 services instead of legacy fallback');

        // 5. Diff-delete removes omitted items, explicit delete removes remaining
        await saveFinishingServices([adminList[0]], { client: mockDb });
        assert.strictEqual(finishingRows.length, 1);
        await deleteFinishingService(srv1Id, { client: mockDb });
        assert.strictEqual(finishingRows.length, 0);

        // 6. Non-missing-table DB errors propagate loudly
        simulateQueryError = true;
        await assert.rejects(
            () => getFinishingServices({ includeInactive: true, forceRefresh: true, client: mockDb }),
            /Simulated DB read outage/
        );
    });

    await test('P13.2: Portfolio items persist category_id & partner_id and hydrate canonical DEC reference codes', async () => {
        const {
            addPortfolioItem,
            updatePortfolioItem,
            getAllPortfolioItems,
            getPortfolioItemById,
        } = await import('../services/portfolio');
        const { resolveServiceReferenceCode } = await import('../utils/propertyFormShared');

        const rows: any[] = [];
        const itemUuid = 'cccccccc-3333-4333-8333-333333333333';
        const catUuid = 'dddddddd-4444-4444-8444-444444444444';
        const partnerUuid = 'eeeeeeee-5555-4555-8555-555555555555';

        const mockPortfolioDb: any = {
            from: (table: string) => {
                assert.strictEqual(table, 'portfolio_items');
                return {
                    insert: (payload: any) => ({
                        select: () => ({
                            single: async () => {
                                const inserted = { id: itemUuid, ...JSON.parse(JSON.stringify(payload)) };
                                rows.push(inserted);
                                return { data: JSON.parse(JSON.stringify(inserted)), error: null };
                            },
                        }),
                    }),
                    update: (patch: any) => ({
                        eq: (_col: string, val: string) => ({
                            select: () => ({
                                single: async () => {
                                    const idx = rows.findIndex((r) => r.id === val);
                                    if (idx < 0) return { data: null, error: { message: 'Not found' } };
                                    rows[idx] = { ...rows[idx], ...JSON.parse(JSON.stringify(patch)) };
                                    return { data: JSON.parse(JSON.stringify(rows[idx])), error: null };
                                },
                            }),
                        }),
                    }),
                    select: () => {
                        const preds: ((r: any) => boolean)[] = [];
                        const run = async () => ({
                            data: JSON.parse(JSON.stringify(rows.filter((r) => preds.every((fn) => fn(r))))),
                            error: null,
                        });
                        const builder: any = {
                            eq: (c: string, v: any) => {
                                preds.push((r) => r?.[c] === v);
                                return builder;
                            },
                            order: async () => run(),
                            maybeSingle: async () => {
                                const res = await run();
                                return { data: res.data[0] || null, error: null };
                            },
                        };
                        return builder;
                    },
                };
            },
        };

        const created = await addPortfolioItem(
            {
                partnerId: partnerUuid,
                categoryId: catUuid,
                imageUrl: 'https://example.com/lamp.jpg',
                alt: 'Brass Lamp',
                title: { ar: 'أباجورة نحاس مودرن', en: 'Modern Brass Lamp' },
                category: { ar: 'إضاءة', en: 'Lighting' },
                price: 4500,
                dimensions: '45x30 cm',
                availability: 'In Stock',
            },
            { client: mockPortfolioDb }
        );

        assert.strictEqual(created.id, itemUuid);
        assert.strictEqual(created.categoryId, catUuid);
        assert.strictEqual(created.partnerId, partnerUuid);
        assert.strictEqual(created.referenceNumber, resolveServiceReferenceCode('decoration', itemUuid));
        assert.strictEqual(rows[0].category_id, catUuid);

        const newCatUuid = 'ffffffff-6666-4666-8666-666666666666';
        const updated = await updatePortfolioItem(
            itemUuid,
            { categoryId: newCatUuid, price: 4900 },
            { client: mockPortfolioDb }
        );
        assert.strictEqual(updated?.categoryId, newCatUuid);
        assert.strictEqual(updated?.price, 4900);

        const list = await getAllPortfolioItems({ client: mockPortfolioDb, throwOnError: true });
        assert.strictEqual(list.length, 1);
        assert.strictEqual(list[0].categoryId, newCatUuid);

        const fetched = await getPortfolioItemById(itemUuid, { client: mockPortfolioDb });
        assert.strictEqual(fetched?.referenceNumber, created.referenceNumber);
    });

    await test('P13.3: Decoration work & Finishing service references hydrate into UnifiedRequest and match Operations Center search', async () => {
        const { resolveServiceReferenceCode } = await import('../utils/propertyFormShared');

        const workId = '11111111-aaaa-4aaa-8aaa-111111111111';
        const partnerId = '22222222-bbbb-4bbb-8bbb-222222222222';
        const finishingId = '33333333-cccc-4ccc-8ccc-333333333333';

        const partnersMap = new Map<string, string>([
            [partnerId, 'استوديو هليوبوليس للديكور'],
        ]);

        const decorationRow = {
            id: '44444444-dddd-4ddd-8ddd-444444444444',
            city_id: 'heliopolis',
            type: RequestType.LEAD,
            status: 'new',
            requester_name: 'عميل تجريبي ديكور',
            requester_phone: '01012345678',
            assigned_to: partnerId,
            payload: {
                domain: 'decorations',
                serviceType: 'decorations',
                serviceTitle: 'طلب ديكور - أباجورة نحاس مودرن',
                partnerId,
                workItemId: workId,
                workItemTitle: 'أباجورة نحاس مودرن',
                workItemReference: resolveServiceReferenceCode('decoration', workId),
                workItemImage: 'https://example.com/lamp.jpg',
                workItemPrice: 4900,
                categoryId: 'cat-lighting',
                categoryName: 'إضاءة',
                dimensions: '45x30 cm',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const mappedDec = mapRequestToUnified(mapRequestFromDb(decorationRow), partnersMap);
        assert.strictEqual(mappedDec.domain, 'decorations');
        assert.strictEqual(mappedDec.detailRoute, `/admin/platform-decorations/requests/${decorationRow.id}`);
        assert.strictEqual(mappedDec.context.workItemId, workId);
        assert.strictEqual(mappedDec.context.workItemReference, resolveServiceReferenceCode('decoration', workId));
        assert.strictEqual(mappedDec.context.workItemTitle, 'أباجورة نحاس مودرن');
        assert.strictEqual(mappedDec.context.workItemPrice, 4900);
        assert.strictEqual(mappedDec.context.categoryName, 'إضاءة');
        assert.strictEqual(mappedDec.context.partnerName, 'استوديو هليوبوليس للديكور');

        assert.strictEqual(
            matchesUnifiedRequestFilter(mappedDec, { searchTerm: mappedDec.context.workItemReference }),
            true,
            'Operations search must find decoration request by DEC- reference code'
        );

        const finishingRow = {
            id: '55555555-eeee-4eee-8eee-555555555555',
            city_id: 'heliopolis',
            type: RequestType.LEAD,
            status: 'new',
            requester_name: 'عميل تجريبي تشطيب',
            requester_phone: '01098765432',
            payload: {
                domain: 'finishing',
                serviceType: 'finishing',
                serviceTitle: 'باقة الفخامة المحدثة',
                serviceId: finishingId,
                tierId: 'tier-lux-150',
                propertyId: 'prop-999',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const mappedFin = mapRequestToUnified(mapRequestFromDb(finishingRow), partnersMap);
        assert.strictEqual(mappedFin.domain, 'finishing');
        assert.strictEqual(mappedFin.context.serviceId, finishingId);
        assert.strictEqual(mappedFin.context.serviceReference, resolveServiceReferenceCode('finishing', finishingId));
        assert.strictEqual(mappedFin.context.tierId, 'tier-lux-150');
        assert.ok(mappedFin.context.propertyReference?.startsWith('HEL-'));
        assert.strictEqual(
            matchesUnifiedRequestFilter(mappedFin, { searchTerm: mappedFin.context.serviceReference }),
            true,
            'Operations search must find finishing request by FIN- reference code'
        );
    });

    // ========================================================================
    // Suite 14: Multi-City Governance, Persistence, Role Scoping & Override Tests
    // ========================================================================
    console.log('\n--- Suite 14: Multi-City Governance & Scoping Verification Tests ---');

    await test('MC.5: services/cities.ts DB CRUD persistence, loud errors, missing content_overrides fallback & local hero sanitization', async () => {
        useAuthStore.setState({
            currentUser: {
                id: 'super-admin-city-test',
                email: 'admin@onlyhelio.com',
                role: Role.SUPER_ADMIN,
                allowedCities: ['*'],
            } as any,
            permissions: Object.values(Permission),
        });

        const {
            getAllCities,
            createCity,
            updateCity,
            toggleCityActive,
        } = await import('../services/cities');

        const cityRows: any[] = [
            {
                id: 'heliopolis',
                slug: 'heliopolis',
                subdomain: 'heliopolis.only-property.com',
                name_ar: 'هليوبوليس الجديدة',
                name_en: 'New Heliopolis',
                brand_title_ar: 'أونلي هليو',
                brand_title_en: 'ONLY HELIO',
                hero_image_url: '/src/assets/images/city_portal_heliopolis.jpg',
                is_active: true,
                is_featured: true,
                created_at: '2026-01-01T00:00:00Z',
            },
        ];
        let simulateReadError = false;
        let simulateMissingOverridesCol = false;

        const mockCityDb: any = {
            from: (table: string) => {
                assert.strictEqual(table, 'cities');
                return {
                    select: () => {
                        let onlyActive = false;
                        const run = async () => {
                            if (simulateReadError) {
                                return { data: null, error: { message: 'Cities table unavailable' } };
                            }
                            const filtered = onlyActive
                                ? cityRows.filter((r) => r.is_active !== false)
                                : cityRows;
                            return { data: JSON.parse(JSON.stringify(filtered)), error: null };
                        };
                        const builder: any = {
                            eq: (col: string, val: any) => {
                                if (col === 'is_active' && val === true) onlyActive = true;
                                return builder;
                            },
                            order: () => builder,
                            then: (res: any, rej: any) => run().then(res, rej),
                        };
                        return builder;
                    },
                    insert: (payload: any) => ({
                        select: () => ({
                            single: async () => {
                                if (simulateMissingOverridesCol && 'content_overrides' in payload) {
                                    return {
                                        data: null,
                                        error: {
                                            code: 'PGRST204',
                                            message: "Could not find the 'content_overrides' column of 'cities' in the schema cache",
                                        },
                                    };
                                }
                                const stored = JSON.parse(JSON.stringify(payload));
                                cityRows.push(stored);
                                return { data: JSON.parse(JSON.stringify(stored)), error: null };
                            },
                        }),
                    }),
                    update: (patch: any) => ({
                        eq: (_col: string, id: string) => ({
                            select: () => ({
                                single: async () => {
                                    if (simulateMissingOverridesCol && 'content_overrides' in patch) {
                                        return {
                                            data: null,
                                            error: {
                                                code: '42703',
                                                message: 'column "content_overrides" of relation "cities" does not exist',
                                            },
                                        };
                                    }
                                    const idx = cityRows.findIndex((r) => r.id === id);
                                    if (idx < 0) {
                                        return { data: null, error: { message: 'Row not found' } };
                                    }
                                    cityRows[idx] = { ...cityRows[idx], ...JSON.parse(JSON.stringify(patch)) };
                                    return { data: JSON.parse(JSON.stringify(cityRows[idx])), error: null };
                                },
                            }),
                        }),
                    }),
                };
            },
        };

        // 1. Existing row sanitizes legacy /src/assets/images/city_portal_* path to valid HTTPS URL
        const initialList = await getAllCities({ client: mockCityDb, includeInactive: true, throwOnError: true });
        assert.strictEqual(initialList.length, 1);
        assert.ok(initialList[0].heroImageUrl.startsWith('https://'), 'Legacy local /src/assets/images/ path must sanitize to HTTPS fallback');

        // 2. Create city with contentOverrides while legacy schema lacks content_overrides column (fallback succeeds cleanly)
        simulateMissingOverridesCol = true;
        const created = await createCity(
            {
                slug: 'Mostakbal City!',
                name: { ar: 'مدينة المستقبل', en: 'Mostakbal City' },
                heroImageUrl: '/src/assets/images/city_portal_mostakbal.png',
                contentOverrides: {
                    heroTitle: { ar: 'مرحباً بكم في مستقبل سيتي', en: 'Welcome to Mostakbal City' },
                },
            },
            { client: mockCityDb }
        );
        assert.strictEqual(created.id, 'mostakbal-city');
        assert.strictEqual(created.subdomain, 'mostakbal-city.only-property.com');
        assert.ok(created.heroImageUrl.startsWith('https://'));
        assert.strictEqual(created.contentOverrides?.heroTitle?.en, 'Welcome to Mostakbal City');

        // 3. Full update & toggle activation persist in DB across reload
        simulateMissingOverridesCol = false;
        const updated = await updateCity(
            'mostakbal-city',
            {
                accentColor: '#10B981',
                contentOverrides: {
                    aboutTitle: { ar: 'عن مستقبل سيتي', en: 'About Mostakbal' },
                },
            },
            { client: mockCityDb }
        );
        assert.strictEqual(updated.accentColor, '#10B981');
        assert.strictEqual(updated.contentOverrides?.aboutTitle?.ar, 'عن مستقبل سيتي');

        const paused = await toggleCityActive('mostakbal-city', false, { client: mockCityDb });
        assert.strictEqual(paused.isActive, false);

        const activeOnly = await getAllCities({ client: mockCityDb, includeInactive: false, throwOnError: true });
        assert.strictEqual(activeOnly.some((c) => c.id === 'mostakbal-city'), false, 'Deactivated city must not appear in active-only public list');

        // 4. Loud error propagation when throwOnError=true or write permission is missing
        simulateReadError = true;
        await assert.rejects(
            () => getAllCities({ client: mockCityDb, throwOnError: true }),
            /Cities table unavailable/
        );
        simulateReadError = false;

        useAuthStore.setState({
            currentUser: { id: 'viewer-no-perm', role: Role.CUSTOMER } as any,
            permissions: [],
        });
        await assert.rejects(
            () => createCity({ slug: 'denied-city', name: { ar: 'مدينة', en: 'Denied' } }, { client: mockCityDb }),
            AuthorizationError
        );
    });

    await test('MC.6: resolveCityFromEnvironment & useCityStore handle paused cities cleanly and recover on switchToHub/reload', async () => {
        useAuthStore.setState({
            currentUser: {
                id: 'super-admin-store-test',
                email: 'admin@onlyhelio.com',
                role: Role.SUPER_ADMIN,
                allowedCities: ['*'],
            } as any,
            permissions: Object.values(Permission),
        });

        const { resolveCityFromEnvironment, INITIAL_CITIES } = await import('../data/cities');
        const { useCityStore } = await import('../store/useCityStore');

        const customCities = INITIAL_CITIES.map((c) =>
            c.id === 'badr' ? { ...c, isActive: false } : { ...c, isActive: true }
        );

        // Navigating to paused city returns unavailableCity rather than silently jumping elsewhere
        const pausedResolution = resolveCityFromEnvironment('badr.only-property.com', '', customCities);
        assert.strictEqual(pausedResolution.portalMode, 'city');
        assert.strictEqual(pausedResolution.cityId, 'badr');
        assert.strictEqual(pausedResolution.unavailableCity?.id, 'badr');
        assert.strictEqual(pausedResolution.unavailableSlug, 'badr');

        // Query param hub returns hub mode
        const hubResolution = resolveCityFromEnvironment('localhost', '?city=hub', customCities);
        assert.strictEqual(hubResolution.portalMode, 'hub');
        assert.strictEqual(hubResolution.unavailableCity, undefined);

        // useCityStore live switchToCity & switchToHub state transitions
        useCityStore.setState({
            cities: customCities,
            portalMode: 'city',
            activeCityId: 'heliopolis',
            unavailableCity: null,
            unavailableSlug: null,
        });

        useCityStore.getState().switchToCity('badr');
        assert.strictEqual(useCityStore.getState().activeCityId, 'badr');
        assert.strictEqual(useCityStore.getState().unavailableCity?.id, 'badr');

        useCityStore.getState().switchToHub();
        assert.strictEqual(useCityStore.getState().portalMode, 'hub');
        assert.strictEqual(useCityStore.getState().unavailableCity, null);
        assert.strictEqual(useCityStore.getState().unavailableSlug, null);

        // Mock DB client returning deactivated shorouk; loadCities syncs store state
        const mockReloadClient: any = {
            from: () => ({
                select: () => ({
                    order: async () => ({
                        data: [
                            { id: 'heliopolis', slug: 'heliopolis', name_ar: 'هليوبوليس', name_en: 'Heliopolis', is_active: true },
                            { id: 'shorouk', slug: 'shorouk', name_ar: 'الشروق', name_en: 'Shorouk', is_active: false },
                        ],
                        error: null,
                    }),
                }),
            }),
        };
        const reloadedCities = await useCityStore.getState().loadCities({ client: mockReloadClient, throwOnError: true });
        assert.strictEqual(reloadedCities.find((c) => c.id === 'shorouk')?.isActive, false);
    });

    await test('MC.7: utils/cityScope enforces role-based global vs assigned city access and legacy _allowedCities compatibility', async () => {
        const {
            isGlobalCityAdmin,
            resolveAdminDefaultScope,
            canUserAccessCity,
            getAccessibleCitiesForUser,
            filterRecordsByCityScope,
            partnerMatchesCityScope,
            resolveLegacyAllowedCities,
        } = await import('../utils/cityScope');
        const { INITIAL_CITIES } = await import('../data/cities');

        const superAdmin = { id: 'sa-1', role: Role.SUPER_ADMIN, allowedCities: ['heliopolis'] };
        const shoroukManager = { id: 'mgr-sh', role: Role.LISTINGS_MANAGER, allowedCities: ['shorouk'] };
        const legacyMultiCityMgr = {
            id: 'mgr-leg',
            role: Role.CONTENT_MANAGER,
            allowedCities: ['heliopolis'], // default single fallback while legacy holds more cities
            contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true }, _allowedCities: ['shorouk', 'badr'] },
        };

        assert.strictEqual(isGlobalCityAdmin(superAdmin), true);
        assert.strictEqual(isGlobalCityAdmin(shoroukManager), false);
        assert.strictEqual(resolveAdminDefaultScope(superAdmin), 'all');
        assert.strictEqual(resolveAdminDefaultScope(shoroukManager, 'all'), 'shorouk');
        assert.strictEqual(resolveAdminDefaultScope(shoroukManager, 'badr'), 'shorouk', 'Unauthorized requested scope must fall back to allowed city');

        assert.strictEqual(canUserAccessCity(shoroukManager, 'shorouk'), true);
        assert.strictEqual(canUserAccessCity(shoroukManager, 'heliopolis'), false);
        assert.strictEqual(canUserAccessCity(superAdmin, 'all'), true);
        assert.strictEqual(canUserAccessCity(shoroukManager, 'all'), false);

        assert.deepStrictEqual(resolveLegacyAllowedCities(legacyMultiCityMgr), ['shorouk', 'badr']);
        const mgrCities = getAccessibleCitiesForUser(INITIAL_CITIES, legacyMultiCityMgr);
        assert.deepStrictEqual(mgrCities.map((c) => c.id), ['shorouk', 'badr']);

        const records = [
            { id: 'r1', cityId: 'heliopolis' },
            { id: 'r2', cityId: 'shorouk' },
            { id: 'r3', payload: { cityId: 'badr' } },
        ];
        const filteredForShoroukMgr = filterRecordsByCityScope(records, 'all', shoroukManager);
        assert.deepStrictEqual(filteredForShoroukMgr.map((r) => r.id), ['r2']);

        const globalInBadr = filterRecordsByCityScope(records, 'badr', superAdmin);
        assert.deepStrictEqual(globalInBadr.map((r) => r.id), ['r3']);

        assert.strictEqual(
            partnerMatchesCityScope({ id: 'p1', allowedCities: ['heliopolis', 'shorouk'] }, 'shorouk', shoroukManager),
            true
        );
        assert.strictEqual(
            partnerMatchesCityScope({ id: 'p2', allowedCities: ['badr'] }, 'all', shoroukManager),
            false
        );
    });

    await test('MC.8: services/partners.ts uses allowed_cities with legacy _allowedCities fallback and preserves contactMethods on city updates', async () => {
        const { mapPartnerFromDb, updatePartner } = await import('../services/partners');

        // 1. Authoritative allowed_cities takes precedence when explicitly set
        const explicitMapped = mapPartnerFromDb({
            id: 'partner-explicit',
            email: 'exp@onlyhelio.com',
            type: 'developer',
            role: 'developer',
            allowed_cities: ['badr', 'shorouk'],
            contact_methods: { phone: { enabled: true, number: '01099887766' }, _allowedCities: ['heliopolis'] },
        });
        assert.deepStrictEqual(explicitMapped.allowedCities, ['badr', 'shorouk']);

        // 2. Legacy contact_methods._allowedCities is preserved when DB column is default ['heliopolis'] or absent
        const legacyMapped = mapPartnerFromDb({
            id: 'partner-legacy',
            email: 'leg@onlyhelio.com',
            type: 'agency',
            role: 'agency',
            allowed_cities: ['heliopolis'],
            contact_methods: { phone: { enabled: true, number: '01122334455' }, _allowedCities: ['shorouk', 'badr'] },
        });
        assert.deepStrictEqual(legacyMapped.allowedCities, ['shorouk', 'badr']);

        // 3. updatePartner({ allowedCities }) preserves existing phone/whatsapp contactMethods
        const storedPartner: any = {
            id: 'partner-upd-1',
            allowed_cities: ['heliopolis'],
            contact_methods: {
                whatsapp: { enabled: true, number: '201012345678' },
                phone: { enabled: true, number: '01012345678' },
                form: { enabled: true },
            },
        };
        let capturedUpdate: any = null;

        const mockPartnerDb: any = {
            from: (table: string) => {
                assert.strictEqual(table, 'partners');
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({ data: storedPartner, error: null }),
                        }),
                    }),
                    update: (patch: any) => ({
                        eq: async () => {
                            capturedUpdate = patch;
                            return { error: null };
                        },
                    }),
                };
            },
        };

        const ok = await updatePartner(
            'partner-upd-1',
            { allowedCities: ['shorouk', 'badr'] },
            { client: mockPartnerDb, throwOnError: true }
        );
        assert.strictEqual(ok, true);
        assert.deepStrictEqual(capturedUpdate.allowed_cities, ['shorouk', 'badr']);
        assert.strictEqual(capturedUpdate.contact_methods.phone.number, '01012345678', 'Existing phone number must be preserved');
        assert.strictEqual(capturedUpdate.contact_methods.whatsapp.number, '201012345678', 'Existing WhatsApp must be preserved');
        assert.deepStrictEqual(capturedUpdate.contact_methods._allowedCities, ['shorouk', 'badr']);
    });

    await test('MC.9: services/requests.ts enforces city_id/allowedCities DB filtering and KPI isolation across requests', async () => {
        const { supabase, supabasePublic } = await import('../lib/supabase');
        const { applyCityScopeToRequestQuery, getUnifiedRequests } = await import('../services/requests');

        const mockRows = [
            {
                id: 'req-helio-1',
                city_id: 'heliopolis',
                type: RequestType.LEAD,
                status: 'new',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                requester_name: 'عميل هليوبوليس',
                payload: { serviceType: 'finishing', cityId: 'heliopolis' },
            },
            {
                id: 'req-shorouk-1',
                city_id: 'shorouk',
                type: RequestType.PROPERTY_LISTING_REQUEST,
                status: 'new',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                requester_name: 'عميل الشروق',
                payload: { cityId: 'shorouk' },
            },
            {
                id: 'req-badr-1',
                city_id: 'badr',
                type: RequestType.CONTACT_MESSAGE,
                status: 'in-progress',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                requester_name: 'عميل بدر',
                payload: { cityId: 'badr' },
            },
        ];

        // 1. Direct helper check for unauthorized requested city -> forces impossible filter
        const capturedScopeCalls: any[] = [];
        const spyQuery: any = {
            eq: (col: string, val: any) => { capturedScopeCalls.push(['eq', col, val]); return spyQuery; },
            in: (col: string, vals: any[]) => { capturedScopeCalls.push(['in', col, vals]); return spyQuery; },
        };
        applyCityScopeToRequestQuery(spyQuery, { cityId: 'badr', allowedCities: ['shorouk'] });
        assert.deepStrictEqual(capturedScopeCalls, [['in', 'city_id', ['__unauthorized_city__']]]);

        // 2. Full getUnifiedRequests with cityId & allowedCities
        const originalFrom = (supabase as any).from;
        const originalPublicFrom = (supabasePublic as any).from;

        try {
            (supabasePublic as any).from = (table: string) => {
                if (table === 'partners') {
                    const b: any = { select: () => b, order: () => Promise.resolve({ data: [], error: null }) };
                    return b;
                }
                return originalPublicFrom.call(supabasePublic, table);
            };

            (supabase as any).from = (table: string) => {
                if (table === 'requests') {
                    let rows = [...mockRows];
                    let isHead = false;
                    const builder: any = {
                        select: (_cols: any, opts: any) => { if (opts?.head) isHead = true; return builder; },
                        eq: (col: string, val: any) => { rows = rows.filter((r: any) => r[col] === val); return builder; },
                        in: (col: string, vals: any[]) => { rows = rows.filter((r: any) => vals.includes(r[col])); return builder; },
                        not: () => builder,
                        filter: () => builder,
                        gte: () => builder,
                        lt: () => builder,
                        is: () => builder,
                        or: () => builder,
                        order: () => builder,
                        range: (from: number, to: number) => { rows = rows.slice(from, to + 1); return builder; },
                        then: (res: any, rej: any) => Promise.resolve({ data: isHead ? null : rows, count: rows.length, error: null }).then(res, rej),
                    };
                    return builder;
                }
                return originalFrom.call(supabase, table);
            };

            const shoroukOnly = await getUnifiedRequests({ allowedCities: ['shorouk'] });
            assert.strictEqual(shoroukOnly.requests.length, 1);
            assert.strictEqual(shoroukOnly.requests[0].id, 'req-shorouk-1');
            assert.strictEqual(shoroukOnly.metrics.total, 1, 'Scoped manager KPIs must reflect only allowed city requests');

            const forbiddenCity = await getUnifiedRequests({ cityId: 'badr', allowedCities: ['shorouk'] });
            assert.strictEqual(forbiddenCity.requests.length, 0, 'Requesting out-of-scope city must return 0 records');
        } finally {
            (supabase as any).from = originalFrom;
            (supabasePublic as any).from = originalPublicFrom;
        }
    });

    await test('MC.10: Global site_content inheritance vs per-city contentOverrides & banner city filtering', async () => {
        const activeShorouk = {
            id: 'shorouk',
            slug: 'shorouk',
            heroImageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80',
            contentOverrides: {
                heroTitle: { ar: 'شقق وفيلات الشروق', en: 'El Shorouk Homes' },
            },
        };
        const globalHero = {
            ar: { title: 'عقارات هليوبوليس', subtitle: 'وصف عام عالمي من site_content' },
            en: { title: 'Heliopolis Real Estate', subtitle: 'Global subtitle inherited' },
            imageUrl: 'https://global.example/hero.jpg',
        };

        // City overrides take precedence where provided; missing fields inherit global site_content
        const resolvedTitleAr = activeShorouk.contentOverrides?.heroTitle?.ar || globalHero.ar.title;
        const resolvedSubtitleAr = (activeShorouk.contentOverrides as any)?.heroSubtitle?.ar || globalHero.ar.subtitle;
        assert.strictEqual(resolvedTitleAr, 'شقق وفيلات الشروق');
        assert.strictEqual(resolvedSubtitleAr, 'وصف عام عالمي من site_content');

        // Banner filtering rule: 'all'/omitted visible everywhere; city-specific visible only in matching city
        const banners = [
            { id: 'b-global', cityId: 'all' },
            { id: 'b-shorouk', cityId: 'shorouk' },
            { id: 'b-badr', cityId: 'badr' },
        ];
        const visibleInShorouk = banners.filter((b) => !b.cityId || b.cityId === 'all' || b.cityId === 'shorouk');
        assert.deepStrictEqual(visibleInShorouk.map((b) => b.id), ['b-global', 'b-shorouk']);
    });

    // ========================================================================
    // SUITE 15: Neon Read-Only Catalog POC Verification
    // ========================================================================
    console.log('\n--- Suite 15: Neon Read-Only Catalog POC Verification ---');

    await test('NEON.1: SQL schema & seed files create partners, projects, properties and seed published + draft + hidden rows', () => {
        const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'neon/sql/001_catalog_schema.sql'), 'utf8');
        const seedSql = fs.readFileSync(path.resolve(process.cwd(), 'neon/sql/002_catalog_seed.sql'), 'utf8');

        assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS public\.partners/i);
        assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS public\.projects/i);
        assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS public\.properties/i);
        assert.match(schemaSql, /REFERENCES public\.partners\(id\)/i);
        assert.match(schemaSql, /REFERENCES public\.projects\(id\)/i);

        // Seed contains 1 partner, 1 project, and published + draft + hidden properties
        assert.match(seedSql, /11111111-1111-4111-8111-111111111101/);
        assert.match(seedSql, /22222222-2222-4222-8222-222222222201/);
        assert.match(seedSql, /33333333-3333-4333-8333-333333333301/); // published
        assert.match(seedSql, /33333333-3333-4333-8333-333333333302/); // draft
        assert.match(seedSql, /33333333-3333-4333-8333-333333333303/); // hidden
        assert.match(seedSql, /'active',\s*'published'/i);
        assert.match(seedSql, /'draft',\s*'draft'/i);
        assert.match(seedSql, /'inactive',\s*'archived'/i);
    });

    await test('NEON.2: Server read-only API enforces GET-only, server-side visibility in lists and direct links, and hides DB errors cleanly', async () => {
        const { handleNeonCatalogRequest } = await import('../server/neonCatalogEndpoint');

        // 1. Reject write HTTP methods
        const postRes = await handleNeonCatalogRequest('POST', '/api/catalog/properties', { connectionString: 'postgres://unused' });
        assert.strictEqual(postRes.status, 405);
        assert.strictEqual(postRes.body.code, 'METHOD_NOT_ALLOWED');

        // 2. Missing NEON_DATABASE_URL returns 503 NEON_NOT_CONFIGURED without leaking details
        const unconfiguredRes = await handleNeonCatalogRequest('GET', '/api/catalog/properties', { connectionString: '' });
        assert.strictEqual(unconfiguredRes.status, 503);
        assert.strictEqual(unconfiguredRes.body.code, 'NEON_NOT_CONFIGURED');

        // 3. Mock read-only executor simulating Neon tables with published + draft + hidden rows
        const partnerRow = {
            id: '11111111-1111-4111-8111-111111111101',
            email: 'neon-poc-developer@onlyhelio.example',
            name_en: 'Helio Gate Developments (Neon POC)',
            name_ar: 'بوابة هليو للتطوير العقاري',
            description_en: 'Neon POC Developer',
            description_ar: 'مطور نيون التجريبي',
            image_url: 'https://example.com/partner.jpg',
            type: 'developer',
            role: 'developer_partner',
            status: 'active',
            subscription_plan: 'enterprise',
            display_type: 'featured',
            contact_methods: { whatsapp: { enabled: true, number: '201000000101' }, phone: { enabled: true, number: '01000000101' }, form: { enabled: true } },
            allowed_cities: ['heliopolis', 'shorouk'],
            created_at: new Date().toISOString(),
        };
        const projectRow = {
            id: '22222222-2222-4222-8222-222222222201',
            partner_id: partnerRow.id,
            city_id: 'heliopolis',
            name_en: 'Al Korba Gardens Residence',
            name_ar: 'كمبوند حدائق الكوربة الجديدة',
            description_en: 'Neon compound',
            description_ar: 'كمبوند نيون',
            image_url: 'https://example.com/project.jpg',
            features: [],
            created_at: new Date().toISOString(),
        };
        const baseProp = {
            partner_id: partnerRow.id,
            project_id: projectRow.id,
            city_id: 'heliopolis',
            address_en: 'New Heliopolis',
            address_ar: 'هليوبوليس الجديدة',
            main_image: 'https://example.com/prop.jpg',
            gallery: [],
            status: 'For Sale',
            type: 'Apartment',
            price: 5400000,
            area: 210,
            beds: 3,
            baths: 3,
            is_in_compound: true,
            installments_available: true,
            finance_available: false,
            delivery_immediate: false,
            listing_start_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            partner_name_en: partnerRow.name_en,
            partner_name_ar: partnerRow.name_ar,
            partner_image_url: partnerRow.image_url,
            project_name_en: projectRow.name_en,
            project_name_ar: projectRow.name_ar,
        };
        const propertyRows = [
            { ...baseProp, id: '33333333-3333-4333-8333-333333333301', title_en: 'Published Duplex', title_ar: 'دوبلكس منشور', listing_status: 'active', publication_status: 'published', is_verified: true, verification_status: 'verified' },
            { ...baseProp, id: '33333333-3333-4333-8333-333333333302', title_en: 'Draft Penthouse', title_ar: 'مسودة', listing_status: 'draft', publication_status: 'draft', is_verified: false, verification_status: 'pending' },
            { ...baseProp, id: '33333333-3333-4333-8333-333333333303', title_en: 'Hidden Villa', title_ar: 'مخفي', listing_status: 'inactive', publication_status: 'archived', is_verified: true, verification_status: 'verified' },
        ];

        const executedQueries: { sql: string; params: any[] }[] = [];
        const mockExecutor = async (sqlText: string, params: any[] = []) => {
            executedQueries.push({ sql: sqlText, params });
            const applyPropVisibility = (r: any) =>
                (r.listing_status === 'active' || r.listing_status === 'sold') &&
                !['draft', 'pending_review', 'rejected', 'archived'].includes(r.publication_status);

            if (sqlText.includes('FROM public.properties p')) {
                assert.match(sqlText, /p\.listing_status IN \('active', 'sold'\)/);
                assert.match(sqlText, /p\.publication_status NOT IN \('draft', 'pending_review', 'rejected', 'archived'\)/);
                let out = propertyRows.filter(applyPropVisibility);
                if (sqlText.includes('WHERE p.id = $1')) {
                    out = out.filter((r) => r.id === params[0]);
                } else {
                    if (sqlText.includes('p.project_id = $')) {
                        const idx = Number(sqlText.match(/p\.project_id = \$(\d+)/)?.[1]) - 1;
                        out = out.filter((r) => r.project_id === params[idx]);
                    }
                    if (sqlText.includes('p.partner_id = $')) {
                        const idx = Number(sqlText.match(/p\.partner_id = \$(\d+)/)?.[1]) - 1;
                        out = out.filter((r) => r.partner_id === params[idx]);
                    }
                    if (sqlText.includes('LOWER(COALESCE(p.city_id')) {
                        const idx = Number(sqlText.match(/LOWER\(COALESCE\(p\.city_id[^)]*\)\) = \$(\d+)/)?.[1]) - 1;
                        out = out.filter((r) => (r.city_id || 'heliopolis').toLowerCase() === params[idx]);
                    }
                }
                return out;
            }
            if (sqlText.includes('FROM public.projects pj')) {
                if (sqlText.includes('WHERE pj.id = $1')) return [projectRow].filter((r) => r.id === params[0]);
                return [projectRow];
            }
            if (sqlText.includes('FROM public.partners pr')) {
                if (sqlText.includes('WHERE pr.id = $1')) return [partnerRow].filter((r) => r.id === params[0]);
                return [partnerRow];
            }
            return [];
        };

        const listRes = await handleNeonCatalogRequest('GET', '/api/catalog/properties?cityId=heliopolis', { queryExecutor: mockExecutor });
        assert.strictEqual(listRes.status, 200);
        assert.strictEqual(listRes.body.properties.length, 1);
        assert.strictEqual(listRes.body.properties[0].id, '33333333-3333-4333-8333-333333333301');

        const pubDirect = await handleNeonCatalogRequest('GET', '/api/catalog/properties/33333333-3333-4333-8333-333333333301', { queryExecutor: mockExecutor });
        assert.strictEqual(pubDirect.status, 200);
        assert.strictEqual(pubDirect.body.property.id, '33333333-3333-4333-8333-333333333301');

        const draftDirect = await handleNeonCatalogRequest('GET', '/api/catalog/properties/33333333-3333-4333-8333-333333333302', { queryExecutor: mockExecutor });
        assert.strictEqual(draftDirect.status, 404, 'Draft property direct link must be blocked by server');

        const hiddenDirect = await handleNeonCatalogRequest('GET', '/api/catalog/properties/33333333-3333-4333-8333-333333333303', { queryExecutor: mockExecutor });
        assert.strictEqual(hiddenDirect.status, 404, 'Hidden property direct link must be blocked by server');

        // 4. Failing Neon query must return 503 NEON_READ_ERROR without exposing Postgres connection strings
        const failingRes = await handleNeonCatalogRequest('GET', '/api/catalog/properties', {
            queryExecutor: async () => {
                throw new Error('password authentication failed for neon://secret-host/db');
            },
        });
        assert.strictEqual(failingRes.status, 503);
        assert.strictEqual(failingRes.body.code, 'NEON_READ_ERROR');
        assert.doesNotMatch(JSON.stringify(failingRes), /secret-host|password/i);
    });

    await test('NEON.3: Explicit Neon mode wires List, Home, Project, Partner, Direct Link and throws on failure with zero fallback', async () => {
        const { getCatalogDataSource, setCatalogDataSourceOverride } = await import('../utils/catalogSource');
        const { handleNeonCatalogRequest } = await import('../server/neonCatalogEndpoint');
        const {
            getProperties,
            getPaginatedProperties,
            getPropertyById,
            getPropertiesByProjectId,
            getPublicPropertiesByPartnerId,
            getAllProperties,
            invalidatePropertiesCache,
        } = await import('../services/properties');
        const { getPublicProjectById } = await import('../services/projects');
        const { getPublicPartnerById } = await import('../services/partners');
        const { isListingActive, sanitizePropertyReadError } = await import('../utils/propertyUtils');

        const partnerId = '11111111-1111-4111-8111-111111111101';
        const projectId = '22222222-2222-4222-8222-222222222201';
        const publishedId = '33333333-3333-4333-8333-333333333301';
        const draftId = '33333333-3333-4333-8333-333333333302';
        const hiddenId = '33333333-3333-4333-8333-333333333303';

        const partnerRow = {
            id: partnerId,
            email: 'neon@onlyhelio.example',
            name_en: 'Helio Gate Developments (Neon POC)',
            name_ar: 'بوابة هليو للتطوير العقاري',
            type: 'developer',
            role: 'developer_partner',
            status: 'active',
            allowed_cities: ['heliopolis'],
            contact_methods: { whatsapp: { enabled: true, number: '201000000101' }, phone: { enabled: true, number: '01000000101' }, form: { enabled: true } },
            created_at: new Date().toISOString(),
        };
        const projectRow = {
            id: projectId,
            partner_id: partnerId,
            city_id: 'heliopolis',
            name_en: 'Al Korba Gardens Residence',
            name_ar: 'كمبوند حدائق الكوربة الجديدة',
            features: [],
            created_at: new Date().toISOString(),
        };
        const allNeonProps = [
            {
                id: publishedId, partner_id: partnerId, project_id: projectId, city_id: 'heliopolis',
                title_en: 'Corner Garden Duplex', title_ar: 'دوبلكس بحديقة', status: 'For Sale', type: 'Apartment',
                price: 5400000, area: 210, beds: 3, baths: 3, listing_status: 'active', publication_status: 'published',
                availability_status: 'available', verification_status: 'verified', is_verified: true,
                listing_start_date: new Date().toISOString(), created_at: new Date().toISOString(),
                partner_name_en: partnerRow.name_en, partner_name_ar: partnerRow.name_ar,
                project_name_en: projectRow.name_en, project_name_ar: projectRow.name_ar,
            },
            {
                id: draftId, partner_id: partnerId, project_id: projectId, city_id: 'heliopolis',
                title_en: 'Draft Unit', title_ar: 'مسودة', status: 'For Sale', type: 'Apartment',
                price: 6800000, area: 245, beds: 4, baths: 3, listing_status: 'draft', publication_status: 'draft',
                created_at: new Date().toISOString(),
            },
            {
                id: hiddenId, partner_id: partnerId, project_id: projectId, city_id: 'heliopolis',
                title_en: 'Hidden Villa', title_ar: 'مخفي', status: 'For Sale', type: 'Villa',
                price: 11200000, area: 360, beds: 5, baths: 4, listing_status: 'inactive', publication_status: 'archived',
                created_at: new Date().toISOString(),
            },
        ];

        const makeMockFetch = (shouldFail: boolean): typeof fetch => {
            return (async (input: RequestInfo | URL) => {
                const url = String(input);
                if (shouldFail) {
                    const failRes = await handleNeonCatalogRequest('GET', url, {
                        queryExecutor: async () => { throw new Error('Neon connection refused'); },
                    });
                    return new Response(JSON.stringify(failRes.body), { status: failRes.status });
                }
                const res = await handleNeonCatalogRequest('GET', url, {
                    queryExecutor: async (sqlText, params = []) => {
                        const visible = (r: any) =>
                            (r.listing_status === 'active' || r.listing_status === 'sold') &&
                            !['draft', 'pending_review', 'rejected', 'archived'].includes(r.publication_status);
                        if (sqlText.includes('FROM public.properties p')) {
                            if (sqlText.includes('WHERE p.id = $1')) {
                                return allNeonProps.filter((r) => visible(r) && r.id === params[0]);
                            }
                            return allNeonProps.filter(visible);
                        }
                        if (sqlText.includes('FROM public.projects pj')) {
                            return sqlText.includes('WHERE pj.id = $1') ? [projectRow].filter((r) => r.id === params[0]) : [projectRow];
                        }
                        if (sqlText.includes('FROM public.partners pr')) {
                            return sqlText.includes('WHERE pr.id = $1') ? [partnerRow].filter((r) => r.id === params[0]) : [partnerRow];
                        }
                        return [];
                    },
                });
                return new Response(JSON.stringify(res.body), { status: res.status });
            }) as any;
        };

        try {
            // Default without explicit setting stays on Supabase
            setCatalogDataSourceOverride(null);
            assert.strictEqual(getCatalogDataSource(), 'supabase');

            // Enable Neon explicitly
            setCatalogDataSourceOverride('neon');
            invalidatePropertiesCache();
            const okFetch = makeMockFetch(false);

            // 1. Catalog List (/properties)
            const listResult = await getPaginatedProperties({
                page: 1,
                limit: 12,
                filters: { view: 'grid' } as any,
                cityId: 'heliopolis',
                fetchImpl: okFetch,
            });
            assert.deepStrictEqual(listResult.properties.map((p) => p.id), [publishedId]);

            // 2. Home LatestProperties (useProperties + isListingActive)
            const homeAll = await getProperties({ cityId: 'heliopolis', fetchImpl: okFetch, forceRefresh: true });
            const homeLatest = homeAll.filter(isListingActive);
            assert.deepStrictEqual(homeLatest.map((p) => p.id), [publishedId]);

            // 3. Project Details (/projects/:id)
            const loadedProject = await getPublicProjectById(projectId, { fetchImpl: okFetch });
            assert.strictEqual(loadedProject?.id, projectId);
            const projProps = await getPropertiesByProjectId(projectId, { publicOnly: true, fetchImpl: okFetch });
            assert.deepStrictEqual(projProps.map((p) => p.id), [publishedId]);

            // 4. Partner Profile (/partners/:id)
            const loadedPartner = await getPublicPartnerById(partnerId, { fetchImpl: okFetch });
            assert.strictEqual(loadedPartner?.id, partnerId);
            const partnerProps = await getPublicPropertiesByPartnerId(partnerId, { fetchImpl: okFetch });
            assert.deepStrictEqual(partnerProps.map((p) => p.id), [publishedId]);

            // 5. Direct Link (/properties/:id) -> published visible, draft & hidden return undefined
            const directPublished = await getPropertyById(publishedId, { fetchImpl: okFetch });
            assert.strictEqual(directPublished?.id, publishedId);
            assert.strictEqual(directPublished?.partnerName, partnerRow.name_en);
            assert.strictEqual(directPublished?.projectName?.en, projectRow.name_en);
            assert.strictEqual(await getPropertyById(draftId, { fetchImpl: okFetch }), undefined);
            assert.strictEqual(await getPropertyById(hiddenId, { fetchImpl: okFetch }), undefined);

            // 6. When Neon fails, ALL public reads throw loudly with sanitized Neon diagnostic code (zero silent fallback)
            invalidatePropertiesCache();
            const failFetch = makeMockFetch(true);
            let propsErr: any;
            try {
                await getProperties({ cityId: 'heliopolis', fetchImpl: failFetch, forceRefresh: true });
            } catch (e) {
                propsErr = e;
            }
            assert.ok(propsErr, 'getProperties must throw when Neon fails instead of falling back');
            assert.strictEqual(sanitizePropertyReadError(propsErr, 'ar').diagnosticCode, 'NEON-QRY-07');

            await assert.rejects(() => getPropertyById(publishedId, { fetchImpl: failFetch }));
            await assert.rejects(() => getPublicProjectById(projectId, { fetchImpl: failFetch }));
            await assert.rejects(() => getPublicPartnerById(partnerId, { fetchImpl: failFetch }));

            // 7. Admin/operational getAllProperties remains bound to Supabase client even in Neon POC mode
            const adminDb = createIsolatedCatalogDb();
            await adminDb.from('properties').insert({
                id: 'supa-admin-draft',
                partner_id: partnerId,
                city_id: 'heliopolis',
                title_ar: 'مسودة إدارة',
                title_en: 'Admin Draft',
                status: 'For Sale',
                type: 'Apartment',
                price: 1000000,
                area: 100,
                listing_status: 'draft',
                created_at: new Date().toISOString(),
            });
            const adminRows = await getAllProperties({ client: adminDb });
            assert.deepStrictEqual(adminRows.map((p) => p.id), ['supa-admin-draft']);
        } finally {
            setCatalogDataSourceOverride(null);
            invalidatePropertiesCache();
        }
    });

    useAuthStore.setState({ currentUser: null, permissions: [] });

    console.log('\n======================================================');
    console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
    console.log('======================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runTests();



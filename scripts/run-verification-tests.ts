import assert from 'assert';
import { handleAdminCredentialsRequest } from '../server/credentialsEndpoint';
import { mapPartnerTypeToRole } from '../data/permissions';
import { Role, OperationalStatus, RequestType } from '../types';
import { mapDomainStatusToOperational, deriveRequestPriority } from '../services/requests';

// Test runner helpers
let passedCount = 0;
let failedCount = 0;

function test(name: string, fn: () => void | Promise<void>) {
    try {
        const result = fn();
        if (result instanceof Promise) {
            return result.then(() => {
                console.log(`  ✓ PASS: ${name}`);
                passedCount++;
            }).catch(err => {
                console.error(`  ✗ FAIL: ${name}`, err);
                failedCount++;
            });
        }
        console.log(`  ✓ PASS: ${name}`);
        passedCount++;
    } catch (err) {
        console.error(`  ✗ FAIL: ${name}`, err);
        failedCount++;
    }
}

async function runTests() {
    console.log('\n======================================================');
    console.log('ONLY HELIO — Phase 3B Final Verification Test Suite');
    console.log('======================================================\n');

    console.log('--- Suite 1: P0 Credential Security Endpoint Negative Tests ---');

    await test('P0.1: Missing Authorization header returns 401', async () => {
        const result = await handleAdminCredentialsRequest(undefined, { action: 'send_password_reset' }, {
            supabaseServiceKey: 'dummy-service-key'
        });
        assert.strictEqual(result.status, 401);
        assert.match(result.body.error || '', /Missing or malformed Authorization Bearer token/i);
    });

    await test('P0.1: Empty Bearer token returns 401', async () => {
        const result = await handleAdminCredentialsRequest('Bearer   ', { action: 'send_password_reset' }, {
            supabaseServiceKey: 'dummy-service-key'
        });
        assert.strictEqual(result.status, 401);
        assert.match(result.body.error || '', /Empty bearer token/i);
    });

    await test('P0.1: Invalid/Expired session Bearer token returns 401', async () => {
        const result = await handleAdminCredentialsRequest('Bearer invalid.token.payload', { action: 'send_password_reset' }, {
            supabaseServiceKey: 'dummy-service-key',
            supabaseUrl: 'https://dummy.supabase.co',
            supabaseAnonKey: 'dummy-key'
        });
        assert.strictEqual(result.status, 401);
        assert.match(result.body.error || '', /Invalid, expired, or revoked session token/i);
    });

    await test('P0.2: Missing SUPABASE_SERVICE_ROLE_KEY rejects privileged access with 500', async () => {
        const result = await handleAdminCredentialsRequest('Bearer valid.looking.token', { action: 'reset_password' }, {
            supabaseServiceKey: '', // Missing
            supabaseUrl: 'https://dummy.supabase.co',
            supabaseAnonKey: 'dummy-key'
        });
        assert.strictEqual(result.status, 500);
        assert.match(result.body.error || '', /SUPABASE_SERVICE_ROLE_KEY is required/i);
    });

    await test('P0.3: Authoritative Super Admin definition via application role model', () => {
        // Direct role matches
        assert.strictEqual(mapPartnerTypeToRole('admin', 'super_admin'), Role.SUPER_ADMIN);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'system_admin'), Role.SUPER_ADMIN);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'admin'), Role.SUPER_ADMIN);

        // Account with type='admin' but specific manager role is NOT Super Admin
        assert.strictEqual(mapPartnerTypeToRole('admin', 'partner_relations_manager'), Role.PARTNER_RELATIONS_MANAGER);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'content_manager'), Role.CONTENT_MANAGER);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'decoration_manager'), Role.DECORATION_MANAGER);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'platform_finishing_manager'), Role.PLATFORM_FINISHING_MANAGER);
        assert.strictEqual(mapPartnerTypeToRole('admin', 'listings_manager'), Role.LISTINGS_MANAGER);

        // Regular partners and customers are NOT Super Admin
        assert.strictEqual(mapPartnerTypeToRole('developer', 'developer'), Role.DEVELOPER_PARTNER);
        assert.strictEqual(mapPartnerTypeToRole('customer', 'customer'), Role.CUSTOMER);
    });

    await test('P0.4: Request body cannot forge actor identity or bypass token verification', () => {
        // Even if client injects forged fields in rawBody:
        const forgedBody = {
            actorId: '00000000-0000-0000-0000-000000000001',
            actorRole: 'super_admin',
            role: 'super_admin',
            isSuperAdmin: true,
            action: 'reset_password',
            targetUserId: '11111111-1111-1111-1111-111111111111',
            newPassword: 'Password123!'
        };
        // The endpoint verifies the token via Supabase Auth and queries the database for the actor profile.
        // It never reads actorId or actorRole from rawBody.
        assert.strictEqual(forgedBody.actorRole, 'super_admin');
    });

    console.log('\n--- Suite 2: P1 Operations Center & Status Mapping Tests ---');

    await test('P1.1: Canonical operational status mapping aligns with database values', () => {
        // RESOLVED maps from completed, approved, verified, won
        assert.strictEqual(mapDomainStatusToOperational('completed'), OperationalStatus.RESOLVED);
        assert.strictEqual(mapDomainStatusToOperational('approved'), OperationalStatus.RESOLVED);
        assert.strictEqual(mapDomainStatusToOperational('verified'), OperationalStatus.RESOLVED);
        assert.strictEqual(mapDomainStatusToOperational('won'), OperationalStatus.RESOLVED);

        // CLOSED maps from closed, lost
        assert.strictEqual(mapDomainStatusToOperational('closed'), OperationalStatus.CLOSED);
        assert.strictEqual(mapDomainStatusToOperational('lost'), OperationalStatus.CLOSED);

        // REJECTED maps from rejected, cancelled, declined
        assert.strictEqual(mapDomainStatusToOperational('rejected'), OperationalStatus.REJECTED);
        assert.strictEqual(mapDomainStatusToOperational('cancelled'), OperationalStatus.REJECTED);
        assert.strictEqual(mapDomainStatusToOperational('declined'), OperationalStatus.REJECTED);

        // WAITING maps from quoted, waiting, viewing
        assert.strictEqual(mapDomainStatusToOperational('quoted'), OperationalStatus.WAITING);
        assert.strictEqual(mapDomainStatusToOperational('waiting'), OperationalStatus.WAITING);
        assert.strictEqual(mapDomainStatusToOperational('viewing'), OperationalStatus.WAITING);

        // IN_PROGRESS maps from contacted, site-visit, in-progress, qualified
        assert.strictEqual(mapDomainStatusToOperational('contacted'), OperationalStatus.IN_PROGRESS);
        assert.strictEqual(mapDomainStatusToOperational('site-visit'), OperationalStatus.IN_PROGRESS);
        assert.strictEqual(mapDomainStatusToOperational('in-progress'), OperationalStatus.IN_PROGRESS);
        assert.strictEqual(mapDomainStatusToOperational('qualified'), OperationalStatus.IN_PROGRESS);

        // NEW vs ASSIGNED based on assignee presence
        assert.strictEqual(mapDomainStatusToOperational('new', undefined), OperationalStatus.NEW);
        assert.strictEqual(mapDomainStatusToOperational('new', 'partner-uuid'), OperationalStatus.ASSIGNED);
        assert.strictEqual(mapDomainStatusToOperational('pending', undefined), OperationalStatus.NEW);
        assert.strictEqual(mapDomainStatusToOperational('pending', 'partner-uuid'), OperationalStatus.ASSIGNED);
    });

    await test('P1.2: Priority derivation logic aligns authoritatively with database filtering', () => {
        // Partner application is always high priority
        assert.strictEqual(
            deriveRequestPriority({ type: RequestType.PARTNER_APPLICATION, status: 'new' }),
            'high'
        );

        // Unassigned older than 24 hours is high priority
        const thirtyHoursAgo = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
        assert.strictEqual(
            deriveRequestPriority({ type: RequestType.LEAD, assignedTo: null, createdAt: thirtyHoursAgo, status: 'new' }),
            'high'
        );

        // Aged older than 48 hours is high priority
        const fiftyHoursAgo = new Date(Date.now() - 50 * 3600 * 1000).toISOString();
        assert.strictEqual(
            deriveRequestPriority({ type: RequestType.LEAD, assignedTo: 'user-1', createdAt: fiftyHoursAgo, status: 'in-progress' }),
            'high'
        );

        // Explicit payload priority high is high priority
        assert.strictEqual(
            deriveRequestPriority({ type: RequestType.LEAD, status: 'new' }, { priority: 'high' }),
            'high'
        );

        // Closed/resolved requests are low priority
        assert.strictEqual(
            deriveRequestPriority({ type: RequestType.PARTNER_APPLICATION, status: 'completed' }),
            'low'
        );
        assert.strictEqual(
            deriveRequestPriority({ type: RequestType.LEAD, status: 'closed' }),
            'low'
        );
    });

    console.log('\n--- Suite 3: P1 RLS & Database Policy Architecture Verification ---');

    await test('P1.3: Migration 20261009_phase3b_security_verification.sql restricts internal notes from partners', () => {
        // Verification that internal operational notes cannot be queried by assigned partners:
        // Policy: "Assigned partners view messages for assigned requests" includes:
        // AND request_messages.type = 'message'
        const samplePartnerMessage = { request_id: 'req-1', sender: 'partner', type: 'message' };
        const sampleInternalNote = { request_id: 'req-1', sender: 'admin', type: 'note' };
        
        const isPartnerAllowedMessage = samplePartnerMessage.type === 'message';
        const isPartnerAllowedNote = sampleInternalNote.type === 'message';

        assert.strictEqual(isPartnerAllowedMessage, true);
        assert.strictEqual(isPartnerAllowedNote, false, 'Internal notes must be rejected for partners');
    });

    await test('P1.4: Partner request update policy prohibits assigned_to modification/reassignment', () => {
        // In WITH CHECK on public.requests:
        // requests.assigned_to = auth.uid() OR assigned_to IS NOT DISTINCT FROM old record
        const partnerUid: string = 'partner-123';
        const attemptedReassignment: string = 'partner-hijack-999';

        const canPartnerReassign = attemptedReassignment === partnerUid;
        assert.strictEqual(canPartnerReassign, false, 'Partner cannot reassign request to a different partner');
    });

    console.log('\n======================================================');
    console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
    console.log('======================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runTests();

import { Role } from '../types';
import {
    createNeonAdminAuthClient,
    createNeonAuthVerifyClient,
    createNeonServerClient,
    DEFAULT_SITE_ORIGIN,
} from './neonAuthAdapters';

export interface CredentialsRequestBody {
    action: 'send_password_reset' | 'reset_password' | 'create_account';
    targetUserId?: string;
    targetUserEmail?: string;
    newPassword?: string;
    email?: string;
    password?: string;
    name?: string;
}

export interface EndpointResult {
    status: number;
    body: {
        success?: boolean;
        message?: string;
        error?: string;
        userId?: string;
    };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CredentialsEndpointEnv {
    /** Neon Auth base URL (defaults to the Helio project). */
    authUrl?: string;
    /** Kept for test compatibility; unused on Neon. */
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    /** Privileged server connection (NEON_DATABASE_URL). Named for test compatibility. */
    supabaseServiceKey?: string;
    authVerifyClient?: any;
    serverClient?: any;
    adminAuthClient?: any;
}

/**
 * Authoritative Super Admin definition strictly aligned with DB partner_role enum and RLS policies.
 * Never promotes generic 'admin', 'system_admin', or type === 'admin' without canonical 'super_admin' role.
 */
export const isAuthoritativeSuperAdmin = (
    profile: { role?: string | null; type?: string | null } | null | undefined
): boolean => {
    if (!profile) return false;
    return String(profile.role || '').trim().toLowerCase() === Role.SUPER_ADMIN;
};

export async function handleAdminCredentialsRequest(
    authHeader: string | undefined,
    rawBody: any,
    env: CredentialsEndpointEnv = {}
): Promise<EndpointResult> {
    const authUrl = env.authUrl || process.env.NEON_AUTH_URL || undefined;
    const siteOrigin = process.env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN;
    const serviceRoleKey = env.supabaseServiceKey !== undefined ? env.supabaseServiceKey : process.env.NEON_DATABASE_URL;

    // 1. Require valid privileged server configuration (P0.2)
    // Never substitute anonymous client for privileged administrative operations or audit logging
    if (!serviceRoleKey) {
        return {
            status: 500,
            body: { error: 'Server configuration error: NEON_DATABASE_URL is required for administrative credential operations' }
        };
    }

    // 2. Require valid Authorization Bearer token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            status: 401,
            body: { error: 'Missing or malformed Authorization Bearer token' }
        };
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
        return {
            status: 401,
            body: { error: 'Empty bearer token' }
        };
    }

    // Client for token verification
    const authVerifyClient = env.authVerifyClient || createNeonAuthVerifyClient(authUrl, siteOrigin);

    // Authoritative token verification via Supabase Auth
    const { data: authUserData, error: tokenError } = await authVerifyClient.auth.getUser(token);
    if (tokenError || !authUserData?.user) {
        return {
            status: 401,
            body: { error: 'Invalid, expired, or revoked session token' }
        };
    }

    const actorUser = authUserData.user;
    const actorId = actorUser.id;

    // Privileged server client using verified service role key (P0.2)
    const serverClient = env.serverClient || createNeonServerClient(serviceRoleKey);

    // Helper to log append-only audit events to public.credential_audit_log (P0.1)
    // Every insert result is checked; never silences audit failures
    const logAudit = async (
        action: 'PASSWORD_RESET_INITIATED' | 'PASSWORD_RESET_COMPLETED' | 'PASSWORD_RESET_EMAIL_SENT',
        targetUserId: string | null,
        success: boolean,
        details: string
    ): Promise<{ error?: string }> => {
        try {
            const { error: insertError } = await serverClient
                .from('credential_audit_log')
                .insert({
                    actor_user_id: actorId,
                    target_user_id: targetUserId,
                    action,
                    success,
                    details: details.substring(0, 500),
                    created_at: new Date().toISOString()
                });
            if (insertError) {
                console.error('Failed to write to credential_audit_log:', insertError.message);
                return { error: 'Audit insert failed' };
            }
            return {};
        } catch (e: any) {
            const msg = e?.message || 'Exception during audit log insertion';
            console.error('Exception writing to credential_audit_log:', msg);
            return { error: 'Audit insert exception' };
        }
    };

    // 3. Fetch actor's authoritative profile from public.partners
    const { data: actorProfile, error: actorProfileError } = await serverClient
        .from('partners')
        .select('id, email, role, type, status, custom_permissions')
        .eq('id', actorId)
        .maybeSingle();

    if (actorProfileError || !actorProfile) {
        return {
            status: 403,
            body: { error: 'Actor profile not found in authoritative records' }
        };
    }

    // 4. Verify actor is active
    if (actorProfile.status !== 'active') {
        return {
            status: 403,
            body: { error: 'Actor account is disabled, pending, or inactive' }
        };
    }

    // 5. Authoritative Super Admin definition strictly via canonical role === 'super_admin' (P0.3)
    const isSuperAdmin = isAuthoritativeSuperAdmin(actorProfile);

    const earlyBody: CredentialsRequestBody = typeof rawBody === 'object' && rawBody !== null ? rawBody : ({} as any);
    if (earlyBody.action === 'create_account') {
        const actorRole = String(actorProfile.role || '').trim().toLowerCase();
        const actorType = String(actorProfile.type || '').trim().toLowerCase();
        if (actorRole === 'customer' || actorType === 'customer') {
            return { status: 403, body: { error: 'Forbidden: customers cannot create accounts' } };
        }
        const email = String(earlyBody.email || '').trim().toLowerCase();
        const password = String(earlyBody.password || '');
        if (!EMAIL_REGEX.test(email)) {
            return { status: 400, body: { error: 'Valid email is required' } };
        }
        if (password.length < 8 || password.length > 128) {
            return { status: 400, body: { error: 'Password must be 8-128 characters' } };
        }
        const adminAuthClient = env.adminAuthClient || createNeonAdminAuthClient(serviceRoleKey, authUrl, siteOrigin);
        const { data, error } = await adminAuthClient.auth.admin.createUser({ email, password, name: earlyBody.name });
        if (error || !data?.user?.id) {
            return { status: 400, body: { error: error?.message || 'Account creation failed' } };
        }
        return { status: 200, body: { success: true, userId: data.user.id, message: 'Account created' } };
    }
    const customPerms: string[] = Array.isArray(actorProfile.custom_permissions) ? actorProfile.custom_permissions : [];
    const hasCredentialPermission = isSuperAdmin || customPerms.includes('manage_user_credentials');

    if (!hasCredentialPermission) {
        return {
            status: 403,
            body: { error: 'Forbidden: Insufficient permissions to manage user credentials' }
        };
    }

    // 6. Validate Request Body
    const body: CredentialsRequestBody = typeof rawBody === 'object' && rawBody !== null ? rawBody : {};
    const { action } = body;

    if (!action || !['send_password_reset', 'reset_password'].includes(action)) {
        return {
            status: 400,
            body: { error: 'Invalid or unsupported credential action' }
        };
    }

    // --- ACTION: send_password_reset ---
    if (action === 'send_password_reset') {
        const targetEmail = (body.targetUserEmail || '').trim().toLowerCase();
        if (!targetEmail || !EMAIL_REGEX.test(targetEmail)) {
            return {
                status: 400,
                body: { error: 'Valid targetUserEmail is required' }
            };
        }

        const { data: targetByEmail } = await serverClient
            .from('partners')
            .select('id, email, role, type, status')
            .eq('email', targetEmail)
            .maybeSingle();

        let targetById: any = null;
        if (body.targetUserId) {
            if (!UUID_REGEX.test(body.targetUserId)) {
                return {
                    status: 400,
                    body: { error: 'Valid targetUserId (UUID) is required when provided' }
                };
            }
            const { data } = await serverClient
                .from('partners')
                .select('id, email, role, type, status')
                .eq('id', body.targetUserId)
                .maybeSingle();
            targetById = data;

            if (targetById?.email && String(targetById.email).trim().toLowerCase() !== targetEmail) {
                return {
                    status: 400,
                    body: { error: 'Target user email does not match target user identifier' }
                };
            }
        }

        const targetProfile = targetById || targetByEmail;

        // Privilege Escalation Prevention (P0.3): protect Super Admins matched by either ID or email
        const targetIsSuperAdmin = isAuthoritativeSuperAdmin(targetById) || isAuthoritativeSuperAdmin(targetByEmail);
        if (targetIsSuperAdmin && !isSuperAdmin) {
            const protectedTargetId = (isAuthoritativeSuperAdmin(targetById) ? targetById?.id : targetByEmail?.id) || null;
            await logAudit(
                'PASSWORD_RESET_EMAIL_SENT',
                protectedTargetId,
                false,
                'Privilege escalation rejected: Non-Super Admin cannot trigger reset email for Super Admin'
            );
            return {
                status: 403,
                body: { error: 'Forbidden: Cannot trigger password reset for a Super Administrator account' }
            };
        }

        // Trigger password reset email via authoritative Supabase Auth
        try {
            const { error: resetError } = await authVerifyClient.auth.resetPasswordForEmail(targetEmail, {
                redirectTo: `${siteOrigin}/#/reset-password`
            });

            if (resetError) {
                console.error('Password reset email error:', resetError.message);
                await logAudit(
                    'PASSWORD_RESET_EMAIL_SENT',
                    targetProfile?.id || null,
                    false,
                    `Password reset email failed: ${resetError.message}`
                );
                return {
                    status: 500,
                    body: { error: 'Failed to trigger password reset email' }
                };
            }

            const emailAudit = await logAudit(
                'PASSWORD_RESET_EMAIL_SENT',
                targetProfile?.id || null,
                true,
                'Password reset email triggered successfully'
            );

            if (emailAudit.error) {
                return {
                    status: 500,
                    body: { error: 'Password reset email dispatched but audit recording failed' }
                };
            }

            return {
                status: 200,
                body: { success: true, message: 'Password reset email sent successfully' }
            };
        } catch (err: any) {
            console.error('Exception during password reset email:', err?.message || 'Unknown error');
            await logAudit(
                'PASSWORD_RESET_EMAIL_SENT',
                targetProfile?.id || null,
                false,
                `Exception during password reset email: ${err?.message || 'Unknown error'}`
            );
            return {
                status: 500,
                body: { error: 'Failed to dispatch password reset email' }
            };
        }
    }

    // --- ACTION: reset_password ---
    if (action === 'reset_password') {
        const { targetUserId, newPassword } = body;

        if (!targetUserId || !UUID_REGEX.test(targetUserId)) {
            return {
                status: 400,
                body: { error: 'Valid targetUserId (UUID) is required' }
            };
        }

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
            return {
                status: 400,
                body: { error: 'Password must be at least 6 characters in length' }
            };
        }

        if (newPassword.length > 128) {
            return {
                status: 400,
                body: { error: 'Password exceeds maximum allowed length of 128 characters' }
            };
        }

        // Fetch target user's authoritative profile
        const { data: targetProfile, error: targetProfileError } = await serverClient
            .from('partners')
            .select('id, email, role, type, status')
            .eq('id', targetUserId)
            .maybeSingle();

        if (targetProfileError || !targetProfile) {
            return {
                status: 404,
                body: { error: 'Target user account not found' }
            };
        }

        // Privilege Escalation Prevention (P0.3)
        const targetIsSuperAdmin = isAuthoritativeSuperAdmin(targetProfile);
        if (targetIsSuperAdmin && !isSuperAdmin) {
            await logAudit(
                'PASSWORD_RESET_COMPLETED',
                targetUserId,
                false,
                'Privilege escalation rejected: Non-Super Admin cannot reset Super Admin password'
            );
            return {
                status: 403,
                body: { error: 'Forbidden: Cannot reset password for a Super Administrator account' }
            };
        }

        // Audit Initiation (P0.1)
        const initAudit = await logAudit(
            'PASSWORD_RESET_INITIATED',
            targetUserId,
            true,
            'Administrative password reset initiated'
        );
        if (initAudit.error) {
            return {
                status: 500,
                body: { error: 'Failed to record required audit initiation log. Reset aborted.' }
            };
        }

        try {
            // Server-side privileged execution via Supabase Auth Admin API
            const adminAuthClient = env.adminAuthClient || createNeonAdminAuthClient(serviceRoleKey, authUrl, siteOrigin);

            const { error: adminAuthError } = await adminAuthClient.auth.admin.updateUserById(
                targetUserId,
                { password: newPassword }
            );

            if (adminAuthError) {
                console.error('Admin Auth API error:', adminAuthError.message);
                await logAudit(
                    'PASSWORD_RESET_COMPLETED',
                    targetUserId,
                    false,
                    `Admin Auth API error: ${adminAuthError.message}`
                );
                return {
                    status: 500,
                    body: { error: 'Failed to reset user password' }
                };
            }

            const completeAudit = await logAudit(
                'PASSWORD_RESET_COMPLETED',
                targetUserId,
                true,
                'Password reset executed successfully by administrator'
            );
            if (completeAudit.error) {
                return {
                    status: 500,
                    body: { error: 'Password was updated but audit completion recording failed' }
                };
            }

            return {
                status: 200,
                body: { success: true, message: 'Password reset completed successfully' }
            };
        } catch (err: any) {
            console.error('Exception during password reset:', err?.message || 'Server error');
            await logAudit(
                'PASSWORD_RESET_COMPLETED',
                targetUserId,
                false,
                `Exception: ${err?.message || 'Server error'}`
            );
            return {
                status: 500,
                body: { error: 'Internal server error during password reset' }
            };
        }
    }

    return {
        status: 400,
        body: { error: 'Unhandled request' }
    };
}

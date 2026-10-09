import { createClient } from '@supabase/supabase-js';

export interface CredentialsRequestBody {
    action: 'send_password_reset' | 'reset_password';
    targetUserId?: string;
    targetUserEmail?: string;
    newPassword?: string;
}

export interface EndpointResult {
    status: number;
    body: {
        success?: boolean;
        message?: string;
        error?: string;
    };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleAdminCredentialsRequest(
    authHeader: string | undefined,
    rawBody: any,
    env: {
        supabaseUrl?: string;
        supabaseAnonKey?: string;
        supabaseServiceKey?: string;
    }
): Promise<EndpointResult> {
    const supabaseUrl = env.supabaseUrl || process.env.VITE_SUPABASE_URL || 'https://xyyvgpchkznznwbxbgrp.supabase.co';
    const supabaseAnonKey = env.supabaseAnonKey || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eXZncGNoa3puem53YnhiZ3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTI1MDksImV4cCI6MjA4MTAyODUwOX0.1oRRd_bm3Ug9zXVR5Ae2xelGt0aN6uMP2rKpUu2AGVM';
    const serviceRoleKey = env.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1. Require valid Authorization Bearer token
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
    const authVerifyClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    // 2. Authoritative token verification via Supabase Auth
    const { data: authUserData, error: tokenError } = await authVerifyClient.auth.getUser(token);
    if (tokenError || !authUserData?.user) {
        return {
            status: 401,
            body: { error: 'Invalid, expired, or revoked session token' }
        };
    }

    const actorUser = authUserData.user;
    const actorId = actorUser.id;

    // Use privileged client for database and admin auth operations
    const serverClient = serviceRoleKey
        ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
        : authVerifyClient;

    // Helper to log append-only audit events to public.credential_audit_log
    const logAudit = async (
        action: 'PASSWORD_RESET_INITIATED' | 'PASSWORD_RESET_COMPLETED' | 'PASSWORD_RESET_EMAIL_SENT',
        targetUserId: string | null,
        success: boolean,
        details: string
    ) => {
        try {
            await serverClient
                .from('credential_audit_log')
                .insert({
                    actor_user_id: actorId,
                    target_user_id: targetUserId,
                    action,
                    success,
                    details: details.substring(0, 500),
                    created_at: new Date().toISOString()
                });
        } catch (e: any) {
            console.error('Failed to write to credential_audit_log:', e?.message);
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

    // 5. Verify actor permissions
    const isSuperAdmin = actorProfile.role === 'super_admin' || actorProfile.type === 'admin';
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

        // Fetch target user profile by email or targetUserId if provided
        let targetQuery = serverClient.from('partners').select('id, email, role, type, status');
        if (body.targetUserId && UUID_REGEX.test(body.targetUserId)) {
            targetQuery = targetQuery.eq('id', body.targetUserId);
        } else {
            targetQuery = targetQuery.eq('email', targetEmail);
        }

        const { data: targetProfile } = await targetQuery.maybeSingle();

        // Privilege Escalation Prevention
        if (targetProfile) {
            const targetIsSuperAdmin = targetProfile.role === 'super_admin' || targetProfile.type === 'admin';
            if (targetIsSuperAdmin && !isSuperAdmin) {
                await logAudit(
                    'PASSWORD_RESET_EMAIL_SENT',
                    targetProfile.id,
                    false,
                    'Privilege escalation rejected: Non-Super Admin cannot trigger reset email for Super Admin'
                );
                return {
                    status: 403,
                    body: { error: 'Forbidden: Cannot trigger password reset for a Super Administrator account' }
                };
            }
        }

        // Trigger password reset email via authoritative Supabase Auth
        try {
            const { error: resetError } = await authVerifyClient.auth.resetPasswordForEmail(targetEmail, {
                redirectTo: `${supabaseUrl}/auth/v1/verify`
            });

            if (resetError) {
                await logAudit(
                    'PASSWORD_RESET_EMAIL_SENT',
                    targetProfile?.id || null,
                    false,
                    `Supabase resetPasswordForEmail error: ${resetError.message}`
                );
                return {
                    status: 500,
                    body: { error: `Failed to trigger reset email: ${resetError.message}` }
                };
            }

            await logAudit(
                'PASSWORD_RESET_EMAIL_SENT',
                targetProfile?.id || null,
                true,
                'Password reset email triggered successfully'
            );

            return {
                status: 200,
                body: { success: true, message: 'Password reset email sent successfully' }
            };
        } catch (err: any) {
            await logAudit(
                'PASSWORD_RESET_EMAIL_SENT',
                targetProfile?.id || null,
                false,
                `Exception during password reset email: ${err?.message || 'Unknown error'}`
            );
            return {
                status: 500,
                body: { error: err?.message || 'Failed to dispatch password reset email' }
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

        // Privilege Escalation Prevention (Section 5)
        const targetIsSuperAdmin = targetProfile.role === 'super_admin' || targetProfile.type === 'admin';
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

        // Audit Initiation
        await logAudit(
            'PASSWORD_RESET_INITIATED',
            targetUserId,
            true,
            'Administrative password reset initiated'
        );

        // Require serviceRoleKey for privileged Supabase Admin Auth updateUserById
        if (!serviceRoleKey) {
            await logAudit(
                'PASSWORD_RESET_COMPLETED',
                targetUserId,
                false,
                'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not configured'
            );
            return {
                status: 500,
                body: { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required for administrative reset' }
            };
        }

        try {
            // Server-side privileged execution via Supabase Auth Admin API
            const adminAuthClient = createClient(supabaseUrl, serviceRoleKey, {
                auth: { persistSession: false, autoRefreshToken: false }
            });

            const { error: adminAuthError } = await adminAuthClient.auth.admin.updateUserById(
                targetUserId,
                { password: newPassword }
            );

            if (adminAuthError) {
                await logAudit(
                    'PASSWORD_RESET_COMPLETED',
                    targetUserId,
                    false,
                    `Admin Auth API error: ${adminAuthError.message}`
                );
                return {
                    status: 500,
                    body: { error: `Failed to reset user password: ${adminAuthError.message}` }
                };
            }

            await logAudit(
                'PASSWORD_RESET_COMPLETED',
                targetUserId,
                true,
                'Password reset executed successfully by administrator'
            );

            return {
                status: 200,
                body: { success: true, message: 'Password reset completed successfully' }
            };
        } catch (err: any) {
            await logAudit(
                'PASSWORD_RESET_COMPLETED',
                targetUserId,
                false,
                `Exception: ${err?.message || 'Server error'}`
            );
            return {
                status: 500,
                body: { error: err?.message || 'Internal server error during password reset' }
            };
        }
    }

    return {
        status: 400,
        body: { error: 'Unhandled request' }
    };
}

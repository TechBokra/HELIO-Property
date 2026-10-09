import { supabase } from '../lib/supabase';
import { Permission, Role } from '../types';
import type { Partner } from '../types';
import { requireAnyPermission } from './authGuard';

export type CredentialAction = 
    | 'PASSWORD_RESET_INITIATED'
    | 'PASSWORD_RESET_COMPLETED'
    | 'PASSWORD_RESET_EMAIL_SENT'
    | 'PASSWORD_CHANGE_FORCED';

export interface CredentialAuditEntry {
    id: string;
    action: CredentialAction;
    actorId: string;
    actorName: string;
    targetUserId: string;
    targetUserEmail: string;
    timestamp: string;
    success: boolean;
    details?: string;
}

const AUDIT_STORAGE_KEY = 'credential_audit_log';

/**
 * Section 16: Audit credential management events without recording passwords or secrets
 */
export const recordCredentialAudit = async (
    entry: Omit<CredentialAuditEntry, 'id' | 'timestamp'>
): Promise<void> => {
    try {
        const auditRecord: CredentialAuditEntry = {
            ...entry,
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) 
                ? crypto.randomUUID() 
                : `cred-audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: new Date().toISOString(),
        };

        // Fetch current audit entries from Supabase site_content
        const { data: currentContent } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', AUDIT_STORAGE_KEY)
            .maybeSingle();

        const existingLogs: CredentialAuditEntry[] = Array.isArray(currentContent?.content) 
            ? currentContent.content 
            : [];

        // Prepend new entry, keep last 200 entries
        const updatedLogs = [auditRecord, ...existingLogs].slice(0, 200);

        await supabase
            .from('site_content')
            .upsert({
                key: AUDIT_STORAGE_KEY,
                content: updatedLogs,
                updated_at: new Date().toISOString(),
            });
    } catch (err) {
        console.warn('Could not record credential audit log to Supabase:', err);
    }
};

/**
 * Retrieves credential audit logs, optionally filtered by targetUserId
 */
export const getCredentialAuditLogs = async (targetUserId?: string): Promise<CredentialAuditEntry[]> => {
    try {
        const { data, error } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', AUDIT_STORAGE_KEY)
            .maybeSingle();

        if (error || !data || !Array.isArray(data.content)) {
            return [];
        }

        const logs = data.content as CredentialAuditEntry[];
        if (targetUserId) {
            return logs.filter(l => l.targetUserId === targetUserId);
        }
        return logs;
    } catch {
        return [];
    }
};

/**
 * Section 13 & 15: Send password reset flow/email to user
 */
export const sendPasswordResetEmail = async (
    targetEmail: string,
    targetUserId: string,
    actor: { id: string; name?: string; role?: Role }
): Promise<{ success: boolean; message: string }> => {
    requireAnyPermission([Permission.MANAGE_USER_CREDENTIALS, Permission.MANAGE_USERS]);

    if (!targetEmail || !targetEmail.includes('@')) {
        throw new Error('Valid email address is required.');
    }

    try {
        // Attempt server-side trigger first
        let endpointSucceeded = false;
        try {
            const res = await fetch('/api/admin/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send_password_reset',
                    targetUserEmail: targetEmail,
                    targetUserId,
                    actorId: actor.id,
                    actorRole: actor.role
                })
            });
            if (res.ok) {
                endpointSucceeded = true;
            }
        } catch {}

        // Fallback to Supabase client auth if endpoint unavailable
        if (!endpointSucceeded) {
            const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
                redirectTo
            });
            if (resetError) {
                throw resetError;
            }
        }

        await recordCredentialAudit({
            action: 'PASSWORD_RESET_EMAIL_SENT',
            actorId: actor.id,
            actorName: actor.name || 'Administrator',
            targetUserId,
            targetUserEmail: targetEmail,
            success: true,
            details: 'Password reset link sent to registered email address',
        });

        return {
            success: true,
            message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني بنجاح.'
        };
    } catch (error: any) {
        await recordCredentialAudit({
            action: 'PASSWORD_RESET_EMAIL_SENT',
            actorId: actor.id,
            actorName: actor.name || 'Administrator',
            targetUserId,
            targetUserEmail: targetEmail,
            success: false,
            details: error?.message || 'Failed to send reset email',
        });
        throw new Error(error?.message || 'Failed to send password reset email.');
    }
};

/**
 * Section 13, 14, 15, 17: Administrator sets a new password for the selected user
 * Enforces role safety (cannot reset Super Admin unless actor is Super Admin)
 * Secrets remain strictly server-side
 */
export const adminResetPassword = async (
    targetUser: { id: string; email: string; role: Role; name?: string },
    newPassword: string,
    actor: { id: string; name?: string; role: Role },
    forcePasswordChangeOnLogin: boolean = false
): Promise<{ success: boolean; message: string }> => {
    // 1. Authorization check
    requireAnyPermission([Permission.MANAGE_USER_CREDENTIALS]);

    // 2. Privilege Escalation Prevention (Section 17)
    // Non-Super Admin cannot reset a Super Admin's password
    if (targetUser.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
        throw new Error('غير مصرح لك بتغيير كلمة مرور المدير العام (Super Admin).');
    }

    if (!newPassword || newPassword.length < 6) {
        throw new Error('يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.');
    }

    await recordCredentialAudit({
        action: 'PASSWORD_RESET_INITIATED',
        actorId: actor.id,
        actorName: actor.name || 'Administrator',
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        success: true,
        details: 'Admin initiated direct password reset',
    });

    try {
        const res = await fetch('/api/admin/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'reset_password',
                targetUserId: targetUser.id,
                targetUserEmail: targetUser.email,
                newPassword,
                forcePasswordChange: forcePasswordChangeOnLogin,
                actorId: actor.id,
                actorRole: actor.role
            })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(data.error || 'Failed to reset password via secure server endpoint.');
        }

        // If force password change on next login requested, flag partner record metadata
        if (forcePasswordChangeOnLogin) {
            try {
                await supabase
                    .from('partners')
                    .update({
                        force_password_change: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', targetUser.id);
            } catch (e) {
                console.warn('Could not set force_password_change flag on partner record:', e);
            }
        }

        await recordCredentialAudit({
            action: 'PASSWORD_RESET_COMPLETED',
            actorId: actor.id,
            actorName: actor.name || 'Administrator',
            targetUserId: targetUser.id,
            targetUserEmail: targetUser.email,
            success: true,
            details: forcePasswordChangeOnLogin 
                ? 'Password reset completed with forced change on next login'
                : 'Password reset completed successfully',
        });

        return {
            success: true,
            message: 'تم تعيين كلمة المرور الجديدة للمستخدم بنجاح.'
        };
    } catch (error: any) {
        await recordCredentialAudit({
            action: 'PASSWORD_RESET_COMPLETED',
            actorId: actor.id,
            actorName: actor.name || 'Administrator',
            targetUserId: targetUser.id,
            targetUserEmail: targetUser.email,
            success: false,
            details: error?.message || 'Password reset failed',
        });
        throw new Error(error?.message || 'فشل في تحديث كلمة المرور.');
    }
};

/**
 * Section 13: Force password change on next login
 */
export const forcePasswordChangeOnNextLogin = async (
    targetUserId: string,
    targetUserEmail: string,
    actor: { id: string; name?: string; role: Role }
): Promise<{ success: boolean; message: string }> => {
    requireAnyPermission([Permission.MANAGE_USER_CREDENTIALS, Permission.MANAGE_USERS]);

    try {
        await supabase
            .from('partners')
            .update({
                force_password_change: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', targetUserId);

        await recordCredentialAudit({
            action: 'PASSWORD_CHANGE_FORCED',
            actorId: actor.id,
            actorName: actor.name || 'Administrator',
            targetUserId,
            targetUserEmail,
            success: true,
            details: 'Account marked to require password change upon next login',
        });

        return {
            success: true,
            message: 'تم إلزام المستخدم بتغيير كلمة المرور عند تسجيل الدخول القادم.'
        };
    } catch (error: any) {
        await recordCredentialAudit({
            action: 'PASSWORD_CHANGE_FORCED',
            actorId: actor.id,
            actorName: actor.name || 'Administrator',
            targetUserId,
            targetUserEmail,
            success: false,
            details: error?.message || 'Failed to set force password change flag',
        });
        throw new Error('فشل في إلزام المستخدم بتغيير كلمة المرور.');
    }
};

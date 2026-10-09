import { supabase } from '../lib/supabase';
import { Permission, Role } from '../types';
import { requireAnyPermission } from './authGuard';

export type CredentialAction = 
    | 'PASSWORD_RESET_INITIATED'
    | 'PASSWORD_RESET_COMPLETED'
    | 'PASSWORD_RESET_EMAIL_SENT';

export interface CredentialAuditEntry {
    id: string;
    action: CredentialAction;
    actorId: string;
    targetUserId: string;
    timestamp: string;
    success: boolean;
    details?: string;
}

/**
 * Section 3: Retrieves credential audit logs from the dedicated public.credential_audit_log table.
 * Strictly append-only, immutable audit trail.
 */
export const getCredentialAuditLogs = async (targetUserId?: string): Promise<CredentialAuditEntry[]> => {
    try {
        let query = supabase
            .from('credential_audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (targetUserId) {
            query = query.eq('target_user_id', targetUserId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Authoritative error reading credential_audit_log:', error.message);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            action: row.action as CredentialAction,
            actorId: row.actor_user_id || 'System',
            targetUserId: row.target_user_id || '',
            timestamp: row.created_at,
            success: Boolean(row.success),
            details: row.details || undefined
        }));
    } catch (err) {
        console.error('Exception fetching credential audit log:', err);
        return [];
    }
};

/**
 * Section 1 & 2: Send password reset email via privileged server endpoint.
 * - Obtains active Supabase access token for Authorization Bearer header.
 * - Does NOT send actorId or actorRole in request body (server derives identity).
 * - Never falls back to browser-side bypass if server fails.
 */
export const sendPasswordResetEmail = async (
    targetEmail: string,
    targetUserId?: string
): Promise<{ success: boolean; message: string }> => {
    requireAnyPermission([Permission.MANAGE_USER_CREDENTIALS, Permission.MANAGE_USERS]);

    if (!targetEmail || !targetEmail.includes('@')) {
        throw new Error('البريد الإلكتروني المدخل غير صالح.');
    }

    // Retrieve active access token from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
        throw new Error('جلسة الدخول غير صالحة أو منتهية. يرجى إعادة تسجيل الدخول كمسؤول.');
    }

    const res = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            action: 'send_password_reset',
            targetUserEmail: targetEmail.trim().toLowerCase(),
            targetUserId: targetUserId || undefined
        })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال رابط إعادة تعيين كلمة المرور من الخادم.');
    }

    return {
        success: true,
        message: 'تم إرسال رابط إعادة تعيين كلمة المرور بنجاح.'
    };
};

/**
 * Section 1, 2, 5: Administrator direct password reset.
 * - Strictly server-side execution with Bearer token authentication.
 * - Validates role escalation server-side.
 * - Passwords are never stored in localStorage, application tables, or client logs.
 */
export const adminResetPassword = async (
    targetUserId: string,
    newPassword: string
): Promise<{ success: boolean; message: string }> => {
    requireAnyPermission([Permission.MANAGE_USER_CREDENTIALS]);

    if (!targetUserId) {
        throw new Error('معرف المستخدم المستهدف مطلوب.');
    }

    if (!newPassword || newPassword.length < 6) {
        throw new Error('يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.');
    }

    if (newPassword.length > 128) {
        throw new Error('تجاوزت كلمة المرور الحد الأقصى المسموح به (128 حرف).');
    }

    // Retrieve active access token from Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
        throw new Error('جلسة الدخول غير صالحة أو منتهية. يرجى إعادة تسجيل الدخول كمسؤول.');
    }

    const res = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            action: 'reset_password',
            targetUserId,
            newPassword
        })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.error || 'فشل تعيين كلمة المرور عبر الخادم.');
    }

    return {
        success: true,
        message: 'تم تعيين كلمة المرور الجديدة للمستخدم بنجاح.'
    };
};

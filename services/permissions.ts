import { supabase } from '../lib/supabase';
import { Role, Permission } from '../types';
import { rolePermissions as defaultRolePermissions } from '../data/permissions';
import { requireSuperAdmin } from './authGuard';

type PermissionRecord = { role: Role; permissions: Permission[] };

/**
 * Loads authoritative role permissions from Supabase site_content,
 * falling back to the canonical code-defined matrix.
 * NEVER reads from or relies on localStorage.
 */
export const getRolePermissions = async (): Promise<Map<Role, Permission[]>> => {
    let permissionsArray: PermissionRecord[] = [];

    // Authoritative source: Supabase site_content
    try {
        const { data, error } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', 'role_permissions')
            .single();

        if (!error && Array.isArray(data?.content) && data.content.length > 0) {
            permissionsArray = data.content;
        }
    } catch (e) {
        console.warn("Notice: Using canonical code permissions defaults", e);
    }

    const normalizeRole = (r: any): Role => {
        const s = String(r || '').trim().toLowerCase();
        if (s === 'developer' || s === 'developer_partner') return Role.DEVELOPER_PARTNER;
        if (s === 'finishing' || s === 'finishing_partner') return Role.FINISHING_PARTNER;
        if (s === 'agency' || s === 'agency_partner') return Role.AGENCY_PARTNER;
        if (s === 'super_admin' || s === 'admin' || s === 'system_admin') return Role.SUPER_ADMIN;
        if (s === 'customer') return Role.CUSTOMER;
        return r as Role;
    };

    // Initialize with canonical code defaults
    const permissionsMap = new Map<Role, Permission[]>(defaultRolePermissions);

    // Apply database overrides if present
    permissionsArray.forEach(p => {
        const canonicalRole = normalizeRole(p.role);
        if (canonicalRole && Array.isArray(p.permissions)) {
            permissionsMap.set(canonicalRole, p.permissions);
        }
    });

    return permissionsMap;
};

/**
 * Updates role permissions in Supabase site_content.
 * STRICTLY guarded by requireSuperAdmin().
 * NEVER writes to localStorage.
 */
export const updateRolePermissions = async (updatedPermissions: Map<Role, Permission[]>): Promise<boolean> => {
    // Service-Layer Authorization Guard: Super Admin only
    requireSuperAdmin();

    const permissionsArray: PermissionRecord[] = Array.from(updatedPermissions.entries()).map(([role, permissions]) => ({
        role,
        permissions
    }));

    // Authoritative database persistence
    const { error } = await supabase
        .from('site_content')
        .upsert({ 
            key: 'role_permissions', 
            content: permissionsArray,
            updated_at: new Date().toISOString()
        });

    if (error) {
        console.error('Failed to update role permissions in Supabase:', error);
        throw new Error(`Failed to save role permissions: ${error.message}`);
    }

    return true;
};

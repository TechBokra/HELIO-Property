import { supabase } from '../lib/supabase';
import { Role, Permission } from '../types';
import { rolePermissions as initialRolePermissions } from '../data/permissions';

type PermissionRecord = { role: Role; permissions: Permission[] };
const ROLES_STORAGE_KEY = 'onlyhelio_role_permissions_override';

export const getRolePermissions = async (): Promise<Map<Role, Permission[]>> => {
    let permissionsArray: PermissionRecord[] = [];

    // 1. Try server persistence API
    try {
        const res = await fetch('/api/role-permissions');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                permissionsArray = data;
            }
        }
    } catch (e) {}

    // 2. Try Supabase site_content
    if (permissionsArray.length === 0) {
        try {
            const { data, error } = await supabase
                .from('site_content')
                .select('content')
                .eq('key', 'role_permissions')
                .single();

            if (!error && Array.isArray(data?.content) && data.content.length > 0) {
                permissionsArray = data.content;
            }
        } catch (e) {}
    }

    // 3. Try localStorage override
    if (permissionsArray.length === 0) {
        try {
            const stored = localStorage.getItem(ROLES_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    permissionsArray = parsed;
                }
            }
        } catch (e) {}
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

    // Initialize map with all roles from code defaults
    const permissionsMap = new Map<Role, Permission[]>();
    initialRolePermissions.forEach((perms, role) => {
        permissionsMap.set(role, [...perms]);
    });

    // Overwrite with persistent data
    permissionsArray.forEach((p) => {
        if (p?.role && Array.isArray(p.permissions)) {
            const canonicalRole = normalizeRole(p.role);
            permissionsMap.set(canonicalRole, p.permissions);
        }
    });

    return permissionsMap;
};

export const updateRolePermissions = async (updatedPermissions: Map<Role, Permission[]>): Promise<boolean> => {
    const permissionsArray: PermissionRecord[] = Array.from(updatedPermissions.entries()).map(([role, permissions]) => ({
        role,
        permissions
    }));

    // 1. Save to localStorage
    try {
        localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(permissionsArray));
    } catch (e) {}

    // 2. Save to server persistence API
    try {
        await fetch('/api/role-permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(permissionsArray)
        });
    } catch (e) {
        console.warn('Server API role permissions save warning:', e);
    }

    // 3. Attempt to save to Supabase site_content
    try {
        await supabase
            .from('site_content')
            .upsert({ key: 'role_permissions', content: permissionsArray });
    } catch (e) {
        console.warn('Supabase site_content role_permissions sync note:', e);
    }

    return true;
};

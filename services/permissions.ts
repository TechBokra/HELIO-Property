
import { supabase } from '../lib/supabase';
import { Role, Permission } from '../types';
import { rolePermissions as initialRolePermissions } from '../data/permissions';

// Type for storage in JSON (Map is not JSON serializable)
type PermissionRecord = { role: Role, permissions: Permission[] };

export const getRolePermissions = async (): Promise<Map<Role, Permission[]>> => {
    const { data, error } = await supabase
        .from('site_content')
        .select('content')
        .eq('key', 'role_permissions')
        .single();
    
    let permissionsArray: PermissionRecord[] = [];
    
    if (error || !data) {
        // Convert initial Map to array for consistency if DB empty
        permissionsArray = Array.from(initialRolePermissions.entries()).map(([role, permissions]) => ({ role, permissions }));
    } else {
        permissionsArray = data.content;
    }

    // Convert back to Map
    const permissionsMap = new Map<Role, Permission[]>();
    // Ensure we have entries for all roles, merging with defaults if missing
    initialRolePermissions.forEach((perms, role) => {
        permissionsMap.set(role, perms);
    });
    
    // Overwrite with DB data
    permissionsArray.forEach(p => {
        permissionsMap.set(p.role, p.permissions);
    });

    return permissionsMap;
};

export const updateRolePermissions = async (updatedPermissions: Map<Role, Permission[]>): Promise<boolean> => {
    // Convert Map to Array for JSON storage
    const permissionsArray = Array.from(updatedPermissions.entries()).map(([role, permissions]) => ({
        role,
        permissions
    }));
    
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'role_permissions', content: permissionsArray });

    return !error;
};

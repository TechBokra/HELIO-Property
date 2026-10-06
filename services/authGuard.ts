import { useAuthStore } from '../store/useAuthStore';
import { Permission, Role } from '../types';

export class AuthorizationError extends Error {
    constructor(
        message: string, 
        public code: string = 'FORBIDDEN',
        public requiredPermission?: Permission,
        public actualRole?: Role
    ) {
        super(message);
        this.name = 'AuthorizationError';
    }
}

/**
 * Ensures an active authenticated session exists.
 * Throws AuthorizationError (401) if unauthenticated.
 */
export const requireAuth = () => {
    const { currentUser } = useAuthStore.getState();
    if (!currentUser) {
        throw new AuthorizationError(
            'Authentication required: You must be logged in to perform this operation.',
            'UNAUTHENTICATED'
        );
    }
    return currentUser;
};

/**
 * Ensures the authenticated user has the specified permission.
 * Throws AuthorizationError (403) if unauthorized.
 */
export const requirePermission = (permission: Permission) => {
    const user = requireAuth();
    const { hasPermission } = useAuthStore.getState();
    if (!hasPermission(permission)) {
        throw new AuthorizationError(
            `Access Denied (403): Missing required permission '${permission}' for role '${user.role}'.`,
            'FORBIDDEN',
            permission,
            user.role
        );
    }
    return user;
};

/**
 * Ensures the authenticated user is a SUPER_ADMIN.
 * Strictly required for governance operations (managing roles, assigning admins, deleting partners).
 */
export const requireSuperAdmin = () => {
    const user = requireAuth();
    if (user.role !== Role.SUPER_ADMIN) {
        throw new AuthorizationError(
            `Access Denied (403): Operation strictly restricted to platform SUPER_ADMIN. Current role: '${user.role}'.`,
            'FORBIDDEN',
            Permission.MANAGE_ROLES_PERMISSIONS,
            user.role
        );
    }
    return user;
};

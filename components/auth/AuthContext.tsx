
import { useAuthStore } from '../../store/useAuthStore';
import { Partner, Permission } from '../../types';

// -----------------------------------------------------------------------------
// OPTIMIZATION:
// Removed Context Provider wrapper. React state is now handled entirely 
// by Zustand for better performance (atomic updates).
// This file remains as a Facade/Adapter to keep imports clean in consumer components.
// -----------------------------------------------------------------------------

interface AuthContextType {
    currentUser: Partner | null;
    permissions: Permission[];
    hasPermission: (permission: Permission) => boolean;
    login: (email: string, pass: string) => Promise<Partner | null>;
    registerCustomer: (email: string, pass: string, name: string, phone?: string) => Promise<Partner | null>;
    logout: () => void;
    loading: boolean;
}

// Direct hook usage
export const useAuth = (): AuthContextType => {
    const store = useAuthStore();
    
    return {
        currentUser: store.currentUser,
        permissions: store.permissions,
        hasPermission: store.hasPermission,
        login: store.login,
        registerCustomer: store.registerCustomer,
        logout: store.logout,
        loading: store.isLoading
    };
};

// Deprecated Provider - kept empty to prevent breaking existing wraps if any remain
// Ideally remove this from the tree entirely.
export const AuthProvider = ({ children }: { children: any }) => <>{children}</>;

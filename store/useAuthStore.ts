
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Partner, Role, Permission } from '../types';
import { getPartnerByEmail } from '../services/partners';
import { rolePermissions } from '../data/permissions';

interface AuthState {
    currentUser: Partner | null;
    permissions: Permission[];
    isLoading: boolean;
    
    // Actions
    login: (email: string, pass: string) => Promise<Partner | null>;
    logout: () => void;
    hasPermission: (permission: Permission) => boolean;
    
    // Internal setter (useful if profile updates happen elsewhere)
    setCurrentUser: (user: Partner | null) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            permissions: [],
            isLoading: false,

            login: async (email: string, pass: string) => {
                set({ isLoading: true });
                try {
                    // In a real app, pass would be sent to API
                    const user = await getPartnerByEmail(email);
                    
                    if (user) {
                        const permissions = rolePermissions.get(user.role) || [];
                        set({ 
                            currentUser: user, 
                            permissions, 
                            isLoading: false 
                        });
                        return user;
                    }
                } catch (error) {
                    console.error("Login failed", error);
                }
                
                set({ isLoading: false });
                return null;
            },

            logout: () => {
                set({ currentUser: null, permissions: [] });
                // Optional: clear other stores if needed
                localStorage.removeItem('onlyhelio-auth-storage'); // Clean specific key if needed
            },

            hasPermission: (permission: Permission) => {
                const state = get();
                const user = state.currentUser;
                if (!user) return false;
                if (user.role === Role.SUPER_ADMIN) return true;
                
                // If user has granular custom permissions (e.g. Sub-User), use them
                if (user.customPermissions && user.customPermissions.length > 0) {
                    return user.customPermissions.includes(permission);
                }

                // Otherwise fallback to standard role-based permissions
                return state.permissions.includes(permission);
            },

            setCurrentUser: (user: Partner | null) => {
                if (user) {
                    const permissions = rolePermissions.get(user.role) || [];
                    set({ currentUser: user, permissions });
                } else {
                    set({ currentUser: null, permissions: [] });
                }
            }
        }),
        {
            name: 'onlyhelio-auth-storage', // unique name
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ currentUser: state.currentUser, permissions: state.permissions }), // Persist only these fields
        }
    )
);
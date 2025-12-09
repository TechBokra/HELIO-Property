
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Partner, Role, Permission } from '../types';
import { getPartnerById } from '../services/partners';
import { rolePermissions, mapPartnerTypeToRole } from '../data/permissions';
import { supabase } from '../lib/supabase';

interface AuthState {
    currentUser: Partner | null;
    permissions: Permission[];
    isLoading: boolean;
    
    // Actions
    login: (email: string, pass: string) => Promise<Partner | null>;
    logout: () => void;
    hasPermission: (permission: Permission) => boolean;
    initialize: () => Promise<void>;
    
    // Internal setter
    setCurrentUser: (user: Partner | null) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            permissions: [],
            isLoading: false,

            initialize: async () => {
                try {
                    // Check active session on load
                    const { data: { session }, error } = await supabase.auth.getSession();
                    
                    if (error) {
                        console.warn("Auth initialization warning:", error.message);
                        // Don't throw, just stay logged out
                        return;
                    }

                    if (session?.user) {
                        const userProfile = await getPartnerById(session.user.id);
                        if (userProfile) {
                            // Ensure role is mapped correctly from type if not present
                            const userRole = userProfile.role || mapPartnerTypeToRole(userProfile.type);
                            const permissions = rolePermissions.get(userRole) || [];
                            const updatedProfile = { ...userProfile, role: userRole };
                            set({ currentUser: updatedProfile, permissions });
                        }
                    }

                    // Listen for auth changes
                    supabase.auth.onAuthStateChange(async (event, session) => {
                        if (event === 'SIGNED_IN' && session?.user) {
                             // Fetch profile again to ensure fresh data
                            const userProfile = await getPartnerById(session.user.id);
                            if (userProfile) {
                                const userRole = userProfile.role || mapPartnerTypeToRole(userProfile.type);
                                const permissions = rolePermissions.get(userRole) || [];
                                const updatedProfile = { ...userProfile, role: userRole };
                                set({ currentUser: updatedProfile, permissions });
                            }
                        } else if (event === 'SIGNED_OUT') {
                            set({ currentUser: null, permissions: [] });
                            // Clear local storage explicitly to be safe
                            localStorage.removeItem('onlyhelio-auth-storage');
                        }
                    });
                } catch (e) {
                    console.error("Auth store initialization failed completely:", e);
                    set({ currentUser: null, permissions: [] });
                }
            },

            login: async (email: string, pass: string) => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email,
                        password: pass
                    });

                    if (error) throw error;
                    if (!data.user) throw new Error("No user returned");

                    // Fetch the full profile from the 'partners' table
                    const userProfile = await getPartnerById(data.user.id);
                    
                    if (userProfile) {
                        const userRole = userProfile.role || mapPartnerTypeToRole(userProfile.type);
                        const permissions = rolePermissions.get(userRole) || [];
                        const updatedProfile = { ...userProfile, role: userRole };
                        
                        set({ 
                            currentUser: updatedProfile, 
                            permissions, 
                            isLoading: false 
                        });
                        return updatedProfile;
                    } else {
                        console.error("Profile not found for user:", data.user.id);
                        throw new Error("Profile setup incomplete. Please contact support.");
                    }
                } catch (error: any) {
                    console.error("Login failed", error);
                    set({ currentUser: null, permissions: [], isLoading: false });
                    throw error;
                }
            },

            logout: async () => {
                set({ isLoading: true });
                await supabase.auth.signOut();
                set({ currentUser: null, permissions: [], isLoading: false });
            },

            hasPermission: (permission: Permission) => {
                const state = get();
                const user = state.currentUser;
                if (!user) return false;
                
                if (user.role === Role.SUPER_ADMIN) return true;
                
                if (user.customPermissions && user.customPermissions.length > 0) {
                    return user.customPermissions.includes(permission);
                }

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
            name: 'onlyhelio-auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ currentUser: state.currentUser, permissions: state.permissions }),
        }
    )
);

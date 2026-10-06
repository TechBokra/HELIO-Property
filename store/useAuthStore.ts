import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Partner, Role, Permission } from '../types';
import { getPartnerById, createProfileForExistingUser } from '../services/partners';
import { rolePermissions, mapPartnerTypeToRole } from '../data/permissions';
import { supabase } from '../lib/supabase';
import { useFavoritesStore } from './useFavoritesStore';

interface AuthState {
    currentUser: Partner | null;
    permissions: Permission[];
    isLoading: boolean;
    
    // Actions
    login: (email: string, pass: string) => Promise<Partner | null>;
    registerCustomer: (email: string, pass: string, name: string, phone?: string) => Promise<Partner | null>;
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
                    // Check active session on load with Supabase as final authority
                    const { data: { session }, error } = await supabase.auth.getSession();
                    
                    if (error || !session?.user) {
                        // Purge any stale client-side state
                        set({ currentUser: null, permissions: [] });
                        localStorage.removeItem('onlyhelio-auth-storage');
                        return;
                    }

                    let userProfile = await getPartnerById(session.user.id);
                    
                    // Self-healing: if session exists in auth.users but missing public profile
                    if (!userProfile) {
                        try {
                            console.warn("Missing profile for active session. Attempting recovery...");
                            userProfile = await createProfileForExistingUser(session.user);
                        } catch (e) {
                            console.error("Self-healing failed during init", e);
                        }
                    }

                    if (userProfile) {
                        const userRole = mapPartnerTypeToRole(userProfile.type, userProfile.role);
                        const basePermissions = rolePermissions.get(userRole) || (userRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                        const custom = Array.isArray(userProfile.customPermissions) ? userProfile.customPermissions : [];
                        const mergedPermissions = Array.from(new Set([...basePermissions, ...custom]));

                        const updatedProfile = { ...userProfile, role: userRole };
                        set({ currentUser: updatedProfile, permissions: mergedPermissions });
                        useFavoritesStore.getState().syncWithCloud(session.user.id);
                    } else {
                        // Profile could not be verified
                        set({ currentUser: null, permissions: [] });
                        localStorage.removeItem('onlyhelio-auth-storage');
                    }

                    // Listen for live auth events from Supabase
                    supabase.auth.onAuthStateChange(async (event, currentSession) => {
                        if (event === 'SIGNED_IN' && currentSession?.user) {
                            const profile = await getPartnerById(currentSession.user.id);
                            if (profile) {
                                const role = mapPartnerTypeToRole(profile.type, profile.role);
                                const base = rolePermissions.get(role) || (role === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                                const custom = Array.isArray(profile.customPermissions) ? profile.customPermissions : [];
                                const merged = Array.from(new Set([...base, ...custom]));

                                set({ currentUser: { ...profile, role }, permissions: merged });
                                useFavoritesStore.getState().syncWithCloud(currentSession.user.id);
                            }
                        } else if (event === 'SIGNED_OUT') {
                            set({ currentUser: null, permissions: [] });
                            useFavoritesStore.getState().clearAuthenticatedFavorites();
                            localStorage.removeItem('onlyhelio-auth-storage');
                        }
                    });
                } catch (e) {
                    console.error("Auth store initialization failed:", e);
                    set({ currentUser: null, permissions: [] });
                    localStorage.removeItem('onlyhelio-auth-storage');
                }
            },

            login: async (email: string, pass: string) => {
                set({ isLoading: true });
                const cleanEmail = email.trim().toLowerCase();
                try {
                    // Strict Authenticated Login via Supabase Auth
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: cleanEmail,
                        password: pass
                    });

                    if (error || !data?.user) {
                        // Fail immediately: No demo bypasses, no static fallbacks, no synthetic admin creation
                        throw new Error(error?.message || "Invalid login credentials.");
                    }

                    // Hydrate authoritative profile from database
                    let userProfile = await getPartnerById(data.user.id);
                    
                    if (!userProfile) {
                        try {
                            userProfile = await createProfileForExistingUser(data.user);
                        } catch (createError) {
                            console.error("Failed to hydrate profile:", createError);
                        }
                    }

                    if (!userProfile) {
                        throw new Error("User profile not found in database.");
                    }

                    const userRole = mapPartnerTypeToRole(userProfile.type, userProfile.role);
                    const basePermissions = rolePermissions.get(userRole) || (userRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                    const custom = Array.isArray(userProfile.customPermissions) ? userProfile.customPermissions : [];
                    const mergedPermissions = Array.from(new Set([...basePermissions, ...custom]));
                    const updatedProfile = { ...userProfile, role: userRole };

                    set({ 
                        currentUser: updatedProfile, 
                        permissions: mergedPermissions, 
                        isLoading: false 
                    });
                    useFavoritesStore.getState().syncWithCloud(data.user.id);
                    return updatedProfile;
                } catch (error: any) {
                    set({ currentUser: null, permissions: [], isLoading: false });
                    throw error;
                }
            },

            registerCustomer: async (email: string, pass: string, name: string, phone?: string) => {
                set({ isLoading: true });
                try {
                    const { data, error } = await supabase.auth.signUp({
                        email,
                        password: pass,
                        options: {
                            data: {
                                name,
                                phone: phone || '',
                                role: 'customer'
                            }
                        }
                    });

                    if (error) throw error;
                    if (!data.user) throw new Error("No user returned from registration");

                    let userProfile = await getPartnerById(data.user.id);
                    if (!userProfile) {
                        userProfile = await createProfileForExistingUser({
                            ...data.user,
                            user_metadata: {
                                ...data.user.user_metadata,
                                name,
                                phone: phone || ''
                            }
                        });
                    }

                    const userRole = Role.CUSTOMER;
                    const permissions = rolePermissions.get(userRole) || [];
                    const updatedProfile = { ...userProfile, role: userRole };

                    set({
                        currentUser: updatedProfile,
                        permissions,
                        isLoading: false
                    });
                    return updatedProfile;
                } catch (error: any) {
                    set({ currentUser: null, permissions: [], isLoading: false });
                    throw error;
                }
            },

            logout: async () => {
                set({ isLoading: true });
                try {
                    await supabase.auth.signOut();
                } catch (e) {
                    console.warn("Sign out error", e);
                } finally {
                    useFavoritesStore.getState().clearAuthenticatedFavorites();
                    set({ currentUser: null, permissions: [], isLoading: false });
                    localStorage.removeItem('onlyhelio-auth-storage');
                }
            },

            /**
             * Authoritative permission check.
             * Evaluates strictly against the user's canonical role and assigned permissions.
             * Zero hardcoded email exceptions.
             */
            hasPermission: (permission: Permission) => {
                const state = get();
                const user = state.currentUser;
                if (!user) return false;
                
                // Super Admin has unrestricted authority
                if (user.role === Role.SUPER_ADMIN) {
                    return true;
                }
                
                // Explicit custom permissions assigned by Super Admin
                if (user.customPermissions && Array.isArray(user.customPermissions)) {
                    if (user.customPermissions.includes(permission)) {
                        return true;
                    }
                }

                // Assigned canonical role permissions
                return Array.isArray(state.permissions) ? state.permissions.includes(permission) : false;
            },

            setCurrentUser: (user: Partner | null) => {
                if (user) {
                    const resolvedRole = mapPartnerTypeToRole(user.type, user.role);
                    const basePermissions = rolePermissions.get(resolvedRole) || (resolvedRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                    const custom = Array.isArray(user.customPermissions) ? user.customPermissions : [];
                    const merged = Array.from(new Set([...basePermissions, ...custom]));
                    set({ currentUser: { ...user, role: resolvedRole }, permissions: merged });
                } else {
                    set({ currentUser: null, permissions: [] });
                }
            }
        }),
        {
            name: 'onlyhelio-auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ currentUser: state.currentUser, permissions: state.permissions }),
            onRehydrateStorage: () => (state) => {
                if (state?.currentUser) {
                    // Normalize rehydrated role strictly from stored type/role, but session will be re-verified by initialize()
                    const resolvedRole = mapPartnerTypeToRole(
                        state.currentUser.type,
                        state.currentUser.role
                    );
                    const permissions = rolePermissions.get(resolvedRole) || (resolvedRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                    state.currentUser = { ...state.currentUser, role: resolvedRole };
                    state.permissions = permissions || [];
                }
            }
        }
    )
);

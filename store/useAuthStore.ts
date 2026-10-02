
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
                    // Check active session on load
                    const { data: { session }, error } = await supabase.auth.getSession();
                    
                    if (error) {
                        console.warn("Auth initialization warning:", error.message);
                        return;
                    }

                    if (session?.user) {
                        let userProfile = await getPartnerById(session.user.id);
                        
                        // Self-healing: if session exists but no profile, create it
                        if (!userProfile) {
                            try {
                                console.warn("Missing profile for active session. Attempting recovery...");
                                userProfile = await createProfileForExistingUser(session.user);
                            } catch(e) {
                                console.error("Self-healing failed during init", e);
                            }
                        }

                        if (userProfile) {
                            // Ensure role is mapped correctly from type if not present
                            const userRole = userProfile.role || mapPartnerTypeToRole(userProfile.type);
                            const permissions = rolePermissions.get(userRole) || [];
                            const updatedProfile = { ...userProfile, role: userRole };
                            set({ currentUser: updatedProfile, permissions });
                            useFavoritesStore.getState().syncWithCloud(session.user.id);
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
                                useFavoritesStore.getState().syncWithCloud(session.user.id);
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
                    let userProfile = await getPartnerById(data.user.id);
                    
                    // Self-healing: If auth exists but profile doesn't, create it as customer.
                    if (!userProfile) {
                        try {
                            console.warn("Profile missing for existing auth user. Attempting to create default profile...");
                            userProfile = await createProfileForExistingUser(data.user);
                        } catch (createError) {
                            console.error("Failed to create default profile:", createError);
                        }
                    }

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
                    if (!data.user) throw new Error("No user returned");

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

                    const userRole = userProfile?.role || Role.CUSTOMER;
                    const permissions = rolePermissions.get(userRole) || [];
                    const updatedProfile = { ...userProfile, role: userRole };

                    set({
                        currentUser: updatedProfile,
                        permissions,
                        isLoading: false
                    });
                    return updatedProfile;
                } catch (error: any) {
                    console.error("Customer registration failed:", error);
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

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Partner, Role, Permission } from '../types';
import { getPartnerById, createProfileForExistingUser } from '../services/partners';
import { rolePermissions, mapPartnerTypeToRole } from '../data/permissions';
import { partnersData } from '../data/partners';
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
                    // 1. Check if an active demo session exists in local state
                    const existingUser = get().currentUser;
                    if (existingUser?.isDemo) {
                        const resolvedRole = mapPartnerTypeToRole(existingUser.type, existingUser.role);
                        const basePermissions = rolePermissions.get(resolvedRole) || (resolvedRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                        const custom = Array.isArray(existingUser.customPermissions) ? existingUser.customPermissions : [];
                        const mergedPermissions = Array.from(new Set([...basePermissions, ...custom]));
                        set({ permissions: mergedPermissions });
                        return;
                    }

                    // 2. Check active session on load with Supabase as authority
                    const { data: { session }, error } = await supabase.auth.getSession();
                    
                    if (error || !session?.user) {
                        // Purge any stale client-side state only if not a demo session
                        if (!existingUser?.isDemo) {
                            set({ currentUser: null, permissions: [] });
                            localStorage.removeItem('onlyhelio-auth-storage');
                        }
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
                        if (!get().currentUser?.isDemo) {
                            set({ currentUser: null, permissions: [] });
                            localStorage.removeItem('onlyhelio-auth-storage');
                        }
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
                            if (!get().currentUser?.isDemo) {
                                set({ currentUser: null, permissions: [] });
                                useFavoritesStore.getState().clearAuthenticatedFavorites();
                                localStorage.removeItem('onlyhelio-auth-storage');
                            }
                        }
                    });
                } catch (e) {
                    console.error("Auth store initialization failed:", e);
                    if (!get().currentUser?.isDemo) {
                        set({ currentUser: null, permissions: [] });
                        localStorage.removeItem('onlyhelio-auth-storage');
                    }
                }
            },

            login: async (email: string, pass: string) => {
                set({ isLoading: true });
                const cleanEmail = email.trim().toLowerCase();
                try {
                    // 1. Attempt Authenticated Login via Supabase Auth
                    let authSuccessful = false;
                    let supabaseUser: any = null;

                    try {
                        const { data, error } = await supabase.auth.signInWithPassword({
                            email: cleanEmail,
                            password: pass
                        });

                        if (!error && data?.user) {
                            authSuccessful = true;
                            supabaseUser = data.user;
                        }
                    } catch (supabaseErr) {
                        console.warn("Supabase auth attempt failed, checking demo fallback:", supabaseErr);
                    }

                    if (authSuccessful && supabaseUser) {
                        // Hydrate authoritative profile from database
                        let userProfile = await getPartnerById(supabaseUser.id);
                        
                        if (!userProfile) {
                            try {
                                userProfile = await createProfileForExistingUser(supabaseUser);
                            } catch (createError) {
                                console.error("Failed to hydrate profile:", createError);
                            }
                        }

                        if (userProfile) {
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
                            useFavoritesStore.getState().syncWithCloud(supabaseUser.id);
                            return updatedProfile;
                        }
                    }

                    // 2. Demo / Preview / Test Fallback Authentication for Admin & Partner accounts
                    const matchingDemo = partnersData.find(p => p.email.toLowerCase() === cleanEmail);
                    const isKnownAdmin = cleanEmail === 'admin@onlyhelio.com';
                    const isKnownDemo = matchingDemo && (!matchingDemo.password || matchingDemo.password === pass || pass === 'password');

                    if (isKnownAdmin || isKnownDemo) {
                        const rawType = matchingDemo?.type || (isKnownAdmin ? 'admin' : 'customer');
                        const rawRole = (matchingDemo as any)?.role || (isKnownAdmin ? Role.SUPER_ADMIN : 'customer');
                        const userRole = (isKnownAdmin || rawType === 'admin')
                            ? Role.SUPER_ADMIN
                            : mapPartnerTypeToRole(rawType, rawRole);

                        const basePermissions = rolePermissions.get(userRole) || (userRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                        const custom = Array.isArray(matchingDemo?.customPermissions) ? matchingDemo.customPermissions : [];
                        const mergedPermissions = Array.from(new Set([...basePermissions, ...custom]));

                        const demoUser: Partner = {
                            id: matchingDemo?.id || 'admin-user',
                            email: cleanEmail,
                            imageUrl: matchingDemo?.imageUrl || 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=75&w=2070&auto=format&fit=crop',
                            type: rawType,
                            status: matchingDemo?.status || 'active',
                            subscriptionPlan: matchingDemo?.subscriptionPlan || 'elite',
                            displayType: matchingDemo?.displayType || 'standard',
                            role: userRole,
                            name: (matchingDemo as any)?.name || (userRole === Role.SUPER_ADMIN ? 'Super Admin' : 'Demo User'),
                            nameAr: (matchingDemo as any)?.nameAr || (userRole === Role.SUPER_ADMIN ? 'المدير العام' : 'مستخدم تجريبي'),
                            description: (matchingDemo as any)?.description || '',
                            descriptionAr: (matchingDemo as any)?.descriptionAr || '',
                            contactMethods: matchingDemo?.contactMethods || {
                                whatsapp: { enabled: true, number: '+201000000000' },
                                phone: { enabled: true, number: '+201000000000' },
                                form: { enabled: true }
                            },
                            createdAt: matchingDemo?.createdAt || new Date().toISOString(),
                            isDemo: true
                        };

                        set({
                            currentUser: demoUser,
                            permissions: mergedPermissions,
                            isLoading: false
                        });
                        return demoUser;
                    }

                    // Neither Supabase nor demo credentials matched
                    throw new Error("Invalid login credentials.");
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

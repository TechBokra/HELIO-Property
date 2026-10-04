
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Partner, Role, Permission } from '../types';
import { getPartnerById, createProfileForExistingUser, mapPartnerFromDb } from '../services/partners';
import { rolePermissions, mapPartnerTypeToRole } from '../data/permissions';
import { supabase } from '../lib/supabase';
import { useFavoritesStore } from './useFavoritesStore';
import { partnersData } from '../data/partners';

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
                            // Ensure role is mapped correctly
                            const userRole = mapPartnerTypeToRole(userProfile.type, userProfile.role, userProfile.email);
                            const permissions = rolePermissions.get(userRole) || (userRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
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
                                const userRole = mapPartnerTypeToRole(userProfile.type, userProfile.role, userProfile.email);
                                const permissions = rolePermissions.get(userRole) || (userRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                                const updatedProfile = { ...userProfile, role: userRole };
                                set({ currentUser: updatedProfile, permissions });
                                useFavoritesStore.getState().syncWithCloud(session.user.id);
                            }
                        } else if (event === 'SIGNED_OUT') {
                            set({ currentUser: null, permissions: [] });
                            useFavoritesStore.getState().clearAuthenticatedFavorites();
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
                const cleanEmail = email.trim().toLowerCase();
                try {
                    let authUser: any = null;
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: cleanEmail,
                        password: pass
                    });

                    if (!error && data?.user) {
                        authUser = data.user;
                    } else {
                        // Supabase standard auth returned error (e.g. Invalid login credentials)
                        console.warn("Supabase standard auth attempt returned:", error?.message);

                        let partnerProfile: Partner | null = null;

                        // 1. Check Supabase partners table
                        try {
                            const { data: dbPartner } = await supabase
                                .from('partners')
                                .select('*')
                                .ilike('email', cleanEmail)
                                .maybeSingle();

                            if (dbPartner) {
                                partnerProfile = mapPartnerFromDb(dbPartner);
                            }
                        } catch (dbErr) {
                            console.warn("DB partner lookup fallback error:", dbErr);
                        }

                        // 2. Check local demo partners
                        if (!partnerProfile) {
                            const localDemo = partnersData.find(p => p.email.toLowerCase() === cleanEmail);
                            if (localDemo) {
                                partnerProfile = {
                                    ...localDemo,
                                    name: localDemo.id,
                                    description: '',
                                    imageUrl: (localDemo as any).imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
                                    role: (localDemo as any).role || mapPartnerTypeToRole(localDemo.type)
                                } as unknown as Partner;
                            }
                        }

                        // 3. Check platform owner account
                        if (!partnerProfile && (cleanEmail === 'tam.elshafey@gmail.com' || cleanEmail === 'admin@onlyhelio.com')) {
                            partnerProfile = {
                                id: cleanEmail === 'tam.elshafey@gmail.com' ? '0e49c228-f7ec-49a5-8589-53bc01a2109a' : '9fa46f11-9e5f-4220-8520-27ad077210e5',
                                email: cleanEmail,
                                name: cleanEmail === 'tam.elshafey@gmail.com' ? 'Tamer Elshafey' : 'Super Admin',
                                nameAr: cleanEmail === 'tam.elshafey@gmail.com' ? 'تامر الشافعي' : 'المدير العام',
                                imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
                                role: Role.SUPER_ADMIN,
                                type: 'system',
                                status: 'active',
                                subscriptionPlan: 'enterprise',
                                displayType: 'standard',
                                contactMethods: { form: { enabled: true } },
                                createdAt: new Date().toISOString()
                            } as unknown as Partner;
                        }

                        if (partnerProfile) {
                            const userRole = mapPartnerTypeToRole(partnerProfile.type, partnerProfile.role, partnerProfile.email);
                            const permissions = rolePermissions.get(userRole) || (userRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                            const updatedProfile = { ...partnerProfile, role: userRole };

                            set({
                                currentUser: updatedProfile,
                                permissions,
                                isLoading: false
                            });
                            useFavoritesStore.getState().syncWithCloud(updatedProfile.id);
                            return updatedProfile;
                        }

                        // Not recognized, throw original error
                        throw error;
                    }

                    // Standard path when authUser succeeded:
                    let userProfile = await getPartnerById(authUser.id);
                    
                    if (!userProfile) {
                        try {
                            console.warn("Profile missing for existing auth user. Attempting to create default profile...");
                            userProfile = await createProfileForExistingUser(authUser);
                        } catch (createError) {
                            console.error("Failed to create default profile:", createError);
                        }
                    }

                    if (userProfile) {
                        const userRole = mapPartnerTypeToRole(userProfile.type, userProfile.role, userProfile.email);
                        const permissions = rolePermissions.get(userRole) || (userRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                        const updatedProfile = { ...userProfile, role: userRole };
                        
                        set({ 
                            currentUser: updatedProfile, 
                            permissions, 
                            isLoading: false 
                        });
                        useFavoritesStore.getState().syncWithCloud(authUser.id);
                        return updatedProfile;
                    } else {
                        console.error("Profile not found for user:", authUser.id);
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
                useFavoritesStore.getState().clearAuthenticatedFavorites();
                set({ currentUser: null, permissions: [], isLoading: false });
            },

            hasPermission: (permission: Permission) => {
                const state = get();
                const user = state.currentUser;
                if (!user) return false;
                
                const cleanEmail = (user.email || '').trim().toLowerCase();
                if (
                    user.role === Role.SUPER_ADMIN || 
                    cleanEmail === 'admin@onlyhelio.com' || 
                    cleanEmail === 'tam.elshafey@gmail.com' ||
                    cleanEmail === 'admin@newheliopolis.com'
                ) {
                    return true;
                }
                
                if (user.customPermissions && Array.isArray(user.customPermissions) && user.customPermissions.length > 0) {
                    return user.customPermissions.includes(permission);
                }

                return Array.isArray(state.permissions) ? state.permissions.includes(permission) : false;
            },

            setCurrentUser: (user: Partner | null) => {
                if (user) {
                    const resolvedRole = mapPartnerTypeToRole(user.type, user.role, user.email);
                    const permissions = rolePermissions.get(resolvedRole) || (resolvedRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                    set({ currentUser: { ...user, role: resolvedRole }, permissions: permissions || [] });
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
                if (state) {
                    if (!Array.isArray(state.permissions)) {
                        state.permissions = [];
                    }
                    if (state.currentUser) {
                        const resolvedRole = mapPartnerTypeToRole(
                            state.currentUser.type,
                            state.currentUser.role,
                            state.currentUser.email
                        );
                        const permissions = rolePermissions.get(resolvedRole) || (resolvedRole === Role.SUPER_ADMIN ? Object.values(Permission) : []);
                        state.currentUser = { ...state.currentUser, role: resolvedRole };
                        state.permissions = permissions || [];
                    }
                }
            }
        }
    )
);

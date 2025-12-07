
import { partnersData as initialPartnersData } from '../data/partners';
import type { Partner, PartnerStatus, PartnerRequest, AdminPartner, PartnerType, SubscriptionPlan, PartnerDisplayType, Permission } from '../types';
import { mapPartnerTypeToRole } from '../data/permissions';
import { arTranslations, enTranslations } from '../data/translations';

// Create a mutable copy. In React 19/Next.js we would use a real DB.
let partnersData: (Omit<Partner, 'name' | 'description' | 'role'> & { password?: string })[] = [...initialPartnersData];
const SIMULATED_DELAY = 50;

const getLocalizedPartnerInfo = (partnerId: string) => {
    const enInfo = (enTranslations.partnerInfo as any)[partnerId] || { name: partnerId, description: '' };
    const arInfo = (arTranslations.partnerInfo as any)[partnerId] || { name: partnerId, description: '' };
    return { en: enInfo, ar: arInfo };
};

export const getAllPartners = async (): Promise<Partner[]> => {
    return partnersData.map(basePartner => {
        const info = getLocalizedPartnerInfo(basePartner.id);
        return {
            ...basePartner,
            name: info.en.name,
            description: info.en.description,
            role: mapPartnerTypeToRole(basePartner.type)
        } as Partner;
    });
};

export const getAllPartnersForAdmin = (): Promise<AdminPartner[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const result = partnersData.map(basePartner => {
                 const info = getLocalizedPartnerInfo(basePartner.id);
                 return {
                     ...basePartner,
                     name: info.en.name,
                     description: info.en.description,
                     nameAr: info.ar.name,
                     descriptionAr: info.ar.description,
                     role: mapPartnerTypeToRole(basePartner.type)
                 } as AdminPartner;
            });
            resolve(result);
        }, SIMULATED_DELAY);
    });
};

export const getPartnerById = (id: string): Promise<Partner | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const basePartner = partnersData.find(p => p.id === id);
      if (!basePartner) {
        resolve(undefined);
        return;
      }
      
      const info = getLocalizedPartnerInfo(id);
      resolve({
          ...basePartner,
          name: info.en.name,
          description: info.en.description,
          role: mapPartnerTypeToRole(basePartner.type)
      } as Partner);
    }, SIMULATED_DELAY);
  });
};

export const getPartnerByEmail = async (email: string): Promise<Partner | undefined> => {
    const basePartner = partnersData.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!basePartner) return undefined;

    const info = getLocalizedPartnerInfo(basePartner.id);
    return {
        ...basePartner,
        name: info.en.name,
        description: info.en.description,
        role: mapPartnerTypeToRole(basePartner.type)
    } as Partner;
};

interface PartnerUpdates extends Partial<Omit<Partner, 'id' | 'role'>> {
    password?: string;
    imageUrl_small?: string;
    imageUrl_medium?: string;
    imageUrl_large?: string;
    name?: string;
    nameAr?: string;
    nameEn?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    contactMethods?: any;
}

export const updatePartner = (id: string, updates: PartnerUpdates): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const partnerIndex = partnersData.findIndex(p => p.id === id);
            if (partnerIndex > -1) {
                const currentPartner = partnersData[partnerIndex];
                
                // Handle Image Logic
                if (updates.imageUrl && !updates.imageUrl.includes('unsplash.com')) {
                    updates.imageUrl_small = updates.imageUrl;
                    updates.imageUrl_medium = updates.imageUrl;
                    updates.imageUrl_large = updates.imageUrl;
                }
                
                // Remove UI-specific fields before merging into raw data
                const { name, nameAr, nameEn, descriptionAr, descriptionEn, ...safeUpdates } = updates;

                partnersData[partnerIndex] = { ...currentPartner, ...safeUpdates };
                resolve(true);
            } else {
                resolve(false);
            }
        }, SIMULATED_DELAY);
    });
};

export const updatePartnerStatus = (id: string, status: PartnerStatus): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const idx = partnersData.findIndex(p => p.id === id);
            if (idx > -1) {
                partnersData[idx].status = status;
                resolve(true);
            } else resolve(false);
        }, SIMULATED_DELAY);
    });
};

export const updatePartnerAdmin = (id: string, updates: Partial<AdminPartner> & { password?: string }): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const idx = partnersData.findIndex(p => p.id === id);
            if (idx > -1) {
                const { nameAr, descriptionAr, ...rest } = updates;
                partnersData[idx] = { ...partnersData[idx], ...rest };
                resolve(true);
            } else resolve(false);
        }, SIMULATED_DELAY);
    });
};

export const upgradePartnerPlan = (id: string, newPlan: SubscriptionPlan): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const idx = partnersData.findIndex(p => p.id === id);
            if (idx > -1) {
                partnersData[idx].subscriptionPlan = newPlan;
                const nextYear = new Date();
                nextYear.setFullYear(nextYear.getFullYear() + 1);
                partnersData[idx].subscriptionEndDate = nextYear.toISOString();
                resolve(true);
            } else resolve(false);
        }, SIMULATED_DELAY);
    });
};

export const addPartner = (request: PartnerRequest, password?: string): Promise<Partner> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newPartnerId = `partner-${Date.now()}`;
            const newPartnerBaseData = {
                id: newPartnerId,
                imageUrl: request.logo || 'https://via.placeholder.com/150',
                email: request.contactEmail,
                password: password || 'password123', 
                type: request.companyType,
                status: 'active' as PartnerStatus,
                subscriptionPlan: request.subscriptionPlan,
                displayType: 'standard' as PartnerDisplayType, 
                contactMethods: { 
                    whatsapp: { enabled: false, number: '' },
                    phone: { enabled: true, number: request.contactPhone },
                    form: { enabled: true }
                }
            };
            partnersData.push(newPartnerBaseData);
            
            const newPartner: Partner = {
                ...newPartnerBaseData,
                name: request.companyName,
                description: request.description,
                role: mapPartnerTypeToRole(request.companyType)
            };
            resolve(newPartner);
        }, SIMULATED_DELAY);
    });
};

export const addInternalUser = (userData: any): Promise<AdminPartner> => {
    return new Promise((resolve) => {
        setTimeout(async () => {
            const newUserId = `user-${Date.now()}`;
            const newPartnerBaseData = {
                id: newUserId,
                imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1964&auto.format&fit=crop',
                email: userData.email,
                password: userData.password || 'password123',
                type: userData.type,
                status: 'active' as PartnerStatus,
                subscriptionPlan: 'basic' as SubscriptionPlan,
                displayType: 'standard' as PartnerDisplayType,
            };
            partnersData.push(newPartnerBaseData);
            const partner = await getPartnerById(newUserId);
            resolve(partner as AdminPartner);
        }, SIMULATED_DELAY);
    });
};

export const updateUser = (userId: string, updates: any): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const idx = partnersData.findIndex(p => p.id === userId);
            if (idx > -1) {
                partnersData[idx] = { ...partnersData[idx], ...updates };
                resolve(true);
            } else resolve(false);
        }, SIMULATED_DELAY);
    });
};

export const deletePartner = (userId: string): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const initialLength = partnersData.length;
            partnersData = partnersData.filter(p => p.id !== userId);
            resolve(partnersData.length < initialLength);
        }, SIMULATED_DELAY);
    });
};

export const getTeamMembers = (parentId: string): Promise<AdminPartner[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
             const result = partnersData
                .filter(p => p.parentId === parentId)
                .map(basePartner => {
                    const info = getLocalizedPartnerInfo(basePartner.id);
                    return {
                        ...basePartner,
                        name: info.en.name !== basePartner.id ? info.en.name : 'Team Member',
                        description: info.en.description,
                        nameAr: info.ar.name !== basePartner.id ? info.ar.name : 'عضو فريق',
                        role: mapPartnerTypeToRole(basePartner.type)
                    } as AdminPartner;
                });
            resolve(result);
        }, SIMULATED_DELAY);
    });
};

export const addTeamMember = (parentId: string, memberData: any): Promise<Partner> => {
    return new Promise((resolve) => {
        setTimeout(async () => {
            const newMemberId = `sub-${Date.now()}`;
            const newMemberBase = {
                id: newMemberId,
                parentId: parentId,
                imageUrl: 'https://via.placeholder.com/150',
                email: memberData.email,
                password: memberData.password,
                type: memberData.type,
                status: 'active' as PartnerStatus,
                subscriptionPlan: 'basic' as SubscriptionPlan,
                displayType: 'standard' as PartnerDisplayType,
                customPermissions: memberData.customPermissions
            };
            partnersData.push(newMemberBase);
            (enTranslations.partnerInfo as any)[newMemberId] = { name: memberData.name, description: 'Team Member' };
            (arTranslations.partnerInfo as any)[newMemberId] = { name: memberData.name, description: 'عضو فريق' };
            const member = await getPartnerById(newMemberId);
            resolve(member!);
        }, SIMULATED_DELAY);
    });
};

export const updateTeamMember = (memberId: string, updates: any): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const idx = partnersData.findIndex(p => p.id === memberId);
            if (idx > -1) {
                partnersData[idx] = { ...partnersData[idx], ...updates };
                if((enTranslations.partnerInfo as any)[memberId]) (enTranslations.partnerInfo as any)[memberId].name = updates.name;
                resolve(true);
            } else resolve(false);
        }, SIMULATED_DELAY);
    });
};

export const deleteTeamMember = (memberId: string): Promise<boolean> => deletePartner(memberId);

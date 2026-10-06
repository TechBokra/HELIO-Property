
import { supabase } from '../lib/supabase';
import { Permission, type SubscriptionPlan, type SubscriptionPlanDetails, type PlanCategory } from '../types';
import { arTranslations, enTranslations } from '../data/translations';
import { requirePermission } from './authGuard';

// Helper to get fallback plans from local translations if DB is empty
const getFallbackPlans = () => {
    const arPlans = arTranslations.subscriptionPlans;
    const enPlans = enTranslations.subscriptionPlans;

    return {
        developer: {
            basic: { ar: arPlans?.developer?.basic, en: enPlans?.developer?.basic },
            professional: { ar: arPlans?.developer?.professional, en: enPlans?.developer?.professional },
            elite: { ar: arPlans?.developer?.elite, en: enPlans?.developer?.elite },
        },
        agency: {
             basic: { ar: arPlans?.agency?.basic, en: enPlans?.agency?.basic },
            professional: { ar: arPlans?.agency?.professional, en: enPlans?.agency?.professional },
            elite: { ar: arPlans?.agency?.elite, en: enPlans?.agency?.elite },
        },
        finishing: {
            commission: { ar: arPlans?.finishing?.commission, en: enPlans?.finishing?.commission },
            professional: { ar: arPlans?.finishing?.professional, en: enPlans?.finishing?.professional },
            elite: { ar: arPlans?.finishing?.elite, en: enPlans?.finishing?.elite },
        },
        individual: {
            sale: {
                paid_listing: { ar: arPlans?.individual?.sale?.paid_listing, en: enPlans?.individual?.sale?.paid_listing },
                commission: { ar: arPlans?.individual?.sale?.commission, en: enPlans?.individual?.sale?.commission },
            },
            rent: {
                paid_listing: { ar: arPlans?.individual?.rent?.paid_listing, en: enPlans?.individual?.rent?.paid_listing },
                commission: { ar: arPlans?.individual?.rent?.commission, en: enPlans?.individual?.rent?.commission },
            }
        },
    } as Record<PlanCategory, any>;
};

export const getPlans = async (): Promise<Record<PlanCategory, any>> => {
    try {
        const { data, error } = await supabase
            .from('site_content')
            .select('content')
            .eq('key', 'subscription_plans')
            .single();

        if (error || !data) {
            // Fallback to local data if not found in DB
            return getFallbackPlans();
        }

        return data.content;
    } catch (e) {
        console.error("Failed to fetch plans", e);
        return getFallbackPlans();
    }
};

export const updatePlan = async (
    planType: PlanCategory, 
    planKey: SubscriptionPlan, 
    updates: { ar: Partial<SubscriptionPlanDetails>, en: Partial<SubscriptionPlanDetails> }, 
    subCategory?: 'sale' | 'rent'
): Promise<boolean> => {
    requirePermission(Permission.MANAGE_PLANS);
    const currentPlans = await getPlans();
    
    // Deep clone to avoid mutation issues before saving
    const newPlans = JSON.parse(JSON.stringify(currentPlans));
    
    // Locate the specific plan
    let targetPlanGroup;
    if (planType === 'individual' && subCategory) {
        targetPlanGroup = newPlans[planType][subCategory];
    } else {
        targetPlanGroup = newPlans[planType];
    }

    if (targetPlanGroup && targetPlanGroup[planKey]) {
        // Merge updates
        targetPlanGroup[planKey].ar = { ...targetPlanGroup[planKey].ar, ...updates.ar };
        targetPlanGroup[planKey].en = { ...targetPlanGroup[planKey].en, ...updates.en };
        
        // Save back to DB
        const { error } = await supabase
            .from('site_content')
            .upsert({ key: 'subscription_plans', content: newPlans });

        if (error) {
            console.error("Error updating plan:", error);
            return false;
        }
        return true;
    }
    
    return false;
};

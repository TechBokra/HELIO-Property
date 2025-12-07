
import type { SubscriptionPlan, SubscriptionPlanDetails, PlanCategory } from '../types';
import { arTranslations, enTranslations } from '../data/translations';

const SIMULATED_DELAY = 300;

const getPlansFromTranslations = () => {
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
    } as any; // Cast to avoid deep type checking for this mock
};


export const getPlans = async (): Promise<Record<PlanCategory, any>> => {
    const plans = getPlansFromTranslations();
    return new Promise((resolve) => {
        // Return a deep copy to prevent direct mutation from outside
        setTimeout(() => resolve(JSON.parse(JSON.stringify(plans))), SIMULATED_DELAY);
    });
};


export const updatePlan = (planType: PlanCategory, planKey: SubscriptionPlan, updates: { ar: Partial<SubscriptionPlanDetails>, en: Partial<SubscriptionPlanDetails> }, subCategory?: 'sale' | 'rent'): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // This is a limitation of the mock setup. In a real app, this would be a POST/PUT request.
            // Here we are just resolving true without actually mutating the source `translations.ts` file.
            console.warn("Mock API: Plan updates are not persisted in this demo.", { planType, subCategory, planKey, updates });
            resolve(true);
        }, SIMULATED_DELAY);
    });
};

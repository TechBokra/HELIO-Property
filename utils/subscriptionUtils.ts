import type { SubscriptionPlan, PartnerType } from '../types';

const limitsByType = {
    agency: {
        properties: { basic: 3, professional: 15, elite: Infinity, commission: 0, paid_listing: 1 },
    },
    developer: { 
        projects: { basic: 1, professional: 5, elite: Infinity },
        units: { basic: 10, professional: 50, elite: Infinity },
    },
    finishing: {
        portfolio: { commission: 10, professional: 50, elite: Infinity },
    },
};

type LimitType = 'properties' | 'projects' | 'units' | 'portfolio';

export const getPlanLimit = (partnerType: PartnerType, plan: SubscriptionPlan, limitType: LimitType): number => {
    // For developers, both 'properties' and 'units' refer to the 'units' limit.
    const effectiveLimitType = (partnerType === 'developer' && (limitType === 'properties' || limitType === 'units')) ? 'units' : limitType;

    const typeKey = partnerType as keyof typeof limitsByType;
    if (
        limitsByType[typeKey] && 
        (limitsByType[typeKey] as any)[effectiveLimitType] && 
        (limitsByType[typeKey] as any)[effectiveLimitType][plan] !== undefined
    ) {
        return (limitsByType[typeKey] as any)[effectiveLimitType][plan];
    }
    // Default to unlimited if a specific limit isn't found for that combination
    return Infinity;
};

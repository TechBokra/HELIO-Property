
export interface RoutingRuleCondition {
    field: string; // e.g., 'type', 'payload.serviceType'
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: string | number;
}

export interface RoutingRuleAction {
    assignTo: string; // userId of the manager/partner
}

export interface RoutingRule {
    id: string;
    name: { [key in 'ar' | 'en']: string };
    active: boolean;
    conditions: RoutingRuleCondition[];
    action: RoutingRuleAction;
}

export let routingRulesData: RoutingRule[] = [
    // --- 1. Decoration Requests ---
    {
        id: 'rule-decor-leads',
        name: {
            en: 'Route Decoration Leads to Decor Manager',
            ar: 'توجيه طلبات الديكور لمدير الديكورات'
        },
        active: true,
        conditions: [
            { field: 'type', operator: 'equals', value: 'LEAD' },
            { field: 'payload.serviceType', operator: 'equals', value: 'decorations' },
        ],
        action: {
            assignTo: 'decoration-manager-1',
        }
    },

    // --- 2. Platform Finishing Requests ---
    {
        id: 'rule-finishing-leads',
        name: {
            en: 'Route Finishing Leads to Platform Finishing Mgr',
            ar: 'توجيه طلبات التشطيب لمدير تشطيبات المنصة'
        },
        active: true,
        conditions: [
            { field: 'type', operator: 'equals', value: 'LEAD' },
            { field: 'payload.serviceType', operator: 'equals', value: 'finishing' },
        ],
        action: {
            assignTo: 'platform-finishing-manager-1',
        }
    },

    // --- 3. Listing Requests (Individual Owners) ---
    {
        id: 'rule-listing-requests',
        name: {
            en: 'Route Listing Requests to Platform Real Estate Mgr',
            ar: 'توجيه طلبات عرض العقارات لمدير عقارات المنصة'
        },
        active: true,
        conditions: [
            { field: 'type', operator: 'equals', value: 'PROPERTY_LISTING_REQUEST' },
        ],
        action: {
            assignTo: 'platform-real-estate-manager-1',
        }
    },

    // --- 4. Partner Applications ---
    {
        id: 'rule-partner-apps',
        name: {
            en: 'Route Partner Apps to Partner Relations',
            ar: 'توجيه طلبات الشراكة لمدير علاقات الشركاء'
        },
        active: true,
        conditions: [
            { field: 'type', operator: 'equals', value: 'PARTNER_APPLICATION' },
        ],
        action: {
            assignTo: 'partner-relations-manager-1',
        }
    },

    // --- 5. High Value Inquiries ---
    {
        id: 'rule-high-value-inquiry',
        name: {
            en: 'Route High Value Inquiries to Senior Manager',
            ar: 'توجيه الاستفسارات العقارية الكبرى لمدير السوق'
        },
        active: true,
        conditions: [
            { field: 'type', operator: 'equals', value: 'PROPERTY_INQUIRY' },
            { field: 'payload.details', operator: 'contains', value: 'villa' }, // Simple heuristic
        ],
        action: {
            assignTo: 'real-estate-market-manager-1',
        }
    },
];

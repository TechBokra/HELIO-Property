import { Role, Permission, PartnerType } from '../types';

export const rolePermissions: Map<Role, Permission[]> = new Map([
  [
    Role.SUPER_ADMIN,
    Object.values(Permission),
  ],

  // --- External Roles ---
  [
    Role.DEVELOPER_PARTNER,
    [
      Permission.VIEW_PARTNER_DASHBOARD,
      Permission.VIEW_PROJECTS,
      Permission.MANAGE_OWN_PROJECTS,
      Permission.VIEW_PROPERTIES,
      Permission.MANAGE_OWN_PROPERTIES,
      Permission.VIEW_OWN_LEADS,
      Permission.MANAGE_OWN_PROFILE,
      Permission.MANAGE_OWN_SUBSCRIPTION,
      Permission.MANAGE_TEAM,
    ],
  ],
  [
    Role.FINISHING_PARTNER,
    [
      Permission.VIEW_PARTNER_DASHBOARD,
      Permission.VIEW_FINISHING,
      Permission.MANAGE_OWN_PORTFOLIO,
      Permission.VIEW_OWN_LEADS,
      Permission.MANAGE_OWN_PROFILE,
      Permission.MANAGE_OWN_SUBSCRIPTION,
      Permission.MANAGE_TEAM,
    ],
  ],
  [
    Role.AGENCY_PARTNER,
    [
      Permission.VIEW_PARTNER_DASHBOARD,
      Permission.VIEW_PROPERTIES,
      Permission.MANAGE_OWN_PROPERTIES,
      Permission.VIEW_OWN_LEADS,
      Permission.MANAGE_OWN_PROFILE,
      Permission.MANAGE_OWN_SUBSCRIPTION,
      Permission.MANAGE_TEAM,
    ],
  ],
  [
    Role.CUSTOMER,
    [
      Permission.VIEW_CUSTOMER_DASHBOARD,
      Permission.MANAGE_OWN_PROFILE,
    ],
  ],

  // --- Internal Platform Management Roles ---
  // 1. Real Estate Market Manager (General Market Oversight)
  [
    Role.REAL_ESTATE_MARKET_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.VIEW_PROPERTIES,
      Permission.MANAGE_MARKET_PROPERTIES,
      Permission.VIEW_PROJECTS,
      Permission.MANAGE_ALL_PROJECTS,
      Permission.VIEW_LEADS,
      Permission.VIEW_REQUESTS,
      Permission.MANAGE_PROPERTY_INQUIRIES,
      Permission.VIEW_ANALYTICS,
      Permission.VIEW_REPORTS,
    ],
  ],

  // 2. Platform Real Estate Manager (Brokerage / Direct Platform Listings)
  [
    Role.PLATFORM_REAL_ESTATE_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.VIEW_PROPERTIES,
      Permission.MANAGE_PLATFORM_PROPERTIES,
      Permission.PUBLISH_PROPERTIES,
      Permission.ARCHIVE_PROPERTIES,
      Permission.VIEW_LEADS,
      Permission.MANAGE_PLATFORM_PROPERTY_LEADS,
      Permission.VIEW_REQUESTS,
      Permission.MANAGE_PROPERTY_REQUESTS,
      Permission.VIEW_ANALYTICS,
    ],
  ],

  // 3. Listings Manager (Catalog Consistency)
  [
    Role.LISTINGS_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.VIEW_PROPERTIES,
      Permission.MANAGE_ALL_PROPERTIES,
      Permission.PUBLISH_PROPERTIES,
      Permission.VIEW_PROJECTS,
      Permission.VIEW_LEADS,
    ],
  ],

  // 4. Partner Relations Manager (Onboarding & Governance)
  [
    Role.PARTNER_RELATIONS_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.VIEW_PARTNERS,
      Permission.MANAGE_ALL_PARTNERS,
      Permission.VERIFY_PARTNERS,
      Permission.SUSPEND_PARTNERS,
      Permission.MANAGE_PARTNER_REQUESTS,
      Permission.MANAGE_INQUIRY_ROUTING,
      Permission.MANAGE_PLANS,
      Permission.VIEW_AUTOMATION,
      Permission.MANAGE_AUTOMATION,
      Permission.VIEW_ANALYTICS,
      Permission.VIEW_REPORTS,
    ],
  ],

  // 5. Customer Relations Manager (Customer Accounts & Inquiries)
  [
    Role.CUSTOMER_RELATIONS_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.VIEW_CUSTOMERS,
      Permission.MANAGE_CUSTOMERS,
      Permission.VIEW_LEADS,
      Permission.VIEW_REQUESTS,
      Permission.MANAGE_REQUESTS,
      Permission.MANAGE_PROPERTY_REQUESTS,
      Permission.MANAGE_PROPERTY_INQUIRIES,
      Permission.MANAGE_CONTACT_REQUESTS,
    ],
  ],

  // 6. Platform Finishing Manager (Turnkey & Operations)
  [
    Role.PLATFORM_FINISHING_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.VIEW_FINISHING,
      Permission.MANAGE_PLATFORM_FINISHING_PACKAGES,
      Permission.MANAGE_PLATFORM_FINISHING_LEADS,
      Permission.MANAGE_QUOTES,
      Permission.MANAGE_EXECUTION,
      Permission.VIEW_LEADS,
      Permission.VIEW_REQUESTS,
    ],
  ],

  // 7. Finishing Market Manager (Finishing Partners Oversight)
  [
    Role.FINISHING_MARKET_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.VIEW_FINISHING,
      Permission.MANAGE_FINISHING_PARTNERS,
      Permission.VIEW_PARTNERS,
      Permission.MANAGE_PARTNER_REQUESTS,
      Permission.VIEW_LEADS,
    ],
  ],

  // 8. Decoration Manager (Platform Portfolio & Requests)
  [
    Role.DECORATION_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.VIEW_DECORATIONS,
      Permission.MANAGE_DECORATIONS_CONTENT,
      Permission.MANAGE_DECORATIONS_LEADS,
      Permission.VIEW_LEADS,
      Permission.VIEW_REQUESTS,
    ],
  ],

  // 9. Content Manager (CMS & Media)
  [
    Role.CONTENT_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.VIEW_SITE_CONTENT,
      Permission.MANAGE_SITE_CONTENT,
      Permission.MANAGE_BANNERS,
      Permission.MANAGE_MEDIA,
      Permission.VIEW_FORMS,
      Permission.MANAGE_FORMS,
      Permission.VIEW_SETTINGS,
      Permission.MANAGE_SETTINGS,
      Permission.MANAGE_FILTERS,
    ],
  ],

  // --- Legacy / General Roles (Kept for backward compatibility) ---
  [
    Role.SERVICE_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.VIEW_FINISHING,
      Permission.MANAGE_FINISHING_PARTNERS,
      Permission.VIEW_DECORATIONS,
      Permission.MANAGE_DECORATIONS_LEADS,
    ],
  ],
]);

/**
 * Resolves a canonical Role strictly from database attributes.
 * Never performs email-based promotion or client overrides.
 */
export const mapPartnerTypeToRole = (type?: PartnerType | string, role?: string): Role => {
    const cleanRole = (role || '').trim().toLowerCase();
    const cleanType = (type || '').trim().toLowerCase();

    // 1. Direct database role string matching (Primary Authority)
    if (cleanRole) {
        switch (cleanRole) {
            case 'super_admin':
            case 'system_admin':
            case 'admin':
                return Role.SUPER_ADMIN;
            case 'developer_partner':
            case 'developer':
                return Role.DEVELOPER_PARTNER;
            case 'finishing_partner':
            case 'finishing':
                return Role.FINISHING_PARTNER;
            case 'agency_partner':
            case 'agency':
                return Role.AGENCY_PARTNER;
            case 'decoration_manager': return Role.DECORATION_MANAGER;
            case 'platform_finishing_manager': return Role.PLATFORM_FINISHING_MANAGER;
            case 'finishing_market_manager': return Role.FINISHING_MARKET_MANAGER;
            case 'platform_real_estate_manager': return Role.PLATFORM_REAL_ESTATE_MANAGER;
            case 'real_estate_market_manager': return Role.REAL_ESTATE_MARKET_MANAGER;
            case 'partner_relations_manager': return Role.PARTNER_RELATIONS_MANAGER;
            case 'content_manager': return Role.CONTENT_MANAGER;
            case 'service_manager': return Role.SERVICE_MANAGER;
            case 'customer_relations_manager': return Role.CUSTOMER_RELATIONS_MANAGER;
            case 'listings_manager': return Role.LISTINGS_MANAGER;
            case 'customer':
            case 'user':
            case 'client':
                return Role.CUSTOMER;
        }
    }

    // 2. Fallback strictly to account Type
    switch (cleanType) {
        case 'admin':
        case 'system':
            return Role.SUPER_ADMIN;
        case 'developer': return Role.DEVELOPER_PARTNER;
        case 'finishing': return Role.FINISHING_PARTNER;
        case 'agency': return Role.AGENCY_PARTNER;
        case 'decoration_manager': return Role.DECORATION_MANAGER;
        case 'platform_finishing_manager': return Role.PLATFORM_FINISHING_MANAGER;
        case 'finishing_market_manager': return Role.FINISHING_MARKET_MANAGER;
        case 'platform_real_estate_manager': return Role.PLATFORM_REAL_ESTATE_MANAGER;
        case 'real_estate_market_manager': return Role.REAL_ESTATE_MARKET_MANAGER;
        case 'partner_relations_manager': return Role.PARTNER_RELATIONS_MANAGER;
        case 'content_manager': return Role.CONTENT_MANAGER;
        case 'service_manager': return Role.SERVICE_MANAGER;
        case 'customer_relations_manager': return Role.CUSTOMER_RELATIONS_MANAGER;
        case 'listings_manager': return Role.LISTINGS_MANAGER;
        case 'customer':
        case 'individual':
            return Role.CUSTOMER;
        default: return Role.CUSTOMER; 
    }
};
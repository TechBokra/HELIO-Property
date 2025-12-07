
import { Role, Permission, PartnerType } from '../types';

export const rolePermissions: Map<Role, Permission[]> = new Map([
  [
    Role.SUPER_ADMIN,
    Object.values(Permission),
  ],
  // --- External Partners ---
  [
    Role.DEVELOPER_PARTNER,
    [
      Permission.VIEW_PARTNER_DASHBOARD,
      Permission.MANAGE_OWN_PROFILE,
      Permission.MANAGE_OWN_PROJECTS,
      Permission.VIEW_OWN_LEADS,
      Permission.MANAGE_OWN_SUBSCRIPTION,
      Permission.MANAGE_OWN_PROPERTIES, // Developers manage properties within projects
      Permission.MANAGE_TEAM, // Can manage sub-users
    ],
  ],
  [
    Role.FINISHING_PARTNER,
    [
      Permission.VIEW_PARTNER_DASHBOARD,
      Permission.MANAGE_OWN_PROFILE,
      Permission.MANAGE_OWN_PORTFOLIO,
      Permission.VIEW_OWN_LEADS,
      Permission.MANAGE_OWN_SUBSCRIPTION,
      Permission.MANAGE_TEAM, // Can manage sub-users
    ],
  ],
  [
    Role.AGENCY_PARTNER,
    [
      Permission.VIEW_PARTNER_DASHBOARD,
      Permission.MANAGE_OWN_PROFILE,
      Permission.MANAGE_OWN_PROPERTIES,
      Permission.VIEW_OWN_LEADS,
      Permission.MANAGE_OWN_SUBSCRIPTION,
      Permission.MANAGE_TEAM, // Can manage sub-users
    ],
  ],

  // --- Internal Managers ---
  
  // 1. Decoration Manager (Platform)
  [
    Role.DECORATION_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.MANAGE_DECORATIONS_CONTENT, // Portfolio, Categories
      Permission.MANAGE_DECORATIONS_LEADS,   // Requests
    ],
  ],

  // 2. Platform Finishing Manager (Internal Team)
  [
    Role.PLATFORM_FINISHING_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.MANAGE_PLATFORM_FINISHING_PACKAGES, // Services, Pricing
      Permission.MANAGE_PLATFORM_FINISHING_LEADS,    // Requests
    ],
  ],

  // 3. Finishing Market Manager (Partners Oversight)
  [
    Role.FINISHING_MARKET_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.MANAGE_FINISHING_PARTNERS, // Review Finishing Partners
      Permission.MANAGE_PARTNER_REQUESTS,   // Approve new finishing partners
    ],
  ],

  // 4. Platform Real Estate Manager (Brokerage / Individual Listings)
  [
    Role.PLATFORM_REAL_ESTATE_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.MANAGE_PLATFORM_PROPERTIES,      // Drafts, Active Platform Listings
      Permission.MANAGE_PLATFORM_PROPERTY_LEADS,  // Direct inquiries
      Permission.MANAGE_PROPERTY_REQUESTS,        // Listing requests from individuals
    ],
  ],

  // 5. Real Estate Market Manager (General Oversight)
  [
    Role.REAL_ESTATE_MARKET_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.MANAGE_MARKET_PROPERTIES, // View all market props
      Permission.MANAGE_ALL_PROJECTS,      // View projects
      Permission.MANAGE_PROPERTY_INQUIRIES, // General search requests
    ],
  ],

  // 6. Partner Relations Manager (Onboarding & Rules)
  [
    Role.PARTNER_RELATIONS_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.MANAGE_ALL_PARTNERS,
      Permission.MANAGE_PARTNER_REQUESTS,
      Permission.MANAGE_INQUIRY_ROUTING,
      Permission.MANAGE_PLANS,
      Permission.MANAGE_AUTOMATION, // Routing Rules
    ],
  ],

  // 7. Content Manager (CMS)
   [
    Role.CONTENT_MANAGER,
    [
      Permission.VIEW_ADMIN_DASHBOARD,
      Permission.MANAGE_BANNERS,
      Permission.MANAGE_SITE_CONTENT,
      Permission.MANAGE_FILTERS,
      Permission.MANAGE_SETTINGS,
      Permission.MANAGE_FORMS, // Dynamic Forms
    ],
  ],

  // --- Legacy / General Roles (For backward compatibility) ---
  [
    Role.SERVICE_MANAGER,
    [
        Permission.VIEW_ADMIN_DASHBOARD,
        Permission.MANAGE_FINISHING_PARTNERS,
        Permission.MANAGE_DECORATIONS_LEADS,
    ]
  ],
  [
    Role.CUSTOMER_RELATIONS_MANAGER,
    [
        Permission.VIEW_ADMIN_DASHBOARD,
        Permission.MANAGE_PROPERTY_REQUESTS,
        Permission.MANAGE_PROPERTY_INQUIRIES,
        Permission.MANAGE_CONTACT_REQUESTS,
    ]
  ],
  [
    Role.LISTINGS_MANAGER,
    [
        Permission.VIEW_ADMIN_DASHBOARD,
        Permission.MANAGE_ALL_PROPERTIES,
    ]
  ]
]);


export const mapPartnerTypeToRole = (type: PartnerType): Role => {
    switch (type) {
        case 'admin': return Role.SUPER_ADMIN;
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
        
        default: return Role.AGENCY_PARTNER; 
    }
}
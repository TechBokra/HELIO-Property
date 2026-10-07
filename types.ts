

export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';

export enum Role {
    SUPER_ADMIN = 'super_admin',
    DEVELOPER_PARTNER = 'developer_partner',
    FINISHING_PARTNER = 'finishing_partner',
    AGENCY_PARTNER = 'agency_partner',
    DECORATION_MANAGER = 'decoration_manager',
    PLATFORM_FINISHING_MANAGER = 'platform_finishing_manager',
    FINISHING_MARKET_MANAGER = 'finishing_market_manager',
    PLATFORM_REAL_ESTATE_MANAGER = 'platform_real_estate_manager',
    REAL_ESTATE_MARKET_MANAGER = 'real_estate_market_manager',
    PARTNER_RELATIONS_MANAGER = 'partner_relations_manager',
    CONTENT_MANAGER = 'content_manager',
    SERVICE_MANAGER = 'service_manager',
    CUSTOMER_RELATIONS_MANAGER = 'customer_relations_manager',
    LISTINGS_MANAGER = 'listings_manager',
    CUSTOMER = 'customer'
}

export enum Permission {
    // DASHBOARD
    VIEW_ADMIN_DASHBOARD = 'view_admin_dashboard',
    VIEW_PARTNER_DASHBOARD = 'view_partner_dashboard',
    VIEW_CUSTOMER_DASHBOARD = 'view_customer_dashboard',

    // PROPERTIES
    VIEW_PROPERTIES = 'view_properties',
    MANAGE_ALL_PROPERTIES = 'manage_all_properties',
    MANAGE_PLATFORM_PROPERTIES = 'manage_platform_properties',
    MANAGE_MARKET_PROPERTIES = 'manage_market_properties',
    PUBLISH_PROPERTIES = 'publish_properties',
    ARCHIVE_PROPERTIES = 'archive_properties',
    MANAGE_OWN_PROPERTIES = 'manage_own_properties',

    // PROJECTS
    VIEW_PROJECTS = 'view_projects',
    MANAGE_ALL_PROJECTS = 'manage_all_projects',
    MANAGE_OWN_PROJECTS = 'manage_own_projects',

    // PARTNERS
    VIEW_PARTNERS = 'view_partners',
    MANAGE_ALL_PARTNERS = 'manage_all_partners',
    VERIFY_PARTNERS = 'verify_partners',
    SUSPEND_PARTNERS = 'suspend_partners',
    MANAGE_PARTNER_REQUESTS = 'manage_partner_requests',
    MANAGE_INQUIRY_ROUTING = 'manage_inquiry_routing',
    MANAGE_PLANS = 'manage_plans',

    // CUSTOMERS
    VIEW_CUSTOMERS = 'view_customers',
    MANAGE_CUSTOMERS = 'manage_customers',

    // LEADS & REQUESTS
    VIEW_LEADS = 'view_leads',
    MANAGE_LEADS = 'manage_leads',
    ASSIGN_LEADS = 'assign_leads',
    VIEW_REQUESTS = 'view_requests',
    MANAGE_REQUESTS = 'manage_requests',
    ASSIGN_REQUESTS = 'assign_requests',
    MANAGE_PLATFORM_PROPERTY_LEADS = 'manage_platform_property_leads',
    MANAGE_PROPERTY_REQUESTS = 'manage_property_requests',
    MANAGE_PROPERTY_INQUIRIES = 'manage_property_inquiries',
    MANAGE_CONTACT_REQUESTS = 'manage_contact_requests',
    VIEW_OWN_LEADS = 'view_own_leads',

    // FINISHING
    VIEW_FINISHING = 'view_finishing',
    MANAGE_PLATFORM_FINISHING_PACKAGES = 'manage_platform_finishing_packages',
    MANAGE_PLATFORM_FINISHING_LEADS = 'manage_platform_finishing_leads',
    MANAGE_FINISHING_PARTNERS = 'manage_finishing_partners',
    MANAGE_QUOTES = 'manage_quotes',
    MANAGE_EXECUTION = 'manage_execution',

    // DECORATIONS
    VIEW_DECORATIONS = 'view_decorations',
    MANAGE_DECORATIONS_CONTENT = 'manage_decorations_content',
    MANAGE_DECORATIONS_LEADS = 'manage_decorations_leads',

    // CONTENT & MEDIA
    VIEW_SITE_CONTENT = 'view_site_content',
    MANAGE_SITE_CONTENT = 'manage_site_content',
    MANAGE_BANNERS = 'manage_banners',
    MANAGE_MEDIA = 'manage_media',

    // ANALYTICS & REPORTS
    VIEW_ANALYTICS = 'view_analytics',
    VIEW_REPORTS = 'view_reports',
    EXPORT_REPORTS = 'export_reports',

    // FINANCE
    VIEW_FINANCE = 'view_finance',
    MANAGE_FINANCE = 'manage_finance',

    // USERS & GOVERNANCE
    VIEW_USERS = 'view_users',
    MANAGE_USERS = 'manage_users',
    VIEW_ROLES_PERMISSIONS = 'view_roles_permissions',
    MANAGE_ROLES_PERMISSIONS = 'manage_roles_permissions',
    VIEW_AUDIT_LOG = 'view_audit_log',

    // AUTOMATION
    VIEW_AUTOMATION = 'view_automation',
    MANAGE_AUTOMATION = 'manage_automation',

    // FORMS
    VIEW_FORMS = 'view_forms',
    MANAGE_FORMS = 'manage_forms',

    // SETTINGS & FILTERS
    VIEW_SETTINGS = 'view_settings',
    MANAGE_SETTINGS = 'manage_settings',
    MANAGE_FILTERS = 'manage_filters',

    // PARTNER SELF-SERVICE
    MANAGE_OWN_PROFILE = 'manage_own_profile',
    MANAGE_OWN_PORTFOLIO = 'manage_own_portfolio',
    MANAGE_OWN_SUBSCRIPTION = 'manage_own_subscription',
    MANAGE_TEAM = 'manage_team'
}

export type PartnerType = 'developer' | 'finishing' | 'agency' | 'admin' | 'customer' | 'decoration_manager' | 'platform_finishing_manager' | 'finishing_market_manager' | 'platform_real_estate_manager' | 'real_estate_market_manager' | 'partner_relations_manager' | 'content_manager' | 'service_manager' | 'customer_relations_manager' | 'listings_manager';

export type SubscriptionPlan = 'basic' | 'professional' | 'elite' | 'commission' | 'paid_listing';
export type PlanCategory = 'developer' | 'agency' | 'finishing' | 'individual';
export type PartnerDisplayType = 'standard' | 'featured' | 'mega_project';
export type PartnerStatus = 'active' | 'pending' | 'disabled' | 'rejected' | 'approved';

export interface Partner {
    id: string;
    name: string;
    email: string;
    imageUrl: string;
    imageUrl_small?: string;
    imageUrl_medium?: string;
    imageUrl_large?: string;
    type: PartnerType;
    role: Role;
    status: PartnerStatus;
    subscriptionPlan: SubscriptionPlan;
    displayType: PartnerDisplayType;
    description?: string;
    subscriptionEndDate?: string | null;
    contactMethods?: {
        whatsapp: { enabled: boolean; number: string; };
        phone: { enabled: boolean; number: string; };
        form: { enabled: boolean; };
    };
    customPermissions?: Permission[];
    parentId?: string;
    nameAr?: string;
    descriptionAr?: string;
    createdAt?: string;
    isDemo?: boolean;
}

export interface AdminPartner extends Partner {
    nameAr: string;
    descriptionAr?: string;
    password?: string;
}

export interface Project {
    id: string;
    partnerId: string;
    name: { ar: string; en: string };
    description: { ar: string; en: string };
    imageUrl: string;
    imageUrl_small?: string;
    imageUrl_medium?: string;
    imageUrl_large?: string;
    createdAt: string;
    features: { icon: string; text: { ar: string; en: string } }[];
    unitCount?: number;
    partnerName?: string;
}

export type ListingStatus = 'active' | 'inactive' | 'draft' | 'sold';
export type PublicationStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
export type AvailabilityStatus = 'available' | 'reserved' | 'sold';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface PropertyHistoryEntry {
    id: string;
    propertyId: string;
    changedBy: string;
    changedAt: string;
    createdAt?: string;
    changeType?: string;
    field: string;
    fieldName?: string;
    oldValue: any;
    newValue: any;
    note?: string;
}

export interface Property {
    id: string;
    referenceNumber?: string;
    slug?: string;
    partnerId: string;
    projectId?: string;
    imageUrl: string;
    imageUrl_small: string;
    imageUrl_medium: string;
    imageUrl_large: string;
    gallery: string[];
    status: { en: 'For Sale' | 'For Rent'; ar: 'للبيع' | 'إيجار' };
    price: { en: string; ar: string };
    priceNumeric: number;
    pricePerMeter?: { en: string; ar: string };
    type: { en: string; ar: string };
    title: { ar: string; en: string };
    address: { ar: string; en: string };
    description: { ar: string; en: string };
    beds: number;
    baths: number;
    area: number;
    floor?: number;
    amenities: { ar: string[]; en: string[] };
    finishingStatus?: { en: string; ar: string };
    installmentsAvailable: boolean;
    isInCompound: boolean;
    realEstateFinanceAvailable: boolean;
    delivery: { isImmediate: boolean; date?: string };
    installments?: { downPayment: number; monthlyInstallment: number; years: number };
    location: { lat: number; lng: number };
    listingStartDate?: string | null;
    listingEndDate?: string;
    listingStatus: ListingStatus;
    publicationStatus?: PublicationStatus;
    partnerName?: string;
    partnerImageUrl?: string;
    projectName?: { ar: string; en: string };
    contactMethod?: 'platform' | 'direct';
    ownerPhone?: string;
    leadCount?: number;
    sourceType?: 'developer' | 'broker' | 'partner_direct' | 'platform_admin' | 'direct_owner' | 'owner_public';
    sourceRequestId?: string;
    verificationStatus?: VerificationStatus;
    verifiedAt?: string;
    priceUpdatedAt?: string;
    availabilityStatus?: AvailabilityStatus;
    lastVerifiedAt?: string;
    lastPriceConfirmedAt?: string;
    lastAvailabilityConfirmedAt?: string;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
    history?: PropertyHistoryEntry[];
}

export interface PortfolioItem {
    id: string;
    partnerId: string;
    imageUrl: string;
    alt: string;
    title: { ar: string; en: string };
    category: { ar: string; en: string };
    price?: number;
    dimensions?: string;
    availability?: 'In Stock' | 'Made to Order';
    partnerName?: string;
    createdAt?: string;
}

export interface DecorationCategory {
    id: string;
    name: { ar: string; en: string };
    description: { ar: string; en: string };
}

export interface Banner {
    id: string;
    title: string;
    imageUrl: string;
    link: string;
    locations: string[];
    status: 'active' | 'inactive';
    startDate?: string | null;
    endDate?: string | null;
}

export interface Quote {
    quote: { ar: string; en: string };
    author: { ar: string; en: string };
}

export interface FilterOption {
    id: string;
    en: string;
    ar: string;
    applicableTo?: string[];
    [key: string]: any;
}

export type RequestStatus = 'new' | 'pending' | 'reviewed' | 'approved' | 'rejected' | 'assigned' | 'in-progress' | 'closed' | 'contacted';

export enum RequestType {
    PARTNER_APPLICATION = 'PARTNER_APPLICATION',
    PROPERTY_LISTING_REQUEST = 'PROPERTY_LISTING_REQUEST',
    LEAD = 'LEAD',
    CONTACT_MESSAGE = 'CONTACT_MESSAGE',
    PROPERTY_INQUIRY = 'PROPERTY_INQUIRY'
}

export interface Request {
    id: string;
    customerId?: string;
    type: RequestType;
    requesterInfo: { name: string; phone: string; email?: string; customerId?: string };
    payload: any;
    status: RequestStatus;
    assignedTo?: string;
    assignedToName?: string;
    createdAt: string;
    updatedAt: string;
}

export type LeadStatus = 'new' | 'contacted' | 'site-visit' | 'quoted' | 'in-progress' | 'in_progress' | 'won' | 'completed' | 'cancelled';

export type DecorationStage = 
    | 'consultation' 
    | 'concept_and_3d' 
    | 'boq_and_materials' 
    | 'execution_and_fitting' 
    | 'completed' 
    | 'cancelled';

export interface LeadMessage {
    id: string;
    sender: 'client' | 'partner' | 'admin' | 'system';
    senderId?: string;
    type: 'message' | 'note';
    content: string;
    timestamp: string;
}

export enum OperationalStatus {
    NEW = 'NEW',
    ASSIGNED = 'ASSIGNED',
    IN_PROGRESS = 'IN_PROGRESS',
    WAITING = 'WAITING',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED',
    REJECTED = 'REJECTED'
}

export type OperationalDomain = 
    | 'real_estate' 
    | 'partners' 
    | 'finishing' 
    | 'decorations' 
    | 'commercial' 
    | 'customer_care';

export interface UnifiedRequest {
    id: string;
    type: RequestType;
    typeLabel: { en: string; ar: string };
    domain: OperationalDomain;
    domainLabel: { en: string; ar: string };
    createdAt: string;
    updatedAt: string;
    ageHours: number;
    isAged: boolean;
    requester: {
        name: string;
        email?: string;
        phone?: string;
        customerId?: string;
    };
    context: {
        propertyId?: string;
        propertyTitle?: string;
        projectId?: string;
        projectTitle?: string;
        partnerId?: string;
        partnerName?: string;
        serviceType?: string;
        serviceTitle?: string;
        estimatedCost?: number;
        source?: string;
        utmSource?: string;
        details?: string;
        images?: string[];
    };
    domainStatus: string;
    operationalStatus: OperationalStatus;
    priority: 'high' | 'medium' | 'low';
    assignedTo?: string;
    assignedToName?: string;
    lastActivity: string;
    nextAction: { en: string; ar: string };
    detailRoute: string;
    rawPayload: any;
}

export interface OperationalMetrics {
    total: number;
    unassigned: number;
    newCount: number;
    inProgress: number;
    waiting: number;
    agedRisk: number;
    highPriority: number;
    resolvedToday: number;
}

export interface Lead {
    id: string;
    partnerId: string;
    managerId?: string;
    propertyId?: string;
    propertyTitle?: string;
    propertyArea?: number | string;
    serviceType: 'finishing' | 'decorations' | 'property' | 'general' | 'property_search' | string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerId?: string;
    requesterEmail?: string;
    contactTime?: string;
    serviceTitle: string;
    customerNotes?: string;
    status: LeadStatus;
    designStage?: DecorationStage;
    createdAt: string;
    updatedAt: string;
    messages: LeadMessage[];
    partnerName?: string;
    itemCategory?: string;
    dimensions?: string;
    referenceImage?: string;
    assignedTo?: string;
    tierDetails?: any;
    pricingModel?: FinishingPricingModel;
    estimatedCost?: number;
    source?: 'property_page' | 'whatsapp' | 'call' | 'inquiry_form' | 'contact_page' | string;
    utmSource?: string;
    utmCampaign?: string;
    utmMedium?: string;
    utmTerm?: string;
    utmContent?: string;
    referrer?: string;
    landingPage?: string;
    pageOrigin?: string;
    leadQuality?: 'new' | 'contacted' | 'qualified' | 'viewing' | 'won' | 'lost' | string;
}

export interface PartnerRequest {
    id: string;
    companyName: string;
    companyType: PartnerType;
    description: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    companyAddress: string;
    website?: string;
    logo?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    subscriptionPlan: SubscriptionPlan;
    documents?: OfficialDocument[];
    managementContacts?: any[];
}

export interface OfficialDocument {
    fileName: string;
    fileContent: string;
    url?: string;
}

export interface AddPropertyRequest {
    id: string;
    customerName: string;
    customerPhone: string;
    status: RequestStatus;
    createdAt: string;
    propertyDetails: any;
    cooperationType: 'paid_listing' | 'commission';
    images?: string[];
    assignedTo?: string;
    managerId?: string;
}

export interface PropertyInquiryRequest {
    id: string;
    customerName: string;
    customerPhone: string;
    details: string;
    status: RequestStatus;
    createdAt: string;
}

export interface ContactRequest {
    id: string;
    name: string;
    phone: string;
    message: string;
    inquiryType: string;
    companyName?: string;
    businessType?: string;
    status: RequestStatus;
    createdAt: string;
    managerId?: string;
}

export interface Notification {
    id: string;
    userId: string;
    message: { ar: string; en: string };
    link: string;
    isRead: boolean;
    createdAt: string;
}

export interface SubscriptionPlanDetails {
    name: string;
    price: string;
    description: string;
    features: string[];
    commissionRate?: number;
}

export interface PropertyFiltersType {
    view: string;
    status: string;
    type: string;
    query: string;
    minPrice: string;
    maxPrice: string;
    project: string;
    finishing: string;
    installments: string;
    realEstateFinance: string;
    floor: string;
    compound: string;
    delivery: string;
    amenities: string[];
    beds: string;
    baths: string;
}

export interface FavoriteItem {
    id: string;
    type: 'property' | 'service' | 'portfolio';
}

export type TransactionType = 'subscription_fee' | 'listing_fee' | 'service_payment' | 'product_purchase';
export type PaymentMethod = 'card' | 'instapay' | 'wallet';
export type TransactionStatus = 'paid' | 'pending' | 'failed' | 'refunded' | 'reviewing';

export interface Transaction {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    currency: string;
    type: TransactionType;
    description: string;
    method: PaymentMethod;
    status: TransactionStatus;
    createdAt: string;
    updatedAt: string;
    referenceNumber?: string;
    receiptUrl?: string;
    relatedEntityId?: string;
}

export interface FinanceStats {
    totalRevenue: number;
    pendingAmount: number;
    successfulTransactions: number;
    pendingReviews: number;
}

export interface PaymentConfiguration {
    instapay: {
        enabled: boolean;
        number: string;
        walletName?: string;
        paymentLink?: string;
        qrCodeUrl?: string;
        instructions: { ar: string; en: string };
    };
    paymob: {
        enabled: boolean;
        apiKey?: string;
        secretKey?: string;
        publicKey?: string;
    };
}

export interface IntegrationConfiguration {
    vercel: {
        accessToken: string;
        projectId: string;
        teamId?: string;
    };
    supabase: {
        url: string;
        anonKey: string;
        serviceRoleKey: string;
    };
    cloudinary: {
        cloudName: string;
        apiKey?: string;
        apiSecret?: string;
        uploadPreset?: string;
        folder?: string;
    };
}

export interface SiteContent {
    siteName?: { ar: string; en: string };
    logoUrl?: string;
    locationPickerMapUrl?: string;
    topBanner?: {
        enabled: boolean;
        content: { ar: string; en: string };
    };
    contactConfiguration?: {
        routing: 'internal' | 'email' | 'both';
        targetEmail?: string;
    };
    paymentConfiguration?: PaymentConfiguration;
    integrationConfiguration?: IntegrationConfiguration;
    hero: {
        ar: { title: string; subtitle: string };
        en: { title: string; subtitle: string };
        images: { src: string; alt: { ar: string; en: string } }[];
    };
    homeCTA?: {
        enabled: boolean;
        ar: { title: string; subtitle: string; button: string; link: string };
        en: { title: string; subtitle: string; button: string; link: string };
    };
    homeListings?: {
        enabled: boolean;
        count: number;
        ar: { title: string };
        en: { title: string };
    };
    whyUs: any;
    services: any;
    partners: any;
    testimonials: any;
    socialProof: any;
    whyNewHeliopolis: any;
    quotes: Quote[];
    footer: any;
    finishingServices?: FinishingService[];
    projectsPage?: any;
    finishingPage?: any;
    decorationsPage?: any;
    privacyPolicy?: any;
    termsOfUse?: any;
}

export type FinishingPricingModel = 'per_sqm' | 'fixed_package' | 'custom_quote';

export interface FinishingPricingTier {
    id?: string;
    unitType: { ar: string; en: string };
    areaRange: { ar: string; en: string };
    price: number;
    priceModel?: FinishingPricingModel;
    description?: { ar?: string; en?: string };
}

export interface FinishingServiceFeature {
    ar: string;
    en: string;
    included: boolean;
}

export interface FinishingService {
    id: string;
    title: { ar: string; en: string };
    description: { ar: string; en: string };
    category?: 'turnkey' | 'commercial' | 'renovation' | 'consultation' | 'smart_home' | 'architectural';
    pricingModel: FinishingPricingModel;
    basePrice?: number;
    currency?: string;
    pricingTiers: FinishingPricingTier[];
    features?: FinishingServiceFeature[];
    isActive?: boolean;
    displayOrder?: number;
    targetPartnerId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface FinishingCategoryDefinition {
    id: 'turnkey' | 'architectural' | 'commercial' | 'renovation' | 'smart_home' | 'mep_specialized' | string;
    name: { ar: string; en: string };
    description: { ar: string; en: string };
    iconName: string;
    typicalPricingModel: FinishingPricingModel;
    warrantyMonths: number;
    avgDeliveryDays: number;
}

export interface PartnerFinishingCapability {
    id?: string;
    partnerId: string;
    categories: string[];
    serviceAreas: string[];
    minBudget: number;
    maxBudget?: number;
    turnkeyCapacity: number;
    warrantyYears: number;
    hasInHouseArchitects: boolean;
    isVerifiedContractor: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface QuoteScopeItem {
    id: string;
    category: string; // 'mep' | 'masonry' | 'paint' | 'flooring' | 'carpentry' | 'supervision' | 'materials'
    description: { ar: string; en: string };
    amount: number;
    unit?: string;
}

export type FinishingQuoteStatus = 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected';

export interface FinishingQuote {
    id: string;
    requestId: string;
    partnerId: string;
    partnerName: string;
    totalPrice: number;
    pricePerSqm?: number;
    currency: string;
    executionTimelineDays: number;
    warrantyMonths: number;
    scopeItems: QuoteScopeItem[];
    termsAndConditions?: string;
    status: FinishingQuoteStatus;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FinishingRequestHistoryEntry {
    id: string;
    requestId: string;
    actionType: 'created' | 'status_change' | 'partner_assigned' | 'quote_submitted' | 'quote_accepted' | 'quote_rejected' | 'site_visit_scheduled' | 'note_added' | 'milestone_updated';
    changedBy: string;
    oldValue?: any;
    newValue?: any;
    note?: string;
    createdAt: string;
}

export interface RequestHistoryEntry {
    id: string;
    requestId: string;
    actorId?: string;
    actorName: string;
    actorRole?: string;
    action: string;
    oldStatus?: string;
    newStatus?: string;
    oldAssignedTo?: string;
    newAssignedTo?: string;
    metadata?: Record<string, any>;
    note?: string;
    createdAt: string;
}

export type FinishingMilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';
export type MilestonePaymentStatus = 'pending' | 'due' | 'paid';

export interface FinishingProjectMilestone {
    id: string;
    requestId: string;
    stageNumber: number;
    title: { ar: string; en: string };
    description: { ar: string; en: string };
    targetDays: number;
    status: FinishingMilestoneStatus;
    progressPercentage: number;
    paymentPercentage: number;
    paymentStatus: MilestonePaymentStatus;
    customerNotes?: string;
    internalNotes?: string;
    inspectorNotes?: string;
    completedAt?: string;
    updatedAt: string;
}

export interface ExecutionAttachment {
    id: string;
    requestId: string;
    milestoneId?: string;
    uploaderId: string;
    fileUrl: string;
    fileName: string;
    fileSize?: number;
    fileType: 'photo' | 'document' | 'inspection_evidence' | 'handover_evidence';
    category: 'milestone_evidence' | 'inspection_evidence' | 'handover_evidence' | 'blueprint';
    isInternal: boolean;
    createdAt: string;
    updatedAt: string;
}

export type FinishingPropertyType = 'apartment' | 'villa';

export interface FinishingEstimateBreakdown {
    area: number;
    tier: string;
    tierName: { ar: string; en: string };
    pricePerSqm: number;
    totalEstimatedCost: number;
    mepCost: number;
    flooringMasonryCost: number;
    carpentryAluminumCost: number;
    paintsDecorCost: number;
    supervisionWarrantyCost: number;
    villaStructureCost?: number;
    estimatedDays: number;
    propertyType: FinishingPropertyType;
    villaFloors?: number;
    specs: {
        bedrooms: number;
        bathrooms: number;
        style: string;
        addons: string[];
        propertyType?: FinishingPropertyType;
        villaFloors?: number;
    };
}


export type FormCategory = 'public' | 'lead_gen' | 'partner_app' | 'admin_internal';
export type FormFieldType = 
    | 'text' 
    | 'textarea' 
    | 'number' 
    | 'email' 
    | 'tel' 
    | 'select' 
    | 'multi-select' 
    | 'checkbox' 
    | 'radio' 
    | 'date' 
    | 'file'
    | 'property_selector'
    | 'project_selector'
    | 'partner_selector';

export type ValidationRuleType = 'none' | 'email' | 'phone_eg' | 'url' | 'number' | 'custom' | 'file_constraint';
export type SubmissionDestination = 'crm_messages' | 'crm_leads' | 'crm_partners' | 'email';
export type FormVisibility = 'public' | 'customer' | 'partner' | 'admin';

export interface FormFieldDefinition {
    id: string;
    key: string;
    type: FormFieldType;
    label: { ar: string; en: string };
    placeholder?: { ar: string; en: string };
    helpText?: { ar: string; en: string };
    required: boolean;
    width: 'full' | 'half' | 'third';
    order?: number;
    options?: string[] | string;
    visibility?: FormVisibility;
    validation?: {
        type: ValidationRuleType;
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        allowedFileTypes?: string[];
        maxFileSizeBytes?: number;
        errorMessage?: { ar: string; en: string };
    };
}

export interface FormDefinition {
    id: string;
    slug: string;
    title: { ar: string; en: string };
    description?: { ar: string; en: string };
    domain?: OperationalDomain;
    category: FormCategory;
    destination: SubmissionDestination;
    requestType?: RequestType;
    version?: number;
    visibility?: FormVisibility;
    isActive: boolean;
    routingRuleId?: string;
    fields: FormFieldDefinition[];
    submitButtonLabel?: { ar: string; en: string };
    createdAt: string;
    updatedAt: string;
}

export interface IntakeSubmissionParams {
    formSlug?: string;
    requestType?: RequestType;
    domain?: OperationalDomain;
    formData: Record<string, any>;
    contextData?: Record<string, any>;
    files?: File[];
}

export interface IntakeSubmissionResult {
    success: boolean;
    requestId: string;
    requestType: RequestType;
    domain: OperationalDomain;
    assignedTo?: string;
    status: string;
    message?: { ar: string; en: string };
}

export interface AIEstimatorItem {
    id: string;
    name: { ar: string; en: string };
    unit: { ar: string; en: string };
    price: number;
}

export interface AIEstimatorStage {
    id: string;
    name: { ar: string; en: string };
    basicItems: AIEstimatorItem[];
    optionalItems: AIEstimatorItem[];
}

export interface AIEstimatorConfig {
    model?: string;
    prompt?: string;
    options?: any;
    stages: AIEstimatorStage[];
}
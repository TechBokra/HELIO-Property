

import type { Partner } from '../types';
import { Permission } from '../types';

// SECURITY WARNING: This mock data includes hardcoded passwords for demonstration purposes ONLY.
// In a real-world application, never store plain-text passwords in your codebase.
// Use a secure authentication system with hashed and salted passwords.
export let partnersData: (Omit<Partner, 'name' | 'description' | 'role'> & { password?: string })[] = [
    // Developers
    {
        id: 'united-development',
        imageUrl: 'https://images.unsplash.com/photo-1542361303-334a16de71b1?q=75&w=2070&auto=format&fit=crop',
        email: 'dev1@onlyhelio.com',
        password: 'password',
        type: 'developer', status: 'active', subscriptionPlan: 'elite',
        subscriptionEndDate: '2025-12-31T00:00:00Z', displayType: 'mega_project',
        contactMethods: { whatsapp: { enabled: true, number: '+201012345678' }, phone: { enabled: true, number: '+201012345678' }, form: { enabled: true } },
        createdAt: '2023-01-01T00:00:00Z'
    },
    // SUB-USER Example for United Development
    {
        id: 'sub-user-1',
        parentId: 'united-development',
        imageUrl: 'https://via.placeholder.com/150',
        email: 'staff@united.com',
        password: 'password',
        type: 'developer', status: 'active', subscriptionPlan: 'basic', displayType: 'standard',
        customPermissions: [Permission.VIEW_OWN_LEADS, Permission.VIEW_PARTNER_DASHBOARD], // Restricted access
        createdAt: '2023-02-01T00:00:00Z'
    },

    {
        id: 'modern-construction-group',
        imageUrl: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?q=75&w=2071&auto=format&fit=crop',
        email: 'dev2@onlyhelio.com',
        password: 'password',
        type: 'developer', status: 'active', subscriptionPlan: 'professional',
        subscriptionEndDate: '2025-08-01T00:00:00Z', displayType: 'mega_project',
        contactMethods: { whatsapp: { enabled: true, number: '+201122334455' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
        createdAt: '2023-03-01T00:00:00Z'
    },
    {
        id: 'sodic',
        imageUrl: 'https://images.unsplash.com/photo-1605146769283-4a23588950c6?q=75&w=2070&auto=format&fit=crop',
        email: 'sodic@onlyhelio.com',
        password: 'password',
        type: 'developer', status: 'active', subscriptionPlan: 'elite',
        subscriptionEndDate: '2029-12-31T00:00:00Z', displayType: 'mega_project',
        contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: true, number: '+201234567890' }, form: { enabled: true } },
        createdAt: '2023-01-15T00:00:00Z'
    },
    {
        id: 'capital-group-properties',
        imageUrl: 'https://images.unsplash.com/photo-1599809275661-059052824c04?q=75&w=2070&auto=format&fit=crop',
        email: 'cgp@onlyhelio.com',
        password: 'password',
        type: 'developer', status: 'active', subscriptionPlan: 'elite',
        subscriptionEndDate: '2029-12-31T00:00:00Z', displayType: 'mega_project',
        contactMethods: { whatsapp: { enabled: true, number: '+201555666777' }, phone: { enabled: true, number: '+201555666777' }, form: { enabled: false } },
        createdAt: '2023-04-01T00:00:00Z'
    },
    {
        id: 'heliopolis-developers-group',
        imageUrl: 'https://images.unsplash.com/photo-1560185893-a55d88652353?q=75&w=2070&auto=format&fit=crop',
        email: 'hdg@onlyhelio.com',
        password: 'password',
        type: 'developer', status: 'active', subscriptionPlan: 'professional',
        subscriptionEndDate: '2026-12-31T00:00:00Z', displayType: 'mega_project',
        contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
        createdAt: '2023-05-01T00:00:00Z'
    },
    // Missing partner added to resolve FK constraint
    {
        id: 'alrowad-engineering',
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=75&w=2070&auto=format&fit=crop',
        email: 'alrowad@onlyhelio.com',
        password: 'password',
        type: 'developer', status: 'active', subscriptionPlan: 'professional',
        subscriptionEndDate: '2025-12-31T00:00:00Z', displayType: 'standard',
        contactMethods: { whatsapp: { enabled: true, number: '+201099887766' }, phone: { enabled: true, number: '+201099887766' }, form: { enabled: true } },
        createdAt: '2023-06-01T00:00:00Z'
    },
    // Finishing Companies
    {
        id: 'el-mottaheda-group',
        imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=75&w=2070&auto=format&fit=crop',
        email: 'fin1@onlyhelio.com',
        password: 'password',
        type: 'finishing', status: 'active', subscriptionPlan: 'professional',
        subscriptionEndDate: '2025-06-20T00:00:00Z', displayType: 'featured',
        contactMethods: { whatsapp: { enabled: true, number: '+201011122233' }, phone: { enabled: true, number: '+201011122233' }, form: { enabled: true } },
        createdAt: '2023-02-10T00:00:00Z'
    },
    {
        id: 'design-hub',
        imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=75&w=2158&auto=format&fit=crop',
        email: 'fin2@onlyhelio.com',
        password: 'password',
        type: 'finishing', status: 'active', subscriptionPlan: 'professional',
        subscriptionEndDate: '2025-10-10T00:00:00Z', displayType: 'featured',
        contactMethods: { whatsapp: { enabled: true, number: '+201144556677' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
        createdAt: '2023-03-20T00:00:00Z'
    },
    {
        id: 'ebdaa-integrated-finishes',
        imageUrl: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=75&w=2070&auto=format&fit=crop',
        email: 'fin4@onlyhelio.com',
        password: 'password',
        type: 'finishing', status: 'active', subscriptionPlan: 'commission',
        subscriptionEndDate: '2025-02-28T00:00:00Z', displayType: 'standard',
        contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: true, number: '+201555123456' }, form: { enabled: true } },
        createdAt: '2023-04-15T00:00:00Z'
    },
    // Agencies
    {
        id: 'future-real-estate',
        imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=75&w=1973&auto=format&fit=crop',
        email: 'agency1@onlyhelio.com',
        password: 'password',
        type: 'agency', status: 'active', subscriptionPlan: 'professional',
        subscriptionEndDate: '2025-09-01T00:00:00Z', displayType: 'featured',
        contactMethods: { whatsapp: { enabled: true, number: '+201288990011' }, phone: { enabled: true, number: '+201288990011' }, form: { enabled: true } },
        createdAt: '2023-01-20T00:00:00Z'
    },
    // Admins & System Users
    {
        id: 'admin-user',
        imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=75&w=2070&auto=format&fit=crop',
        email: 'admin@onlyhelio.com',
        password: 'password',
        type: 'admin', status: 'active', subscriptionPlan: 'elite',
        subscriptionEndDate: '2099-12-31T00:00:00Z', displayType: 'standard',
        contactMethods: { whatsapp: { enabled: true, number: '+201000000000' }, phone: { enabled: true, number: '+201000000000' }, form: { enabled: true } },
        createdAt: '2022-01-01T00:00:00Z'
    },
    
    // --- NEW ROLES ---

    // Decoration Manager
    {
        id: 'f476c295-e80a-41ca-a63b-61ff2f579f71',
        imageUrl: 'https://images.unsplash.com/photo-1531891437562-b1a5b0648509?q=75&w=1974&auto.format&fit=crop',
        email: 'decor@onlyhelio.com',
        password: 'password',
        type: 'decoration_manager', status: 'active', subscriptionPlan: 'basic',
        displayType: 'standard',
        contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
        createdAt: '2023-01-01T00:00:00Z'
    },
    
    // Platform Finishing Manager (Internal)
    {
        id: '3e554896-eee8-4545-9c7f-0a79a4c1a9f1',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=75&w=1974&auto.format&fit=crop',
        email: 'fin-platform@onlyhelio.com',
        password: 'password',
        type: 'platform_finishing_manager', status: 'active', subscriptionPlan: 'basic',
        displayType: 'standard',
        contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
        createdAt: '2023-01-01T00:00:00Z'
    },

    // Finishing Market Manager (Partners)
    {
        id: 'finishing-market-manager-1',
        imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=75&w=1974&auto.format&fit=crop',
        email: 'fin-market@onlyhelio.com',
        password: 'password',
        type: 'finishing_market_manager', status: 'active', subscriptionPlan: 'basic',
        displayType: 'standard',
        contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
        createdAt: '2023-01-01T00:00:00Z'
    },

    // Platform Real Estate Manager (Brokerage)
    {
        id: 'platform-real-estate-manager-1',
        imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=75&w=1976&auto.format&fit=crop',
        email: 're-platform@onlyhelio.com',
        password: 'password',
        type: 'platform_real_estate_manager', status: 'active', subscriptionPlan: 'basic',
        displayType: 'standard',
        contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
        createdAt: '2023-01-01T00:00:00Z'
    },

    // Real Estate Market Manager (External)
    {
        id: 'real-estate-market-manager-1',
        imageUrl: 'https://images.unsplash.com/photo-1599948058230-787cd7a5f629?q=75&w=1974&auto.format&fit=crop',
        email: 're-market@onlyhelio.com',
        password: 'password',
        type: 'real_estate_market_manager', status: 'active', subscriptionPlan: 'basic',
        displayType: 'standard',
        contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
        createdAt: '2023-01-01T00:00:00Z'
    },

    // Partner Relations Manager
    {
        id: 'partner-relations-manager-1',
        imageUrl: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=75&w=1974&auto.format&fit=crop',
        email: 'partners@onlyhelio.com',
        password: 'password',
        type: 'partner_relations_manager', status: 'active', subscriptionPlan: 'basic',
        displayType: 'standard',
        contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
        createdAt: '2023-01-01T00:00:00Z'
    },

    // Content Manager
    {
        id: 'content-manager-1',
        imageUrl: 'https://images.unsplash.com/photo-1587614295999-6c1c13675127?q=75&w=1974&auto.format&fit=crop',
        email: 'content@onlyhelio.com',
        password: 'password',
        type: 'content_manager', status: 'active', subscriptionPlan: 'basic',
        displayType: 'standard',
        contactMethods: { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } },
        createdAt: '2023-01-01T00:00:00Z'
    },
    
    // Individual Listings (system partner)
    {
        id: 'individual-listings',
        imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=75&w=2070&auto=format&fit=crop',
        email: 'individual@onlyhelio.com',
        password: 'password',
        type: 'agency', status: 'active', subscriptionPlan: 'elite',
        subscriptionEndDate: '2099-12-31T00:00:00Z', displayType: 'standard',
        contactMethods: { whatsapp: { enabled: true, number: '+201000000001' }, phone: { enabled: true, number: '+201000000001' }, form: { enabled: true } },
        createdAt: '2023-01-01T00:00:00Z'
    },
];

// Add responsive image URLs to all partners
partnersData.forEach(partner => {
    (partner as any).imageUrl_small = partner.imageUrl.replace('w=2070', 'w=480').replace('w=2071', 'w=480').replace('w=1974', 'w=480').replace('w=2158', 'w=480');
    (partner as any).imageUrl_medium = partner.imageUrl.replace('w=2070', 'w=800').replace('w=2071', 'w=800').replace('w=1974', 'w=800').replace('w=2158', 'w=800');
    (partner as any).imageUrl_large = partner.imageUrl.replace('w=2070', 'w=1200').replace('w=2071', 'w=1200').replace('w=1974', 'w=1200').replace('w=2158', 'w=1200');
});
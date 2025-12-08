
import { supabase } from '../lib/supabase';
import { partnersData } from '../data/partners';
import { projectsData } from '../data/projects';
import { propertiesData } from '../data/properties';
import { portfolioData } from '../data/portfolio';
import { requestsData } from '../data/requests';
import { leadsData } from '../data/leads';
import { siteContentData } from '../data/content';
import { bannersData } from '../data/banners';
import { routingRulesData } from '../data/routingRules';
import { formsData } from '../data/forms';
import { arTranslations, enTranslations } from '../data/translations';
import { aiEstimatorConfigData } from '../data/aiConfig';

/**
 * @deprecated
 * This migration service is deprecated.
 * We now use direct SQL seeding in Supabase SQL Editor for data integrity and speed.
 * This file is kept as a reference for data structures but should not be used in production flow.
 */

// Helper to get localized names for partners
const getPartnerInfo = (id: string) => {
    // @ts-ignore
    const ar = arTranslations.partnerInfo?.[id] || {};
    // @ts-ignore
    const en = enTranslations.partnerInfo?.[id] || {};
    return { ar, en };
};

const getFallbackPlans = () => {
    // ... logic same as before ...
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
    };
};

const formatDateForDb = (dateStr: string | undefined | null) => {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
        return `${dateStr}-01`;
    }
    return dateStr;
};

export const migrateDataToSupabase = async (onProgress: (msg: string) => void) => {
    console.warn("DEPRECATION WARNING: migrateDataToSupabase is deprecated. Please use the SQL Seed script.");
    
    try {
        onProgress("Starting migration (LEGACY MODE)...");

        // 1. Partners
        onProgress(`Migrating ${partnersData.length} partners...`);
        const partnersPayload = partnersData.map(p => {
            const info = getPartnerInfo(p.id);
            return {
                id: p.id,
                email: p.email,
                password: (p as any).password || 'password',
                type: p.type,
                status: p.status,
                subscription_plan: p.subscriptionPlan,
                display_type: p.displayType,
                image_url: p.imageUrl,
                contact_methods: p.contactMethods,
                name_ar: info.ar.name || p.id,
                name_en: info.en.name || p.id,
                description_ar: info.ar.description,
                description_en: info.en.description,
                parent_id: p.parentId
            };
        });
        const { error: errPartners } = await supabase.from('partners').upsert(partnersPayload);
        if (errPartners) {
            console.error("Partners Migration Failed:", errPartners);
            throw new Error(`Partners Error: ${errPartners.message}`);
        }

        // 2. Projects
        onProgress(`Migrating ${projectsData.length} projects...`);
        const projectsPayload = projectsData.map(p => ({
            id: p.id,
            partner_id: p.partnerId,
            name_ar: p.name.ar,
            name_en: p.name.en,
            description_ar: p.description.ar,
            description_en: p.description.en,
            image_url: p.imageUrl,
            features: p.features,
            created_at: p.createdAt
        }));
        const { error: errProjects } = await supabase.from('projects').upsert(projectsPayload);
        if (errProjects) {
            console.error("Projects Migration Failed:", errProjects);
            if(errProjects.code === '23503') {
                 onProgress("Foreign key error in Projects. Check if all partner IDs exist.");
            }
            throw new Error(`Projects Error: ${errProjects.message}`);
        }

        // 3. Properties
        onProgress(`Migrating ${propertiesData.length} properties...`);
        const propertiesPayload = propertiesData.map(p => ({
            id: p.id,
            partner_id: p.partnerId,
            project_id: p.projectId,
            title_ar: p.title.ar,
            title_en: p.title.en,
            description_ar: p.description.ar,
            description_en: p.description.en,
            address_ar: p.address.ar,
            address_en: p.address.en,
            price: p.priceNumeric,
            area: p.area,
            type: p.type.en,
            status: p.status.en,
            finishing_status: p.finishingStatus?.en,
            beds: p.beds,
            baths: p.baths,
            floor: p.floor,
            main_image: p.imageUrl,
            gallery: p.gallery,
            amenities: p.amenities.en,
            location: p.location,
            is_in_compound: p.isInCompound,
            installments_available: p.installmentsAvailable,
            finance_available: p.realEstateFinanceAvailable,
            delivery_immediate: p.delivery.isImmediate,
            delivery_date: formatDateForDb(p.delivery.date),
            installments_info: p.installments,
            listing_status: p.listingStatus,
            contact_method: p.contactMethod,
            owner_phone: p.ownerPhone,
            listing_start_date: p.listingStartDate
        }));
        const { error: errProps } = await supabase.from('properties').upsert(propertiesPayload);
        if (errProps) {
            console.error("Properties Migration Failed:", errProps);
            throw new Error(`Properties Error: ${errProps.message}`);
        }

        // 4. Portfolio
        onProgress(`Migrating ${portfolioData.length} portfolio items...`);
        const portfolioPayload = portfolioData.map(p => ({
            id: p.id,
            partner_id: p.partnerId,
            title_ar: p.title.ar,
            title_en: p.title.en,
            category_ar: p.category.ar,
            category_en: p.category.en,
            image_url: p.imageUrl,
            price: p.price,
            dimensions: p.dimensions,
            availability: p.availability
        }));
        const { error: errPort } = await supabase.from('portfolio_items').upsert(portfolioPayload);
        if (errPort) throw new Error(`Portfolio Error: ${errPort.message}`);

        // 5. Leads & Requests
        onProgress(`Migrating leads and requests...`);
        const leadsPayload = leadsData.map(l => ({
            id: l.id,
            type: 'LEAD',
            status: l.status,
            requester_name: l.customerName,
            requester_phone: l.customerPhone,
            assigned_to: l.assignedTo || l.managerId || l.partnerId,
            payload: l,
            created_at: l.createdAt,
            updated_at: l.updatedAt
        }));
        
        const requestsPayload = requestsData.map(r => ({
            id: r.id,
            type: r.type,
            status: r.status,
            requester_name: r.requesterInfo.name,
            requester_phone: r.requesterInfo.phone,
            requester_email: r.requesterInfo.email,
            assigned_to: r.assignedTo,
            payload: r.payload,
            created_at: r.createdAt,
            updated_at: r.updatedAt
        }));
        
        const allRequests = [...leadsPayload, ...requestsPayload];
        const { error: errReq } = await supabase.from('requests').upsert(allRequests);
        if (errReq) throw new Error(`Requests Error: ${errReq.message}`);

        // 6. Site Content
        onProgress("Migrating site content and configuration...");
        
        await supabase.from('site_content').upsert({ key: 'banners', content: bannersData });
        await supabase.from('site_content').upsert({ key: 'main_content', content: siteContentData });
        await supabase.from('site_content').upsert({ key: 'automation_rules', content: routingRulesData });
        await supabase.from('site_content').upsert({ key: 'forms_config', content: formsData });
        
        const plansData = getFallbackPlans();
        await supabase.from('site_content').upsert({ key: 'subscription_plans', content: plansData });
        await supabase.from('site_content').upsert({ key: 'ai_config', content: aiEstimatorConfigData });

        onProgress("Migration Completed Successfully!");
        return true;

    } catch (error: any) {
        console.error("Migration Fatal Error:", error);
        onProgress(`Error: ${error.message}`);
        return false;
    }
};

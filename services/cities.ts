import { supabase } from '../lib/supabase';
import { INITIAL_CITIES } from '../data/cities';
import { Permission, type CityContentOverrides, type CityPortalConfig } from '../types';
import { requirePermission } from './authGuard';

const LEGACY_LOCAL_CITY_IMAGE_RE = /^\/src\/assets\/images\/city_portal_/i;

const FALLBACK_CITY_HERO_IMAGE =
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80';

const sanitizeCityHeroImage = (url?: string | null, fallbackCityId?: string): string => {
    const trimmed = String(url || '').trim();
    if (!trimmed || LEGACY_LOCAL_CITY_IMAGE_RE.test(trimmed)) {
        const seedMatch = INITIAL_CITIES.find((c) => c.id === fallbackCityId);
        return seedMatch?.heroImageUrl || FALLBACK_CITY_HERO_IMAGE;
    }
    return trimmed;
};

const sanitizeOverrides = (raw: any): CityContentOverrides | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const overrides: CityContentOverrides = {};
    const copyBi = (val: any) => {
        if (!val || typeof val !== 'object') return undefined;
        const ar = typeof val.ar === 'string' ? val.ar : undefined;
        const en = typeof val.en === 'string' ? val.en : undefined;
        if (!ar && !en) return undefined;
        return { ar: ar || en || '', en: en || ar || '' };
    };
    const heroTitle = copyBi(raw.heroTitle);
    const heroSubtitle = copyBi(raw.heroSubtitle);
    const aboutTitle = copyBi(raw.aboutTitle);
    const aboutDescription = copyBi(raw.aboutDescription);
    if (heroTitle) overrides.heroTitle = heroTitle;
    if (heroSubtitle) overrides.heroSubtitle = heroSubtitle;
    if (aboutTitle) overrides.aboutTitle = aboutTitle;
    if (aboutDescription) overrides.aboutDescription = aboutDescription;
    return Object.keys(overrides).length > 0 ? overrides : undefined;
};

export const mapCityFromDb = (row: any): CityPortalConfig => {
    const id = String(row.id || row.slug || '').trim().toLowerCase();
    const slug = String(row.slug || id).trim().toLowerCase();
    const seed = INITIAL_CITIES.find((c) => c.id === id);

    return {
        id,
        slug,
        subdomain: String(row.subdomain || `${slug}.only-property.com`),
        name: {
            ar: String(row.name_ar || seed?.name.ar || slug),
            en: String(row.name_en || seed?.name.en || slug),
        },
        brandTitle: {
            ar: String(row.brand_title_ar || seed?.brandTitle.ar || row.name_ar || slug),
            en: String(row.brand_title_en || seed?.brandTitle.en || row.name_en || slug),
        },
        tagline: {
            ar: String(row.tagline_ar ?? seed?.tagline.ar ?? ''),
            en: String(row.tagline_en ?? seed?.tagline.en ?? ''),
        },
        region: {
            ar: String(row.region_ar ?? seed?.region.ar ?? ''),
            en: String(row.region_en ?? seed?.region.en ?? ''),
        },
        accentColor: String(row.accent_color || seed?.accentColor || '#F59E0B'),
        heroImageUrl: sanitizeCityHeroImage(row.hero_image_url, id),
        isActive: row.is_active !== false,
        isFeatured: row.is_featured !== false,
        coordinates: {
            lat: typeof row.lat === 'number' ? row.lat : seed?.coordinates?.lat ?? 30.1286,
            lng: typeof row.lng === 'number' ? row.lng : seed?.coordinates?.lng ?? 31.6744,
        },
        contentOverrides: sanitizeOverrides(row.content_overrides),
        stats: seed?.stats || { propertiesCount: 0, projectsCount: 0, partnersCount: 0 },
    };
};

const isMissingColumnError = (err: any, columnName: string): boolean => {
    const msg = `${err?.message || ''} ${err?.details || ''} ${err?.hint || ''}`.toLowerCase();
    return (
        err?.code === '42703' ||
        err?.code === 'PGRST204' ||
        (msg.includes(columnName.toLowerCase()) && (msg.includes('column') || msg.includes('schema cache')))
    );
};

export interface GetCitiesOptions {
    client?: any;
    includeInactive?: boolean;
    throwOnError?: boolean;
}

export const getAllCities = async (options: GetCitiesOptions = {}): Promise<CityPortalConfig[]> => {
    const dbClient = options.client || supabase;
    const includeInactive = options.includeInactive ?? true;

    let query = dbClient
        .from('cities')
        .select('*')
        .order('created_at', { ascending: true });

    if (!includeInactive) {
        query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
        if (options.throwOnError) {
            throw new Error(`فشل تحميل بيانات المدن من قاعدة البيانات: ${error.message}`);
        }
        console.warn('Supabase notice fetching cities, using initial defaults:', error.message);
        return includeInactive ? INITIAL_CITIES : INITIAL_CITIES.filter((c) => c.isActive);
    }

    if (!Array.isArray(data) || data.length === 0) {
        return includeInactive ? INITIAL_CITIES : INITIAL_CITIES.filter((c) => c.isActive);
    }

    return data.map(mapCityFromDb);
};

export interface CreateCityInput {
    id?: string;
    slug: string;
    subdomain?: string;
    name: { ar: string; en: string };
    brandTitle?: { ar: string; en: string };
    tagline?: { ar: string; en: string };
    region?: { ar: string; en: string };
    accentColor?: string;
    heroImageUrl?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    coordinates?: { lat: number; lng: number };
    contentOverrides?: CityContentOverrides;
}

export const createCity = async (
    input: CreateCityInput,
    options: { client?: any } = {}
): Promise<CityPortalConfig> => {
    requirePermission(Permission.MANAGE_CITIES);
    const dbClient = options.client || supabase;

    const cleanSlug = (input.slug || input.id || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    if (!cleanSlug) {
        throw new Error('معرّف المدينة (Slug) مطلوب ويجب أن يحتوي على أحرف إنجليزية أو أرقام.');
    }

    const nameAr = String(input.name?.ar || '').trim();
    const nameEn = String(input.name?.en || '').trim();
    if (!nameAr || !nameEn) {
        throw new Error('اسم المدينة باللغتين العربية والإنجليزية مطلوب.');
    }

    const now = new Date().toISOString();
    const dbPayload: Record<string, any> = {
        id: cleanSlug,
        slug: cleanSlug,
        subdomain: (input.subdomain || `${cleanSlug}.only-property.com`).trim().toLowerCase(),
        name_ar: nameAr,
        name_en: nameEn,
        brand_title_ar: (input.brandTitle?.ar || `أونلي ${nameAr}`).trim(),
        brand_title_en: (input.brandTitle?.en || `ONLY ${cleanSlug.toUpperCase()}`).trim(),
        tagline_ar: (input.tagline?.ar || '').trim(),
        tagline_en: (input.tagline?.en || '').trim(),
        region_ar: (input.region?.ar || '').trim(),
        region_en: (input.region?.en || '').trim(),
        accent_color: input.accentColor || '#F59E0B',
        hero_image_url: sanitizeCityHeroImage(input.heroImageUrl, cleanSlug),
        is_active: input.isActive !== false,
        is_featured: input.isFeatured !== false,
        lat: typeof input.coordinates?.lat === 'number' ? input.coordinates.lat : 30.1286,
        lng: typeof input.coordinates?.lng === 'number' ? input.coordinates.lng : 31.6744,
        content_overrides: input.contentOverrides || {},
        created_at: now,
        updated_at: now,
    };

    let { data, error } = await dbClient
        .from('cities')
        .insert(dbPayload)
        .select('*')
        .single();

    if (error && isMissingColumnError(error, 'content_overrides')) {
        const { content_overrides: _omit, ...fallbackPayload } = dbPayload;
        const retry = await dbClient
            .from('cities')
            .insert(fallbackPayload)
            .select('*')
            .single();
        data = retry.data;
        error = retry.error;
    }

    if (error || !data) {
        throw new Error(`تعذر حفظ المدينة في قاعدة البيانات: ${error?.message || 'خطأ غير متوقع'}`);
    }

    const mapped = mapCityFromDb(data);
    if (!mapped.contentOverrides && input.contentOverrides) {
        mapped.contentOverrides = sanitizeOverrides(input.contentOverrides);
    }
    return mapped;
};

export const updateCity = async (
    cityId: string,
    updates: Partial<CityPortalConfig>,
    options: { client?: any } = {}
): Promise<CityPortalConfig> => {
    requirePermission(Permission.MANAGE_CITIES);
    const dbClient = options.client || supabase;

    const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
    };

    if (updates.slug !== undefined) {
        const normalized = updates.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        dbUpdates.slug = normalized;
    }
    if (updates.subdomain !== undefined) dbUpdates.subdomain = updates.subdomain.trim().toLowerCase();
    if (updates.name?.ar !== undefined) dbUpdates.name_ar = updates.name.ar.trim();
    if (updates.name?.en !== undefined) dbUpdates.name_en = updates.name.en.trim();
    if (updates.brandTitle?.ar !== undefined) dbUpdates.brand_title_ar = updates.brandTitle.ar.trim();
    if (updates.brandTitle?.en !== undefined) dbUpdates.brand_title_en = updates.brandTitle.en.trim();
    if (updates.tagline?.ar !== undefined) dbUpdates.tagline_ar = updates.tagline.ar.trim();
    if (updates.tagline?.en !== undefined) dbUpdates.tagline_en = updates.tagline.en.trim();
    if (updates.region?.ar !== undefined) dbUpdates.region_ar = updates.region.ar.trim();
    if (updates.region?.en !== undefined) dbUpdates.region_en = updates.region.en.trim();
    if (updates.accentColor !== undefined) dbUpdates.accent_color = updates.accentColor;
    if (updates.heroImageUrl !== undefined) dbUpdates.hero_image_url = sanitizeCityHeroImage(updates.heroImageUrl, cityId);
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    if (updates.isFeatured !== undefined) dbUpdates.is_featured = updates.isFeatured;
    if (updates.coordinates?.lat !== undefined) dbUpdates.lat = updates.coordinates.lat;
    if (updates.coordinates?.lng !== undefined) dbUpdates.lng = updates.coordinates.lng;
    if (updates.contentOverrides !== undefined) dbUpdates.content_overrides = updates.contentOverrides || {};

    let { data, error } = await dbClient
        .from('cities')
        .update(dbUpdates)
        .eq('id', cityId)
        .select('*')
        .single();

    if (error && isMissingColumnError(error, 'content_overrides')) {
        const { content_overrides: _omit, ...fallbackUpdates } = dbUpdates;
        const retry = await dbClient
            .from('cities')
            .update(fallbackUpdates)
            .eq('id', cityId)
            .select('*')
            .single();
        data = retry.data;
        error = retry.error;
    }

    if (error || !data) {
        throw new Error(`تعذر تحديث المدينة في قاعدة البيانات: ${error?.message || 'غير موجودة أو لا توجد صلاحية'}`);
    }

    const mapped = mapCityFromDb(data);
    if (!mapped.contentOverrides && updates.contentOverrides) {
        mapped.contentOverrides = sanitizeOverrides(updates.contentOverrides);
    }
    return mapped;
};

export const toggleCityActive = async (
    cityId: string,
    isActive: boolean,
    options: { client?: any } = {}
): Promise<CityPortalConfig> => {
    return updateCity(cityId, { isActive }, options);
};

import { supabase, supabasePublic } from '../lib/supabase';
import { Permission, type Project } from '../types';
import { projectsData } from '../data/projects';
import { requireAnyPermission } from './authGuard';
import { isDemoModeEnabled } from '../utils/demoMode';
import { useAuthStore } from '../store/useAuthStore';

export interface ProjectQueryOptions {
    cityId?: string;
    forceRefresh?: boolean;
    client?: any;
}

const getReadClient = (overrideClient?: any) => {
    if (overrideClient) return overrideClient;
    try {
        const user = useAuthStore.getState().currentUser;
        if (user && !user.isDemo) {
            return supabase;
        }
    } catch {
        // Ignore store access issues outside browser context
    }
    return supabasePublic;
};

const parseProjectQueryOptions = (cityIdOrContext?: string | ProjectQueryOptions | unknown): ProjectQueryOptions => {
    if (typeof cityIdOrContext === 'string') {
        return { cityId: cityIdOrContext };
    }
    if (
        cityIdOrContext &&
        typeof cityIdOrContext === 'object' &&
        ('cityId' in cityIdOrContext || 'forceRefresh' in cityIdOrContext || 'client' in cityIdOrContext)
    ) {
        return cityIdOrContext as ProjectQueryOptions;
    }
    return {};
};

const isMissingCityIdColumnError = (error: any): boolean => {
    if (!error) return false;
    const code = String(error.code || '');
    const msg = String(error.message || '').toLowerCase();
    return (code === '42703' || code === 'PGRST204') && msg.includes('city_id');
};

const FEATURE_TRANSLATIONS: Record<string, { ar: string; en: string }> = {
    'pool': { ar: 'حمام سباحة', en: 'Swimming Pool' },
    'swimming pool': { ar: 'حمام سباحة', en: 'Swimming Pool' },
    'infinity pool': { ar: 'مسبح إنفينيتي', en: 'Infinity Pool' },
    'security': { ar: 'أمن وحراسة 24/7', en: '24/7 Security' },
    'smart security': { ar: 'أمن ذكي', en: 'Smart Security' },
    'smart security 24/7': { ar: 'أمن ذكي 24/7', en: 'Smart Security 24/7' },
    'clubhouse': { ar: 'كلوب هاوس ونادٍ اجتماعي', en: 'Clubhouse' },
    'private clubhouse': { ar: 'كلوب هاوس خاص', en: 'Private Clubhouse' },
    'green spaces': { ar: 'مساحات خضراء ولاندسكيب', en: 'Green Spaces' },
    'commercial area': { ar: 'منطقة تجارية ومطاعم', en: 'Commercial Area' },
    'commercial mall': { ar: 'مول تجاري متكامل', en: 'Commercial Mall' },
    'sports club': { ar: 'نادي رياضي', en: 'Sports Club' },
    'central park': { ar: 'حديقة مركزية', en: 'Central Park' },
    'international school zone': { ar: 'منطقة مدارس دولية', en: 'International School Zone' },
    'health & wellness spa': { ar: 'سبا ومركز صحي', en: 'Health & Wellness Spa' },
    'cycling paths': { ar: 'مسارات للدراجات', en: 'Cycling Paths' },
    'crystal lagoons': { ar: 'بحيرات كريستالية', en: 'Crystal Lagoons' },
    'lakes': { ar: 'بحيرات صناعية', en: 'Lakes' },
    'jogging tracks': { ar: 'تراك للمشي والجري', en: 'Jogging Tracks' },
    'spanish courtyards': { ar: 'أفنية أندلسية وإسبانية', en: 'Spanish Courtyards' },
    'smart home systems': { ar: 'أنظمة منازل ذكية', en: 'Smart Home Systems' },
    'underground parking': { ar: 'جراجات تحت الأرض', en: 'Underground Parking' },
    'kids aqua park': { ar: 'أكوا بارك للأطفال', en: 'Kids Aqua Park' },
    'kids play area': { ar: 'منطقة ألعاب أطفال', en: 'Kids Play Area' },
    'high-speed elevators': { ar: 'مصاعد سريعة ذكية', en: 'High-speed Elevators' },
    'executive meeting rooms': { ar: 'قاعات اجتماعات تنفيذية', en: 'Executive Meeting Rooms' },
    'medical compliance': { ar: 'مطابق للمواصفات الطبية', en: 'Medical Compliance' },
    'underground valet': { ar: 'خدمة صف سيارات وجراج', en: 'Underground Valet' },
    'solar powered': { ar: 'طاقة شمسية مستدامة', en: 'Solar Powered' }
};

const getIconForFeature = (text: string): string => {
    if (!text) return 'BuildingIcon';
    const lower = text.toLowerCase();
    if (lower.includes('pool') || lower.includes('مسبح') || lower.includes('سباح')) return 'SwimmingPoolIcon';
    if (lower.includes('park') || lower.includes('حديق') || lower.includes('green') || lower.includes('خضر')) return 'ParkIcon';
    if (lower.includes('security') || lower.includes('أمن') || lower.includes('حراس') || lower.includes('shield')) return 'ShieldCheckIcon';
    if (lower.includes('shop') || lower.includes('mall') || lower.includes('تسوق') || lower.includes('مول') || lower.includes('commercial')) return 'ShoppingCartIcon';
    if (lower.includes('store') || lower.includes('business') || lower.includes('محل') || lower.includes('تجار')) return 'BuildingStorefrontIcon';
    if (lower.includes('elevator') || lower.includes('مصعد') || lower.includes('أسانسير')) return 'ElevatorIcon';
    return 'BuildingIcon';
};

export const mapProjectFromDb = (row: any): Project => {
    let rawFeatures: any[] = [];
    if (typeof row.features === 'string') {
        try {
            rawFeatures = JSON.parse(row.features);
        } catch {
            rawFeatures = [];
        }
    } else if (Array.isArray(row.features)) {
        rawFeatures = row.features;
    }

    const normalizedFeatures = (Array.isArray(rawFeatures) ? rawFeatures : []).map((f: any) => {
        if (typeof f === 'string') {
            const key = f.toLowerCase().trim();
            const translated = FEATURE_TRANSLATIONS[key] || { ar: f, en: f };
            return {
                icon: getIconForFeature(f),
                text: translated
            };
        }
        if (f && typeof f === 'object') {
            const textObj = typeof f.text === 'object' && f.text !== null
                ? { ar: f.text.ar || f.text.en || '', en: f.text.en || f.text.ar || '' }
                : (typeof f.text === 'string' ? { ar: f.text, en: f.text } : { ar: '', en: '' });
            return {
                icon: f.icon || getIconForFeature(textObj.en || textObj.ar),
                text: textObj
            };
        }
        return {
            icon: 'BuildingIcon',
            text: { ar: '', en: '' }
        };
    });

    return {
        id: row.id,
        partnerId: row.partner_id,
        name: { ar: row.name_ar || row.name_en || '', en: row.name_en || row.name_ar || '' },
        description: { ar: row.description_ar || row.description_en || '', en: row.description_en || row.description_ar || '' },
        imageUrl: row.image_url || '',
        createdAt: row.created_at,
        features: normalizedFeatures,
        imageUrl_small: row.image_url || '',
        imageUrl_medium: row.image_url || '',
        imageUrl_large: row.image_url || '',
        cityId: row.city_id || 'heliopolis'
    };
};

export const filterProjectsByCity = (projects: Project[], cityId?: string): Project[] => {
    if (!cityId || cityId === 'all' || cityId === 'hub') return projects;
    const normalized = cityId.trim().toLowerCase();
    return projects.filter((project) => (project.cityId || 'heliopolis').toLowerCase() === normalized);
};

// In-memory cache for high-frequency navigation
let cachedProjects: { data: Project[]; timestamp: number } | null = null;
let inFlightProjectsPromise: Promise<Project[]> | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const invalidateProjectsCache = () => {
    cachedProjects = null;
    inFlightProjectsPromise = null;
};

export const getAllProjects = async (cityIdOrOptions?: string | ProjectQueryOptions | unknown): Promise<Project[]> => {
    const opts = parseProjectQueryOptions(cityIdOrOptions);
    const cityId = opts.cityId;

    if (isDemoModeEnabled() && !opts.client) {
        return filterProjectsByCity(projectsData, cityId);
    }

    const useCache = !opts.client && !opts.forceRefresh;
    const now = Date.now();
    if (useCache && cachedProjects && (now - cachedProjects.timestamp) < CACHE_TTL_MS) {
        return filterProjectsByCity(cachedProjects.data, cityId);
    }

    const executeFetch = async (): Promise<Project[]> => {
        const dbClient = getReadClient(opts.client);
        const { data, error } = await dbClient
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message || 'Failed to fetch projects from database.');
        }

        const mapped = (data || []).map(mapProjectFromDb);
        if (!opts.client) {
            cachedProjects = { data: mapped, timestamp: Date.now() };
        }
        return mapped;
    };

    if (!opts.client && !opts.forceRefresh) {
        if (inFlightProjectsPromise) {
            const list = await inFlightProjectsPromise;
            return filterProjectsByCity(list, cityId);
        }

        inFlightProjectsPromise = executeFetch().finally(() => {
            inFlightProjectsPromise = null;
        });

        const result = await inFlightProjectsPromise;
        return filterProjectsByCity(result, cityId);
    }

    const result = await executeFetch();
    return filterProjectsByCity(result, cityId);
};

export const getProjectById = async (id: string, options?: { client?: any }): Promise<Project | undefined> => {
    if (!id) return undefined;

    if (isDemoModeEnabled() && !options?.client) {
        return projectsData.find(p => p.id === id);
    }

    const dbClient = getReadClient(options?.client);
    const { data, error } = await dbClient
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        throw new Error(error.message || 'Failed to fetch project from database.');
    }

    if (!data) {
        return undefined;
    }

    return mapProjectFromDb(data);
};

export const getProjectsByPartnerId = async (partnerId: string, options?: { client?: any }): Promise<Project[]> => {
    if (!partnerId) return [];

    if (isDemoModeEnabled() && !options?.client) {
        return projectsData.filter(p => p.partnerId === partnerId);
    }

    const dbClient = getReadClient(options?.client);
    const { data, error } = await dbClient
        .from('projects')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(error.message || 'Failed to fetch partner projects from database.');
    }

    return (data || []).map(mapProjectFromDb);
};

export const addProject = async (
    project: Omit<Project, 'id' | 'createdAt'>,
    options?: { client?: any }
): Promise<Project> => {
    requireAnyPermission([Permission.MANAGE_ALL_PROJECTS, Permission.MANAGE_OWN_PROJECTS]);

    const dbClient = options?.client || supabase;
    const dbPayload: Record<string, any> = {
        partner_id: project.partnerId,
        name_ar: project.name.ar,
        name_en: project.name.en,
        description_ar: project.description.ar,
        description_en: project.description.en,
        image_url: project.imageUrl,
        features: JSON.stringify(project.features || []),
        city_id: project.cityId || 'heliopolis',
    };

    let { data, error } = await dbClient.from('projects').insert(dbPayload).select().single();
    if (error && isMissingCityIdColumnError(error)) {
        const { city_id: _ignored, ...legacyPayload } = dbPayload;
        const retry = await dbClient.from('projects').insert(legacyPayload).select().single();
        data = retry.data;
        error = retry.error;
    }

    if (error) throw error;
    invalidateProjectsCache();
    const mapped = mapProjectFromDb(data);
    return { ...mapped, cityId: project.cityId || mapped.cityId || 'heliopolis' };
};

export const updateProject = async (
    projectId: string,
    updates: Partial<Project>,
    options?: { client?: any }
): Promise<Project | undefined> => {
    requireAnyPermission([Permission.MANAGE_ALL_PROJECTS, Permission.MANAGE_OWN_PROJECTS]);

    const dbClient = options?.client || supabase;
    const dbUpdates: Record<string, any> = {};
    if (updates.partnerId) dbUpdates.partner_id = updates.partnerId;
    if (updates.name) {
        dbUpdates.name_ar = updates.name.ar;
        dbUpdates.name_en = updates.name.en;
    }
    if (updates.description) {
        dbUpdates.description_ar = updates.description.ar;
        dbUpdates.description_en = updates.description.en;
    }
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.features) dbUpdates.features = JSON.stringify(updates.features);
    if (updates.cityId) dbUpdates.city_id = updates.cityId;

    let { data, error } = await dbClient.from('projects').update(dbUpdates).eq('id', projectId).select().single();
    if (error && isMissingCityIdColumnError(error)) {
        const { city_id: _ignored, ...legacyUpdates } = dbUpdates;
        const retry = await dbClient.from('projects').update(legacyUpdates).eq('id', projectId).select().single();
        data = retry.data;
        error = retry.error;
    }

    if (error) throw error;
    invalidateProjectsCache();
    const mapped = mapProjectFromDb(data);
    return { ...mapped, cityId: updates.cityId || mapped.cityId || 'heliopolis' };
};

export const deleteProject = async (projectId: string, options?: { client?: any }): Promise<boolean> => {
    requireAnyPermission([Permission.MANAGE_ALL_PROJECTS, Permission.MANAGE_OWN_PROJECTS]);

    const dbClient = options?.client || supabase;
    const { error } = await dbClient.from('projects').delete().eq('id', projectId);
    if (error) {
        throw error;
    }
    invalidateProjectsCache();
    return true;
};

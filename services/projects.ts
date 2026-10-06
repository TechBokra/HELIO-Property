
import { supabase, supabasePublic } from '../lib/supabase';
import type { Project } from '../types';
import { projectsData } from '../data/projects';

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

const mapProjectFromDb = (row: any): Project => {
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
        imageUrl_large: row.image_url || ''
    };
};

// In-memory cache for high-frequency navigation
let cachedProjects: { data: Project[]; timestamp: number } | null = null;
let inFlightProjectsPromise: Promise<Project[]> | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export const invalidateProjectsCache = () => {
    cachedProjects = null;
    inFlightProjectsPromise = null;
};

export const getAllProjects = async (): Promise<Project[]> => {
    const now = Date.now();
    if (cachedProjects && (now - cachedProjects.timestamp) < CACHE_TTL_MS) {
        return cachedProjects.data;
    }

    if (inFlightProjectsPromise) {
        return inFlightProjectsPromise;
    }

    inFlightProjectsPromise = (async () => {
        try {
            const { data, error } = await supabasePublic
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.warn("Supabase error fetching projects, using fallback:", error.message);
                const fallback = cachedProjects ? cachedProjects.data : projectsData;
                return fallback;
            }

            if (!data || data.length === 0) {
                return projectsData;
            }

            const mapped = data.map(mapProjectFromDb);
            cachedProjects = { data: mapped, timestamp: Date.now() };
            return mapped;
        } catch (e) {
            console.warn("Exception fetching projects, using fallback:", e);
            return cachedProjects ? cachedProjects.data : projectsData;
        } finally {
            inFlightProjectsPromise = null;
        }
    })();

    return inFlightProjectsPromise;
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
    try {
        const { data, error } = await supabasePublic.from('projects').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
            return mapProjectFromDb(data);
        }
    } catch {
        // Fall through to cache/static data
    }
    
    // Check cached or fallback data
    if (cachedProjects?.data) {
        const found = cachedProjects.data.find(p => p.id === id);
        if (found) return found;
    }
    return projectsData.find(p => p.id === id);
};

export const getProjectsByPartnerId = async (partnerId: string): Promise<Project[]> => {
    try {
        const { data, error } = await supabasePublic.from('projects').select('*').eq('partner_id', partnerId);
        if (!error && data && data.length > 0) {
            return data.map(mapProjectFromDb);
        }
    } catch {}
    return projectsData.filter(p => p.partnerId === partnerId);
};

export const addProject = async (project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
    const dbPayload = {
        partner_id: project.partnerId,
        name_ar: project.name.ar,
        name_en: project.name.en,
        description_ar: project.description.ar,
        description_en: project.description.en,
        image_url: project.imageUrl,
        features: JSON.stringify(project.features)
    };
    
    const { data, error } = await supabase.from('projects').insert(dbPayload).select().single();
    if (error) throw error;
    invalidateProjectsCache();
    return mapProjectFromDb(data);
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<Project | undefined> => {
    const dbUpdates: any = {};
    if (updates.name) {
        dbUpdates.name_ar = updates.name.ar;
        dbUpdates.name_en = updates.name.en;
    }
    if (updates.description) {
        dbUpdates.description_ar = updates.description.ar;
        dbUpdates.description_en = updates.description.en;
    }
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
    if (updates.features) dbUpdates.features = JSON.stringify(updates.features);

    const { data, error } = await supabase.from('projects').update(dbUpdates).eq('id', projectId).select().single();
    if (error) return undefined;
    invalidateProjectsCache();
    return mapProjectFromDb(data);
};

export const deleteProject = async (projectId: string): Promise<boolean> => {
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (!error) invalidateProjectsCache();
    return !error;
};

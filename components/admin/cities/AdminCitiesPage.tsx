import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../shared/LanguageContext';
import { useCityStore } from '../../../store/useCityStore';
import { ROOT_HUB_DOMAIN } from '../../../data/cities';
import { Permission, type CityContentOverrides, type CityPortalConfig } from '../../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../shared/ToastContext';
import { getAllProperties } from '../../../services/properties';
import { getAllProjects } from '../../../services/projects';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { getRecordCityId, getUserAllowedCityIds } from '../../../utils/cityScope';

const DEFAULT_CITY_HERO_IMAGE =
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1400&auto=format&fit=crop';

const AdminCitiesPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const { showToast } = useToast();
    const canManageCities = hasPermission(Permission.MANAGE_CITIES);

    const cities = useCityStore((s) => s.cities);
    const loadCities = useCityStore((s) => s.loadCities);
    const addCity = useCityStore((s) => s.addCity);
    const updateCity = useCityStore((s) => s.updateCity);
    const toggleCityActive = useCityStore((s) => s.toggleCityActive);
    const isLoading = useCityStore((s) => s.isLoading);
    const storeError = useCityStore((s) => s.error);
    const clearError = useCityStore((s) => s.clearError);
    const switchToCity = useCityStore((s) => s.switchToCity);
    const switchToHub = useCityStore((s) => s.switchToHub);
    const adminCityScope = useCityStore((s) => s.adminCityScope);
    const setAdminCityScope = useCityStore((s) => s.setAdminCityScope);

    useEffect(() => {
        loadCities().catch(() => {});
    }, [loadCities]);

    const { data: allProperties } = useQuery({ queryKey: ['allProperties'], queryFn: getAllProperties });
    const { data: allProjects } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects });
    const { data: allPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });

    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Add City Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [slug, setSlug] = useState('');
    const [nameAr, setNameAr] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [brandAr, setBrandAr] = useState('');
    const [brandEn, setBrandEn] = useState('');
    const [regionAr, setRegionAr] = useState('شرق القاهرة');
    const [regionEn, setRegionEn] = useState('East Cairo');
    const [taglineAr, setTaglineAr] = useState('');
    const [taglineEn, setTaglineEn] = useState('');
    const [accentColor, setAccentColor] = useState('#F59E0B');
    const [heroImageUrl, setHeroImageUrl] = useState(DEFAULT_CITY_HERO_IMAGE);

    // Edit City Modal State
    const [editingCity, setEditingCity] = useState<CityPortalConfig | null>(null);
    const [editNameAr, setEditNameAr] = useState('');
    const [editNameEn, setEditNameEn] = useState('');
    const [editBrandAr, setEditBrandAr] = useState('');
    const [editBrandEn, setEditBrandEn] = useState('');
    const [editRegionAr, setEditRegionAr] = useState('');
    const [editRegionEn, setEditRegionEn] = useState('');
    const [editTaglineAr, setEditTaglineAr] = useState('');
    const [editTaglineEn, setEditTaglineEn] = useState('');
    const [editAccentColor, setEditAccentColor] = useState('#F59E0B');
    const [editHeroImageUrl, setEditHeroImageUrl] = useState(DEFAULT_CITY_HERO_IMAGE);
    const [editIsActive, setEditIsActive] = useState(true);
    const [editIsFeatured, setEditIsFeatured] = useState(false);
    const [editHeroTitleAr, setEditHeroTitleAr] = useState('');
    const [editHeroTitleEn, setEditHeroTitleEn] = useState('');
    const [editHeroSubtitleAr, setEditHeroSubtitleAr] = useState('');
    const [editHeroSubtitleEn, setEditHeroSubtitleEn] = useState('');
    const [editAboutTitleAr, setEditAboutTitleAr] = useState('');
    const [editAboutTitleEn, setEditAboutTitleEn] = useState('');
    const [editAboutDescAr, setEditAboutDescAr] = useState('');
    const [editAboutDescEn, setEditAboutDescEn] = useState('');

    const cityLiveCounts = useMemo(() => {
        const counts: Record<string, { properties: number; projects: number; partners: number }> = {};
        cities.forEach((c) => {
            const propCount = (allProperties || []).filter((p) => getRecordCityId(p) === c.id).length;
            const projCount = (allProjects || []).filter((p) => getRecordCityId(p) === c.id).length;
            const partnerCount = (allPartners || []).filter((p) => {
                const allowed = getUserAllowedCityIds(p);
                return allowed.includes('*') || allowed.includes(c.id);
            }).length;
            counts[c.id] = {
                properties: allProperties ? propCount : c.stats.propertiesCount,
                projects: allProjects ? projCount : c.stats.projectsCount,
                partners: allPartners ? partnerCount : c.stats.partnersCount,
            };
        });
        return counts;
    }, [cities, allProperties, allProjects, allPartners]);

    const openEditModal = (city: CityPortalConfig) => {
        setFormError(null);
        setEditingCity(city);
        setEditNameAr(city.name.ar);
        setEditNameEn(city.name.en);
        setEditBrandAr(city.brandTitle.ar);
        setEditBrandEn(city.brandTitle.en);
        setEditRegionAr(city.region.ar);
        setEditRegionEn(city.region.en);
        setEditTaglineAr(city.tagline.ar);
        setEditTaglineEn(city.tagline.en);
        setEditAccentColor(city.accentColor || '#F59E0B');
        setEditHeroImageUrl(city.heroImageUrl || DEFAULT_CITY_HERO_IMAGE);
        setEditIsActive(city.isActive);
        setEditIsFeatured(city.isFeatured !== false);
        setEditHeroTitleAr(city.contentOverrides?.heroTitle?.ar || '');
        setEditHeroTitleEn(city.contentOverrides?.heroTitle?.en || '');
        setEditHeroSubtitleAr(city.contentOverrides?.heroSubtitle?.ar || '');
        setEditHeroSubtitleEn(city.contentOverrides?.heroSubtitle?.en || '');
        setEditAboutTitleAr(city.contentOverrides?.aboutTitle?.ar || '');
        setEditAboutTitleEn(city.contentOverrides?.aboutTitle?.en || '');
        setEditAboutDescAr(city.contentOverrides?.aboutDescription?.ar || '');
        setEditAboutDescEn(city.contentOverrides?.aboutDescription?.en || '');
    };

    const handleCreateCity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageCities) {
            showToast(isAr ? 'صلاحية الإدارة العامة مطلوبة لإضافة مدينة.' : 'Super Admin permission required.', 'error');
            return;
        }
        const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (!cleanSlug || !nameAr.trim() || !nameEn.trim()) return;

        setIsSaving(true);
        setFormError(null);
        clearError();

        const newCity: CityPortalConfig = {
            id: cleanSlug,
            slug: cleanSlug,
            subdomain: `${cleanSlug}.${ROOT_HUB_DOMAIN}`,
            name: { ar: nameAr.trim(), en: nameEn.trim() },
            brandTitle: {
                ar: brandAr.trim() || `أونلي ${nameAr.trim()}`,
                en: brandEn.trim() || `ONLY ${nameEn.trim().toUpperCase()}`,
            },
            tagline: {
                ar: taglineAr.trim() || `البوابة العقارية والخدمية المتخصصة لمدينة ${nameAr.trim()}.`,
                en: taglineEn.trim() || `Dedicated real estate and local services portal for ${nameEn.trim()}.`,
            },
            region: { ar: regionAr.trim(), en: regionEn.trim() },
            accentColor: accentColor.trim() || '#F59E0B',
            heroImageUrl: heroImageUrl.trim() || DEFAULT_CITY_HERO_IMAGE,
            isActive: true,
            isFeatured: true,
            stats: {
                propertiesCount: 0,
                projectsCount: 0,
                partnersCount: 0,
                districtsCount: 5,
            },
        };

        try {
            await addCity(newCity);
            showToast(isAr ? 'تم إنشاء المدينة وحفظها في قاعدة البيانات بنجاح.' : 'City created and saved successfully.', 'success');
            setIsAddModalOpen(false);
            setSlug('');
            setNameAr('');
            setNameEn('');
            setBrandAr('');
            setBrandEn('');
            setTaglineAr('');
            setTaglineEn('');
            setAccentColor('#F59E0B');
            setHeroImageUrl(DEFAULT_CITY_HERO_IMAGE);
        } catch (err: any) {
            const msg = err?.message || (isAr ? 'تعذر حفظ المدينة في قاعدة البيانات.' : 'Failed to save city.');
            setFormError(msg);
            showToast(msg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateCity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCity) return;
        if (!canManageCities) {
            showToast(isAr ? 'صلاحية الإدارة العامة مطلوبة لتعديل المدينة.' : 'Super Admin permission required.', 'error');
            return;
        }

        setIsSaving(true);
        setFormError(null);
        clearError();

        const contentOverrides: CityContentOverrides = {
            ...(editHeroTitleAr.trim() || editHeroTitleEn.trim()
                ? { heroTitle: { ar: editHeroTitleAr.trim(), en: editHeroTitleEn.trim() } }
                : {}),
            ...(editHeroSubtitleAr.trim() || editHeroSubtitleEn.trim()
                ? { heroSubtitle: { ar: editHeroSubtitleAr.trim(), en: editHeroSubtitleEn.trim() } }
                : {}),
            ...(editAboutTitleAr.trim() || editAboutTitleEn.trim()
                ? { aboutTitle: { ar: editAboutTitleAr.trim(), en: editAboutTitleEn.trim() } }
                : {}),
            ...(editAboutDescAr.trim() || editAboutDescEn.trim()
                ? { aboutDescription: { ar: editAboutDescAr.trim(), en: editAboutDescEn.trim() } }
                : {}),
        };

        try {
            await updateCity(editingCity.id, {
                name: { ar: editNameAr.trim(), en: editNameEn.trim() },
                brandTitle: { ar: editBrandAr.trim(), en: editBrandEn.trim() },
                region: { ar: editRegionAr.trim(), en: editRegionEn.trim() },
                tagline: { ar: editTaglineAr.trim(), en: editTaglineEn.trim() },
                accentColor: editAccentColor.trim() || '#F59E0B',
                heroImageUrl: editHeroImageUrl.trim() || DEFAULT_CITY_HERO_IMAGE,
                isActive: editIsActive,
                isFeatured: editIsFeatured,
                contentOverrides,
            });
            showToast(isAr ? 'تم تحديث بيانات وتخصيصات المدينة بنجاح.' : 'City settings updated successfully.', 'success');
            setEditingCity(null);
        } catch (err: any) {
            const msg = err?.message || (isAr ? 'تعذر تحديث بيانات المدينة.' : 'Failed to update city.');
            setFormError(msg);
            showToast(msg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (city: CityPortalConfig) => {
        if (!canManageCities) {
            showToast(isAr ? 'صلاحية الإدارة العامة مطلوبة لتغيير حالة المدينة.' : 'Super Admin permission required.', 'error');
            return;
        }
        clearError();
        try {
            const updated = await toggleCityActive(city.id);
            if (updated) {
                showToast(
                    updated.isActive
                        ? (isAr ? `تم تفعيل بوابة ${updated.name.ar}` : `${updated.name.en} portal activated`)
                        : (isAr ? `تم إيقاف بوابة ${updated.name.ar} مؤقتاً` : `${updated.name.en} portal paused`),
                    'success'
                );
            }
        } catch (err: any) {
            showToast(err?.message || (isAr ? 'تعذر تحديث حالة المدينة.' : 'Failed to toggle city state.'), 'error');
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">
                        {ROOT_HUB_DOMAIN} · MULTI-CITY CONTROL PLANE
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        {isAr
                            ? 'إدارة المدن والمواقع الفرعية (Subdomains)'
                            : 'Multi-City & Subdomain Portals Governance'}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {isAr
                            ? 'تحكم مركزي في البوابة الأم (Only Property) والمواقع الفرعية المتخصصة لكل مدينة مع الحفظ الدائم في Supabase وعزل البيانات عبر city_id.'
                            : 'Centralized control plane for the Only Property root hub and persistent city subdomain portals stored in Supabase.'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            switchToHub();
                            navigate('/');
                        }}
                        className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 hover:border-amber-500 text-xs sm:text-sm font-semibold transition-colors"
                    >
                        {isAr ? 'معاينة البوابة الأم (Only Property)' : 'Preview Root Hub'}
                    </button>
                    {canManageCities && (
                        <button
                            type="button"
                            onClick={() => {
                                setFormError(null);
                                setIsAddModalOpen(true);
                            }}
                            className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs sm:text-sm font-bold transition-colors"
                        >
                            {isAr ? '+ إضافة مدينة (نطاق فرعي)' : '+ Add City Subdomain'}
                        </button>
                    )}
                </div>
            </div>

            {storeError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-sm">
                    <span>{storeError}</span>
                    <button
                        type="button"
                        onClick={clearError}
                        className="text-xs font-bold underline hover:text-red-950"
                    >
                        {isAr ? 'إغلاق' : 'Dismiss'}
                    </button>
                </div>
            )}

            {/* Root Hub Card */}
            <div className="bg-stone-950 text-white rounded-xl p-6 border border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <p className="text-xs font-mono text-amber-400 mb-1">
                        https://{ROOT_HUB_DOMAIN} · ?city=hub
                    </p>
                    <h2 className="text-xl font-bold">
                        {isAr
                            ? 'البوابة الأم: Only Property — المظلة الرئيسية للمدن'
                            : 'Root Ecosystem Hub: Only Property'}
                    </h2>
                    <p className="text-sm text-stone-300 mt-1 max-w-2xl">
                        {isAr
                            ? 'تستعرض الفكرة العامة للمنظومة وتوجه الزوار والشركاء إلى الموقع الفرعي المتخصص لكل مدينة، مع توحيد الحسابات وإدارة الصلاحيات.'
                            : 'Showcases the unified multi-city vision and routes visitors and partners to each city subdomain with unified SSO and role governance.'}
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => setAdminCityScope('all')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            adminCityScope === 'all'
                                ? 'bg-amber-500 text-stone-950 font-bold'
                                : 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                        }`}
                    >
                        {isAr ? 'تفعيل نطاق الإدارة الشامل (كل المدن)' : 'Set Admin Scope: All Cities'}
                    </button>
                </div>
            </div>

            {/* Content Inheritance vs City Configuration Blueprint */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1.5">
                        {isAr ? '1. المحتوى الموروث من المنصة الأم (site_content)' : '1. Inherited Global Content (site_content)'}
                    </p>
                    <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside leading-relaxed">
                        <li>{isAr ? 'الهوية العامة، القائمة العلوية، وبيانات التواصل في الفوتر.' : 'Global platform header links, footer contact info, legal pages, and CTA templates.'}</li>
                        <li>{isAr ? 'كتالوج خدمات التشطيبات الهندسية ومعرض الديكور والنماذج الديناميكية.' : 'Platform finishing service tiers, decorations showcase, and dynamic intake forms.'}</li>
                        <li>{isAr ? 'النصوص الافتراضية لقسم الواجهة الرئيسية و«عن المدينة» عند عدم ضبط تخصيص للمدينة.' : 'Default Hero and About City editorial copy whenever per-city overrides are left blank.'}</li>
                    </ul>
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1.5">
                        {isAr ? '2. ما يُضبط ويُعزل لكل مدينة (cities + content_overrides)' : '2. Per-City Settings & Data Isolation (cities)'}
                    </p>
                    <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside leading-relaxed">
                        <li>{isAr ? 'الاسم بالعربي والإنجليزي، شعار البوابة، النطاق الفرعي، صورة الـ Hero، واللون المميز، وحالة التفعيل/الإيقاف.' : 'City bilingual name, brand title, subdomain, hero photo, accent color, and active/paused status.'}</li>
                        <li>{isAr ? 'تخصيصات اختيارية لعنوان ووصف الـ Hero وقسم «عن المدينة» عبر content_overrides.' : 'Optional per-city Hero and About City title/description via content_overrides.'}</li>
                        <li>{isAr ? 'عزل تشغيلي لبيانات العقارات، المشاريع، البانرات، الطلبات، وصلاحيات الشركاء (allowed_cities).' : 'Strict scoping of properties, projects, banners, requests, and partner allowed_cities.'}</li>
                    </ul>
                </div>
            </div>

            {/* Cities Registry Cards */}
            {isLoading && cities.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                    {isAr ? 'جاري تحميل سجل المدن...' : 'Loading city portals...'}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {cities.map((city) => {
                        const isScoped = adminCityScope === city.id;
                        const stats = cityLiveCounts[city.id] || {
                            properties: city.stats.propertiesCount,
                            projects: city.stats.projectsCount,
                            partners: city.stats.partnersCount,
                        };
                        return (
                            <div
                                key={city.id}
                                className={`bg-white rounded-xl border ${
                                    isScoped ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200'
                                } overflow-hidden shadow-xs flex flex-col`}
                            >
                                <div className="h-40 relative bg-gray-900">
                                    <img
                                        src={city.heroImageUrl || DEFAULT_CITY_HERO_IMAGE}
                                        alt={city.name[language]}
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            target.onerror = null;
                                            target.src = DEFAULT_CITY_HERO_IMAGE;
                                        }}
                                        className="w-full h-full object-cover opacity-80"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/35 to-transparent" />
                                    <div className="absolute top-3 left-3 right-3 flex justify-between items-center text-xs">
                                        <span className="font-mono bg-black/70 text-white px-2.5 py-1 rounded border border-white/15">
                                            {city.subdomain}
                                        </span>
                                        <span
                                            className={`px-2 py-0.5 rounded font-semibold ${
                                                city.isActive ? 'bg-emerald-500/90 text-white' : 'bg-red-600/90 text-white'
                                            }`}
                                        >
                                            {city.isActive
                                                ? isAr ? 'نشط' : 'Active'
                                                : isAr ? 'متوقف' : 'Paused'}
                                        </span>
                                    </div>
                                    <div className="absolute bottom-3 left-4 right-4 text-white">
                                        <p className="text-xs text-amber-400 font-bold">{city.brandTitle[language]}</p>
                                        <h3 className="text-lg font-bold">{city.name[language]}</h3>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    <p className="text-xs text-gray-500 mb-2">{city.region[language]}</p>
                                    <p className="text-xs text-gray-600 leading-relaxed mb-4 flex-1">
                                        {city.tagline[language]}
                                    </p>

                                    <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-gray-50 rounded-lg border border-gray-200/80 mb-4 text-center">
                                        <div>
                                            <p className="text-base font-extrabold text-gray-900 tabular-nums">
                                                {stats.properties}
                                            </p>
                                            <p className="text-[11px] text-gray-500">
                                                {isAr ? 'عقار' : 'Units'}
                                            </p>
                                        </div>
                                        <div className="border-x border-gray-200">
                                            <p className="text-base font-extrabold text-gray-900 tabular-nums">
                                                {stats.projects}
                                            </p>
                                            <p className="text-[11px] text-gray-500">
                                                {isAr ? 'كمبوند' : 'Projects'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-base font-extrabold text-gray-900 tabular-nums">
                                                {stats.partners}
                                            </p>
                                            <p className="text-[11px] text-gray-500">
                                                {isAr ? 'شريك' : 'Partners'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAdminCityScope(city.id)}
                                            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                                                isScoped
                                                    ? 'bg-amber-500 text-gray-950 font-bold'
                                                    : 'bg-gray-900 text-white hover:bg-gray-800'
                                            }`}
                                        >
                                            {isScoped
                                                ? isAr ? 'نطاق الإدارة الحالي' : 'Active Admin Scope'
                                                : isAr ? 'تخصيص لوحة التحكم' : 'Scope Dashboard'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                switchToCity(city.slug);
                                                navigate('/');
                                            }}
                                            className="py-2 px-3 rounded-lg border border-gray-200 hover:border-amber-500 text-gray-700 text-xs font-semibold transition-colors"
                                        >
                                            {isAr ? 'فتح موقع المدينة' : 'Open City Portal'}
                                        </button>
                                        {canManageCities && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(city)}
                                                    className="py-1.5 px-3 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold transition-colors"
                                                >
                                                    {isAr ? 'تعديل وتخصيص المحتوى' : 'Edit & Overrides'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleActive(city)}
                                                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                                                        city.isActive
                                                            ? 'text-red-700 bg-red-50 hover:bg-red-100'
                                                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                                    }`}
                                                >
                                                    {city.isActive
                                                        ? isAr ? 'تعطيل المدينة' : 'Pause City'
                                                        : isAr ? 'تفعيل المدينة' : 'Activate City'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add City Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 my-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {isAr ? 'إضافة موقع فرعي لمدينة جديدة' : 'Add New City Subdomain Portal'}
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            {isAr
                                ? 'يتم حفظ المدينة مباشرة في جدول cities في Supabase مع عزل كامل لبياناتها.'
                                : 'Saved persistently to the Supabase cities registry with isolated city_id data.'}
                        </p>

                        {formError && (
                            <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreateCity} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    {isAr ? 'معرف النطاق الفرعي (Subdomain Slug)' : 'Subdomain Slug (e.g. madinaty, obour)'}
                                </label>
                                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                    <input
                                        type="text"
                                        required
                                        placeholder="madinaty"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                                    />
                                    <span className="bg-gray-100 px-3 py-2 text-xs font-mono text-gray-500 border-s border-gray-300">
                                        .{ROOT_HUB_DOMAIN}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'اسم المدينة (عربي)' : 'City Name (Arabic)'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="مدينتي"
                                        value={nameAr}
                                        onChange={(e) => setNameAr(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'اسم المدينة (إنجليزي)' : 'City Name (English)'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Madinaty"
                                        value={nameEn}
                                        onChange={(e) => setNameEn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'شعار البوابة (عربي)' : 'Brand Title (Arabic)'}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="أونلي مدينتي"
                                        value={brandAr}
                                        onChange={(e) => setBrandAr(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'شعار البوابة (إنجليزي)' : 'Brand Title (English)'}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="ONLY MADINATY"
                                        value={brandEn}
                                        onChange={(e) => setBrandEn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'النطاق الجغرافي (عربي)' : 'Region (Arabic)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={regionAr}
                                        onChange={(e) => setRegionAr(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'النطاق الجغرافي (إنجليزي)' : 'Region (English)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={regionEn}
                                        onChange={(e) => setRegionEn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'وصف البوابة (عربي)' : 'Tagline (Arabic)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={taglineAr}
                                        onChange={(e) => setTaglineAr(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'وصف البوابة (إنجليزي)' : 'Tagline (English)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={taglineEn}
                                        onChange={(e) => setTaglineEn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'رابط صورة الغلاف' : 'Hero Image URL'}
                                    </label>
                                    <input
                                        type="url"
                                        value={heroImageUrl}
                                        onChange={(e) => setHeroImageUrl(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'اللون المميز' : 'Accent Color'}
                                    </label>
                                    <input
                                        type="color"
                                        value={accentColor}
                                        onChange={(e) => setAccentColor(e.target.value)}
                                        className="w-full h-10 p-1 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-bold disabled:opacity-50"
                                >
                                    {isSaving
                                        ? (isAr ? 'جاري الحفظ...' : 'Saving...')
                                        : (isAr ? 'إنشاء وتفعيل موقع المدينة' : 'Create & Activate City Portal')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit City & Content Overrides Modal */}
            {editingCity && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 my-8 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {isAr ? `تعديل وتخصيص بوابة ${editingCity.name.ar}` : `Edit ${editingCity.name.en} & Content Overrides`}
                        </h3>
                        <p className="text-xs text-gray-500 mb-4 font-mono">
                            {editingCity.id} · {editingCity.subdomain}
                        </p>

                        {formError && (
                            <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleUpdateCity} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'اسم المدينة (عربي)' : 'City Name (Arabic)'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editNameAr}
                                        onChange={(e) => setEditNameAr(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'اسم المدينة (إنجليزي)' : 'City Name (English)'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editNameEn}
                                        onChange={(e) => setEditNameEn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'شعار البوابة (عربي)' : 'Brand Title (Arabic)'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editBrandAr}
                                        onChange={(e) => setEditBrandAr(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'شعار البوابة (إنجليزي)' : 'Brand Title (English)'}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editBrandEn}
                                        onChange={(e) => setEditBrandEn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'المنطقة (عربي)' : 'Region (Arabic)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={editRegionAr}
                                        onChange={(e) => setEditRegionAr(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'المنطقة (إنجليزي)' : 'Region (English)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={editRegionEn}
                                        onChange={(e) => setEditRegionEn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'الوصف المختصر (عربي)' : 'Tagline (Arabic)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={editTaglineAr}
                                        onChange={(e) => setEditTaglineAr(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'الوصف المختصر (إنجليزي)' : 'Tagline (English)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={editTaglineEn}
                                        onChange={(e) => setEditTaglineEn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'رابط صورة الـ Hero' : 'Hero Image URL'}
                                    </label>
                                    <input
                                        type="url"
                                        value={editHeroImageUrl}
                                        onChange={(e) => setEditHeroImageUrl(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        {isAr ? 'اللون المميز' : 'Accent Color'}
                                    </label>
                                    <input
                                        type="color"
                                        value={editAccentColor}
                                        onChange={(e) => setEditAccentColor(e.target.value)}
                                        className="w-full h-10 p-1 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-6 py-2">
                                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editIsActive}
                                        onChange={(e) => setEditIsActive(e.target.checked)}
                                        className="rounded text-amber-500"
                                    />
                                    <span>{isAr ? 'البوابة مفعّلة ومتاحة للعامة' : 'Portal Active & Publicly Visible'}</span>
                                </label>
                                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editIsFeatured}
                                        onChange={(e) => setEditIsFeatured(e.target.checked)}
                                        className="rounded text-amber-500"
                                    />
                                    <span>{isAr ? 'مدينة مميزة في البوابة الأم' : 'Featured in Root Hub'}</span>
                                </label>
                            </div>

                            {/* Per-city editorial overrides */}
                            <div className="border-t border-gray-200 pt-4 space-y-3">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">
                                        {isAr ? 'تخصيص محتوى الواجهة للمدينة (content_overrides — اختياري)' : 'Per-City Editorial Overrides (Optional — Otherwise Inherits Global CMS)'}
                                    </h4>
                                    <p className="text-[11px] text-gray-500">
                                        {isAr ? 'اترك الحقل فارغاً ليرث القيمة العامة من site_content تلقائياً.' : 'Leave blank to inherit from global site_content.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            {isAr ? 'عنوان Hero المخصص (عربي)' : 'Hero Title Override (AR)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={editHeroTitleAr}
                                            onChange={(e) => setEditHeroTitleAr(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            {isAr ? 'عنوان Hero المخصص (إنجليزي)' : 'Hero Title Override (EN)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={editHeroTitleEn}
                                            onChange={(e) => setEditHeroTitleEn(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            {isAr ? 'الوصف الفرعي Hero (عربي)' : 'Hero Subtitle Override (AR)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={editHeroSubtitleAr}
                                            onChange={(e) => setEditHeroSubtitleAr(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            {isAr ? 'الوصف الفرعي Hero (إنجليزي)' : 'Hero Subtitle Override (EN)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={editHeroSubtitleEn}
                                            onChange={(e) => setEditHeroSubtitleEn(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            {isAr ? 'عنوان قسم «عن المدينة» (عربي)' : 'About Section Title (AR)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={editAboutTitleAr}
                                            onChange={(e) => setEditAboutTitleAr(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            {isAr ? 'عنوان قسم «عن المدينة» (إنجليزي)' : 'About Section Title (EN)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={editAboutTitleEn}
                                            onChange={(e) => setEditAboutTitleEn(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            {isAr ? 'وصف «عن المدينة» (عربي)' : 'About Description (AR)'}
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={editAboutDescAr}
                                            onChange={(e) => setEditAboutDescAr(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            {isAr ? 'وصف «عن المدينة» (إنجليزي)' : 'About Description (EN)'}
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={editAboutDescEn}
                                            onChange={(e) => setEditAboutDescEn(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setEditingCity(null)}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-bold disabled:opacity-50"
                                >
                                    {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCitiesPage;

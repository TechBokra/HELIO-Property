import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../shared/LanguageContext';
import { useCityStore } from '../../../store/useCityStore';
import { ROOT_HUB_DOMAIN } from '../../../data/cities';
import type { CityPortalConfig } from '../../../types';

const AdminCitiesPage: React.FC = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const cities = useCityStore((s) => s.cities);
    const addCity = useCityStore((s) => s.addCity);
    const toggleCityActive = useCityStore((s) => s.toggleCityActive);
    const switchToCity = useCityStore((s) => s.switchToCity);
    const switchToHub = useCityStore((s) => s.switchToHub);
    const adminCityScope = useCityStore((s) => s.adminCityScope);
    const setAdminCityScope = useCityStore((s) => s.setAdminCityScope);

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

    const handleCreateCity = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (!cleanSlug || !nameAr.trim() || !nameEn.trim()) return;

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
            accentColor: '#F59E0B',
            heroImageUrl: '/src/assets/images/city_portal_heliopolis_1794779920751.jpg',
            isActive: true,
            isFeatured: true,
            stats: {
                propertiesCount: 0,
                projectsCount: 0,
                partnersCount: 1,
                districtsCount: 5,
            },
        };

        addCity(newCity);
        setIsAddModalOpen(false);
        setSlug('');
        setNameAr('');
        setNameEn('');
        setBrandAr('');
        setBrandEn('');
        setTaglineAr('');
        setTaglineEn('');
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
                        {language === 'ar'
                            ? 'إدارة المدن والمواقع الفرعية (Subdomains)'
                            : 'Multi-City & Subdomain Portals Governance'}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {language === 'ar'
                            ? 'تحكم مركزي في البوابة الأم (Only Property) والمواقع الفرعية المتخصصة لكل مدينة مع عزل البيانات عبر city_id.'
                            : 'Centralized control plane for the Only Property root hub and isolated city subdomain portals.'}
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
                        {language === 'ar' ? 'معاينة البوابة الأم (Only Property)' : 'Preview Root Hub'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs sm:text-sm font-bold transition-colors"
                    >
                        {language === 'ar' ? '+ إضافة مدينة (نطاق فرعي)' : '+ Add City Subdomain'}
                    </button>
                </div>
            </div>

            {/* Root Hub Card */}
            <div className="bg-stone-950 text-white rounded-xl p-6 border border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <p className="text-xs font-mono text-amber-400 mb-1">
                        https://{ROOT_HUB_DOMAIN} · ?city=hub
                    </p>
                    <h2 className="text-xl font-bold">
                        {language === 'ar'
                            ? 'البوابة الأم: Only Property — المظلة الرئيسية للمدن'
                            : 'Root Ecosystem Hub: Only Property'}
                    </h2>
                    <p className="text-sm text-stone-300 mt-1 max-w-2xl">
                        {language === 'ar'
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
                        {language === 'ar' ? 'تفعيل نطاق الإدارة الشامل (كل المدن)' : 'Set Admin Scope: All Cities'}
                    </button>
                </div>
            </div>

            {/* Cities Registry Table / Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {cities.map((city) => {
                    const isScoped = adminCityScope === city.id;
                    return (
                        <div
                            key={city.id}
                            className={`bg-white rounded-xl border ${
                                isScoped ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200'
                            } overflow-hidden shadow-xs flex flex-col`}
                        >
                            <div className="h-40 relative bg-gray-900">
                                <img
                                    src={city.heroImageUrl}
                                    alt={city.name[language]}
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        target.onerror = null;
                                        target.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=900&auto=format&fit=crop';
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
                                            city.isActive ? 'bg-emerald-500/90 text-white' : 'bg-gray-700 text-gray-300'
                                        }`}
                                    >
                                        {city.isActive
                                            ? language === 'ar' ? 'نشط' : 'Active'
                                            : language === 'ar' ? 'متوقف' : 'Paused'}
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
                                            {city.stats.propertiesCount}
                                        </p>
                                        <p className="text-[11px] text-gray-500">
                                            {language === 'ar' ? 'عقار' : 'Units'}
                                        </p>
                                    </div>
                                    <div className="border-x border-gray-200">
                                        <p className="text-base font-extrabold text-gray-900 tabular-nums">
                                            {city.stats.projectsCount}
                                        </p>
                                        <p className="text-[11px] text-gray-500">
                                            {language === 'ar' ? 'كمبوند' : 'Projects'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-base font-extrabold text-gray-900 tabular-nums">
                                            {city.stats.partnersCount}
                                        </p>
                                        <p className="text-[11px] text-gray-500">
                                            {language === 'ar' ? 'شريك' : 'Partners'}
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
                                            ? language === 'ar' ? 'نطاق الإدارة الحالي' : 'Active Admin Scope'
                                            : language === 'ar' ? 'تخصيص لوحة التحكم' : 'Scope Dashboard'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            switchToCity(city.slug);
                                            navigate('/');
                                        }}
                                        className="py-2 px-3 rounded-lg border border-gray-200 hover:border-amber-500 text-gray-700 text-xs font-semibold transition-colors"
                                    >
                                        {language === 'ar' ? 'فتح موقع المدينة' : 'Open City Portal'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleCityActive(city.id)}
                                        className="col-span-2 py-1.5 px-3 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                                    >
                                        {city.isActive
                                            ? language === 'ar' ? 'إيقاف النطاق الفرعي مؤقتاً' : 'Pause City Subdomain'
                                            : language === 'ar' ? 'تفعيل النطاق الفرعي' : 'Activate City Subdomain'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* VPS + Wildcard DNS + Local PostgreSQL Architecture Blueprint */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">
                        VPS & CLOUDFLARE DEPLOYMENT BLUEPRINT
                    </p>
                    <h2 className="text-xl font-bold text-gray-900">
                        {language === 'ar'
                            ? 'دليل التشغيل الفعلي للنطاقات الفرعية على السيرفر (VPS + Coolify + PostgreSQL)'
                            : 'Production VPS + Wildcard DNS + PostgreSQL Deployment Blueprint'}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <p className="font-mono text-xs font-bold text-amber-700 mb-1">01. Cloudflare Wildcard DNS</p>
                        <h3 className="font-bold text-gray-900 mb-2">
                            {language === 'ar' ? 'إعداد النطاق الرئيسي والفرعي' : 'Root & Wildcard DNS Records'}
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed mb-3">
                            {language === 'ar'
                                ? 'يتم توجيه النطاق الرئيسي وجميع النطاقات الفرعية للمدن تلقائياً إلى نفس عنوان الـ VPS عبر سجلين فقط في Cloudflare:'
                                : 'Route both the root hub and all current/future city subdomains to the same VPS IP with two DNS records:'}
                        </p>
                        <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs space-y-1">
                            <div>A  @   -&gt; &lt;VPS_IP&gt; (Proxied)</div>
                            <div>A  *   -&gt; &lt;VPS_IP&gt; (Proxied)</div>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <p className="font-mono text-xs font-bold text-amber-700 mb-1">02. Coolify + Docker Engine</p>
                        <h3 className="font-bold text-gray-900 mb-2">
                            {language === 'ar' ? 'نشر موحد לכל المواقع الفرعية' : 'Single Container Multi-Subdomain Routing'}
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed mb-3">
                            {language === 'ar'
                                ? 'في Coolify يتم ربط التطبيق بالنطاق العام ورمز النجمة ليقوم الكود بتحديد المدينة من الرابط دون الحاجة لتشغيل حاوية منفصلة لكل مدينة:'
                                : 'Configure Coolify Domains to accept wildcard traffic so a single deployment serves all cities dynamically:'}
                        </p>
                        <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs space-y-1">
                            <div>https://only-property.com</div>
                            <div>https://*.only-property.com</div>
                        </div>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                        <p className="font-mono text-xs font-bold text-amber-700 mb-1">03. Local PostgreSQL + R2 Backup</p>
                        <h3 className="font-bold text-gray-900 mb-2">
                            {language === 'ar' ? 'قاعدة بيانات موحدة على نفس الـ VPS' : 'Co-located PostgreSQL + Off-server Backup'}
                        </h3>
                        <p className="text-xs text-gray-600 leading-relaxed mb-3">
                            {language === 'ar'
                                ? 'تشغيل PostgreSQL داخل نفس السيرفر (OVH أو LDC مصر) يمنح زمن استجابة أقل من 1ms بين الباك إند وقاعدة البيانات مع نسخ احتياطي آلي خارجي.'
                                : 'Running PostgreSQL on the same VPS via Coolify achieves sub-1ms internal latency with automated daily encrypted backups to Cloudflare R2.'}
                        </p>
                        <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs space-y-1">
                            <div>DB: postgresql://internal-vps:5432</div>
                            <div>Tenant Key: city_id + allowed_cities</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add City Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {language === 'ar' ? 'إضافة موقع فرعي لمدينة جديدة' : 'Add New City Subdomain Portal'}
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            {language === 'ar'
                                ? 'سيتم تفعيل النطاق الفرعي فوراً بنفس التصميم والبنية مع عزل كامل لبيانات المدينة.'
                                : 'The new city subdomain will immediately inherit the platform layout with isolated city_id data.'}
                        </p>

                        <form onSubmit={handleCreateCity} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    {language === 'ar' ? 'معرف النطاق الفرعي (Subdomain Slug)' : 'Subdomain Slug (e.g. madinaty, obour)'}
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
                                        {language === 'ar' ? 'اسم المدينة (عربي)' : 'City Name (Arabic)'}
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
                                        {language === 'ar' ? 'اسم المدينة (إنجليزي)' : 'City Name (English)'}
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
                                        {language === 'ar' ? 'شعار البوابة (عربي)' : 'Brand Title (Arabic)'}
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
                                        {language === 'ar' ? 'شعار البوابة (إنجليزي)' : 'Brand Title (English)'}
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
                                        {language === 'ar' ? 'النطاق الجغرافي (عربي)' : 'Region (Arabic)'}
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
                                        {language === 'ar' ? 'النطاق الجغرافي (إنجليزي)' : 'Region (English)'}
                                    </label>
                                    <input
                                        type="text"
                                        value={regionEn}
                                        onChange={(e) => setRegionEn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                >
                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-bold"
                                >
                                    {language === 'ar' ? 'إنشاء وتفعيل موقع المدينة' : 'Create & Activate City Portal'}
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

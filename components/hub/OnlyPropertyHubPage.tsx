import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '../shared/SEO';
import { useLanguage } from '../shared/LanguageContext';
import { useCityStore } from '../../store/useCityStore';
import { ROOT_HUB_DOMAIN } from '../../data/cities';

const OnlyPropertyHubPage: React.FC = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const cities = useCityStore((s) => s.cities);
    const switchToCity = useCityStore((s) => s.switchToCity);

    const activeCities = cities.filter((c) => c.isActive);
    const [selectedLauncherCity, setSelectedLauncherCity] = useState<string>(activeCities[0]?.slug || 'heliopolis');
    const [selectedLauncherRoute, setSelectedLauncherRoute] = useState<string>('/');

    useEffect(() => {
        if (activeCities.length === 0) return;
        if (!activeCities.some((c) => c.slug === selectedLauncherCity)) {
            setSelectedLauncherCity(activeCities[0].slug);
        }
    }, [activeCities, selectedLauncherCity]);

    const totalStats = activeCities.reduce(
        (acc, city) => ({
            properties: acc.properties + (city.stats?.propertiesCount || 0),
            projects: acc.projects + (city.stats?.projectsCount || 0),
            partners: acc.partners + (city.stats?.partnersCount || 0),
            districts: acc.districts + (city.stats?.districtsCount || 0),
        }),
        { properties: 0, projects: 0, partners: 0, districts: 0 },
    );

    const handleEnterCityPortal = (citySlug: string, targetPath = '/') => {
        switchToCity(citySlug);
        navigate(targetPath);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLauncherSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleEnterCityPortal(selectedLauncherCity, selectedLauncherRoute);
    };

    return (
        <div className="bg-[#FAF8F5] text-stone-900 min-h-screen">
            <SEO
                title={
                    language === 'ar'
                        ? 'ONLY PROPERTY | البوابة الأم للمدن العمرانية الذكية'
                        : 'ONLY PROPERTY | Multi-City Real Estate Ecosystem'
                }
                description={
                    language === 'ar'
                        ? 'منظومة Only Property العقارية والخدمية — مواقع فرعية متخصصة لكل مدينة مع حساب موحد وإدارة مركزية.'
                        : 'Only Property multi-city real estate ecosystem — dedicated city portals powered by unified accounts and centralized governance.'
                }
            />

            {/* 1. Architectural Hero & City Subdomain Launcher */}
            <section className="relative min-h-[84vh] flex items-center overflow-hidden bg-stone-950 text-white">
                <img
                    src="/src/assets/images/hero_only_property_hub_1794779919905.jpg"
                    alt={language === 'ar' ? 'منظومة أونلي بروبرتي للمدن الجديدة' : 'Only Property Multi-City Ecosystem'}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1800&auto=format&fit=crop';
                    }}
                    className="absolute inset-0 w-full h-full object-cover opacity-55 scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/75 to-stone-950/40" />

                <div className="relative z-10 container mx-auto px-6 py-20 lg:py-28">
                    <div className="max-w-4xl">
                        <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] text-amber-400 mb-5">
                            {ROOT_HUB_DOMAIN} · {language === 'ar' ? 'البوابة المركزية للمدن المتخصصة' : 'ROOT MULTI-CITY HUB'}
                        </p>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6">
                            {language === 'ar'
                                ? 'منظومة عقارية وخدمية واحدة. موقع متخصص لكل مدينة.'
                                : 'One Architectural Ecosystem. A Dedicated Portal for Every City.'}
                        </h1>

                        <p className="text-base sm:text-lg lg:text-xl text-stone-200 max-w-2xl leading-relaxed mb-10">
                            {language === 'ar'
                                ? 'تجمع Only Property بين الهوية الموحدة والعمق المحلي؛ كل مدينة تعمل عبر نطاق فرعي مستقل ببياناتها ومشروعاتها وشركائها المعتمدين، مع حساب موحد ولوحة تحكم مركزية.'
                                : 'Only Property unites master-planned cities under one architectural standard. Each city operates on its own dedicated subdomain with localized listings, compounds, and verified service partners.'}
                        </p>

                        {/* Interactive City + Destination Launcher */}
                        <form
                            onSubmit={handleLauncherSubmit}
                            className="bg-stone-900/90 backdrop-blur-md border border-stone-700/80 rounded-xl p-3 sm:p-4 shadow-2xl max-w-3xl"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                <div className="sm:col-span-5">
                                    <label className="block text-[11px] uppercase tracking-wider text-stone-400 px-2 mb-1">
                                        {language === 'ar' ? 'اختر المدينة (النطاق الفرعي)' : 'Select City Portal (Subdomain)'}
                                    </label>
                                    <select
                                        value={selectedLauncherCity}
                                        onChange={(e) => setSelectedLauncherCity(e.target.value)}
                                        className="w-full bg-stone-800/90 text-white border border-stone-700 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-amber-500"
                                    >
                                        {activeCities.map((city) => (
                                            <option key={city.id} value={city.slug}>
                                                {city.name[language]} — {city.subdomain}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="sm:col-span-4">
                                    <label className="block text-[11px] uppercase tracking-wider text-stone-400 px-2 mb-1">
                                        {language === 'ar' ? 'القسم المطلوب داخل المدينة' : 'Target City Section'}
                                    </label>
                                    <select
                                        value={selectedLauncherRoute}
                                        onChange={(e) => setSelectedLauncherRoute(e.target.value)}
                                        className="w-full bg-stone-800/90 text-white border border-stone-700 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="/">
                                            {language === 'ar' ? 'الرئيسية للمدينة' : 'City Home Portal'}
                                        </option>
                                        <option value="/properties">
                                            {language === 'ar' ? 'العقارات والوحدات المتاحة' : 'Properties & Units'}
                                        </option>
                                        <option value="/projects">
                                            {language === 'ar' ? 'الكمبوندات والمشروعات' : 'Compounds & Projects'}
                                        </option>
                                        <option value="/finishing">
                                            {language === 'ar' ? 'خدمات التشطيبات الهندسية' : 'Finishing Services'}
                                        </option>
                                        <option value="/decorations">
                                            {language === 'ar' ? 'الديكور والتحف' : 'Decorations & Crafts'}
                                        </option>
                                    </select>
                                </div>

                                <div className="sm:col-span-3 pt-1 sm:pt-5">
                                    <button
                                        type="submit"
                                        className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 px-4 rounded-lg text-sm transition-colors shadow-lg shadow-amber-500/20"
                                    >
                                        {language === 'ar' ? 'انتقل لبوابة المدينة' : 'Launch Portal'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            {/* 2. Live Ecosystem Metrics Strip (tabular-nums) */}
            <section className="border-b border-stone-200 bg-white">
                <div className="container mx-auto px-6 py-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                                {language === 'ar' ? 'المواقع الفرعية النشطة' : 'Active City Portals'}
                            </p>
                            <p className="text-3xl font-extrabold text-stone-900 tabular-nums">
                                {activeCities.length}
                            </p>
                            <p className="text-xs text-stone-500 mt-1">
                                {language === 'ar' ? 'هليوبوليس الجديدة · الشروق · بدر' : 'New Heliopolis · El Shorouk · Badr'}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                                {language === 'ar' ? 'إجمالي الوحدات المدرجة' : 'Indexed City Properties'}
                            </p>
                            <p className="text-3xl font-extrabold text-stone-900 tabular-nums">
                                {totalStats.properties.toLocaleString()}
                            </p>
                            <p className="text-xs text-stone-500 mt-1">
                                {language === 'ar' ? 'عزل كامل لبيانات كل مدينة' : 'Strict per-city data isolation'}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                                {language === 'ar' ? 'الكمبوندات والمشروعات' : 'Master-Planned Compounds'}
                            </p>
                            <p className="text-3xl font-extrabold text-stone-900 tabular-nums">
                                {totalStats.projects}
                            </p>
                            <p className="text-xs text-stone-500 mt-1">
                                {language === 'ar' ? 'مطورون عقاريون معتمدون' : 'Verified developer portfolios'}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                                {language === 'ar' ? 'شركاء النجاح والخدمات' : 'Verified City Partners'}
                            </p>
                            <p className="text-3xl font-extrabold text-stone-900 tabular-nums">
                                {totalStats.partners}
                            </p>
                            <p className="text-xs text-stone-500 mt-1">
                                {language === 'ar' ? 'حساب موحد بصلاحيات متعددة المدن' : 'Unified SSO with multi-city scopes'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Specialized City Subdomain Portals Grid */}
            <section className="py-20 lg:py-24">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 mb-2">
                                {language === 'ar' ? 'النطاقات الفرعية المتخصصة' : 'CITY SUBDOMAIN DIRECTORY'}
                            </p>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
                                {language === 'ar'
                                    ? 'اختر موقع المدينة المتخصص'
                                    : 'Explore Dedicated City Portals'}
                            </h2>
                        </div>
                        <p className="text-sm sm:text-base text-stone-600 max-w-xl">
                            {language === 'ar'
                                ? 'يحمل كل موقع فرعي ذات التصميم والبنية البرمجية لـ Only Property، مع تخصيص كامل للعقارات والكمبوندات وطلبات العملاء وأدوات التحكم الخاصة بالمدينة.'
                                : 'Every city subdomain shares the unified Only Property architecture while serving strictly isolated listings, compounds, leads, and city-specific operational controls.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {activeCities.map((city) => (
                            <article
                                key={city.id}
                                className="group bg-white rounded-xl border border-stone-200/90 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                            >
                                <div className="relative aspect-[4/3] overflow-hidden bg-stone-900">
                                    <img
                                        src={city.heroImageUrl}
                                        alt={city.name[language]}
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            target.onerror = null;
                                            target.src = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1000&auto=format&fit=crop';
                                        }}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />

                                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-stone-200">
                                        <span className="bg-stone-950/75 backdrop-blur-sm px-2.5 py-1 rounded border border-white/15">
                                            {city.subdomain}
                                        </span>
                                        <span className="bg-stone-950/75 backdrop-blur-sm px-2.5 py-1 rounded border border-white/15 font-sans font-bold text-amber-400">
                                            {city.brandTitle[language]}
                                        </span>
                                    </div>

                                    <div className="absolute bottom-4 left-5 right-5 text-white">
                                        <p className="text-xs text-stone-300 mb-1">
                                            {city.region[language]}
                                        </p>
                                        <h3 className="text-2xl font-bold tracking-tight">
                                            {city.name[language]}
                                        </h3>
                                    </div>
                                </div>

                                <div className="p-6 flex-1 flex flex-col">
                                    <p className="text-sm text-stone-600 leading-relaxed mb-6 flex-1">
                                        {city.tagline[language]}
                                    </p>

                                    {/* Tabular City Telemetry */}
                                    <div className="grid grid-cols-3 gap-2 py-3.5 px-4 bg-stone-50 rounded-lg border border-stone-200/70 mb-6 text-center">
                                        <div>
                                            <p className="text-lg font-extrabold text-stone-900 tabular-nums">
                                                {city.stats.propertiesCount}
                                            </p>
                                            <p className="text-[11px] text-stone-500">
                                                {language === 'ar' ? 'وحدة عقارية' : 'Properties'}
                                            </p>
                                        </div>
                                        <div className="border-x border-stone-200">
                                            <p className="text-lg font-extrabold text-stone-900 tabular-nums">
                                                {city.stats.projectsCount}
                                            </p>
                                            <p className="text-[11px] text-stone-500">
                                                {language === 'ar' ? 'كمبوند ومشروع' : 'Compounds'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-extrabold text-stone-900 tabular-nums">
                                                {city.stats.partnersCount}
                                            </p>
                                            <p className="text-[11px] text-stone-500">
                                                {language === 'ar' ? 'شريك معتمد' : 'Partners'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => handleEnterCityPortal(city.slug, '/')}
                                            className="col-span-2 bg-stone-900 hover:bg-amber-500 hover:text-stone-950 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                                        >
                                            {language === 'ar'
                                                ? `دخول موقع ${city.name.ar}`
                                                : `Enter ${city.name.en} Portal`}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleEnterCityPortal(city.slug, '/properties')}
                                            className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium py-2 px-3 rounded-lg text-xs transition-colors"
                                        >
                                            {language === 'ar' ? 'تصفح العقارات' : 'Browse Properties'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleEnterCityPortal(city.slug, '/projects')}
                                            className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium py-2 px-3 rounded-lg text-xs transition-colors"
                                        >
                                            {language === 'ar' ? 'تصفح الكمبوندات' : 'Browse Compounds'}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. Editorial Architecture Pillars (01 / 02 / 03) */}
            <section className="py-20 bg-white border-t border-stone-200">
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl mb-14">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 mb-2">
                            {language === 'ar' ? 'البنية المعمارية للمنظومة' : 'UNIFIED PLATFORM ARCHITECTURE'}
                        </p>
                        <h2 className="text-3xl font-extrabold text-stone-900 tracking-tight">
                            {language === 'ar'
                                ? 'كيف تعمل منظومة Only Property عبر جميع المدن؟'
                                : 'How the Only Property Multi-City Engine Operates'}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="border-t-2 border-stone-900 pt-6">
                            <span className="text-xs font-mono font-bold text-amber-600 tabular-nums">01.</span>
                            <h3 className="text-xl font-bold text-stone-900 mt-2 mb-3">
                                {language === 'ar'
                                    ? 'نطاق فرعي مستقل وبيانات معزولة لكل مدينة'
                                    : 'Dedicated Subdomain & Isolated Data per City'}
                            </h3>
                            <p className="text-sm text-stone-600 leading-relaxed">
                                {language === 'ar'
                                    ? 'يتم توجيه كل نطاق فرعي (مثل heliopolis.only-property.com و shorouk.only-property.com) تلقائياً لعرض عقارات وكمبوندات وبانرات وطلبات تلك المدينة فقط عبر معرف المدينة (city_id).'
                                    : 'Each subdomain (e.g., heliopolis.only-property.com, shorouk.only-property.com) automatically resolves its tenant scope and isolates properties, compounds, banners, and customer requests via city_id.'}
                            </p>
                        </div>

                        <div className="border-t-2 border-stone-900 pt-6">
                            <span className="text-xs font-mono font-bold text-amber-600 tabular-nums">02.</span>
                            <h3 className="text-xl font-bold text-stone-900 mt-2 mb-3">
                                {language === 'ar'
                                    ? 'حساب موحد للمستخدمين والشركاء عبر المدن'
                                    : 'Single Sign-On for Users & Multi-City Partners'}
                            </h3>
                            <p className="text-sm text-stone-600 leading-relaxed">
                                {language === 'ar'
                                    ? 'لا حاجة لتسجيل حساب جديد في كل مدينة؛ يعمل حساب العميل أو المطور أو شركة التشطيبات عبر جميع المدن المصرح له بها (allowed_cities) بنفس بيانات الدخول.'
                                    : 'Customers, developers, and finishing agencies authenticate once. Partner profiles carry explicit allowed_cities permissions so they can operate seamlessly across authorized cities.'}
                            </p>
                        </div>

                        <div className="border-t-2 border-stone-900 pt-6">
                            <span className="text-xs font-mono font-bold text-amber-600 tabular-nums">03.</span>
                            <h3 className="text-xl font-bold text-stone-900 mt-2 mb-3">
                                {language === 'ar'
                                    ? 'تحكم مركزي شامل + إدارة مخصصة لكل مدينة'
                                    : 'Centralized Super-Admin + Per-City Governance'}
                            </h3>
                            <p className="text-sm text-stone-600 leading-relaxed">
                                {language === 'ar'
                                    ? 'يمتلك المدير العام لوحة تحكم شاملة تعرض إحصائيات وطلبات كل المدن مع إمكانية التصفية الفورية لأي مدينة أو تعيين مدير مخصص لإدارة موقع فرعي محدد.'
                                    : 'Super-Admins oversee all cities from a unified control plane with an instant City Scope Switcher, while City Managers are scoped strictly to their assigned city portal.'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default OnlyPropertyHubPage;

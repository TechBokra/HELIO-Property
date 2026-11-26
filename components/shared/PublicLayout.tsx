import React, { useState, useMemo, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import Footer from './Footer';
import QuietZone from './QuietZone';
import MobileNav from './MobileNav';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from './LanguageContext';
import { Permission } from '../../types';
import { useSiteContent } from '../../hooks/useSiteContent';
import { useCityStore } from '../../store/useCityStore';

const PublicLayout: React.FC = () => {
    const [isQuietZoneActive, setIsQuietZoneActive] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

    const { currentUser, logout, hasPermission } = useAuth();
    const { language, t } = useLanguage();
    const { data: siteContent } = useSiteContent();
    const navigate = useNavigate();

    const cities = useCityStore((s) => s.cities);
    const portalMode = useCityStore((s) => s.portalMode);
    const unavailableCity = useCityStore((s) => s.unavailableCity);
    const unavailableSlug = useCityStore((s) => s.unavailableSlug);
    const switchToHub = useCityStore((s) => s.switchToHub);
    const switchToCity = useCityStore((s) => s.switchToCity);

    const activeCities = useMemo(() => cities.filter((c) => c.isActive), [cities]);
    const isPausedCityPortal = portalMode === 'city' && Boolean(unavailableCity || unavailableSlug);

    const dashboardPath = useMemo(() => {
        if (!currentUser) return '/login';
        if (hasPermission(Permission.VIEW_ADMIN_DASHBOARD)) {
            return '/admin';
        }
        if (hasPermission(Permission.VIEW_PARTNER_DASHBOARD)) {
            return '/dashboard';
        }
        if (hasPermission(Permission.VIEW_CUSTOMER_DASHBOARD) || (currentUser as any).role === 'customer') {
            return '/my-dashboard';
        }
        return '/';
    }, [currentUser, hasPermission]);

    const dashboardText = hasPermission(Permission.VIEW_ADMIN_DASHBOARD)
        ? t.adminDashboard.title
        : hasPermission(Permission.VIEW_PARTNER_DASHBOARD)
            ? t.dashboard.title
            : (language === 'ar' ? 'لوحة التحكم' : 'Dashboard');

    const handleToggleQuietZone = useCallback(() => {
        setIsQuietZoneActive(true);
        setIsMobileNavOpen(false);
    }, []);

    return (
        <div className="flex flex-col min-h-screen">
            {siteContent?.topBanner?.enabled && (
                <div className="bg-gray-900 text-white text-center py-3 px-4 text-sm font-medium relative z-50 border-b-2 border-amber-500">
                    <div className="container mx-auto flex items-center justify-center gap-2">
                        <span className="text-xl">🚧</span>
                        <span>{siteContent.topBanner.content[language]}</span>
                    </div>
                </div>
            )}

            <Header
                onToggleQuietZone={handleToggleQuietZone}
                onOpenMobileNav={() => setIsMobileNavOpen(true)}
                currentUser={currentUser}
                dashboardPath={dashboardPath}
                dashboardText={dashboardText}
                logout={logout}
            />
            <main className="flex-grow">
                {isPausedCityPortal ? (
                    <section className="py-24 px-6 bg-gray-50 min-h-[65vh] flex items-center justify-center">
                        <div className="max-w-xl w-full bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center space-y-5">
                            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
                                {language === 'ar' ? 'بوابة المدينة متوقفة مؤقتاً' : 'City Portal Temporarily Paused'}
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                                {unavailableCity
                                    ? (language === 'ar'
                                        ? `بوابة ${unavailableCity.name.ar} غير متاحة حالياً للعامة`
                                        : `${unavailableCity.name.en} Portal is Currently Paused`)
                                    : (language === 'ar'
                                        ? 'بوابة المدينة المطلوبة غير مفعّلة حالياً'
                                        : 'Requested City Portal Is Not Active')}
                            </h1>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {language === 'ar'
                                    ? 'تم إيقاف هذه البوابة الفرعية مؤقتاً من لوحة الإدارة. يمكنك الانتقال إلى البوابة الأم Only Property أو تصفح المدن المفعّلة.'
                                    : 'This city subdomain portal has been temporarily paused by platform administrators. Return to the Only Property hub or switch to an active city portal.'}
                            </p>

                            <div className="flex flex-wrap justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        switchToHub();
                                        navigate('/');
                                    }}
                                    className="px-5 py-2.5 rounded-lg bg-gray-900 hover:bg-amber-500 hover:text-gray-950 text-white text-xs sm:text-sm font-bold transition-colors"
                                >
                                    {language === 'ar' ? 'العودة للبوابة الأم (Only Property)' : 'Go to Only Property Hub'}
                                </button>
                                {activeCities.map((city) => (
                                    <button
                                        key={city.id}
                                        type="button"
                                        onClick={() => {
                                            switchToCity(city.slug);
                                            navigate('/');
                                        }}
                                        className="px-4 py-2.5 rounded-lg border border-gray-300 hover:border-amber-500 text-gray-800 text-xs sm:text-sm font-semibold transition-colors"
                                    >
                                        {city.name[language]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                ) : (
                    <Outlet />
                )}
            </main>
            <Footer />
            
            {isQuietZoneActive && <QuietZone onClose={() => setIsQuietZoneActive(false)} />}

            <MobileNav
                id="mobile-nav-menu"
                isOpen={isMobileNavOpen}
                onClose={() => setIsMobileNavOpen(false)}
                onToggleQuietZone={handleToggleQuietZone}
                currentUser={currentUser}
                dashboardPath={dashboardPath}
                logout={logout}
                hasPermission={hasPermission}
            />
        </div>
    );
};

export default PublicLayout;
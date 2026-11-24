
import { memo, useMemo } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { Partner } from '../../types';
import { LightBulbIcon, HeartIcon, MenuIcon, GlobeAltIcon } from '../ui/Icons';
import { SiteIdentity } from './SiteIdentity';
import { useLanguage } from './LanguageContext';
import NotificationBell from './NotificationBell';
import { useCityStore } from '../../store/useCityStore';
import { useSiteContent } from '../../hooks/useSiteContent';
import { resolveNavigationLinks } from '../../utils/siteContentHelpers';
import SmartActionLink from './SmartActionLink';

interface HeaderProps {
    onToggleQuietZone: () => void;
    onOpenMobileNav: () => void;
    currentUser: Partner | null;
    dashboardPath: string;
    dashboardText: string;
    logout: () => void;
    previewViewport?: 'desktop' | 'mobile';
}

export const Header = memo<HeaderProps>(({ 
    onToggleQuietZone,
    onOpenMobileNav,
    currentUser,
    dashboardPath,
    dashboardText,
    logout,
    previewViewport,
}) => {
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();
    const { data: siteContent } = useSiteContent();
    const cities = useCityStore((s) => s.cities);
    const portalMode = useCityStore((s) => s.portalMode);
    const activeCityId = useCityStore((s) => s.activeCityId);
    const switchToHub = useCityStore((s) => s.switchToHub);
    const switchToCity = useCityStore((s) => s.switchToCity);

    const activeCities = cities.filter((c) => c.isActive);
    const currentSelectorValue = portalMode === 'hub' ? 'hub' : activeCityId;

    const handlePortalSwitch = (value: string) => {
        if (value === 'hub') {
            switchToHub();
            navigate('/');
        } else {
            switchToCity(value);
        }
    };

    const navLinks = useMemo(() => {
        const resolved = resolveNavigationLinks(siteContent);
        return resolved.map((item) => ({
            id: item.id,
            name: item.label?.[language] || item.label?.ar || item.label?.en || item.href,
            href: item.href,
            isEnd: item.isEnd ?? (item.href === '/'),
        }));
    }, [siteContent, language]);

    const headerCta = siteContent?.headerCta;
    const showHeaderCta = headerCta?.visible ?? true;
    const headerCtaLabel = headerCta?.text?.[language] || t.joinAsPartner;
    const headerCtaLink = headerCta?.link || '/register';

    const activeLinkClass = 'text-amber-500 font-semibold';
    const inactiveLinkClass = 'text-gray-600 hover:text-amber-500';

    const prefetchRoute = (href: string) => {
        switch (href) {
            case '/properties':
                import('../properties/PropertiesPage');
                break;
            case '/projects':
                import('../projects/ProjectsPage');
                break;
            case '/finishing':
                import('../finishing/FinishingPage');
                break;
            case '/decorations':
                import('../decorations/DecorationsPage');
                break;
            case '/contact':
                import('../contact/ContactPage');
                break;
        }
    };

    const isForcedMobile = previewViewport === 'mobile';
    const isForcedDesktop = previewViewport === 'desktop';

    const desktopNavVisibilityClass = isForcedMobile
        ? 'hidden'
        : isForcedDesktop
            ? 'flex items-center gap-6 text-sm xl:text-base'
            : 'hidden xl:flex items-center gap-7 text-base';

    const desktopUtilityClass = isForcedMobile
        ? 'hidden'
        : isForcedDesktop
            ? 'block'
            : 'hidden lg:block';

    const desktopLangClass = isForcedMobile
        ? 'hidden'
        : isForcedDesktop
            ? 'flex items-center justify-center h-10 w-10 rounded-full border border-gray-300 text-gray-600 font-semibold text-lg hover:border-amber-500 hover:text-amber-500 transition-colors'
            : 'hidden lg:flex items-center justify-center h-10 w-10 rounded-full border border-gray-300 text-gray-600 font-semibold text-lg hover:border-amber-500 hover:text-amber-500 transition-colors';

    const desktopAuthClass = isForcedMobile
        ? 'hidden'
        : isForcedDesktop
            ? 'flex items-center gap-2 border-l border-gray-200 pl-4'
            : 'hidden lg:flex items-center gap-2 border-l border-gray-200 pl-4';

    const mobileTriggerClass = isForcedMobile
        ? 'block'
        : isForcedDesktop
            ? 'hidden'
            : 'lg:hidden';

    return (
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm border-b border-gray-200">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="flex justify-between items-center h-16 lg:h-20">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <Link to="/" target="_self" className="text-amber-500 hover:opacity-80 transition-opacity shrink-0" title={language === 'ar' ? 'الرئيسية' : 'Home'}>
                            <SiteIdentity />
                        </Link>

                        {/* Multi-City & Root Hub Subdomain Switcher */}
                        <div className="flex items-center gap-1.5 bg-gray-100/90 border border-gray-200 rounded-lg px-2 py-1.5 max-w-[170px] sm:max-w-none">
                            <GlobeAltIcon className="w-4 h-4 text-amber-600 shrink-0" />
                            <select
                                aria-label={language === 'ar' ? 'تبديل موقع المدينة' : 'Switch City Portal'}
                                value={currentSelectorValue}
                                onChange={(e) => handlePortalSwitch(e.target.value)}
                                className="bg-transparent text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none cursor-pointer truncate"
                            >
                                <option value="hub">
                                    {language === 'ar' ? '🌐 البوابة الأم (Only Property)' : '🌐 Root Hub (Only Property)'}
                                </option>
                                {activeCities.map((city) => (
                                    <option key={city.id} value={city.slug}>
                                        {city.name[language]} ({city.slug})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <nav className={desktopNavVisibilityClass}>
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.id || link.href}
                                to={link.href}
                                end={link.isEnd}
                                onMouseEnter={() => prefetchRoute(link.href)}
                                onFocus={() => prefetchRoute(link.href)}
                                className={({ isActive }) =>
                                    `${isActive ? activeLinkClass : inactiveLinkClass} transition-colors duration-200 whitespace-nowrap`
                                }
                            >
                                {link.name}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                        {currentUser && !previewViewport && (
                            <div className="flex items-center justify-center">
                                <NotificationBell />
                            </div>
                        )}
                        <Link
                            to="/favorites"
                            className={`${desktopUtilityClass} text-gray-500 hover:text-amber-500 transition-colors`}
                            aria-label="Favorites"
                        >
                            <HeartIcon className="h-6 w-6" />
                        </Link>
                        <button
                            type="button"
                            onClick={onToggleQuietZone}
                            className={`${desktopUtilityClass} text-gray-500 hover:text-amber-500 transition-colors`}
                            aria-label="Quiet Zone"
                        >
                            <LightBulbIcon className="h-6 w-6" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                            className={desktopLangClass}
                            aria-label="Toggle language"
                        >
                            {language === 'en' ? 'ع' : 'En'}
                        </button>
                        <div className={desktopAuthClass}>
                            {currentUser && !previewViewport ? (
                                <>
                                    <Link
                                        to={dashboardPath}
                                        className="text-gray-700 font-semibold hover:text-amber-500 transition-colors whitespace-nowrap"
                                    >
                                        {dashboardText}
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="text-gray-500 hover:text-red-500 transition-colors whitespace-nowrap"
                                    >
                                        {t.auth.logout}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {showHeaderCta && (
                                        <SmartActionLink
                                            to={headerCtaLink}
                                            fallback="/register"
                                            className="text-gray-600 hover:text-amber-600 font-medium transition-colors whitespace-nowrap"
                                        >
                                            {headerCtaLabel}
                                        </SmartActionLink>
                                    )}
                                    <Link
                                        to="/login"
                                        className="bg-amber-500 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition-colors whitespace-nowrap"
                                    >
                                        {t.auth.login}
                                    </Link>
                                </>
                            )}
                        </div>
                        <div className={mobileTriggerClass}>
                            <button
                                type="button"
                                onClick={onOpenMobileNav}
                                className="text-gray-600 p-1 rounded-md hover:bg-gray-100"
                                aria-label="Open menu"
                                aria-controls="mobile-nav-menu"
                            >
                                <MenuIcon className="h-7 w-7" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
});
Header.displayName = 'Header';

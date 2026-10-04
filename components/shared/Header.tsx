
import { memo } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { Partner } from '../../types';
import { LightBulbIcon, HeartIcon, MenuIcon } from '../ui/Icons';
import { SiteIdentity } from './SiteIdentity';
import { useLanguage } from './LanguageContext';
import NotificationBell from './NotificationBell';

interface HeaderProps {
    onToggleQuietZone: () => void;
    onOpenMobileNav: () => void;
    currentUser: Partner | null;
    dashboardPath: string;
    dashboardText: string;
    logout: () => void;
}

export const Header = memo<HeaderProps>(({ 
    onToggleQuietZone,
    onOpenMobileNav,
    currentUser,
    dashboardPath,
    dashboardText,
    logout
}) => {
    const { language, setLanguage, t } = useLanguage();

    const navLinks = [
        { name: t.nav.home, href: '/' },
        { name: t.nav.properties, href: '/properties' },
        { name: t.nav.projects, href: '/projects' },
        { name: t.nav.finishing, href: '/finishing' },
        { name: t.nav.decorations, href: '/decorations' },
        { name: t.nav.contact, href: '/contact' },
    ];

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

    return (
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm border-b border-gray-200">
            <div className="container mx-auto px-6">
                <div className="flex justify-between items-center h-16 lg:h-20">
                    <Link to="/" target="_self" className="text-amber-500 hover:opacity-80 transition-opacity" title={language === 'ar' ? 'الرئيسية' : 'Home'}>
                        <SiteIdentity />
                    </Link>

                    <nav className="hidden lg:flex items-center gap-8 text-lg">
                        {navLinks.map((link) => (
                            <NavLink
                                key={link.href}
                                to={link.href}
                                end={link.href === '/'}
                                onMouseEnter={() => prefetchRoute(link.href)}
                                onFocus={() => prefetchRoute(link.href)}
                                className={({ isActive }) =>
                                    `${isActive ? activeLinkClass : inactiveLinkClass} transition-colors duration-200`
                                }
                            >
                                {link.name}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2 md:gap-4">
                        {currentUser && (
                            <div className="flex items-center justify-center">
                                <NotificationBell />
                            </div>
                        )}
                        <Link
                            to="/favorites"
                            className="hidden lg:block text-gray-500 hover:text-amber-500 transition-colors"
                            aria-label="Favorites"
                        >
                            <HeartIcon className="h-6 w-6" />
                        </Link>
                        <button
                            onClick={onToggleQuietZone}
                            className="hidden lg:block text-gray-500 hover:text-amber-500 transition-colors"
                            aria-label="Quiet Zone"
                        >
                            <LightBulbIcon className="h-6 w-6" />
                        </button>
                        <button
                            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
                            className="hidden lg:flex items-center justify-center h-10 w-10 rounded-full border border-gray-300 text-gray-600 font-semibold text-lg hover:border-amber-500 hover:text-amber-500 transition-colors"
                            aria-label="Toggle language"
                        >
                            {language === 'en' ? 'ع' : 'En'}
                        </button>
                        <div className="hidden lg:flex items-center gap-2 border-l border-gray-200 pl-4">
                            {currentUser ? (
                                <>
                                    <Link
                                        to={dashboardPath}
                                        className="text-gray-700 font-semibold hover:text-amber-500 transition-colors"
                                    >
                                        {dashboardText}
                                    </Link>
                                    <button
                                        onClick={logout}
                                        className="text-gray-500 hover:text-red-500 transition-colors"
                                    >
                                        {t.auth.logout}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/register"
                                        className="text-gray-600 hover:text-amber-600 font-medium transition-colors"
                                    >
                                        {t.joinAsPartner}
                                    </Link>
                                    <Link
                                        to="/login"
                                        className="bg-amber-500 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition-colors"
                                    >
                                        {t.auth.login}
                                    </Link>
                                </>
                            )}
                        </div>
                        <div className="lg:hidden">
                            <button
                                onClick={onOpenMobileNav}
                                className="text-gray-600"
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

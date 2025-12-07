
import React, { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { 
  LightBulbIcon, HeartIcon, HomeIcon, BuildingIcon, 
  CubeIcon, WrenchScrewdriverIcon, SparklesIcon, PhoneIcon, CloseIcon, CogIcon
} from '../ui/Icons';
import { SiteIdentity } from './SiteIdentity';
import type { Partner } from '../../types';
import { Permission } from '../../types';
import { useLanguage } from './LanguageContext';

interface MobileNavProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onToggleQuietZone: () => void;
  currentUser: Partner | null;
  dashboardPath: string;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
}

const NavItem: React.FC<{ to: string; icon: React.FC<{className?: string}>; label: string; onClick: () => void; isEnd?: boolean }> = ({ to, icon: Icon, label, onClick, isEnd = false }) => {
    const baseClasses = "flex items-center w-full p-3 rounded-lg transition-colors duration-200 text-lg";
    const activeClasses = "bg-amber-100 text-amber-600 font-semibold";
    const inactiveClasses = "text-gray-600 hover:bg-gray-100";
    
    return (
        <li>
            <NavLink
                to={to}
                end={isEnd}
                onClick={onClick}
                className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
            >
                <Icon className="w-6 h-6 flex-shrink-0"/>
                <span className="mx-4">{label}</span>
            </NavLink>
        </li>
    );
};

const MobileNav: React.FC<MobileNavProps> = React.memo(({ isOpen, onClose, ...props }) => {
    const navRef = useRef<HTMLDivElement>(null);
    const { 
      id, onToggleQuietZone, currentUser, dashboardPath, logout, hasPermission 
    } = props;
    const { language, setLanguage, t } = useLanguage();
    const isRTL = language === 'ar';
    
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        const firstFocusableElement = navRef.current?.querySelector('button, a');
        (firstFocusableElement as HTMLElement)?.focus();
        return () => {
          document.removeEventListener('keydown', handleKeyDown);
          document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);
    
    const navLinks = [
        { name: t.nav.home, href: "/", icon: HomeIcon, isEnd: true },
        { name: t.nav.properties, href: "/properties", icon: BuildingIcon },
        { name: t.nav.projects, href: "/projects", icon: CubeIcon },
        { name: t.nav.finishing, href: "/finishing", icon: WrenchScrewdriverIcon },
        { name: t.nav.decorations, href: "/decorations", icon: SparklesIcon },
        { name: t.nav.contact, href: "/contact", icon: PhoneIcon },
    ];
    const dashboardText = hasPermission(Permission.VIEW_ADMIN_DASHBOARD) ? t.adminDashboard.title : t.dashboard.title;

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <aside
                id={id}
                ref={navRef}
                className={`fixed top-0 bottom-0 ${isRTL ? 'right-0' : 'left-0'} w-80 flex flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out z-50 lg:hidden
                    ${isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`
                }
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-nav-title"
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                     <Link to="/" onClick={onClose} id="mobile-nav-title" className="flex items-center gap-2 text-amber-500 hover:opacity-80">
                        <SiteIdentity logoClassName="h-8 w-8" textClassName="text-xl" hideTextOnMobile={false} />
                    </Link>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100" aria-label={language === 'ar' ? 'إغلاق القائمة' : 'Close menu'}>
                        <CloseIcon className="w-6 h-6"/>
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-4">
                    <ul className="space-y-1">
                        {navLinks.map(link => <NavItem key={link.href} to={link.href} icon={link.icon} label={link.name} onClick={onClose} isEnd={link.isEnd} />)}
                    </ul>
                    <hr className="my-4 border-gray-200" />
                    <ul className="space-y-1">
                       <NavItem to="/favorites" icon={HeartIcon} label={t.nav.favorites} onClick={onClose} />
                       <li>
                           <button onClick={() => { onToggleQuietZone(); onClose(); }} className="flex items-center w-full p-3 rounded-lg transition-colors duration-200 text-lg text-gray-600 hover:bg-gray-100">
                               <LightBulbIcon className="w-6 h-6"/>
                               <span className="mx-4">{t.wisdomQuotes.title}</span>
                           </button>
                       </li>
                    </ul>
                    <hr className="my-4 border-gray-200" />
                    {currentUser ? (
                        <div className="space-y-2">
                            {(hasPermission(Permission.VIEW_ADMIN_DASHBOARD) || hasPermission(Permission.VIEW_PARTNER_DASHBOARD)) && (
                                 <Link to={dashboardPath} onClick={onClose} className="w-full flex items-center p-3 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold text-lg transition-colors">
                                    <CogIcon className="w-6 h-6"/>
                                    <span className="mx-4">{dashboardText}</span>
                                </Link>
                            )}
                            <button onClick={() => { logout(); onClose(); }} className="w-full flex items-center p-3 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors text-lg">
                                <span className="mx-4">{t.auth.logout}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <Link to="/login" onClick={onClose} className="w-full flex items-center justify-center p-3 rounded-lg bg-amber-500 text-gray-900 font-bold text-lg hover:bg-amber-600 transition-colors">
                                {t.auth.login}
                            </Link>
                             <Link to="/register" onClick={onClose} className="w-full flex items-center justify-center p-3 rounded-lg bg-gray-200 text-gray-800 font-bold text-lg hover:bg-gray-300 transition-colors">
                                {t.joinAsPartner}
                            </Link>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                     <div className="flex justify-around items-center pt-2">
                        <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="font-semibold text-lg text-gray-600 hover:text-amber-500">
                            {language === 'en' ? 'العربية' : 'English'}
                        </button>
                     </div>
                </div>
            </aside>
        </>
    );
});

export default MobileNav;

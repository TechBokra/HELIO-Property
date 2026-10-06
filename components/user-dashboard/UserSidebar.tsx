import { NavLink, Link } from 'react-router-dom';
import { useLanguage } from '../shared/LanguageContext';
import { 
    HomeIcon, UserPlusIcon, InboxIcon, HeartIcon, LogoutIcon, CloseIcon, GlobeAltIcon
} from '../ui/Icons';
import { SiteIdentity } from '../shared/SiteIdentity';
import { Role, type Partner } from '../../types';

interface UserSidebarProps {
  user: Partner;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const UserSidebar = ({ user, onLogout, isOpen, setIsOpen }: UserSidebarProps) => {
    const { language, t } = useLanguage();
    const isRTL = language === 'ar';
    const isAdmin = user.role === Role.SUPER_ADMIN || 
                    (user.role && user.role.includes('manager')) || 
                    (user.role && user.role.includes('admin'));
    
    const navLinks = [
        { name: t.nav.home, href: '/my-dashboard', icon: HomeIcon, exact: true },
        { name: t.nav.profile || (isRTL ? 'الملف الشخصي' : 'Profile'), href: '/my-dashboard/profile', icon: UserPlusIcon },
        { name: t.nav.myRequests || t.adminDashboard?.nav?.myRequests || (isRTL ? 'طلباتي' : 'My Requests'), href: '/my-dashboard/requests', icon: InboxIcon },
        { name: t.nav.favorites, href: '/my-dashboard/favorites', icon: HeartIcon },
    ];

    return (
        <>
            {/* Mobile sidebar */}
            <div className={`relative z-50 lg:hidden ${isOpen ? 'block' : 'hidden'}`} role="dialog" aria-modal="true">
                <div className="fixed inset-0 bg-gray-900/80 transition-opacity" onClick={() => setIsOpen(false)} />
                <div className={`fixed inset-0 flex z-50`}>
                     <div className={`relative flex h-full w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4 transition-transform duration-300 ease-in-out 
                        ${isRTL ? 'ml-auto' : 'mr-auto'} 
                        ${isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`
                    }>
                        <div className={`absolute top-0 flex w-16 justify-center pt-5 ${isRTL ? 'right-full' : 'left-full'}`}>
                            <button type="button" className="-m-2.5 p-2.5" onClick={() => setIsOpen(false)}>
                                <span className="sr-only">Close sidebar</span>
                                <CloseIcon className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        
                        <div className="flex flex-shrink-0 items-center px-4">
                            <Link 
                                to="/" 
                                target="_self" 
                                onClick={() => setIsOpen(false)}
                                className="hover:opacity-85 transition-opacity block group"
                                title={language === 'ar' ? 'الذهاب إلى الموقع الرئيسي' : 'Go to Main Website'}
                            >
                                <SiteIdentity className="text-amber-500" logoClassName="h-8 w-auto" />
                            </Link>
                        </div>
                        <div className="mt-5 h-0 flex-1 overflow-y-auto">
                            {isAdmin && (
                                <div className="px-2 mb-3">
                                    <Link
                                        to="/admin"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-sm shadow-sm transition-all"
                                    >
                                        <span>👑</span>
                                        <span>{language === 'ar' ? 'لوحة تحكم الإدارة الكاملة' : 'Admin Dashboard'}</span>
                                    </Link>
                                </div>
                            )}
                            <nav className="px-2 space-y-1">
                                {navLinks.map((link) => (
                                    <NavLink
                                        key={link.href}
                                        to={link.href}
                                        end={link.exact}
                                        onClick={() => setIsOpen(false)}
                                        className={({ isActive }) => `group flex items-center px-2 py-2 text-base font-medium rounded-md ${isActive ? 'bg-amber-50 text-amber-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                    >
                                        <link.icon className={`mr-4 h-6 w-6 flex-shrink-0 ${language === 'ar' ? 'ml-4 mr-0' : 'mr-4'}`} aria-hidden="true" />
                                        {link.name}
                                    </NavLink>
                                ))}
                            </nav>
                        </div>
                         <div className="border-t border-gray-200 p-4">
                            <button onClick={() => { onLogout(); setIsOpen(false); }} className="flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-red-600">
                                <LogoutIcon className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-red-600" aria-hidden="true" />
                                {t.auth.logout}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col">
                <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white shadow-sm">
                    <div className="flex h-16 flex-shrink-0 items-center px-6 border-b border-gray-100">
                        <Link 
                            to="/" 
                            target="_self"
                            className="hover:opacity-85 transition-opacity block group"
                            title={language === 'ar' ? 'الذهاب إلى الموقع الرئيسي' : 'Go to Main Website'}
                        >
                            <SiteIdentity className="text-amber-500" logoClassName="h-8 w-auto" />
                        </Link>
                    </div>
                    <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
                         <div className="flex flex-col items-center px-4 mb-6">
                             <img src={user.imageUrl || 'https://via.placeholder.com/150'} alt={user.name} className="h-16 w-16 rounded-full object-cover border-2 border-amber-100 mb-2" />
                             <h3 className="text-sm font-bold text-gray-900">{user.name}</h3>
                             <p className="text-xs text-gray-500">{user.email}</p>
                         </div>
                        {isAdmin && (
                            <div className="px-3 mb-3">
                                <Link
                                    to="/admin"
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs shadow-sm transition-all group"
                                >
                                    <span className="flex items-center gap-2">
                                        <span>👑</span>
                                        <span>{language === 'ar' ? 'لوحة تحكم الإدارة الكاملة' : 'Admin Dashboard'}</span>
                                    </span>
                                    <span className="text-xs group-hover:translate-x-1 transition-transform">←</span>
                                </Link>
                            </div>
                        )}
                        <nav className="mt-2 flex-1 space-y-1 px-3">
                            {navLinks.map((link) => (
                                <NavLink
                                    key={link.href}
                                    to={link.href}
                                    end={link.exact}
                                    className={({ isActive }) => `group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${isActive ? 'bg-amber-50 text-amber-600' : 'text-gray-700 hover:text-amber-600 hover:bg-gray-50'}`}
                                >
                                    <link.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                    {link.name}
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                    <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
                         <Link to="/" className="group block w-full flex-shrink-0">
                            <div className="flex items-center">
                                <GlobeAltIcon className="inline-block h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                                <div className={`${language === 'ar' ? 'mr-3' : 'ml-3'}`}>
                                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{t.nav.home}</p>
                                </div>
                            </div>
                        </Link>
                         <button onClick={onLogout} className="ml-auto text-gray-400 hover:text-red-500 transition-colors">
                            <LogoutIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
};

export default UserSidebar;

import React, { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { partnerNavLinks } from '../../data/navigation';
import { useLanguage } from '../shared/LanguageContext';

const PartnerDashboardLayout: React.FC = () => {
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;
    const { currentUser, logout, hasPermission } = useAuth();
    
    const baseLinkClasses = "flex items-center px-4 py-3 text-md font-medium rounded-lg transition-colors";
    const activeLinkClasses = "bg-amber-500 text-gray-900";
    const inactiveLinkClasses = "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";

    const visibleNavLinks = useMemo(() => {
        if (!currentUser) return [];
        return partnerNavLinks.filter(link => 
            hasPermission(link.permission) && 
            (!link.roles || link.roles.includes(currentUser.role))
        );
    }, [currentUser, hasPermission]);

    return (
        <div className="flex min-h-[80vh] bg-gray-50 dark:bg-gray-800">
            <aside className="w-72 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                <div className="text-center mb-8">
                    <img src={currentUser?.imageUrl} alt={currentUser?.name} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-amber-500 object-cover" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t_dash.welcome}</h2>
                    <p className="text-amber-500">{currentUser?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t_dash.title}</p>
                </div>
                <nav className="flex-grow overflow-y-auto">
                    <ul className="space-y-2">
                        {visibleNavLinks.map(link => {
                            const Icon = link.icon;
                            return (
                                <li key={link.href}>
                                    <NavLink to={link.href} end={link.exact} className={({isActive}) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}>
                                        <span className={language === 'ar' ? 'ml-3' : 'mr-3'}><Icon className="w-5 h-5" /></span>
                                        {link.name(t_dash)}
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                <div className="mt-4">
                     <button onClick={logout} className="w-full text-left text-red-500 hover:bg-red-500/10 px-4 py-3 rounded-lg transition-colors">
                        {t.auth.logout}
                    </button>
                </div>
            </aside>

            <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default PartnerDashboardLayout;

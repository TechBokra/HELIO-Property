import React, { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from './LanguageContext';
import GlobalSearch from '@/components/admin/GlobalSearch';
import DashboardSidebar from './DashboardSidebar';
import NotificationBell from './NotificationBell';
import { MenuIcon, GlobeAltIcon } from '@/components/ui/Icons';
import { SiteLogo } from './SiteLogo';
import { Permission } from '@/types';
import type { NavLinkItem } from '@/data/navigation';

interface DashboardLayoutProps {
  navLinks: NavLinkItem[];
  pageTitle: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ navLinks, pageTitle }) => {
    const { language, t } = useLanguage();
    const { currentUser: user, logout: onLogout, hasPermission } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

    if (!user) return null;
    
    const isAdminDashboard = hasPermission(Permission.MANAGE_USERS);
    const isRTL = language === 'ar';

    return (
        <div className="min-h-screen bg-gray-50">
            <DashboardSidebar 
                user={user}
                navLinks={navLinks}
                onLogout={onLogout}
                hasPermission={hasPermission}
                isOpen={sidebarOpen} 
                setIsOpen={setSidebarOpen} 
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
            />
            
            <div className={`transition-all duration-300 ${isRTL ? (isCollapsed ? 'lg:mr-20' : 'lg:mr-72') : (isCollapsed ? 'lg:pl-20' : 'lg:pl-72')}`}>
                 {/* Header */}
                <div className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                    <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
                        <span className="sr-only">Open sidebar</span>
                        <MenuIcon className="h-6 w-6" />
                    </button>

                    {/* Separator for mobile */}
                    <div className="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true" />
                    
                    <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                        <div className="flex flex-1 items-center">
                            {isAdminDashboard && <GlobalSearch />}
                        </div>
                        
                        <div className="flex items-center gap-x-4 lg:gap-x-6">
                            {/* Return to Site Button */}
                            <Link 
                                to="/" 
                                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-amber-600 transition-colors"
                                title={language === 'ar' ? 'عرض الموقع' : 'View Site'}
                            >
                                <GlobeAltIcon className="h-6 w-6" />
                                <span className="hidden md:inline">{language === 'ar' ? 'الموقع' : 'View Site'}</span>
                            </Link>

                            {/* Separator */}
                            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true" />

                            {/* Notification Bell */}
                            <NotificationBell />
                            
                            {/* Separator */}
                            <div className="h-6 w-px bg-gray-900/10" aria-hidden="true" />

                            {/* User Profile Dropdown / Indicator */}
                            <div className="flex items-center">
                                <span className="sr-only">Open user menu</span>
                                <img
                                    className="h-8 w-8 rounded-full bg-gray-50 object-cover border border-gray-200"
                                    src={user.imageUrl}
                                    alt=""
                                />
                                <span className="hidden lg:flex lg:items-center">
                                    <span className={`text-sm font-semibold leading-6 text-gray-900 ${language === 'ar' ? 'mr-4' : 'ml-4'}`} aria-hidden="true">
                                        {language === 'ar' && 'nameAr' in user ? (user as any).nameAr : user.name}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="py-10">
                    <div className="px-4 sm:px-6 lg:px-8">
                       <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
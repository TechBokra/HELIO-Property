import React, { useState, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from './LanguageContext';
import GlobalSearch from '@/components/admin/GlobalSearch';
import DashboardSidebar from './DashboardSidebar';
import NotificationBell from './NotificationBell';
import { MenuIcon, GlobeAltIcon, ChevronRightIcon, ChevronLeftIcon } from '@/components/ui/Icons';
import { Permission, Role } from '@/types';
import { type NavLinkItem, getAdminBreadcrumbs } from '@/data/navigation';

interface DashboardLayoutProps {
  navLinks: NavLinkItem[];
  pageTitle: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ navLinks }) => {
    const { language, t } = useLanguage();
    const { currentUser: user, logout: onLogout, hasPermission } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('sidebarCollapsed') === 'true';
        } catch {
            return false;
        }
    });

    if (!user) return null;
    
    const isAdminDashboard = hasPermission(Permission.MANAGE_USERS) || location.pathname.startsWith('/admin');
    const isRTL = language === 'ar';

    // Canonical Breadcrumbs derived from Route Hierarchy
    const breadcrumbs = useMemo(() => {
        if (location.pathname.startsWith('/admin')) {
            return getAdminBreadcrumbs(location.pathname, language, t);
        }
        return [];
    }, [location.pathname, language, t]);

    const partnerName = (language === 'ar' && 'nameAr' in user ? (user as any).nameAr : user.name) || user.email;

    const roleLabel = useMemo(() => {
        if (user.role === Role.SUPER_ADMIN) {
            return isRTL ? 'المدير العام' : 'Super Admin';
        }
        return user.role?.replace(/_/g, ' ') || 'Admin';
    }, [user.role, isRTL]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Sidebar (Desktop Collapsible & Mobile Drawer) */}
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
            
            {/* Main Content Area */}
            <div className={`flex-1 transition-all duration-300 ${
                isRTL 
                    ? (isCollapsed ? 'lg:mr-[4.75rem]' : 'lg:mr-[17.5rem]') 
                    : (isCollapsed ? 'lg:ml-[4.75rem]' : 'lg:ml-[17.5rem]')
            }`}>
                {/* Standardized Admin Header */}
                <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white/90 backdrop-blur-md px-4 shadow-2xs sm:px-6 lg:px-8">
                    {/* Left: Mobile Toggle & Breadcrumbs */}
                    <div className="flex items-center gap-x-3 sm:gap-x-4 min-w-0">
                        {/* Mobile Drawer Trigger */}
                        <button 
                            type="button" 
                            className="-m-2 p-2 text-gray-700 hover:text-amber-600 rounded-md lg:hidden" 
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open sidebar"
                        >
                            <MenuIcon className="h-6 w-6" />
                        </button>

                        {/* Breadcrumbs Navigation */}
                        {breadcrumbs.length > 0 && (
                            <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 rtl:space-x-reverse text-xs overflow-x-auto py-1 scrollbar-none">
                                {breadcrumbs.map((crumb, idx) => {
                                    const isLast = idx === breadcrumbs.length - 1;

                                    return (
                                        <React.Fragment key={idx}>
                                            {idx > 0 && (
                                                <span className="text-gray-300 shrink-0">
                                                    {isRTL ? (
                                                        <ChevronLeftIcon className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <ChevronRightIcon className="w-3.5 h-3.5" />
                                                    )}
                                                </span>
                                            )}
                                            {crumb.href && !crumb.isCurrent ? (
                                                <Link 
                                                    to={crumb.href} 
                                                    className="font-medium text-gray-500 hover:text-amber-600 transition-colors whitespace-nowrap"
                                                >
                                                    {crumb.label}
                                                </Link>
                                            ) : (
                                                <span 
                                                    className={`whitespace-nowrap font-semibold ${
                                                        isLast ? 'text-gray-900 bg-gray-100/80 px-2 py-0.5 rounded' : 'text-gray-500'
                                                    }`}
                                                    aria-current={isLast ? 'page' : undefined}
                                                >
                                                    {crumb.label}
                                                </span>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </nav>
                        )}
                    </div>
                    
                    {/* Right: Actions, Search, Notifications, Identity */}
                    <div className="flex items-center gap-x-3 sm:gap-x-5 shrink-0">
                        {/* Global Search (Admin only) */}
                        {isAdminDashboard && (
                            <div className="hidden md:block">
                                <GlobalSearch />
                            </div>
                        )}

                        {/* View Public Website */}
                        <Link 
                            to="/" 
                            target="_self"
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-amber-600 hover:bg-amber-50 px-2 py-1 rounded transition-colors" 
                            title={isRTL ? 'الذهاب إلى الموقع الرئيسي' : 'View Public Site'}
                        >
                            <GlobeAltIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">{isRTL ? 'الموقع' : 'Site'}</span>
                        </Link>

                        {/* Notifications */}
                        <NotificationBell />

                        <div className="h-5 w-px bg-gray-200" aria-hidden="true" />

                        {/* User Identity & Role Badge */}
                        <div className="flex items-center gap-x-2.5">
                            <img
                                className="h-8 w-8 rounded-full bg-gray-100 object-cover border border-gray-200"
                                src={user.imageUrl || '/favicon.ico'}
                                alt={partnerName}
                            />
                            <div className="hidden md:flex flex-col text-start">
                                <span className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[120px]">
                                    {partnerName}
                                </span>
                                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                                    {roleLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content Body */}
                <main className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
import React, { useMemo, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { 
    ChevronDoubleLeftIcon, ChevronDoubleRightIcon, LogoutIcon, CloseIcon, GlobeAltIcon
} from '@/components/ui/Icons';
import { SiteIdentity } from './SiteIdentity';
import { type Partner, Permission, Role } from '@/types';
import ErrorBoundary from './ErrorBoundary';
import { 
    type NavLinkItem, 
    ADMIN_GROUPS, 
    getActiveAdminNav, 
    getAdminGroupLabel, 
    type AdminNavGroup 
} from '@/data/navigation';

interface DashboardSidebarProps {
  user: Partner;
  navLinks: NavLinkItem[];
  onLogout: () => void;
  hasPermission: (permission: Permission) => boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const SidebarContent: React.FC<Omit<DashboardSidebarProps, 'isOpen' | 'setIsOpen' | 'setIsCollapsed'> & { onLinkClick: () => void, isCollapsed: boolean }> = ({
    user,
    navLinks,
    onLogout,
    hasPermission,
    isCollapsed,
    onLinkClick
}) => {
    const { language, t } = useLanguage();
    const isRTL = language === 'ar';
    const location = useLocation();

    // 1. Dynamic permission filtering using canonical Phase 2 permissions
    const visibleNavLinks = useMemo(() => {
        if (!user) return [];
        return navLinks.filter(link => {
            // Special check for partner team management
            if (link.permission === Permission.MANAGE_TEAM && user.role === Role.SUPER_ADMIN) return false;
            
            // Core: strictly filter via hasPermission
            return hasPermission(link.permission) && 
                (!link.roles || link.roles.includes(user.role));
        });
    }, [navLinks, hasPermission, user]);

    // 2. Active location resolution with specificity & longest-prefix matching
    const activeNav = useMemo(() => {
        if (location.pathname.startsWith('/admin')) {
            return getActiveAdminNav(location.pathname);
        }
        return undefined;
    }, [location.pathname]);
    
    // 3. Group links according to Phase 3A canonical domains
    const linkGroups = useMemo(() => {
        const groups: Record<string, NavLinkItem[]> = {};
        
        visibleNavLinks.forEach(link => {
            const groupKey = link.group;
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(link);
        });

        // Determine if this is the admin nav with ADMIN_GROUPS
        const knownAdminKeys = Object.keys(ADMIN_GROUPS);
        const hasAdminGroups = Object.keys(groups).some(k => knownAdminKeys.includes(k));

        if (hasAdminGroups) {
            // Sort according to ADMIN_GROUPS canonical order (1 to 11)
            return Object.keys(groups)
                .sort((a, b) => {
                    const orderA = ADMIN_GROUPS[a as AdminNavGroup]?.order ?? 99;
                    const orderB = ADMIN_GROUPS[b as AdminNavGroup]?.order ?? 99;
                    return orderA - orderB;
                })
                .map(groupKey => ({
                    key: groupKey,
                    label: getAdminGroupLabel(groupKey as AdminNavGroup, language),
                    links: groups[groupKey]
                }));
        }

        // Partner / Fallback nav ordering
        const partnerOrder = ['Partner'];
        return Object.keys(groups)
            .sort((a, b) => {
                const idxA = partnerOrder.indexOf(a);
                const idxB = partnerOrder.indexOf(b);
                return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
            })
            .map(groupKey => ({
                key: groupKey,
                label: groupKey === 'Partner' ? (isRTL ? 'لوحة الشريك' : 'Partner Dashboard') : groupKey,
                links: groups[groupKey]
            }));
            
    }, [visibleNavLinks, language, isRTL]);

    // @ts-ignore
    const partnerName = t.partnerInfo?.[user.id]?.name || user.name;

    return (
        <div 
            className="flex grow flex-col gap-y-4 overflow-y-auto overflow-x-hidden bg-white px-3 py-4 dashboard-sidebar scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent h-full"
            role="navigation"
            aria-label={isRTL ? 'القائمة الجانبية للنظام' : 'Admin Sidebar Navigation'}
        >
            {/* Header Brand */}
            <div className={`flex h-14 shrink-0 items-center ${isCollapsed ? 'justify-center' : 'px-2'} transition-all duration-300 border-b border-gray-100 pb-3`}>
                <Link 
                    to="/" 
                    target="_self"
                    className="hover:opacity-85 transition-opacity block group" 
                    title={isRTL ? 'الذهاب إلى الموقع الرئيسي' : 'Go to Main Website'}
                >
                    <SiteIdentity 
                        className={`text-amber-500 transition-all duration-300 ${isCollapsed ? 'scale-90' : ''}`}
                        logoClassName="h-7 w-auto" 
                        textClassName={`font-bold text-base text-gray-800 whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-2.5'}`}
                        showText={true}
                        hideTextOnMobile={false}
                    />
                </Link>
            </div>
            
            <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-5">
                    {/* User Profile Summary */}
                    <li>
                        <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center py-1' : 'px-2 py-2 bg-gray-50 rounded-lg'}`}>
                            <div className="relative shrink-0">
                                <img 
                                    src={user.imageUrl || '/favicon.ico'} 
                                    alt={partnerName} 
                                    className="w-9 h-9 rounded-full object-cover border border-amber-500/30" 
                                />
                                <span className="absolute bottom-0 end-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                            </div>
                            
                            <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ms-3'}`}>
                                <h2 className="text-xs font-bold text-gray-900 truncate" title={partnerName}>
                                    {partnerName}
                                </h2>
                                <span className="inline-block text-[11px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    {user.role === Role.SUPER_ADMIN ? 'Super Admin' : (user.role?.replace(/_/g, ' ') || 'Admin')}
                                </span>
                            </div>
                        </div>
                    </li>
                    
                    {/* Navigation Groups */}
                    {linkGroups.map((group) => {
                        const isGroupActive = activeNav?.group === group.key;

                        return (
                            <li key={group.key} className="space-y-1">
                                {/* Group Title in Expanded Mode */}
                                {!isCollapsed ? (
                                    <div className="flex items-center justify-between px-2 pt-2 pb-1">
                                        <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                                            isGroupActive ? 'text-amber-600' : 'text-gray-400'
                                        }`}>
                                            {group.label}
                                        </span>
                                        {isGroupActive && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        )}
                                    </div>
                                ) : (
                                    /* Separator in Collapsed Mode */
                                    <div className="h-px bg-gray-100 mx-2 my-2" title={group.label}></div>
                                )}
                                
                                <ul role="list" className="space-y-0.5">
                                    {group.links.map(link => {
                                        const Icon = link.icon;
                                        const linkName = link.name(t);
                                        
                                        // Active detection: matches activeNav determined by longest-prefix algorithm
                                        const isItemActive = activeNav ? activeNav.href === link.href : location.pathname === link.href;

                                        return (
                                            <li key={link.href} className="relative group">
                                                <NavLink 
                                                    to={link.href} 
                                                    end={link.exact} 
                                                    onClick={onLinkClick}
                                                    aria-current={isItemActive ? 'page' : undefined}
                                                    className={`group flex items-center gap-x-2.5 px-2.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                                                        isCollapsed ? 'justify-center' : ''
                                                    } ${
                                                        isItemActive 
                                                            ? 'bg-amber-50 text-amber-700 font-bold shadow-xs border-s-2 border-amber-500' 
                                                            : 'text-gray-600 hover:text-amber-600 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <Icon 
                                                        className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${
                                                            isItemActive ? 'text-amber-600' : 'text-gray-400 group-hover:text-amber-600'
                                                        }`} 
                                                        aria-hidden="true" 
                                                    />
                                                    
                                                    <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                                                        isCollapsed ? 'w-0 opacity-0 -translate-x-3' : 'w-auto max-w-[150px] opacity-100 translate-x-0 truncate'
                                                    }`}>
                                                        {linkName}
                                                    </span>
                                                </NavLink>
                                                
                                                {/* Tooltip for Collapsed Mode */}
                                                {isCollapsed && (
                                                    <div 
                                                        role="tooltip"
                                                        className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50`}
                                                    >
                                                        <div className="font-bold text-[10px] text-amber-400 uppercase tracking-wider">{group.label}</div>
                                                        <div className="font-semibold text-xs text-white">{linkName}</div>
                                                        <div className={`absolute top-1/2 -translate-y-1/2 border-4 border-transparent ${
                                                            isRTL ? 'border-l-gray-900 left-full' : 'border-r-gray-900 right-full'
                                                        }`}></div>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        );
                    })}

                    {/* Bottom Utility Actions */}
                    <li className="mt-auto pt-3 border-t border-gray-100 space-y-1">
                        {/* Return to Public Website */}
                        <Link 
                            to="/" 
                            className={`group flex items-center gap-x-2.5 px-2.5 py-2 text-xs font-semibold rounded-lg text-gray-600 hover:text-amber-600 hover:bg-gray-50 transition-colors ${
                                isCollapsed ? 'justify-center' : ''
                            }`}
                            title={isRTL ? 'العودة للموقع الرئيسي' : 'Return to Public Website'}
                        >
                            <GlobeAltIcon className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-amber-600" />
                            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                                isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
                            }`}>
                                {isRTL ? 'الموقع الرئيسي' : 'Public Site'}
                            </span>
                        </Link>

                        {/* Sign Out */}
                        <button 
                            onClick={onLogout} 
                            title={t.auth?.logout || 'تسجيل الخروج'} 
                            className={`w-full group flex items-center gap-x-2.5 px-2.5 py-2 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 transition-colors ${
                                isCollapsed ? 'justify-center' : ''
                            }`}
                        >
                            <LogoutIcon className="h-5 w-5 shrink-0 text-red-500 group-hover:text-red-700" />
                            <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
                                isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
                            }`}>
                                {t.auth?.logout || 'تسجيل الخروج'}
                            </span>
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

const DashboardSidebar: React.FC<DashboardSidebarProps> = (props) => {
    const { isOpen, setIsOpen, isCollapsed, setIsCollapsed } = props;
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    useEffect(() => {
        try {
            localStorage.setItem('sidebarCollapsed', String(isCollapsed));
        } catch {
            // ignore localStorage errors in strict privacy modes
        }
    }, [isCollapsed]);

    return (
        <ErrorBoundary fallback={<div className="w-20 bg-gray-100 h-full flex items-center justify-center text-red-500 font-bold">!</div>}>
            {/* Mobile Drawer (Accessible modal dialog) */}
            <div 
                className={`relative z-50 lg:hidden ${isOpen ? 'block' : 'hidden'}`} 
                role="dialog" 
                aria-modal="true"
                aria-label="Mobile Navigation Drawer"
            >
                <div 
                    className="fixed inset-0 bg-gray-900/70 transition-opacity backdrop-blur-xs" 
                    onClick={() => setIsOpen(false)} 
                />
                <div className="fixed inset-0 flex">
                    <div 
                        className={`relative flex h-full w-full max-w-xs flex-1 transition-transform duration-300 ease-in-out shadow-2xl ${
                            isRTL ? 'ml-auto' : 'mr-auto'
                        } ${
                            isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')
                        }`}
                    >
                        <div className={`absolute top-0 flex w-14 justify-center pt-4 ${isRTL ? 'right-full' : 'left-full'}`}>
                            <button 
                                type="button" 
                                className="p-2 text-white hover:text-amber-400 rounded-md transition-colors" 
                                onClick={() => setIsOpen(false)}
                                aria-label="Close sidebar"
                            >
                                <CloseIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <SidebarContent {...props} isCollapsed={false} onLinkClick={() => setIsOpen(false)} />
                    </div>
                </div>
            </div>

            {/* Desktop Fixed Sidebar */}
            <div 
                className={`hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col transition-all duration-300 ease-in-out border-e border-gray-200 bg-white shadow-xs overflow-hidden`}
                style={{ width: isCollapsed ? '4.75rem' : '17.5rem' }}
            >
                <div className="flex min-h-0 flex-1 flex-col h-full">
                    <SidebarContent {...props} onLinkClick={() => {}} />
                    
                    {/* Desktop Collapse/Expand Control */}
                    <div className="flex flex-shrink-0 border-t border-gray-100 p-2.5 bg-gray-50/80">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full flex items-center justify-center py-2 px-3 text-xs font-semibold text-gray-500 hover:text-amber-600 hover:bg-white rounded-md transition-all shadow-xs border border-gray-200"
                            title={isCollapsed ? (isRTL ? 'توسيع القائمة' : 'Expand Sidebar') : (isRTL ? 'طي القائمة' : 'Collapse Sidebar')}
                            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                        >
                            {isRTL ? (
                                isCollapsed ? (
                                    <ChevronDoubleLeftIcon className="h-4 w-4" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <ChevronDoubleRightIcon className="h-4 w-4" />
                                        <span>طي القائمة</span>
                                    </div>
                                )
                            ) : (
                                isCollapsed ? (
                                    <ChevronDoubleRightIcon className="h-4 w-4" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <ChevronDoubleLeftIcon className="h-4 w-4" />
                                        <span>Collapse Sidebar</span>
                                    </div>
                                )
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default DashboardSidebar;

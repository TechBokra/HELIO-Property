
import React, { useMemo, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { 
    ChevronDoubleLeftIcon, ChevronDoubleRightIcon, LogoutIcon, CloseIcon, GlobeAltIcon
} from '@/components/ui/Icons';
import { SiteIdentity } from './SiteIdentity';
import { type Partner, Permission, Role } from '@/types';
import ErrorBoundary from './ErrorBoundary';

interface NavLinkItem {
  name: (t: any) => string;
  href: string;
  icon: React.FC<{ className?: string }>;
  exact?: boolean;
  group: string;
  permission: Permission;
  roles?: Role[];
}

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

const SidebarContent: React.FC<Omit<DashboardSidebarProps, 'isOpen' | 'setIsOpen' | 'setIsCollapsed'> & {onLinkClick: () => void, isCollapsed: boolean}> = ({
    user,
    navLinks,
    onLogout,
    hasPermission,
    isCollapsed,
    onLinkClick
}) => {
    const { language, t } = useLanguage();
    const isRTL = language === 'ar';

    const visibleNavLinks = useMemo(() => {
        if (!user) return [];
        return navLinks.filter(link => {
            // Special check for team management: must have permission AND not be a super admin
            if (link.permission === Permission.MANAGE_TEAM && user.role === Role.SUPER_ADMIN) return false;
            
            return hasPermission(link.permission) && 
            (!link.roles || link.roles.includes(user.role));
        });
    }, [navLinks, hasPermission, user]);
    
    const linkGroups = useMemo(() => {
        // Defines the display order of groups in the sidebar
        const groupOrder = [
            'Management', // Added Management here to show Dashboard, Analytics, etc.
            'Overview', 
            'Operations',
            'Request Triage', 
            'Real Estate Market',
            'Platform Operations', 
            'Customer Relations',
            'Partner Relations', 
            'Content Management', 
            'Content & Listings', 
            'Content',
            'System', 
            'Partner'
        ];
        const groups: { [key: string]: typeof visibleNavLinks } = {};
        
        visibleNavLinks.forEach(link => {
            if (!groups[link.group]) groups[link.group] = [];
            groups[link.group].push(link);
        });

        // Map groups based on order, and include any groups found in links but not in the order list at the end
        const orderedGroups = groupOrder
            .map(groupName => ({ name: groupName, links: groups[groupName] }))
            .filter(group => group.links && group.links.length > 0);
            
        // Find any remaining groups not in the explicit order list
        Object.keys(groups).forEach(key => {
            if (!groupOrder.includes(key)) {
                orderedGroups.push({ name: key, links: groups[key] });
            }
        });

        return orderedGroups;
            
    }, [visibleNavLinks]);

    // @ts-ignore
    const partnerName = t.partnerInfo?.[user.id]?.name || user.name;

    return (
        <div className="flex grow flex-col gap-y-5 overflow-y-auto overflow-x-hidden bg-white px-4 py-4 dashboard-sidebar scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent h-full">
             <div className={`flex h-16 shrink-0 items-center ${isCollapsed ? 'justify-center' : ''} transition-all duration-300`}>
                <SiteIdentity 
                    className={`text-amber-500 transition-all duration-300 ${isCollapsed ? 'scale-90' : ''}`}
                    logoClassName="h-8 w-auto" 
                    textClassName={`font-bold text-lg text-gray-800 whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}`}
                    showText={true}
                    hideTextOnMobile={false}
                />
            </div>
            
            <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                         <div className={`text-center transition-all duration-300 ease-in-out ${isCollapsed ? 'px-0' : 'px-1 space-y-2'}`}>
                             <div className={`mx-auto border-2 border-amber-500 rounded-full overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-10 h-10 border-0' : 'w-16 h-16'}`}>
                                <img src={user.imageUrl} alt={partnerName} className="w-full h-full object-cover" />
                             </div>
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
                                 <h2 className="text-sm font-bold text-gray-900 truncate px-1" title={partnerName}>{partnerName}</h2>
                                 <p className="text-xs text-amber-500 capitalize truncate px-1">{user.role === Role.SUPER_ADMIN ? 'Super Admin' : t.adminDashboard.partnerTypes[user.type as keyof typeof t.adminDashboard.partnerTypes]}</p>
                            </div>
                        </div>
                    </li>
                    
                    {linkGroups.map((group, index) => (
                         <li key={group.name}>
                            <div className={`text-xs font-bold leading-6 text-gray-400 px-2 uppercase tracking-wider mb-1 transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'h-0 opacity-0' : 'h-6 opacity-100'}`}>
                                {group.name.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                             {/* Separator line when collapsed to distinguish groups visually without text */}
                            {isCollapsed && <div className="h-px bg-gray-100 mx-2 my-2"></div>}
                            
                            <ul role="list" className="-mx-2 space-y-1">
                                {group.links.map(link => {
                                    const Icon = link.icon;
                                    
                                    let linkName = link.name(t);
                                    if (link.href === '/admin/requests' && user.role !== Role.SUPER_ADMIN) {
                                        linkName = t.adminDashboard.nav.myRequests;
                                    }

                                    return (
                                        <li key={link.href} className="relative group">
                                            <NavLink 
                                                to={link.href} 
                                                end={link.exact} 
                                                onClick={onLinkClick}
                                                className={({isActive}) => `group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200 ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-amber-50 text-amber-600' : 'text-gray-700 hover:text-amber-600 hover:bg-gray-50'}`}
                                            >
                                                <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0 -translate-x-4' : 'w-auto max-w-[140px] opacity-100 translate-x-0'}`}>
                                                    {linkName}
                                                </span>
                                            </NavLink>
                                            
                                            {/* Tooltip for collapsed state */}
                                            {isCollapsed && (
                                                <div className={`absolute ${isRTL ? 'right-full mr-2' : 'left-full ml-2'} top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-800 text-white text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg`}>
                                                    {linkName}
                                                    {/* Triangle pointer */}
                                                    <div className={`absolute top-1/2 -translate-y-1/2 border-4 border-transparent ${isRTL ? 'border-l-gray-800 left-full' : 'border-r-gray-800 right-full'}`}></div>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>
                    ))}

                    <li className="mt-auto">
                        <div className={`border-t border-gray-200 pt-4 mt-4 space-y-1 transition-all duration-300 ${isCollapsed ? 'px-0' : ''}`}>
                             {/* Return to Website */}
                            <Link 
                                to="/" 
                                className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:bg-gray-50 hover:text-amber-600 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                                title={language === 'ar' ? 'العودة للموقع' : 'Return to Website'}
                            >
                                <GlobeAltIcon className="h-6 w-6 shrink-0 group-hover:text-amber-600" />
                                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                                    {language === 'ar' ? 'العودة للموقع' : 'Return to Website'}
                                </span>
                            </Link>

                            {/* Logout */}
                            <button 
                                onClick={onLogout} 
                                title={t.auth.logout} 
                                className={`w-full group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-red-600 hover:bg-red-50 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
                            >
                                <LogoutIcon className="h-6 w-6 shrink-0 group-hover:text-red-700" />
                                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>{t.auth.logout}</span>
                            </button>
                        </div>
                    </li>
                </ul>
            </nav>
        </div>
    )
};


const DashboardSidebar: React.FC<DashboardSidebarProps> = (props) => {
    const { isOpen, setIsOpen, isCollapsed, setIsCollapsed } = props;
    const { language } = useLanguage();
    const isRTL = language === 'ar';

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    }, [isCollapsed]);

    return (
        <ErrorBoundary fallback={<div className="w-20 bg-gray-100 h-full flex items-center justify-center text-red-500">!</div>}>
            {/* Mobile sidebar */}
            <div className={`relative z-50 lg:hidden ${isOpen ? 'block' : 'hidden'}`} role="dialog" aria-modal="true">
                <div className="fixed inset-0 bg-gray-900/80 transition-opacity backdrop-blur-sm" onClick={() => setIsOpen(false)} />
                <div className="fixed inset-0 flex">
                    <div className={`relative flex h-full w-full max-w-xs flex-1 transition-transform duration-300 ease-in-out 
                        ${isRTL ? 'ml-auto' : 'mr-auto'} 
                        ${isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}`
                    }>
                        <div className={`absolute top-0 flex w-16 justify-center pt-5 ${isRTL ? 'right-full' : 'left-full'}`}>
                            <button type="button" className="-m-2.5 p-2.5" onClick={() => setIsOpen(false)}>
                                <span className="sr-only">Close sidebar</span>
                                <CloseIcon className="h-6 w-6 text-white" />
                            </button>
                        </div>
                        <SidebarContent {...props} isCollapsed={false} onLinkClick={() => setIsOpen(false)} />
                    </div>
                </div>
            </div>

            {/* Desktop sidebar */}
            <div 
                className={`hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:flex-col transition-all duration-300 ease-in-out border-r border-gray-200 bg-white shadow-sm overflow-hidden`}
                style={{ width: isCollapsed ? '5rem' : '18rem' }}
            >
                <div className="flex min-h-0 flex-1 flex-col h-full">
                    <SidebarContent {...props} onLinkClick={() => {}} />
                    
                    <div className="flex flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full flex items-center justify-center p-1.5 text-gray-500 hover:text-amber-600 hover:bg-gray-200 rounded-md transition-colors"
                            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            <span className="sr-only">Collapse sidebar</span>
                             {isRTL ? (
                                isCollapsed ? <ChevronDoubleLeftIcon className="h-5 w-5" /> : <ChevronDoubleRightIcon className="h-5 w-5" />
                            ) : (
                                isCollapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default DashboardSidebar;

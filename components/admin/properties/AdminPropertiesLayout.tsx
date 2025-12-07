
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLanguage } from '../../shared/LanguageContext';

const AdminPropertiesLayout: React.FC = () => {
    const { language, t } = useLanguage();
    const t_nav = t.adminDashboard.nav;

    const tabs = [
        { name: t_nav.dashboard, href: '/admin/properties', exact: true },
        { name: t_nav.propertiesList, href: '/admin/properties/list', exact: false },
        { name: t_nav.propertyRequests, href: '/admin/properties/listing-requests', exact: false },
        { name: t_nav.propertyInquiries, href: '/admin/properties/search-requests', exact: false },
        { name: t_nav.propertyFilters, href: '/admin/properties/filters', exact: false },
    ];

    const baseClasses = "px-4 py-3 font-semibold text-sm md:text-md border-b-4 transition-colors duration-200 whitespace-nowrap";
    const activeClasses = "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/10";
    const inactiveClasses = "border-transparent text-gray-500 dark:text-gray-400 hover:text-amber-500 hover:border-amber-300 hover:bg-gray-50 dark:hover:bg-gray-800";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_nav.properties}</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {language === 'ar' 
                        ? 'إدارة العقارات، الطلبات، والاستفسارات من مكان واحد.' 
                        : 'Manage properties, listing requests, and search inquiries from one place.'}
                </p>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                 <div className="flex -mb-px" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    {tabs.map(tab => (
                        <NavLink
                            key={tab.href}
                            to={tab.href}
                            end={tab.exact}
                            className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                        >
                            {tab.name}
                        </NavLink>
                    ))}
                </div>
            </div>
            
            <div className="min-h-[500px]">
                <Outlet />
            </div>
        </div>
    );
};

export default AdminPropertiesLayout;

import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../shared/LanguageContext';
import UserSidebar from './UserSidebar';
import NotificationBell from '../shared/NotificationBell';
import { MenuIcon, GlobeAltIcon } from '../ui/Icons';

const UserDashboardLayout = () => {
    const { language } = useLanguage();
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Check authentication
    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
        }
    }, [currentUser, navigate]);

    if (!currentUser) return null;
    
    const isRTL = language === 'ar';

    return (
        <div className="min-h-screen bg-gray-50">
            <UserSidebar 
                user={currentUser}
                onLogout={logout}
                isOpen={sidebarOpen} 
                setIsOpen={setSidebarOpen} 
            />
            
            <div className={`transition-all duration-300 ${isRTL ? 'lg:mr-72' : 'lg:pl-72'}`}>
                 {/* Header */}
                <div className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                    <button type="button" className="-m-2.5 p-2.5 text-gray-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
                        <span className="sr-only">Open sidebar</span>
                        <MenuIcon className="h-6 w-6" />
                    </button>

                    <div className="h-6 w-px bg-gray-900/10 lg:hidden" aria-hidden="true" />
                    
                    <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end">
                        <div className="flex items-center gap-x-4 lg:gap-x-6">
                            <Link 
                                to="/" 
                                target="_blank"
                                className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-amber-600 transition-colors"
                            >
                                <GlobeAltIcon className="h-6 w-6" />
                                <span className="hidden md:inline">{language === 'ar' ? 'الموقع' : 'View Site'}</span>
                            </Link>

                            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10" aria-hidden="true" />

                            <NotificationBell />
                            
                            <div className="h-6 w-px bg-gray-900/10" aria-hidden="true" />

                            <div className="flex items-center">
                                <span className="sr-only">Open user menu</span>
                                <img
                                    className="h-8 w-8 rounded-full bg-gray-50 object-cover border border-gray-200"
                                    src={currentUser.imageUrl || 'https://via.placeholder.com/150'}
                                    alt=""
                                />
                                <span className="hidden lg:flex lg:items-center">
                                    <span className={`text-sm font-semibold leading-6 text-gray-900 ${language === 'ar' ? 'mr-4' : 'ml-4'}`} aria-hidden="true">
                                        {currentUser.name}
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

export default UserDashboardLayout;
import React from 'react';
import { Link } from 'react-router-dom';
import { Permission, Role } from '../../types';
import { useAuth } from './AuthContext';
import { useLanguage } from '../shared/LanguageContext';
import { ShieldCheckIcon, ArrowLeftIcon, LogoutIcon } from '../ui/Icons';
import { Button } from '../ui/Button';

interface AccessDeniedProps {
    requiredPermission?: Permission;
    userRole?: Role;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredPermission, userRole }) => {
    const { language } = useLanguage();
    const { logout, currentUser } = useAuth();
    const isAr = language === 'ar';

    const getReturnUrl = () => {
        if (!currentUser) return '/login';
        if (currentUser.role === Role.CUSTOMER) return '/my-dashboard';
        if ([Role.DEVELOPER_PARTNER, Role.FINISHING_PARTNER, Role.AGENCY_PARTNER].includes(currentUser.role)) {
            return '/dashboard';
        }
        return '/admin';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 border border-gray-200 dark:border-gray-700 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mb-6">
                    <ShieldCheckIcon className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
                
                <span className="inline-block px-3 py-1 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-mono text-xs font-bold rounded-full mb-3">
                    HTTP 403 • {isAr ? 'وصول غير مصرح به' : 'Access Forbidden'}
                </span>

                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                    {isAr ? 'لا تملك صلاحية الوصول' : 'Access Denied'}
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    {isAr
                        ? 'حسابك لا يمتلك الصلاحية التشغيلية الكافية للوصول إلى هذا القسم أو تنفيذ هذا الإجراء.'
                        : 'Your account does not possess the required operational permission to access this module or execute this action.'}
                </p>

                <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-4 mb-6 text-left border border-gray-200 dark:border-gray-700 text-xs space-y-2 font-mono">
                    <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                        <span>{isAr ? 'الدور الحالي (Role):' : 'Current Role:'}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{userRole || currentUser?.role || 'N/A'}</span>
                    </div>
                    {requiredPermission && (
                        <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                            <span>{isAr ? 'الصلاحية المطلوبة:' : 'Required Permission:'}</span>
                            <span className="font-bold text-red-600 dark:text-red-400">{requiredPermission}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to={getReturnUrl()} className="flex-1">
                        <Button className="w-full flex items-center justify-center gap-2">
                            <ArrowLeftIcon className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                            {isAr ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
                        </Button>
                    </Link>
                    <Button 
                        variant="outline" 
                        onClick={() => logout()}
                        className="flex items-center justify-center gap-2 text-gray-600"
                    >
                        <LogoutIcon className="w-4 h-4" />
                        {isAr ? 'تسجيل الخروج' : 'Sign Out'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;

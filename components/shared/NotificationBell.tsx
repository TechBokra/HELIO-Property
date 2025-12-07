
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BellIcon, ArrowRightIcon, CheckCircleIcon } from '../ui/Icons';
import type { Notification } from '../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotificationsByUserId, markNotificationsAsRead } from '../../services/notifications';
import { useLanguage } from './LanguageContext';
import { Permission } from '../../types';

const NotificationBell: React.FC = () => {
    const { currentUser, hasPermission } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const queryClient = useQueryClient();

    const { data: notifications } = useQuery({
        queryKey: ['notifications', currentUser?.id],
        queryFn: () => currentUser ? getNotificationsByUserId(currentUser.id) : Promise.resolve([]),
        enabled: !!currentUser,
        refetchInterval: 10000 
    });

    const markReadMutation = useMutation({
        mutationFn: async (ids: string[]) => {
             if(!currentUser) return;
             await markNotificationsAsRead(currentUser.id, ids);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const userNotifications = useMemo(() => notifications || [], [notifications]);
    const unreadCount = useMemo(() => userNotifications.filter(n => !n.isRead).length, [userNotifications]);

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (isOpen && !(event.target as HTMLElement).closest('.notification-bell-wrapper')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [isOpen]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };
    
    const handleMarkAllRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        const unreadIds = userNotifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length > 0) {
            markReadMutation.mutate(unreadIds);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        setIsOpen(false);
        if (!notification.isRead) {
             markReadMutation.mutate([notification.id]);
        }
        navigate(notification.link);
    };

    const notificationsLink = hasPermission(Permission.VIEW_ADMIN_DASHBOARD) ? '/admin/notifications' : '/dashboard/notifications';

    return (
        <div className="relative notification-bell-wrapper">
            <button 
                onClick={handleToggle}
                className="relative text-gray-500 hover:text-amber-500 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                aria-label="Toggle notifications"
            >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 animate-fadeIn overflow-hidden origin-top-right ring-1 ring-black/5`}>
                    <div className="p-3 px-4 font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-2">
                            <span>{t.notifications.title}</span>
                            {unreadCount > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-extrabold">{unreadCount}</span>}
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1 transition-colors"
                            >
                                <CheckCircleIcon className="w-3 h-3" />
                                {language === 'ar' ? 'تحديد الكل' : 'Mark all read'}
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                        {userNotifications.length > 0 ? (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                {userNotifications.slice(0, 8).map(notification => (
                                    <li key={notification.id}>
                                        <button
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`w-full text-left p-4 text-sm flex gap-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!notification.isRead ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!notification.isRead ? 'bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                            <div className="flex-grow">
                                                <p className={`text-gray-800 dark:text-gray-200 line-clamp-2 ${!notification.isRead ? 'font-semibold' : ''}`}>
                                                    {notification.message[language]}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1.5">
                                                    {new Date(notification.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                <BellIcon className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
                                <p className="text-sm">{t.notifications.noNotifications}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-center">
                        <Link 
                            to={notificationsLink} 
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-500 flex items-center justify-center gap-1 py-2 transition-colors"
                        >
                            {language === 'ar' ? 'عرض كل الإشعارات' : 'View all notifications'}
                            <ArrowRightIcon className={`w-3 h-3 ${language === 'ar' ? 'rotate-180' : ''}`} />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;

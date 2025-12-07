
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { getNotificationsByUserId, markNotificationsAsRead } from '../../services/notifications';
import { useLanguage } from './LanguageContext';
import { Card, CardContent } from '../ui/Card';
import { BellIcon } from '../ui/Icons';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

const AllNotificationsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { language, t } = useLanguage();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications', currentUser?.id],
        queryFn: () => currentUser ? getNotificationsByUserId(currentUser.id) : Promise.resolve([]),
        enabled: !!currentUser,
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            if (!currentUser || !notifications) return;
            const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
            if (unreadIds.length > 0) {
                await markNotificationsAsRead(currentUser.id, unreadIds);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const handleNotificationClick = async (notification: any) => {
        if (!notification.isRead && currentUser) {
             await markNotificationsAsRead(currentUser.id, [notification.id]);
             queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
        navigate(notification.link);
    };

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <BellIcon className="w-8 h-8 text-amber-500" />
                    {t.notifications.title}
                </h1>
                {notifications && notifications.some(n => !n.isRead) && (
                    <Button onClick={() => markAllReadMutation.mutate()} variant="secondary" size="sm">
                        {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {notifications && notifications.length > 0 ? (
                    notifications.map((notification) => (
                        <Card 
                            key={notification.id} 
                            className={`cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${!notification.isRead ? 'border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-900/10' : 'border-l-4 border-l-transparent'}`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <CardContent className="p-4 flex gap-4 items-start">
                                <div className={`mt-1 p-2 rounded-full flex-shrink-0 ${!notification.isRead ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                    <BellIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-grow">
                                    <p className={`text-gray-900 dark:text-white ${!notification.isRead ? 'font-bold' : ''}`}>
                                        {notification.message[language]}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {new Date(notification.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                    </p>
                                </div>
                                {!notification.isRead && (
                                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-dashed">
                        {t.notifications.noNotifications}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AllNotificationsPage;


import { notificationsData as initialNotificationsData } from '../data/notifications';
import type { Notification } from '../types';

// Create a mutable, in-memory copy of the data to simulate a database.
let notificationsData: Notification[] = [...initialNotificationsData];

const SIMULATED_DELAY = 200;

export const getNotificationsByUserId = (userId: string): Promise<Notification[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const userNotifications = notificationsData
                .filter(n => n.userId === userId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            resolve(JSON.parse(JSON.stringify(userNotifications)));
        }, SIMULATED_DELAY);
    });
};

export const markNotificationsAsRead = (userId: string, notificationIds: string[]): Promise<boolean> => {
     return new Promise((resolve) => {
        setTimeout(() => {
            notificationsData.forEach((notification, index) => {
                if (notification.userId === userId && notificationIds.includes(notification.id)) {
                    notificationsData[index].isRead = true;
                }
            });
            resolve(true);
        }, SIMULATED_DELAY);
    });
};

export const addNotification = (notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<Notification> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newNotification: Notification = {
                ...notificationData,
                id: `notif-${Date.now()}`,
                isRead: false,
                createdAt: new Date().toISOString(),
            };
            notificationsData.unshift(newNotification);
            resolve(newNotification);
        }, 50); // a small delay
    });
};

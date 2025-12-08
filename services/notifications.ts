
import { supabase } from '../lib/supabase';
import type { Notification } from '../types';

const mapNotificationFromDb = (row: any): Notification => ({
    id: row.id,
    userId: row.user_id,
    message: typeof row.message === 'string' ? JSON.parse(row.message) : row.message,
    link: row.link,
    isRead: row.is_read,
    createdAt: row.created_at
});

export const getNotificationsByUserId = async (userId: string): Promise<Notification[]> => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapNotificationFromDb);
};

export const markNotificationsAsRead = async (userId: string, notificationIds: string[]): Promise<boolean> => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .in('id', notificationIds);
        
    return !error;
};

export const addNotification = async (notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<Notification> => {
    const dbPayload = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: notificationData.userId,
        message: notificationData.message,
        link: notificationData.link,
        is_read: false,
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('notifications')
        .insert(dbPayload)
        .select()
        .single();

    if (error) {
        console.error("Failed to add notification", error);
        throw error;
    }
    return mapNotificationFromDb(data);
};

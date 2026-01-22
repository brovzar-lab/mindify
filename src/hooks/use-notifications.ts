import { useEffect, useState } from 'react';
import { LocalNotifications, type PendingLocalNotificationSchema, type PermissionStatus } from '@capacitor/local-notifications';
import { notificationService, type NotificationOptions } from '@/services/notification-service';
import type { MindifyItem } from '@/types';

interface UseNotificationsReturn {
    permission: PermissionStatus | null;
    activeNotifications: PendingLocalNotificationSchema[];
    requestPermission: () => Promise<boolean>;
    scheduleReminder: (item: MindifyItem, options?: NotificationOptions) => Promise<number | null>;
    cancelReminder: (itemId: string) => Promise<void>;
    snoozeReminder: (notificationId: number, item: MindifyItem, minutes: number) => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

export function useNotifications(
    onComplete?: (itemId: string) => void,
    onSnooze?: (itemId: string, notificationId: number, minutes: number) => void
): UseNotificationsReturn {
    const [permission, setPermission] = useState<PermissionStatus | null>(null);
    const [activeNotifications, setActiveNotifications] = useState<PendingLocalNotificationSchema[]>([]);

    // Check permissions on mount
    useEffect(() => {
        const checkPerms = async () => {
            await notificationService.checkPermissions();
            const perms = await LocalNotifications.checkPermissions();
            setPermission(perms);
        };
        checkPerms();
    }, []);

    // Set up notification action handlers
    useEffect(() => {
        if (onComplete && onSnooze) {
            notificationService.setupNotificationHandlers(onComplete, onSnooze);
        }
    }, [onComplete, onSnooze]);

    // Load active notifications
    const refreshNotifications = async () => {
        const pending = await notificationService.getPendingNotifications();
        setActiveNotifications(pending);
    };

    useEffect(() => {
        refreshNotifications();
    }, []);

    const requestPermission = async (): Promise<boolean> => {
        const granted = await notificationService.requestPermissions();
        const perms = await LocalNotifications.checkPermissions();
        setPermission(perms);
        return granted;
    };

    const scheduleReminder = async (
        item: MindifyItem,
        options?: NotificationOptions
    ): Promise<number | null> => {
        const notificationId = await notificationService.scheduleNotification(item, options);
        await refreshNotifications();
        return notificationId;
    };

    const cancelReminder = async (itemId: string): Promise<void> => {
        await notificationService.cancelNotification(itemId);
        await refreshNotifications();
    };

    const snoozeReminder = async (
        notificationId: number,
        item: MindifyItem,
        minutes: number
    ): Promise<void> => {
        await notificationService.snoozeNotification(notificationId, item, minutes);
        await refreshNotifications();
    };

    return {
        permission,
        activeNotifications,
        requestPermission,
        scheduleReminder,
        cancelReminder,
        snoozeReminder,
        refreshNotifications,
    };
}

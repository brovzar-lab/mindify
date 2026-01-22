import { LocalNotifications, type ScheduleOptions, type PendingLocalNotificationSchema } from '@capacitor/local-notifications';
import * as chrono from 'chrono-node';
import type { MindifyItem } from '@/types';

/**
 * Smart Notification Service
 * 
 * ADHD-Optimized notification system that:
 * - Extracts times from natural language ("call mom at 3pm")
 * - Provides smart default times based on urgency
 * - Implements escalating notification patterns
 * - Offers context-aware snooze options
 */

export interface NotificationOptions {
    scheduledTime?: Date;
    customMessage?: string;
    isRecurring?: boolean;
}

export class NotificationService {
    private static instance: NotificationService;
    private permissionGranted: boolean = false;

    private constructor() { }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Request notification permissions from the user
     */
    async requestPermissions(): Promise<boolean> {
        try {
            const permission = await LocalNotifications.requestPermissions();
            this.permissionGranted = permission.display === 'granted';
            return this.permissionGranted;
        } catch (error) {
            console.error('Failed to request notification permissions:', error);
            return false;
        }
    }

    /**
     * Check if notification permissions are granted
     */
    async checkPermissions(): Promise<boolean> {
        try {
            const permission = await LocalNotifications.checkPermissions();
            this.permissionGranted = permission.display === 'granted';
            return this.permissionGranted;
        } catch (error) {
            console.error('Failed to check notification permissions:', error);
            return false;
        }
    }

    /**
     * Extract time from natural language text
     * Examples:
     * - "call mom at 3pm" → Today at 3pm (or tomorrow if past)
     * - "meeting tomorrow" → Tomorrow at 9am
     * - "in 2 hours" → Current time + 2 hours
     * - "next Monday" → Next Monday at 9am
     */
    extractTimeFromText(text: string): Date | null {
        const parsed = chrono.parseDate(text);

        if (parsed) {
            // If the parsed time is in the past, move it to tomorrow
            const now = new Date();
            if (parsed < now) {
                const tomorrow = new Date(parsed);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow;
            }
            return parsed;
        }

        return null;
    }

    /**
     * Get smart default time based on item urgency
     */
    getDefaultReminderTime(item: MindifyItem): Date {
        const now = new Date();

        switch (item.urgency) {
            case 'high':
                // High urgency: 15 minutes from now
                return new Date(now.getTime() + 15 * 60 * 1000);

            case 'medium':
                // Medium urgency: 1 hour from now
                return new Date(now.getTime() + 60 * 60 * 1000);

            case 'low':
                // Low urgency: Tomorrow at 9am
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                return tomorrow;

            case 'none':
            default:
                // No urgency: Tomorrow at 9am
                const nextDay = new Date(now);
                nextDay.setDate(nextDay.getDate() + 1);
                nextDay.setHours(9, 0, 0, 0);
                return nextDay;
        }
    }

    /**
     * Generate a unique notification ID from item ID
     */
    private generateNotificationId(itemId: string): number {
        // Use a hash of the item ID to generate a consistent numeric ID
        let hash = 0;
        for (let i = 0; i < itemId.length; i++) {
            const char = itemId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Schedule a notification for an item
     */
    async scheduleNotification(
        item: MindifyItem,
        options: NotificationOptions = {}
    ): Promise<number | null> {
        if (!this.permissionGranted) {
            const granted = await this.requestPermissions();
            if (!granted) {
                console.warn('Notification permissions not granted');
                return null;
            }
        }

        try {
            // Determine the scheduled time
            let scheduledTime = options.scheduledTime;

            if (!scheduledTime) {
                // Try to extract time from the raw input
                const extractedTime = this.extractTimeFromText(item.rawInput);
                scheduledTime = extractedTime || this.getDefaultReminderTime(item);
            }

            const notificationId = this.generateNotificationId(item.id);

            const notification: ScheduleOptions = {
                notifications: [
                    {
                        id: notificationId,
                        title: item.title,
                        body: options.customMessage || item.rawInput,
                        schedule: { at: scheduledTime },
                        sound: 'default',
                        actionTypeId: 'MINDIFY_REMINDER',
                        extra: {
                            itemId: item.id,
                            snoozeCount: 0,
                            category: item.category,
                        },
                    },
                ],
            };

            await LocalNotifications.schedule(notification);
            console.log(`Scheduled notification ${notificationId} for ${scheduledTime}`);

            return notificationId;
        } catch (error) {
            console.error('Failed to schedule notification:', error);
            return null;
        }
    }

    /**
     * Cancel a notification for an item
     */
    async cancelNotification(itemId: string): Promise<void> {
        try {
            const notificationId = this.generateNotificationId(itemId);
            await LocalNotifications.cancel({
                notifications: [{ id: notificationId }],
            });
            console.log(`Cancelled notification ${notificationId}`);
        } catch (error) {
            console.error('Failed to cancel notification:', error);
        }
    }

    /**
     * Snooze a notification (reschedule for later)
     */
    async snoozeNotification(
        notificationId: number,
        item: MindifyItem,
        durationMinutes: number
    ): Promise<void> {
        try {
            // Cancel the current notification
            await LocalNotifications.cancel({
                notifications: [{ id: notificationId }],
            });

            // Get current snooze count
            const pending = await LocalNotifications.getPending();
            const existingNotification = pending.notifications.find(n => n.id === notificationId);
            const snoozeCount = (existingNotification?.extra?.snoozeCount || 0) + 1;

            // Calculate new time
            const newTime = new Date(Date.now() + durationMinutes * 60 * 1000);

            // Determine notification sound based on snooze count (escalation)
            const sound = snoozeCount === 1 ? 'default' : snoozeCount >= 2 ? 'alarm' : 'soft';

            // Reschedule with updated snooze count
            await LocalNotifications.schedule({
                notifications: [
                    {
                        id: notificationId,
                        title: `⏰ Reminder: ${item.title}`,
                        body: snoozeCount >= 2
                            ? `This is your ${snoozeCount}rd reminder! ${item.rawInput}`
                            : item.rawInput,
                        schedule: { at: newTime },
                        sound,
                        actionTypeId: 'MINDIFY_REMINDER',
                        extra: {
                            itemId: item.id,
                            snoozeCount,
                            category: item.category,
                        },
                    },
                ],
            });

            console.log(`Snoozed notification ${notificationId} for ${durationMinutes} minutes (snooze count: ${snoozeCount})`);
        } catch (error) {
            console.error('Failed to snooze notification:', error);
        }
    }

    /**
     * Get all pending notifications
     */
    async getPendingNotifications(): Promise<PendingLocalNotificationSchema[]> {
        try {
            const pending = await LocalNotifications.getPending();
            return pending.notifications;
        } catch (error) {
            console.error('Failed to get pending notifications:', error);
            return [];
        }
    }

    /**
     * Register notification action handlers
     */
    setupNotificationHandlers(
        onComplete: (itemId: string) => void,
        onSnooze: (itemId: string, notificationId: number, minutes: number) => void
    ): void {
        LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
            const { itemId } = action.notification.extra || {};

            if (!itemId) return;

            switch (action.actionId) {
                case 'MARK_DONE':
                    onComplete(itemId);
                    break;

                case 'SNOOZE_5MIN':
                    onSnooze(itemId, action.notification.id, 5);
                    break;

                case 'SNOOZE_15MIN':
                    onSnooze(itemId, action.notification.id, 15);
                    break;

                case 'SNOOZE_1HR':
                    onSnooze(itemId, action.notification.id, 60);
                    break;

                case 'SNOOZE_TOMORROW':
                    // Calculate minutes until 9am tomorrow
                    const now = new Date();
                    const tomorrow9am = new Date(now);
                    tomorrow9am.setDate(tomorrow9am.getDate() + 1);
                    tomorrow9am.setHours(9, 0, 0, 0);
                    const minutesUntilTomorrow = Math.floor((tomorrow9am.getTime() - now.getTime()) / (60 * 1000));
                    onSnooze(itemId, action.notification.id, minutesUntilTomorrow);
                    break;

                default:
                    // Notification tapped (no action button)
                    console.log(`Notification tapped for item ${itemId}`);
            }
        });
    }
}

export const notificationService = NotificationService.getInstance();

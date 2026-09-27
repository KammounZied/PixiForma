import { CommonFunction } from '@/common';

export interface NotificationPayload {
    user_ids: number[];
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
}

export async function sendNotifications(payload: NotificationPayload): Promise<void> {
    try {
        const headers = await CommonFunction.createHeaders({ withToken: true });
        const res = await fetch('/api/notifications/create', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            console.warn('sendNotifications: backend returned', res.status, await res.text().catch(() => ''));
        }
    } catch (error) {
        console.error('Error sending notifications:', error);
    }
}

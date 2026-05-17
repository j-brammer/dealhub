import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { isDeliveredByExpectedAt } from '@/lib/expectedDelivery';

/** Narrow shape for scheduling — avoids importing OrdersContext (circular). */
export type OrderDeliveryNotificationInput = {
  id: string;
  expectedDeliveryAt: string;
  lines: { title: string }[];
};

const ANDROID_CHANNEL_ID = 'dealhub-deliveries';

/** Inclusive start hour (local time). Notifications are never scheduled before this. */
export const DELIVERY_NOTIFICATION_WAKE_START_HOUR = 9;

/**
 * End hour (local time), exclusive — same as 9:00 through 20:59.
 * Outside this window, delivery alerts move to the next 9:00 so they do not fire overnight.
 */
export const DELIVERY_NOTIFICATION_WAKE_END_HOUR = 21;

export function deliveryNotificationId(orderId: string): string {
  return `dealhub-delivery-${orderId}`;
}

/**
 * If `at` falls outside waking hours, shift to 9:00 the same local day (before dawn)
 * or 9:00 the next day (after quiet hours).
 */
export function nextWakingNotificationTime(
  at: Date,
  wakeStartHour: number = DELIVERY_NOTIFICATION_WAKE_START_HOUR,
  wakeEndHour: number = DELIVERY_NOTIFICATION_WAKE_END_HOUR
): Date {
  const t = new Date(at.getTime());
  const minutesSinceMidnight = t.getHours() * 60 + t.getMinutes();
  const start = wakeStartHour * 60;
  const end = wakeEndHour * 60;

  if (minutesSinceMidnight >= start && minutesSinceMidnight < end) {
    return t;
  }
  if (minutesSinceMidnight < start) {
    t.setHours(wakeStartHour, 0, 0, 0);
    return t;
  }
  t.setDate(t.getDate() + 1);
  t.setHours(wakeStartHour, 0, 0, 0);
  return t;
}

function formatDeliveryNotificationBody(o: OrderDeliveryNotificationInput): string {
  const first = o.lines[0]?.title ?? 'Your items';
  const short = first.length > 72 ? `${first.slice(0, 69)}…` : first;
  if (o.lines.length <= 1) {
    return `${short} — open DealHub to see your order.`;
  }
  return `${short} and ${o.lines.length - 1} more — open DealHub to see your order.`;
}

async function ensureDeliveryNotificationSetup(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Order deliveries',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    return true;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedules one local notification per order that is not yet delivered.
 * Fire time is the simulated delivery time, clamped into waking hours only.
 */
export async function syncOrderDeliveryNotifications(orders: OrderDeliveryNotificationInput[]): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  const ok = await ensureDeliveryNotificationSetup();
  if (!ok) {
    return;
  }

  const now = Date.now();

  for (const o of orders) {
    const nid = deliveryNotificationId(o.id);
    try {
      await Notifications.cancelScheduledNotificationAsync(nid);
    } catch {
      /* no-op */
    }

    if (isDeliveredByExpectedAt(o.expectedDeliveryAt, now)) {
      continue;
    }

    const when = nextWakingNotificationTime(new Date(o.expectedDeliveryAt));
    if (when.getTime() <= now) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: nid,
      content: {
        title: 'Your order was delivered',
        body: formatDeliveryNotificationBody(o),
        data: { orderId: o.id, type: 'dealhub_delivery' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
      },
    });
  }
}

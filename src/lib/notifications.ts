import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Local reminders only: scheduled on the phone itself, no server or push token involved.
 * Remote "a friend captured 03:47" notifications would need Cloud Functions (Blaze plan).
 */
const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const CHANNEL_ID = 'reminders';
const STREAK_KIND = 'streak-reminder';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Asks once; returns false when the player declined (then only system settings can turn it on). */
export async function ensureNotificationPermission(channelName: string): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Cancels streak reminders of one room, or of every room when `roomId` is omitted. */
export async function cancelStreakReminders(roomId?: string): Promise<void> {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind === STREAK_KIND && (roomId === undefined || n.content.data?.roomId === roomId))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Replaces the room's pending streak reminders with one per given time. */
export async function scheduleStreakReminders(roomId: string, title: string, body: string, times: number[]): Promise<void> {
  if (!supported) return;
  await cancelStreakReminders(roomId);
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  await Promise.all(
    times.map((time) =>
      Notifications.scheduleNotificationAsync({
        content: { title, body, data: { kind: STREAK_KIND, roomId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(time), channelId: CHANNEL_ID },
      }),
    ),
  );
}

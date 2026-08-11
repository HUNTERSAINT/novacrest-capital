import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken, removePushToken } from '@workspace/api-client-react';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request notification permission and return the Expo push token, or null. */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}

/** Register push token with the backend. Silently fails if unavailable. */
export async function setupAdminPushNotifications(): Promise<string | null> {
  const token = await registerForPushNotificationsAsync();
  if (!token) return null;
  try {
    await registerPushToken(token);
  } catch {
    // Non-critical
  }
  return token;
}

/** Remove push token from the backend on logout. */
export async function teardownAdminPushNotifications(token: string): Promise<void> {
  try {
    await removePushToken(token);
  } catch {
    // Non-critical
  }
}

/**
 * Hook that sets up foreground notification listener.
 * Call once at the root layout level.
 */
export function useNotificationSetup() {
  const listenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    listenerRef.current = Notifications.addNotificationReceivedListener(() => {
      // Notification received in foreground — the handler above handles display
    });
    return () => {
      listenerRef.current?.remove();
    };
  }, []);
}

import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { setBaseUrl } from '@workspace/api-client-react';
import { AuthProvider } from '@/contexts/AuthContext';
import { Stack, useRouter } from 'expo-router';

// Set API base URL at module level — outside any component
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

// Configure how notifications are displayed when the app is in the foreground
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
import React, { useEffect, useRef } from 'react';
import { useNotificationSetup } from '@/hooks/usePushNotifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RootLayoutNav() {
  const router = useRouter();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  // Listen for notification taps and deep-link to the relevant admin section
  useEffect(() => {
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const section =
          (response.notification.request.content.data as Record<string, string>)?.section ?? 'members';
        router.navigate({
          pathname: '/(tabs)/admin',
          params: { section },
        });
      },
    );
    return () => {
      responseListenerRef.current?.remove();
    };
  }, [router]);

  // Set up foreground notification handler
  useNotificationSetup();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Listen for notification taps and deep-link to the correct admin section
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          screen?: string;
          section?: string;
        };
        if (data?.screen === 'admin') {
          // Navigate to the admin tab, passing the section as a query param
          router.push({
            pathname: '/(tabs)/admin',
            params: data.section ? { section: data.section } : {},
          });
        }
      },
    );

    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

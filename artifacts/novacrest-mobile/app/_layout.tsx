import React, { useEffect, useState } from 'react';
import { Platform, View, StatusBar, Text, TextInput } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ModeStatusBanner from '@/components/ModeStatusBanner';
import { LowSignalProvider } from '@/contexts/LowSignalContext';
import { AuthProvider } from '@/contexts/AuthContext';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { setBaseUrl } from '@workspace/api-client-react';
import { useNotificationSetup } from '@/hooks/usePushNotifications';

// Apply the website's clean sans-serif typography to native body text and fields.
const NativeText = Text as unknown as { defaultProps?: Record<string, any> };
NativeText.defaultProps = {
  ...NativeText.defaultProps,
  style: [{ fontFamily: 'Inter_400Regular' }, NativeText.defaultProps?.style],
};
const NativeTextInput = TextInput as unknown as { defaultProps?: Record<string, any> };
NativeTextInput.defaultProps = {
  ...NativeTextInput.defaultProps,
  style: [{ fontFamily: 'Inter_400Regular' }, NativeTextInput.defaultProps?.style],
};

const API_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN || 'novacrestfi.com';
setBaseUrl(`https://${API_DOMAIN}`);

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

function RootLayoutNav() {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        screen?: string;
        section?: string;
      };
      if (data?.screen === 'admin' || data?.section) {
        router.navigate({
          pathname: '/(tabs)/admin',
          params: data.section ? { section: data.section } : { section: 'members' },
        });
      }
    });
    return () => subscription.remove();
  }, [router]);

  useNotificationSetup();

  return (
    <View style={{ flex: 1, backgroundColor: '#09090b' }}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />
      <ModeStatusBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="deposit" options={{ headerShown: false }} />
        <Stack.Screen name="withdraw" options={{ headerShown: false }} />
        <Stack.Screen name="purchase" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [fontFallbackReady, setFontFallbackReady] = useState(false);

  // Font loading can stall on some Android devices/network conditions.
  // Release the native splash and render with system font fallback after 2s.
  useEffect(() => {
    const timeout = setTimeout(() => setFontFallbackReady(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError || fontFallbackReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError, fontFallbackReady]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LowSignalProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </LowSignalProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

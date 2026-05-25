import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  HindSiliguri_400Regular,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { useAuthStore } from '../store/auth-store';
import { useSettingsStore } from '../store/settings-store';
import { colors } from '../lib/theme';
import { SubscriptionProvider } from '../context/SubscriptionContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    HindSiliguri_400Regular,
    HindSiliguri_700Bold,
  });

  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);

  useEffect(() => {
    hydrateAuth();
    hydrateSettings();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SubscriptionProvider>
    </QueryClientProvider>
  );
}

import '@/lib/i18n';

import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { LEGAL_VERSION } from '@/legal';
import { PreferencesProvider, usePreferences } from '@/lib/preferences';
import { AppThemeProvider, useAppTheme } from '@/theme/theme-provider';
import { ALL_FONT_ASSETS } from '@/theme/themes';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <PreferencesProvider>
      <AppThemeProvider>
        <AppStack />
      </AppThemeProvider>
    </PreferencesProvider>
  );
}

function AppStack() {
  const { t } = useTranslation();
  const { ready, legalNoticeSeen } = usePreferences();
  const [fontsLoaded, fontError] = useFonts(ALL_FONT_ASSETS);
  const { colors, scheme, definition } = useAppTheme();
  const noticeSeen = legalNoticeSeen >= LEGAL_VERSION;

  // The native splash stays up until fonts and saved preferences (language, look) are in.
  if (!ready || (!fontsLoaded && !fontError)) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.accent,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontFamily: definition.fonts.display, color: colors.text },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        {/* The privacy notice comes first; nothing signs in or reaches the server before it. */}
        <Stack.Protected guard={!noticeSeen}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={noticeSeen}>
          <Stack.Screen name="index" options={{ headerShown: false, title: t('home.title') }} />
          <Stack.Screen name="create" options={{ title: t('create.title'), presentation: 'modal' }} />
          <Stack.Screen name="join" options={{ title: t('join.title'), presentation: 'modal' }} />
          <Stack.Screen name="settings" options={{ title: t('settings.title'), presentation: 'modal' }} />
          <Stack.Screen name="room/[id]" options={{ title: '' }} />
          <Stack.Screen name="legal/[kind]" options={{ title: '', presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

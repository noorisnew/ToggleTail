import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import ErrorBoundary from '@/components/ErrorBoundary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setupGlobalErrorHandling } from '@/src/services/loggerService';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    setupGlobalErrorHandling();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="child-home" options={{ title: 'ToggleTail', headerShown: false }} />
          <Stack.Screen name="parent-gate" options={{ title: 'Parent Access' }} />
          <Stack.Screen name="parent-home" options={{ title: 'Parent Dashboard', headerShown: false }} />
          <Stack.Screen name="story-create" options={{ title: 'Create Story', headerShown: false }} />
          <Stack.Screen name="story-view" options={{ title: 'Story', headerShown: false }} />
          <Stack.Screen name="record-narration" options={{ title: 'Record Narration', headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

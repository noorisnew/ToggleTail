import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import ErrorBoundary from '@/components/ErrorBoundary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { seedStoriesFromLibrary } from '@/src/data/seeder';
import { autoApprovePreloadedStories } from '@/src/domain/services/storyApprovalService';
import { setupGlobalErrorHandling } from '@/src/services/loggerService';
import { cleanupLegacyAuthStorage } from '@/src/services/parentGateService';
import { getProfile } from '@/src/data/storage/profileStorage';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    setupGlobalErrorHandling();
    // Clean up legacy auth storage keys on app startup
    cleanupLegacyAuthStorage();
    // Seed preloaded stories into storage and auto-approve them.
    // Pass the profile name as a stable per-account identifier so that each
    // new account gets its own seeding state and always receives the bundled
    // stories, even on a device that was previously used by another account.
    getProfile().then(profile => {
      const profileId = profile?.name ?? undefined;
      return seedStoriesFromLibrary(profileId);
    }).then(async (result) => {
      if (result.seededCount > 0) {
        console.log(`Seeded ${result.seededCount} preloaded stories`);
      }
      // Auto-approve all preloaded stories so they're visible by default
      await autoApprovePreloadedStories();
    });
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

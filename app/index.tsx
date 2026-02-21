import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/design';
import { ONBOARDING_KEY } from '../src/data/storage/storageKeys';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      setOnboardingDone(value === 'true');
    } catch (error) {
      console.error('checkOnboarding error:', error);
      setOnboardingDone(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primaryStart} />
      </View>
    );
  }

  if (onboardingDone) {
    return <Redirect href="/child-home" />;
  }

  return <Redirect href="/onboarding/welcome" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});

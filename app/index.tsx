import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getProfile } from '../src/data/storage/profileStorage';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const profile = await getProfile();
      setHasProfile(!!profile);
    } catch (error) {
      console.error('Error checking profile:', error);
      setHasProfile(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3E8FF' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  // If no profile exists, go to onboarding
  if (!hasProfile) {
    return <Redirect href="/onboarding/welcome" />;
  }

  // Otherwise go to main child home screen
  return <Redirect href="/child-home" />;
}

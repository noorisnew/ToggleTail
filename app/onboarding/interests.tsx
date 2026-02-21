import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/design';
import { AvatarType, InterestType, setProfile } from '../../src/data/storage/profileStorage';
import { ONBOARDING_KEY } from '../../src/data/storage/storageKeys';

const TEMP_NAME_KEY = 'onboarding_temp_name';
const TEMP_AGE_KEY = 'onboarding_temp_age';
const TEMP_AVATAR_KEY = 'onboarding_temp_avatar';

const INTERESTS: { name: InterestType; emoji: string; bgColor: string }[] = [
  { name: 'Super Heroes', emoji: '🦸‍♀️', bgColor: '#fce7f3' },
  { name: 'Dragons & Magic', emoji: '🐉', bgColor: '#f3e8ff' },
  { name: 'Fairy Tales', emoji: '🧚', bgColor: '#fce7f3' },
  { name: 'Mystery & Puzzles', emoji: '🔍', bgColor: '#dbeafe' },
  { name: 'Dinosaurs', emoji: '🦕', bgColor: '#dcfce7' },
  { name: 'Ocean Adventures', emoji: '🌊', bgColor: '#cffafe' },
  { name: 'Cute Animals', emoji: '🐻', bgColor: '#fef3c7' },
  { name: 'Space & Robots', emoji: '🚀', bgColor: '#e0e7ff' },
];

export default function InterestsScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<InterestType[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadName = async () => {
      const storedName = await AsyncStorage.getItem(TEMP_NAME_KEY);
      if (storedName) setName(storedName);
    };
    loadName();
  }, []);

  const toggleInterest = (interest: InterestType) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Gather all temp data
      const storedName = await AsyncStorage.getItem(TEMP_NAME_KEY);
      const storedAge = await AsyncStorage.getItem(TEMP_AGE_KEY);
      const storedAvatar = await AsyncStorage.getItem(TEMP_AVATAR_KEY);

      console.log('Profile data:', { storedName, storedAge, storedAvatar });

      if (!storedName || !storedAge) {
        console.error('Missing data:', { storedName, storedAge });
        // Use fallback values if data is missing
        const fallbackName = storedName || 'Reader';
        const fallbackAge = storedAge || '5';
        
        await setProfile({
          name: fallbackName,
          age: parseInt(fallbackAge, 10),
          readingLevel: 'Beginner',
          avatar: (storedAvatar as AvatarType) || 'Lion',
          interests: selectedInterests.length > 0 ? selectedInterests : undefined,
        });
      } else {
        // Save the complete profile
        await setProfile({
          name: storedName,
          age: parseInt(storedAge, 10),
          readingLevel: 'Beginner',
          avatar: (storedAvatar as AvatarType) || 'Lion',
          interests: selectedInterests.length > 0 ? selectedInterests : undefined,
        });
      }

      // Mark onboarding as complete
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');

      // Clean up temp storage
      await AsyncStorage.multiRemove([TEMP_NAME_KEY, TEMP_AGE_KEY, TEMP_AVATAR_KEY]);

      // Navigate to child home
      router.replace('/child-home');
    } catch (error) {
      console.error('handleComplete:', error);
      Alert.alert('Error', 'Could not save profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBorder}>
            <View style={styles.logoInner}>
              <Text style={styles.logoText}>Toggle{'\n'}tails</Text>
            </View>
          </View>
        </View>
        <Text style={styles.subtitle}>Set up your child's reading adventure</Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.stepText}>Step 8 of 8</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.emoji}>💗</Text>
          <Text style={styles.title}>What does {name || 'your child'} love to read about?</Text>
          <Text style={styles.description}>We'll suggest stories they'll enjoy</Text>
        </View>

        <ScrollView style={styles.interestsScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.interestsGrid}>
            {INTERESTS.map((interest) => (
              <TouchableOpacity
                key={interest.name}
                style={[
                  styles.interestCard,
                  { backgroundColor: interest.bgColor },
                  selectedInterests.includes(interest.name) && styles.interestCardSelected,
                ]}
                onPress={() => toggleInterest(interest.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                <Text style={[
                  styles.interestLabel,
                  selectedInterests.includes(interest.name) && styles.interestLabelSelected,
                ]}>
                  {interest.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleComplete}
            activeOpacity={0.8}
            style={styles.nextButtonWrapper}
            disabled={saving}
          >
            <LinearGradient
              colors={saving ? ['#9ca3af', '#6b7280'] : [Colors.primaryStart, Colors.primaryEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>
                {saving ? 'Saving...' : 'Start Reading! 📖'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    padding: Spacing.xl,
    maxHeight: '95%',
    ...Shadows.card,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.accentYellow,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: Colors.primaryStart,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: Typography.weights.bold,
    color: Colors.accentYellow,
    textAlign: 'center',
    lineHeight: 22,
  },
  subtitle: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#f3e8ff',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.textPrimary,
    borderRadius: 9999,
  },
  stepText: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  content: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.textAccent,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  interestsScroll: {
    maxHeight: 280,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  interestCard: {
    width: '48%',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestCardSelected: {
    borderColor: Colors.primaryStart,
  },
  interestEmoji: {
    fontSize: 36,
    marginBottom: Spacing.xs,
  },
  interestLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  interestLabelSelected: {
    color: Colors.primaryStart,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: Spacing.lg,
    borderTopWidth: 2,
    borderTopColor: Colors.backgroundLight,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  backButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.textAccent,
    fontSize: Typography.sizes.button,
    fontWeight: Typography.weights.semibold,
  },
  nextButtonWrapper: {
    flex: 1,
  },
  nextButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  nextButtonText: {
    color: Colors.textLight,
    fontSize: Typography.sizes.button,
    fontWeight: Typography.weights.semibold,
  },
});

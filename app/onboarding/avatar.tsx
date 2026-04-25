import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/design';
import { AvatarType } from '../../src/data/storage/profileStorage';

const TEMP_NAME_KEY = 'onboarding_temp_name';
const TEMP_AVATAR_KEY = 'onboarding_temp_avatar';

const AVATARS: { name: AvatarType; emoji: string }[] = [
  { name: 'Lion', emoji: '🦁' },
  { name: 'Bear', emoji: '🐻' },
  { name: 'Bunny', emoji: '🐰' },
  { name: 'Panda', emoji: '🐼' },
  { name: 'Fox', emoji: '🦊' },
  { name: 'Koala', emoji: '🐨' },
  { name: 'Unicorn', emoji: '🦄' },
  { name: 'Frog', emoji: '🐸' },
  { name: 'Owl', emoji: '🦉' },
  { name: 'Octopus', emoji: '🐙' },
  { name: 'Dino', emoji: '🦖' },
  { name: 'Cat', emoji: '🐱' },
];

export default function AvatarScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType | null>(null);

  useEffect(() => {
    const loadName = async () => {
      const storedName = await AsyncStorage.getItem(TEMP_NAME_KEY);
      if (storedName) setName(storedName);
    };
    loadName();

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  const handleNext = async () => {
    if (selectedAvatar) {
      await AsyncStorage.setItem(TEMP_AVATAR_KEY, selectedAvatar);
    }
    router.replace('/onboarding/interests');
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
            <View style={[styles.progressFill, { width: '87.5%' }]} />
          </View>
          <Text style={styles.stepText}>Step 7 of 8</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.emoji}>😊</Text>
          <Text style={styles.title}>Pick {name || 'your'}'s reading buddy!</Text>
          <Text style={styles.description}>Choose a fun avatar for their profile</Text>
        </View>

        <ScrollView
          style={styles.avatarScroll}
          contentContainerStyle={styles.avatarScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarGrid}>
            {AVATARS.map((avatar) => (
              <TouchableOpacity
                key={avatar.name}
                style={[
                  styles.avatarCard,
                  selectedAvatar === avatar.name && styles.avatarCardSelected,
                ]}
                onPress={() => setSelectedAvatar(avatar.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
                <Text style={[
                  styles.avatarLabel,
                  selectedAvatar === avatar.name && styles.avatarLabelSelected,
                ]}
                numberOfLines={2}>
                  {avatar.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.8}
            style={styles.singleActionButtonWrapper}
          >
            <LinearGradient
              colors={selectedAvatar ? [Colors.primaryStart, Colors.primaryEnd] : ['#d1d5db', '#9ca3af']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>Next →</Text>
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
  avatarScroll: {
    maxHeight: 340,
  },
  avatarScrollContent: {
    paddingBottom: Spacing.sm,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  avatarCard: {
    width: '31%',
    minHeight: 108,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  avatarCardSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7',
  },
  avatarEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  avatarLabel: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  avatarLabelSelected: {
    color: '#16a34a',
  },
  actions: {
    flexDirection: 'row',
    paddingTop: Spacing.lg,
    borderTopWidth: 2,
    borderTopColor: Colors.backgroundLight,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  singleActionButtonWrapper: {
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

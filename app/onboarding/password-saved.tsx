import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/design';

const TEMP_NAME_KEY = 'onboarding_temp_name';

export default function PasswordSavedScreen() {
  const router = useRouter();
  const [name, setName] = useState('');

  useEffect(() => {
    const loadName = async () => {
      const storedName = await AsyncStorage.getItem(TEMP_NAME_KEY);
      if (storedName) setName(storedName);
    };
    loadName();

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

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
            <View style={[styles.progressFill, { width: '75%' }]} />
          </View>
          <Text style={styles.stepText}>Step 6 of 8</Text>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.yellowProgressBar} />

          <View style={styles.childTurnBox}>
            <View style={styles.childTurnHeader}>
              <Text style={styles.childEmoji}>👶</Text>
              <Text style={styles.childTurnTitle}>{name || 'Child'}'s Turn!</Text>
            </View>
            <Text style={styles.childTurnText}>
              For <Text style={styles.highlightPurple}>reading buddy</Text> and <Text style={styles.highlightOrange}>genre</Text>, {name || 'your child'} should have their own experience.
            </Text>
          </View>

          <View style={styles.transitionContainer}>
            <Text style={styles.transitionEmojis}>👨‍👩‍👧</Text>
            <Text style={styles.transitionArrow}>→</Text>
            <Text style={styles.transitionEmojis}>👶</Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => router.replace('/onboarding/avatar')}
            activeOpacity={0.8}
            style={styles.singleActionButtonWrapper}
          >
            <LinearGradient
              colors={[Colors.primaryStart, Colors.primaryEnd]}
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
    marginBottom: Spacing.lg,
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
  scrollContent: {
    flexGrow: 0,
  },
  yellowProgressBar: {
    height: 8,
    backgroundColor: '#fef08a',
    borderRadius: 4,
    marginBottom: Spacing.lg,
  },
  childTurnBox: {
    backgroundColor: '#fef3c7',
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: '#fcd34d',
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  childTurnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  childEmoji: {
    fontSize: 32,
    marginRight: Spacing.sm,
  },
  childTurnTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: '#b45309',
  },
  childTurnText: {
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  highlightPurple: {
    color: Colors.primaryStart,
    fontWeight: Typography.weights.semibold,
  },
  highlightOrange: {
    color: '#ea580c',
    fontWeight: Typography.weights.semibold,
  },
  transitionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  transitionEmojis: {
    fontSize: 36,
  },
  transitionArrow: {
    fontSize: 24,
    color: Colors.primaryStart,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: Spacing.lg,
    borderTopWidth: 2,
    borderTopColor: Colors.backgroundLight,
    gap: Spacing.md,
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

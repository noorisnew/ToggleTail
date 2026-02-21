import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/design';

export default function WelcomeScreen() {
  const router = useRouter();

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
            <View style={[styles.progressFill, { width: '12.5%' }]} />
          </View>
          <Text style={styles.stepText}>Step 1 of 8</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.emoji}>📚✨</Text>
          <Text style={styles.title}>Welcome to ToggleTails!</Text>
          <Text style={styles.description}>
            A magical place where stories come alive. Let's get started on your reading journey!
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => router.push('/onboarding/role')}
            activeOpacity={0.8}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={[Colors.primaryStart, Colors.primaryEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Get Started →</Text>
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
  content: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.textAccent,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    paddingTop: Spacing.lg,
    borderTopWidth: 2,
    borderTopColor: Colors.backgroundLight,
  },
  buttonWrapper: {
    width: '100%',
  },
  button: {
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.textLight,
    fontSize: Typography.sizes.button,
    fontWeight: Typography.weights.semibold,
  },
});

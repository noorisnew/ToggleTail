import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/design';

type Role = 'parent' | 'child' | null;

export default function RoleScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [showChildMessage, setShowChildMessage] = useState(false);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    if (role === 'child') {
      setShowChildMessage(true);
    } else {
      setShowChildMessage(false);
    }
  };

  const handleNext = () => {
    // Both roles lead to child-name (parent sets up child's profile)
    router.push('/onboarding/child-name');
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
            <View style={[styles.progressFill, { width: '25%' }]} />
          </View>
          <Text style={styles.stepText}>Step 2 of 8</Text>
        </View>

        <View style={styles.content}>
          {!showChildMessage ? (
            <>
              <Text style={styles.emoji}>👨‍👩‍👧</Text>
              <Text style={styles.title}>Are you a parent or a child?</Text>
              <Text style={styles.description}>Let us know who's setting up this account</Text>

              <View style={styles.roleOptions}>
                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    selectedRole === 'parent' && styles.roleCardSelected,
                  ]}
                  onPress={() => handleRoleSelect('parent')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.roleEmoji}>👨‍👩‍👧</Text>
                  <Text style={styles.roleLabel}>Parent</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleCard,
                    selectedRole === 'child' && styles.roleCardSelected,
                  ]}
                  onPress={() => handleRoleSelect('child')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.roleEmoji}>🧒</Text>
                  <Text style={styles.roleLabel}>Child</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.childMessageBox}>
              <Text style={styles.childMessageEmoji}>🙋</Text>
              <Text style={styles.childMessageTitle}>Hold on, little reader!</Text>
              <Text style={styles.childMessageText}>
                Please ask your parent or guardian to help set up this account.
              </Text>
              <Text style={styles.childMessageHighlight}>
                We need just <Text style={styles.highlight}>5 minutes</Text> of their time
              </Text>
              <Text style={styles.childMessageHighlight}>
                for <Text style={styles.highlightPink}>the rest of yours!</Text> 📖 ✨
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {showChildMessage ? (
            <TouchableOpacity
              onPress={() => {
                setShowChildMessage(false);
                setSelectedRole(null);
              }}
              activeOpacity={0.8}
              style={styles.singleActionButtonWrapper}
            >
              <LinearGradient
                colors={[Colors.primaryStart, Colors.primaryEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButton}
              >
                <Text style={styles.nextButtonText}>Get My Parent →</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.8}
                style={styles.nextButtonWrapper}
                disabled={!selectedRole}
              >
                <LinearGradient
                  colors={selectedRole ? [Colors.primaryStart, Colors.primaryEnd] : ['#d1d5db', '#9ca3af']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButton}
                >
                  <Text style={styles.nextButtonText}>Next →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
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
    fontSize: 48,
    marginBottom: Spacing.sm,
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
    marginBottom: Spacing.lg,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: Colors.primaryStart,
    backgroundColor: '#f3e8ff',
  },
  roleEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  roleLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  childMessageBox: {
    backgroundColor: '#fef9c3',
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: '#facc15',
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  childMessageEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  childMessageTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.textAccent,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  childMessageText: {
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  childMessageHighlight: {
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  highlight: {
    color: Colors.textAccent,
    fontWeight: Typography.weights.bold,
  },
  highlightPink: {
    color: Colors.primaryEnd,
    fontWeight: Typography.weights.bold,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: Spacing.lg,
    borderTopWidth: 2,
    borderTopColor: Colors.backgroundLight,
    gap: Spacing.md,
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

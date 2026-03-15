/**
 * Parent Password Setup Screen
 * Location: app/onboarding/parent-password.tsx
 * 
 * Production-level password setup for parent gate functionality.
 * Implements industry-standard password policies for children's apps.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Shadows, Spacing, Typography } from '../../constants/design';
import { getProfile } from '../../src/data/storage/profileStorage';
import { usePasswordValidation } from '../../src/hooks/usePasswordValidation';
import { setParentPasswordHash } from '../../src/services/parentGateService';

// Requirement item for checklist
interface RequirementItemProps {
  met: boolean;
  text: string;
  hasStartedTyping: boolean;
}

const RequirementItem = ({ met, text, hasStartedTyping }: RequirementItemProps) => {
  const bgColor = !hasStartedTyping ? '#F3F4F6' : met ? '#DCFCE7' : '#FEE2E2';
  const textColor = !hasStartedTyping ? '#6B7280' : met ? '#166534' : '#991B1B';
  const icon = !hasStartedTyping ? '○' : met ? '✓' : '✗';
  
  return (
    <View style={[styles.requirementItem, { backgroundColor: bgColor }]}>
      <Text style={[styles.requirementIcon, { color: textColor }]}>{icon}</Text>
      <Text style={[styles.requirementText, { color: textColor }]}>{text}</Text>
    </View>
  );
};

// Password strength meter the visual
interface StrengthMeterProps {
  percent: number;
  label: string;
  color: string;
  hasStartedTyping: boolean;
}

const StrengthMeter = ({ percent, label, color, hasStartedTyping }: StrengthMeterProps) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percent,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [percent]);
  
  if (!hasStartedTyping) {
    return null;
  }
  
  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthHeader}>
        <Text style={styles.strengthLabel}>Password Strength</Text>
        <Text style={[styles.strengthValue, { color }]}>{label}</Text>
      </View>
      <View style={styles.strengthTrack}>
        <Animated.View
          style={[
            styles.strengthFill,
            {
              backgroundColor: color,
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

export default function ParentPasswordScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [childName, setChildName] = useState<string | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const confirmInputRef = useRef<TextInput>(null);
  
  // Load child name for personal info validation
  useEffect(() => {
    loadChildName();
  }, []);
  
  const loadChildName = async () => {
    try {
      const profile = await getProfile();
      if (profile?.name) {
        setChildName(profile.name);
      }
    } catch {
      // Ignore errors - personal info check is optional
    }
  };
  
  // Use password validation hook with personal info
  const {
    password,
    confirmPassword,
    setPassword,
    setConfirmPassword,
    requirements,
    strength,
    canSubmit,
    hasStartedTyping,
    hasStartedConfirm,
    passwordFieldState,
    confirmFieldState,
    passwordsMatch,
    primaryError,
  } = usePasswordValidation({
    personalInfo: { childName },
    debounceMs: 150,
  });
  
  // Get border color based on field state
  const getFieldBorderColor = (state: 'neutral' | 'error' | 'valid'): string => {
    switch (state) {
      case 'valid':
        return '#22C55E';
      case 'error':
        return '#EF4444';
      default:
        return Colors.borderCard;
    }
  };
  
  const handleNext = async () => {
    if (isSubmitting) return;
    
    // Show validation error if the set requirements not met
    if (!canSubmit) {
      Alert.alert('Password Requirements', primaryError || 'Please complete all password requirements');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('[ParentPassword] Calling setParentPasswordHash...');
      const result = await setParentPasswordHash(password);
      console.log('[ParentPassword] Result:', result);
      
      if (result.success) {
        router.push('/onboarding/password-saved');
      } else {
        // Show error (using Alert as fallback)
        const { Alert } = await import('react-native');
        Alert.alert('Error', result.error || 'Failed to save password. Please try again.');
      }
    } catch (error) {
      console.error('[ParentPassword] Exception:', error);
      const { Alert } = await import('react-native');
      Alert.alert('Error', `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
          <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoBorder}>
                <View style={styles.logoInner}>
                  <Text style={styles.logoText}>Toggle{'\n'}tails</Text>
                </View>
              </View>
            </View>
            <Text style={styles.subtitle}>Set up your child's reading adventure</Text>
            
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '62.5%' }]} />
              </View>
              <Text style={styles.stepText}>Step 5 of 8</Text>
            </View>
            
            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>Create your parent password</Text>
              <Text style={styles.description}>
                This protects parent settings and purchases.
              </Text>
              
              {/* Safety Warning */}
              <View style={styles.warningBanner}>
                <Text style={styles.warningIcon}>🔒</Text>
                <Text style={styles.warningText}>
                  Only parents should set this. Don't share it with children.
                </Text>
              </View>
              
              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      { borderColor: getFieldBorderColor(passwordFieldState) },
                    ]}
                    placeholder="Enter password"
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmInputRef.current?.focus()}
                    blurOnSubmit={false}
                    accessibilityLabel="Password input field"
                    accessibilityHint="Enter your parent password, minimum 8 characters with uppercase, lowercase, number, and symbol"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Requirements Checklist */}
              <View style={styles.requirementsList}>
                <RequirementItem
                  met={requirements.minLength}
                  text="At least 8 characters"
                  hasStartedTyping={hasStartedTyping}
                />
                <RequirementItem
                  met={requirements.hasUppercase}
                  text="One uppercase letter (A-Z)"
                  hasStartedTyping={hasStartedTyping}
                />
                <RequirementItem
                  met={requirements.hasLowercase}
                  text="One lowercase letter (a-z)"
                  hasStartedTyping={hasStartedTyping}
                />
                <RequirementItem
                  met={requirements.hasNumber}
                  text="One number (0-9)"
                  hasStartedTyping={hasStartedTyping}
                />
                <RequirementItem
                  met={requirements.hasSymbol}
                  text="One symbol (!@#$%...)"
                  hasStartedTyping={hasStartedTyping}
                />
                {hasStartedTyping && !requirements.notCommon && (
                  <RequirementItem
                    met={false}
                    text="Don't use common passwords"
                    hasStartedTyping={hasStartedTyping}
                  />
                )}
                {hasStartedTyping && !requirements.noPersonalInfo && (
                  <RequirementItem
                    met={false}
                    text="Don't include personal info"
                    hasStartedTyping={hasStartedTyping}
                  />
                )}
              </View>
              
              {/* Strength Meter */}
              <StrengthMeter
                percent={strength.percent}
                label={strength.label}
                color={strength.color}
                hasStartedTyping={hasStartedTyping}
              />
              
              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={confirmInputRef}
                    style={[
                      styles.input,
                      { borderColor: getFieldBorderColor(confirmFieldState) },
                    ]}
                    placeholder="Confirm password"
                    placeholderTextColor={Colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                    accessibilityLabel="Confirm password input field"
                    accessibilityHint="Re-enter your password to confirm"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Match Status */}
                {hasStartedConfirm && confirmPassword.length > 0 && (
                  <View
                    style={[
                      styles.matchStatus,
                      { backgroundColor: passwordsMatch ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.matchText,
                        { color: passwordsMatch ? '#166534' : '#991B1B' },
                      ]}
                    >
                      {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.8}
                style={styles.nextButtonWrapper}
                disabled={isSubmitting}
                accessibilityLabel="Continue to next step"
                accessibilityRole="button"
                accessibilityState={{ disabled: isSubmitting }}
              >
                <LinearGradient
                  colors={[Colors.primaryStart, Colors.primaryEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextButton}
                >
                  <Text style={styles.nextButtonText}>
                    {isSubmitting ? 'Saving...' : 'Next →'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  
  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentYellow,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: Colors.primaryStart,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    color: Colors.accentYellow,
    textAlign: 'center',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  
  // Progress
  progressContainer: {
    marginBottom: Spacing.lg,
  },
  progressTrack: {
    height: 10,
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
    marginTop: Spacing.xs,
  },
  
  // Content
  content: {
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: Typography.weights.bold,
    color: Colors.textAccent,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  
  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  
  // Input
  inputContainer: {
    width: '100%',
    marginTop: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    padding: Spacing.md,
    paddingRight: 50,
    fontSize: Typography.sizes.body,
    borderWidth: 2,
    color: Colors.textPrimary,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
  },
  eyeIcon: {
    fontSize: 20,
  },
  
  // Requirements
  requirementsList: {
    marginTop: Spacing.md,
    gap: 6,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  requirementIcon: {
    fontSize: 14,
    fontWeight: Typography.weights.bold,
    marginRight: 8,
    width: 16,
    textAlign: 'center',
  },
  requirementText: {
    fontSize: 13,
    flex: 1,
  },
  
  // Strength Meter
  strengthContainer: {
    marginTop: Spacing.md,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
  },
  strengthValue: {
    fontSize: 13,
    fontWeight: Typography.weights.bold,
  },
  strengthTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Match Status
  matchStatus: {
    marginTop: Spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  matchText: {
    fontSize: 13,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  
  // Actions
  actions: {
    flexDirection: 'row',
    paddingTop: Spacing.lg,
    marginTop: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.backgroundLight,
    gap: Spacing.md,
  },
  backButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
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
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  nextButtonText: {
    color: Colors.textLight,
    fontSize: Typography.sizes.button,
    fontWeight: Typography.weights.semibold,
  },
});

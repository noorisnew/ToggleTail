/**
 * Parent Gate Screen
 * Location: app/parent-gate.tsx
 * 
 * Login screen for parent authentication with rate limiting and lockout.
 * Uses bcrypt hashing for secure password verification.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/design';
import { addEvent } from '../src/data/storage/eventLogStorage';
import { normalizeError } from '../src/domain/services/errorService';
import {
    hasParentPassword,
    isLockedOut,
    LockoutStatus,
    setParentPasswordHash,
    verifyParentPassword,
} from '../src/services/parentGateService';

export default function ParentGateScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutStatus, setLockoutStatus] = useState<LockoutStatus | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const confirmInputRef = useRef<TextInput>(null);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkExistingPin();
    return () => {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
      }
    };
  }, []);

  // Start lockout countdown timer
  const startLockoutTimer = useCallback(() => {
    if (lockoutTimerRef.current) {
      clearInterval(lockoutTimerRef.current);
    }
    
    lockoutTimerRef.current = setInterval(async () => {
      const status = await isLockedOut();
      setLockoutStatus(status);
      
      if (!status.isLocked && lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
        lockoutTimerRef.current = null;
      }
    }, 1000);
  }, []);

  const checkExistingPin = async () => {
    try {
      const [exists, status] = await Promise.all([
        hasParentPassword(),
        isLockedOut(),
      ]);
      setHasExistingPin(exists);
      setLockoutStatus(status);
      
      if (status.isLocked) {
        startLockoutTimer();
      }
    } catch (error) {
      console.error('checkExistingPin:', normalizeError(error));
      Alert.alert('Error', 'Could not check PIN status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (pin.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters.');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await setParentPasswordHash(pin);
      
      if (result.success) {
        setPin('');
        setConfirmPin('');
        router.replace('/parent-home');
      } else {
        Alert.alert('Error', result.error || 'Could not save password. Please try again.');
      }
    } catch (error) {
      console.error('handleSetPin:', normalizeError(error));
      Alert.alert('Error', 'Could not save password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    // Check lockout first
    if (lockoutStatus?.isLocked) {
      Alert.alert('Locked Out', `Too many failed attempts. Try again in ${lockoutStatus.remainingSeconds} seconds.`);
      return;
    }
    
    if (pin.length < 1) {
      Alert.alert('Invalid Password', 'Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await verifyParentPassword(pin);
      
      if (result.success) {
        await addEvent({ type: 'PIN_SUCCESS' });
        setPin('');
        router.replace('/parent-home');
      } else {
        await addEvent({ type: 'PIN_FAIL' });
        
        // Check if now locked out
        if (result.isLocked) {
          setLockoutStatus({
            isLocked: true,
            remainingSeconds: result.lockoutSeconds || 30,
            failedAttempts: 5,
          });
          startLockoutTimer();
        }
        
        Alert.alert('Authentication Failed', result.error || 'Incorrect password.');
        setPin('');
      }
    } catch (error) {
      console.error('handleLogin:', normalizeError(error));
      Alert.alert('Error', 'Could not verify password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show PIN setup screen if no PIN exists
  if (!hasExistingPin) {
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
              <Text style={styles.emoji}>🔐</Text>
              <Text style={styles.title}>Set Parent Password</Text>
              <Text style={styles.subtitle}>Create a password (8+ characters) to access parent settings</Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.textMuted}
                  value={pin}
                  onChangeText={setPin}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmInputRef.current?.focus()}
                  blurOnSubmit={false}
                  accessibilityLabel="Password input"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  ref={confirmInputRef}
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor={Colors.textMuted}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSetPin}
                  accessibilityLabel="Confirm password input"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                onPress={handleSetPin} 
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={[Colors.primaryStart, Colors.primaryEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>Set Password</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>Cancel</Text>
              </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Show login screen if PIN exists
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
            <Text style={styles.emoji}>🔒</Text>
            <Text style={styles.title}>Parent Login</Text>
            <Text style={styles.subtitle}>Enter your password to continue</Text>
            
            {/* Lockout Warning */}
            {lockoutStatus?.isLocked && (
              <View style={styles.lockoutBanner}>
                <Text style={styles.lockoutIcon}>⏱️</Text>
                <Text style={styles.lockoutText}>
                  Too many failed attempts.{'\n'}
                  Try again in {lockoutStatus.remainingSeconds} seconds
                </Text>
              </View>
            )}

            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  lockoutStatus?.isLocked && styles.inputDisabled,
                ]}
                placeholder="Enter password"
                placeholderTextColor={Colors.textMuted}
                value={pin}
                onChangeText={setPin}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!lockoutStatus?.isLocked && !isSubmitting}
                accessibilityLabel="Password input"
                accessibilityHint="Enter your parent password to access settings"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={handleLogin} 
              activeOpacity={0.8}
              disabled={lockoutStatus?.isLocked || isSubmitting}
              accessibilityLabel="Login button"
              accessibilityRole="button"
              accessibilityState={{ disabled: lockoutStatus?.isLocked || isSubmitting }}
            >
              <LinearGradient
                colors={
                  lockoutStatus?.isLocked || isSubmitting
                    ? ['#d1d5db', '#9ca3af']
                    : [Colors.primaryStart, Colors.primaryEnd]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? 'Verifying...' : lockoutStatus?.isLocked ? 'Locked' : 'Login'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>
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
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Shadows.card,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  
  // Lockout Banner
  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  lockoutIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  lockoutText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    fontWeight: Typography.weights.semibold,
  },
  
  // Input
  inputWrapper: {
    width: '100%',
    position: 'relative',
    marginBottom: Spacing.md,
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.lg,
    paddingRight: 50,
    fontSize: 16,
    textAlign: 'left',
    borderWidth: 2,
    borderColor: Colors.borderCard,
    color: Colors.textPrimary,
  },
  inputDisabled: {
    opacity: 0.5,
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
  
  gradientButton: {
    paddingHorizontal: Spacing.xl * 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.button,
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: Colors.textLight,
    fontSize: Typography.sizes.button,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  backButton: {
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
  backButtonText: {
    color: Colors.textAccent,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  loadingText: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
  },
});

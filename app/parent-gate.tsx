import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/design';
import { addEvent } from '../src/data/storage/eventLogStorage';
import { PIN_KEY } from '../src/data/storage/storageKeys';
import { normalizeError } from '../src/domain/services/errorService';

export default function ParentGateScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if PIN already exists
  useEffect(() => {
    checkExistingPin();
  }, []);

  const checkExistingPin = async () => {
    try {
      const storedPin = await AsyncStorage.getItem(PIN_KEY);
      setHasExistingPin(storedPin !== null);
    } catch (error) {
      console.error('checkExistingPin:', normalizeError(error));
      Alert.alert('Error', 'Could not check PIN status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (pin.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    try {
      await AsyncStorage.setItem(PIN_KEY, pin);
      router.replace('/parent-home');
    } catch (error) {
      console.error('handleSetPin:', normalizeError(error));
      Alert.alert('Error', 'Could not save password. Please try again.');
    }
  };

  const handleLogin = async () => {
    if (pin.length < 6) {
      Alert.alert('Invalid Password', 'Please enter your password (6+ characters).');
      return;
    }

    try {
      const storedPin = await AsyncStorage.getItem(PIN_KEY);
      if (pin === storedPin) {
        await addEvent({ type: 'PIN_SUCCESS' });
        setPin('');
        router.replace('/parent-home');
      } else {
        await addEvent({ type: 'PIN_FAIL' });
        Alert.alert('Incorrect Password', 'The password you entered is incorrect.');
        setPin('');
      }
    } catch (error) {
      console.error('handleLogin:', normalizeError(error));
      Alert.alert('Error', 'Could not verify password. Please try again.');
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <Text style={styles.emoji}>🔐</Text>
              <Text style={styles.title}>Set Parent Password</Text>
              <Text style={styles.subtitle}>Create a password (6+ characters) to access parent settings</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={Colors.textMuted}
                value={pin}
                onChangeText={setPin}
                secureTextEntry
                returnKeyType="next"
              />

              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={Colors.textMuted}
                value={confirmPin}
                onChangeText={setConfirmPin}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSetPin}
              />

              <TouchableOpacity onPress={handleSetPin} activeOpacity={0.8}>
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
      </TouchableWithoutFeedback>
    );
  }

  // Show login screen if PIN exists
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.emoji}>🔒</Text>
            <Text style={styles.title}>Parent Login</Text>
            <Text style={styles.subtitle}>Enter your password to continue</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor={Colors.textMuted}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity onPress={handleLogin} activeOpacity={0.8}>
              <LinearGradient
                colors={[Colors.primaryStart, Colors.primaryEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Login</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
  input: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    textAlign: 'left',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    color: Colors.textPrimary,
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

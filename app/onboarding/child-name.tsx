import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/design';

const TEMP_NAME_KEY = 'onboarding_temp_name';

export default function ChildNameScreen() {
  const router = useRouter();
  const [name, setName] = useState('');

  const handleNext = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter the child\'s name.');
      return;
    }
    // Store name temporarily for subsequent screens
    await AsyncStorage.setItem(TEMP_NAME_KEY, name.trim());
    router.push('/onboarding/age');
  };

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
            <View style={[styles.progressFill, { width: '37.5%' }]} />
          </View>
          <Text style={styles.stepText}>Step 3 of 8</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.emoji}>👶</Text>
          <Text style={styles.title}>What's your child's name?</Text>
          <Text style={styles.description}>We'll use this to personalize their experience</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Child's First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Emma, Liam, Sofia..."
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={50}
              autoFocus
            />
          </View>
        </View>

        <View style={styles.actions}>
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
          >
            <LinearGradient
              colors={name.trim() ? [Colors.primaryStart, Colors.primaryEnd] : ['#d1d5db', '#9ca3af']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButton}
            >
              <Text style={styles.nextButtonText}>Next →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
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
  inputContainer: {
    width: '100%',
    marginTop: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.button,
    padding: Spacing.md,
    fontSize: Typography.sizes.body,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    color: Colors.textPrimary,
    textAlign: 'center',
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Spacing, Typography } from '../constants/design';
import { normalizeError } from '../src/domain/services/errorService';
import { clearParentPassword, hasParentPassword } from '../src/services/parentGateService';

// Dark theme colors for debug panel
const DebugColors = {
  background: '#1a1a2e',
  cardBackground: '#16213e',
  accent: '#4ecdc4',
  accentLight: '#a8d8ea',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  warning: '#ff6b6b',
  danger: ['#ff4444', '#cc0000'] as const,
  action: ['#4a90d9', '#357abd'] as const,
};

// Keys to display (AsyncStorage only - password is in SecureStore)
const STORAGE_KEYS = [
  'stories_v1',
  'narration_mode_v1',
  'onboarding_done_v1',
  'child_profile_v1',
  'event_log_v1',
];

type StorageData = Record<string, string | null>;

export default function DebugScreen() {
  const router = useRouter();
  const [storageData, setStorageData] = useState<StorageData>({});
  const [hasPassword, setHasPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    setLoading(true);
    try {
      const data: StorageData = {};
      for (const key of STORAGE_KEYS) {
        data[key] = await AsyncStorage.getItem(key);
      }
      setStorageData(data);
      // Check SecureStore for password
      const passwordExists = await hasParentPassword();
      setHasPassword(passwordExists);
    } catch (error) {
      console.error('loadStorageData:', normalizeError(error));
      Alert.alert('Error', 'Could not load storage data.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearPassword = async () => {
    try {
      await clearParentPassword();
      Alert.alert('Success', 'Parent password cleared from SecureStore.');
      loadStorageData();
    } catch (error) {
      console.error('handleClearPassword:', normalizeError(error));
      Alert.alert('Error', 'Could not clear password.');
    }
  };

  const handleClearStories = async () => {
    try {
      await AsyncStorage.removeItem('stories_v1');
      Alert.alert('Success', 'Stories cleared.');
      loadStorageData();
    } catch (error) {
      console.error('handleClearStories:', normalizeError(error));
      Alert.alert('Error', 'Could not clear stories.');
    }
  };

  const handleResetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('onboarding_done_v1');
      await AsyncStorage.removeItem('child_profile_v1');
      Alert.alert('Success', 'Onboarding reset.');
      loadStorageData();
    } catch (error) {
      console.error('handleResetOnboarding:', normalizeError(error));
      Alert.alert('Error', 'Could not reset onboarding.');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete ALL app data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Success', 'All data cleared.');
              loadStorageData();
            } catch (error) {
              console.error('handleClearAll:', normalizeError(error));
              Alert.alert('Error', 'Could not clear all data.');
            }
          },
        },
      ]
    );
  };

  const formatValue = (value: string | null): string => {
    if (value === null) return '(not set)';
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.emoji}>🛠️</Text>
        <Text style={styles.title}>Debug Panel</Text>
        <View style={styles.warningBadge}>
          <Text style={styles.warningText}>DEV ONLY</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📦 Storage Values</Text>
          
          {/* SecureStore password status */}
          <View style={styles.storageItem}>
            <Text style={styles.storageKey}>🔐 Parent Password (SecureStore)</Text>
            <Text style={[styles.storageValue, { color: hasPassword ? '#4ecdc4' : '#888888' }]}>
              {hasPassword ? '✓ Set (bcrypt hash)' : '(not set)'}
            </Text>
          </View>
          
          {/* AsyncStorage keys */}
          {STORAGE_KEYS.map((key) => (
            <View key={key} style={styles.storageItem}>
              <Text style={styles.storageKey}>{key}</Text>
              <Text style={styles.storageValue}>{formatValue(storageData[key])}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>

          <TouchableOpacity onPress={handleClearPassword} activeOpacity={0.8}>
            <LinearGradient
              colors={[...DebugColors.action]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>🔐 Clear Password</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClearStories} activeOpacity={0.8}>
            <LinearGradient
              colors={[...DebugColors.action]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>📚 Clear Stories</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResetOnboarding} activeOpacity={0.8}>
            <LinearGradient
              colors={[...DebugColors.action]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>🔄 Reset Onboarding</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClearAll} activeOpacity={0.8}>
            <LinearGradient
              colors={[...DebugColors.danger]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dangerButton}
            >
              <Text style={styles.dangerButtonText}>⚠️ Clear All Data</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
        <LinearGradient
          colors={[DebugColors.accent, '#38b2ac']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DebugColors.background,
    padding: Spacing.lg,
    paddingTop: 60,
  },
  headerCard: {
    backgroundColor: DebugColors.cardBackground,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emoji: {
    fontSize: 36,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: DebugColors.textPrimary,
  },
  warningBadge: {
    backgroundColor: DebugColors.warning,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.button,
    marginTop: Spacing.xs,
  },
  warningText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: DebugColors.textPrimary,
    letterSpacing: 1,
  },
  loadingText: {
    color: DebugColors.textSecondary,
    fontSize: Typography.sizes.body,
  },
  scroll: {
    flex: 1,
  },
  card: {
    backgroundColor: DebugColors.cardBackground,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: DebugColors.accent,
    marginBottom: Spacing.md,
  },
  storageItem: {
    backgroundColor: DebugColors.background,
    padding: Spacing.sm,
    borderRadius: BorderRadius.button,
    marginBottom: Spacing.sm,
  },
  storageKey: {
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    color: DebugColors.accentLight,
    marginBottom: 4,
  },
  storageValue: {
    fontSize: 11,
    color: DebugColors.textSecondary,
    fontFamily: 'monospace',
  },
  actionButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionButtonText: {
    color: DebugColors.textPrimary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
  },
  dangerButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  dangerButtonText: {
    color: DebugColors.textPrimary,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
  },
  backButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  backButtonText: {
    color: DebugColors.textPrimary,
    fontSize: Typography.sizes.button,
    fontWeight: Typography.weights.semibold,
  },
});

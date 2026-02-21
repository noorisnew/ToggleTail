import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/design';
import { clearEvents, getEvents, LogEvent } from '../src/data/storage/eventLogStorage';
import { normalizeError } from '../src/domain/services/errorService';

export default function LogsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<LogEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const loadEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (error) {
      console.error('loadEvents:', normalizeError(error));
      Alert.alert('Error', 'Could not load event logs.');
    }
  };

  const handleClearLogs = () => {
    Alert.alert('Clear Logs', 'Are you sure you want to clear all logs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearEvents();
            setEvents([]);
          } catch (error) {
            console.error('handleClearLogs:', normalizeError(error));
            Alert.alert('Error', 'Could not clear logs.');
          }
        },
      },
    ]);
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'STORY_OPEN':
        return '📖 Story Opened';
      case 'READ_START':
        return '▶️ Narration Started';
      case 'READ_STOP':
        return '⏹️ Narration Stopped';
      case 'PIN_SUCCESS':
        return '✅ PIN Success';
      case 'PIN_FAIL':
        return '❌ PIN Failed';
      default:
        return type;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.emoji}>📊</Text>
        <Text style={styles.title}>Event Logs</Text>
        <Text style={styles.subtitle}>Track activity and usage</Text>

        <TouchableOpacity onPress={handleClearLogs} activeOpacity={0.8}>
          <LinearGradient
            colors={['#ef4444', '#dc2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>🗑️ Clear All Logs</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No events logged yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.eventItem}>
              <Text style={styles.eventType}>{getEventLabel(item.type)}</Text>
              {item.storyId && (
                <Text style={styles.eventStoryId}>Story: {item.storyId.slice(0, 8)}...</Text>
              )}
              <Text style={styles.eventTime}>{formatTimestamp(item.timestamp)}</Text>
            </View>
          )}
        />
      </View>

      <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
        <LinearGradient
          colors={[Colors.primaryStart, Colors.primaryEnd]}
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
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    paddingTop: 60,
  },
  headerCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  emoji: {
    fontSize: 36,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  clearButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
  },
  clearButtonText: {
    color: Colors.textLight,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
  },
  listCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: Typography.sizes.body,
  },
  eventItem: {
    backgroundColor: Colors.backgroundLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderCard,
  },
  eventType: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  eventStoryId: {
    fontSize: Typography.sizes.small,
    color: Colors.textAccent,
    marginTop: 4,
  },
  eventTime: {
    fontSize: Typography.sizes.small,
    color: Colors.textMuted,
    marginTop: 4,
  },
  backButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.textLight,
    fontSize: Typography.sizes.button,
    fontWeight: Typography.weights.semibold,
  },
});

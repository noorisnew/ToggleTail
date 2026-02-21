import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Colors, Shadows, Spacing } from '../constants/design';
import { signOut } from '../src/data/storage/authStorage';
import { getNarrationMode, NarrationMode, setNarrationMode } from '../src/data/storage/narrationStorage';
import { deleteStory, getStories, Story, updateStory } from '../src/data/storage/storyStorage';
import { normalizeError } from '../src/domain/services/errorService';

export default function ParentHomeScreen() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [narrationMode, setNarrationModeState] = useState<NarrationMode>('AI');

  // Reload stories and narration mode when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStories();
      loadNarrationMode();
    }, [])
  );

  const loadStories = async () => {
    try {
      const data = await getStories();
      setStories(data);
    } catch (error) {
      console.error('loadStories:', normalizeError(error));
      Alert.alert('Error', 'Could not load stories. Please try again.');
    }
  };

  const loadNarrationMode = async () => {
    try {
      const mode = await getNarrationMode();
      setNarrationModeState(mode);
    } catch (error) {
      console.error('loadNarrationMode:', normalizeError(error));
      Alert.alert('Error', 'Could not load narration settings.');
    }
  };

  const handleSetNarrationMode = async (mode: NarrationMode) => {
    try {
      await setNarrationMode(mode);
      setNarrationModeState(mode);
    } catch (error) {
      console.error('handleSetNarrationMode:', normalizeError(error));
      Alert.alert('Error', 'Could not save narration mode. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Story', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteStory(id);
          if (success) {
            loadStories();
          } else {
            Alert.alert('Error', 'Could not delete story. Please try again.');
          }
        },
      },
    ]);
  };

  const handleToggleApproval = async (story: Story) => {
    const result = await updateStory(story.id, { approved: !story.approved });
    if (result) {
      loadStories();
    } else {
      Alert.alert('Error', 'Could not update story approval.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? This will clear all data including stories, recordings, and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const success = await signOut();
            if (success) {
              // Navigate to onboarding/welcome screen
              router.replace('/onboarding/welcome');
            } else {
              Alert.alert('Error', 'Could not sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>👨‍👩‍👧</Text>
          <Text style={styles.title}>Parent Dashboard</Text>
          <Text style={styles.subtitle}>Manage stories and settings</Text>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Narration Mode Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎙️ Narration Mode</Text>
            <View style={styles.narrationButtons}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  narrationMode === 'AI' && styles.modeButtonActive,
                ]}
                onPress={() => handleSetNarrationMode('AI')}
              >
                <Text style={styles.modeEmoji}>🤖</Text>
                <Text
                  style={[
                    styles.modeButtonText,
                    narrationMode === 'AI' && styles.modeButtonTextActive,
                  ]}
                >
                  AI Voice
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  narrationMode === 'Human' && styles.modeButtonActive,
                ]}
                onPress={() => handleSetNarrationMode('Human')}
              >
                <Text style={styles.modeEmoji}>🎤</Text>
                <Text
                  style={[
                    styles.modeButtonText,
                    narrationMode === 'Human' && styles.modeButtonTextActive,
                  ]}
                >
                  Your Voice
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/story-create')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[Colors.primaryStart, Colors.primaryEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addButtonGradient}
                >
                  <Text style={styles.addButtonText}>+ Add Story</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logsButton}
                onPress={() => router.push('/logs')}
              >
                <Text style={styles.logsButtonText}>📊 View Logs</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stories List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Stories ({stories.length})</Text>
            {stories.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📝</Text>
                <Text style={styles.emptyText}>No stories yet</Text>
                <Text style={styles.emptySubtext}>Tap "Add Story" to create one!</Text>
              </View>
            ) : (
              stories.map((item) => (
                <View key={item.id} style={styles.storyItem}>
                  <View style={styles.storyInfo}>
                    <View style={styles.storyHeader}>
                      <Text style={styles.storyTitle}>{item.title}</Text>
                      <View style={[
                        styles.statusBadge,
                        item.approved ? styles.statusApproved : styles.statusPending
                      ]}>
                        <Text style={styles.statusText}>
                          {item.approved ? '✅' : '⏳'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.storyDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <View style={styles.storyActions}>
                    <TouchableOpacity
                      style={styles.recordButton}
                      onPress={() => router.push({ pathname: '/record-narration', params: { id: item.id } })}
                    >
                      <Text style={styles.recordButtonText}>🎙️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.approveButton,
                        item.approved && styles.approveButtonActive,
                      ]}
                      onPress={() => handleToggleApproval(item)}
                    >
                      <Text style={styles.approveButtonText}>
                        {item.approved ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/child-home')}
          >
            <Text style={styles.backButtonText}>← Back to Child Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>🚪 Sign Out</Text>
          </TouchableOpacity>
          {__DEV__ && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => router.push('/debug')}
            >
              <Text style={styles.debugButtonText}>🛠️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundPrimary,
    padding: Spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    borderWidth: 4,
    borderColor: Colors.borderCard,
    overflow: 'hidden',
    ...Shadows.card,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: Colors.borderInput,
  },
  emoji: {
    fontSize: 40,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textAccent,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  narrationButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modeButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.backgroundInput,
    borderWidth: 2,
    borderColor: Colors.borderInput,
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: Colors.primaryStart,
    backgroundColor: '#f3e8ff',
  },
  modeEmoji: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modeButtonTextActive: {
    color: Colors.primaryStart,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  addButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  logsButton: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.backgroundInput,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.borderInput,
  },
  logsButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.backgroundInput,
    borderRadius: 12,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  storyItem: {
    backgroundColor: Colors.backgroundInput,
    padding: Spacing.md,
    borderRadius: 12,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.borderInput,
  },
  storyInfo: {
    flex: 1,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  storyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusApproved: {
    backgroundColor: '#dcfce7',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
  },
  storyDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  storyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  recordButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  recordButtonText: {
    fontSize: 14,
  },
  approveButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  approveButtonActive: {
    backgroundColor: Colors.textMuted,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 2,
    borderTopColor: Colors.borderInput,
    gap: Spacing.sm,
  },
  backButton: {
    flex: 1,
    backgroundColor: Colors.textSecondary,
    padding: Spacing.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  debugButton: {
    backgroundColor: '#1a1a2e',
    padding: Spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButtonText: {
    fontSize: 16,
  },
});

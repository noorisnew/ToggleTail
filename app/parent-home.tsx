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
import {
    AI_VOICE_OPTIONS,
    AIVoiceId,
    getNarrationSettings,
    NarrationMode,
    NarrationSettings,
    ParentVoiceLabel,
    saveNarrationSettings,
} from '../src/data/storage/narrationStorage';
import { deleteStory, getStories, Story } from '../src/data/storage/storyStorage';
import { normalizeError } from '../src/domain/services/errorService';
import { approveStory, removeApproval } from '../src/domain/services/storyApprovalService';

export default function ParentHomeScreen() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [narrationSettings, setNarrationSettingsState] = useState<NarrationSettings>({
    preferredSource: 'AI',
    aiVoiceId: 'Rachel',
    parentVoiceLabel: 'Parent',
  });

  // Reload stories and narration settings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStories();
      loadNarrationSettings();
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

  const loadNarrationSettings = async () => {
    try {
      const settings = await getNarrationSettings();
      setNarrationSettingsState(settings);
    } catch (error) {
      console.error('loadNarrationSettings:', normalizeError(error));
      Alert.alert('Error', 'Could not load narration settings.');
    }
  };

  const handleSetNarrationMode = async (mode: NarrationMode) => {
    try {
      const newSettings = { ...narrationSettings, preferredSource: mode };
      await saveNarrationSettings(newSettings);
      setNarrationSettingsState(newSettings);
    } catch (error) {
      console.error('handleSetNarrationMode:', normalizeError(error));
      Alert.alert('Error', 'Could not save narration mode. Please try again.');
    }
  };

  const handleSetAIVoice = async (voiceId: AIVoiceId) => {
    try {
      const newSettings = { ...narrationSettings, aiVoiceId: voiceId };
      await saveNarrationSettings(newSettings);
      setNarrationSettingsState(newSettings);
    } catch (error) {
      console.error('handleSetAIVoice:', normalizeError(error));
      Alert.alert('Error', 'Could not save voice selection.');
    }
  };

  const handleSetParentVoiceLabel = async (label: ParentVoiceLabel) => {
    try {
      const newSettings = { ...narrationSettings, parentVoiceLabel: label };
      await saveNarrationSettings(newSettings);
      setNarrationSettingsState(newSettings);
    } catch (error) {
      console.error('handleSetParentVoiceLabel:', normalizeError(error));
      Alert.alert('Error', 'Could not save voice label.');
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
    // Use storyApprovalService for consistent approval management
    const result = story.approved 
      ? await removeApproval(story.id)
      : await approveStory(story.id);
    
    if (result.success) {
      loadStories();
    } else {
      Alert.alert('Error', result.error || 'Could not update story approval.');
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
          {/* Narration Setup Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎙️ Narration Setup</Text>
            
            {/* Source Toggle */}
            <View style={styles.narrationButtons}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  narrationSettings.preferredSource === 'AI' && styles.modeButtonActive,
                ]}
                onPress={() => handleSetNarrationMode('AI')}
              >
                <Text style={styles.modeEmoji}>🤖</Text>
                <Text
                  style={[
                    styles.modeButtonText,
                    narrationSettings.preferredSource === 'AI' && styles.modeButtonTextActive,
                  ]}
                >
                  AI Voice
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  narrationSettings.preferredSource === 'Human' && styles.modeButtonActive,
                ]}
                onPress={() => handleSetNarrationMode('Human')}
              >
                <Text style={styles.modeEmoji}>🎤</Text>
                <Text
                  style={[
                    styles.modeButtonText,
                    narrationSettings.preferredSource === 'Human' && styles.modeButtonTextActive,
                  ]}
                >
                  Your Voice
                </Text>
              </TouchableOpacity>
            </View>

            {/* AI Voice Selection (shown when AI mode selected) */}
            {narrationSettings.preferredSource === 'AI' && (
              <View style={styles.voiceSelectionContainer}>
                <Text style={styles.voiceSelectionLabel}>Choose AI Voice:</Text>
                <View style={styles.voiceOptions}>
                  {AI_VOICE_OPTIONS.map((voice) => (
                    <TouchableOpacity
                      key={voice.id}
                      style={[
                        styles.voiceOption,
                        narrationSettings.aiVoiceId === voice.id && styles.voiceOptionActive,
                      ]}
                      onPress={() => handleSetAIVoice(voice.id)}
                    >
                      <Text style={styles.voiceOptionEmoji}>{voice.emoji}</Text>
                      <Text style={[
                        styles.voiceOptionName,
                        narrationSettings.aiVoiceId === voice.id && styles.voiceOptionNameActive,
                      ]}>{voice.name}</Text>
                      <Text style={styles.voiceOptionDesc}>{voice.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Parent Voice Label (shown when Human mode selected) */}
            {narrationSettings.preferredSource === 'Human' && (
              <View style={styles.voiceSelectionContainer}>
                <Text style={styles.voiceSelectionLabel}>Voice Label:</Text>
                <View style={styles.voiceOptions}>
                  {(['Mom', 'Dad', 'Parent'] as ParentVoiceLabel[]).map((label) => (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.voiceOption,
                        narrationSettings.parentVoiceLabel === label && styles.voiceOptionActive,
                      ]}
                      onPress={() => handleSetParentVoiceLabel(label)}
                    >
                      <Text style={styles.voiceOptionEmoji}>
                        {label === 'Mom' ? '👩' : label === 'Dad' ? '👨' : '👤'}
                      </Text>
                      <Text style={[
                        styles.voiceOptionName,
                        narrationSettings.parentVoiceLabel === label && styles.voiceOptionNameActive,
                      ]}>{label}'s Voice</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Create Story - Primary Feature */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Create</Text>
            <TouchableOpacity
              style={styles.createStoryButton}
              onPress={() => router.push('/story-create')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[Colors.primaryStart, Colors.primaryEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createStoryGradient}
              >
                <Text style={styles.createStoryEmoji}>📖</Text>
                <View style={styles.createStoryTextContainer}>
                  <Text style={styles.createStoryTitle}>Create Your Own Story</Text>
                  <Text style={styles.createStorySubtitle}>Personalized stories for your child</Text>
                </View>
                <Text style={styles.createStoryArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Stories List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Stories ({stories.length})</Text>
            {stories.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📝</Text>
                <Text style={styles.emptyText}>No stories yet</Text>
                <Text style={styles.emptySubtext}>Create your first story above!</Text>
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

          {/* Settings & Logs - Secondary Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ More</Text>
            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/parent-settings')}
              >
                <Text style={styles.secondaryButtonEmoji}>⚙️</Text>
                <Text style={styles.secondaryButtonText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/logs')}
              >
                <Text style={styles.secondaryButtonEmoji}>📊</Text>
                <Text style={styles.secondaryButtonText}>View Logs</Text>
              </TouchableOpacity>
            </View>
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
  settingsButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C4B5FD',
  },
  settingsButtonText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '600',
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
  // Voice Selection Styles
  voiceSelectionContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  voiceSelectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  voiceOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  voiceOption: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 10,
    backgroundColor: Colors.backgroundInput,
    borderWidth: 2,
    borderColor: Colors.borderInput,
    alignItems: 'center',
  },
  voiceOptionActive: {
    borderColor: Colors.primaryStart,
    backgroundColor: '#f3e8ff',
  },
  voiceOptionEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  voiceOptionName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  voiceOptionNameActive: {
    color: Colors.primaryStart,
  },
  voiceOptionDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Create Story Button Styles
  createStoryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createStoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  createStoryEmoji: {
    fontSize: 32,
  },
  createStoryTextContainer: {
    flex: 1,
  },
  createStoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  createStorySubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  createStoryArrow: {
    fontSize: 20,
    color: '#fff',
  },
  // Secondary Actions Styles
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.backgroundInput,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.borderInput,
    gap: Spacing.sm,
  },
  secondaryButtonEmoji: {
    fontSize: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});

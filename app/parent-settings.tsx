import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/design';
import { deleteClonedVoice } from '../src/data/api/elevenLabsApi';
import {
    AI_VOICE_OPTIONS,
    AIVoiceId,
    getNarrationSettings,
    NarrationSettings,
    saveNarrationSettings,
} from '../src/data/storage/narrationStorage';
import { getStories, Story, updateStory } from '../src/data/storage/storyStorage';
import { isPreloadedStory } from '../src/data/seeder/index';
import {
    playElevenLabsAudio,
    stopElevenLabsPlayback,
} from '../src/services/elevenLabsPlaybackService';
import { stopPlayback as stopNarrationPlayback } from '../src/services/narrationService';

// ─── Voice preview samples ────────────────────────────────────────────────────
const AI_VOICE_PREVIEWS: Record<AIVoiceId, { sample: string; rate: number; pitch: number }> = {
  Rachel:  { sample: 'Hi there! I am Rachel, a warm and natural storyteller.',                rate: 0.95, pitch: 1.0  },
  Dorothy: { sample: 'Hello sweetheart. I am Dorothy, gentle and soothing.',                  rate: 0.82, pitch: 0.92 },
  Josh:    { sample: 'Hey! I am Josh. I keep stories fun and playful!',                        rate: 1.02, pitch: 1.08 },
  Adam:    { sample: 'Hello. I am Adam, with a clear, deep voice for confident narration.',   rate: 0.90, pitch: 0.86 },
  Sarah:   { sample: 'Hi! I am Sarah, bright and lively for every story adventure.',          rate: 1.0,  pitch: 1.12 },
};

type LibTab = 'preloaded' | 'ai' | 'pending';

export default function ParentSettingsScreen() {
  const router = useRouter();

  // Narration
  const [narrationSettings, setNarrationSettings] = useState<NarrationSettings | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<AIVoiceId | null>(null);
  const [isPreviewingClone, setIsPreviewingClone] = useState(false);

  // Library
  const [stories, setStories]   = useState<Story[]>([]);
  const [libTab, setLibTab]     = useState<LibTab>('preloaded');

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async () => {
    const [narration, allStories] = await Promise.all([
      getNarrationSettings(),
      getStories(),
    ]);
    setNarrationSettings(narration);
    setStories(allStories);
  };

  // ── Narration helpers ───────────────────────────────────────────────────────

  const updateNarration = async (updates: Partial<NarrationSettings>) => {
    if (!narrationSettings) return;
    const updated = { ...narrationSettings, ...updates };
    setNarrationSettings(updated);
    await saveNarrationSettings(updated);
  };

  const stopAllAudio = async () => {
    await stopElevenLabsPlayback();
    await stopNarrationPlayback();
    await Speech.stop();
    setPreviewingVoiceId(null);
    setIsPreviewingClone(false);
  };

  const handleSelectAIVoice = (voiceId: AIVoiceId) => {
    updateNarration({ aiVoiceId: voiceId, useClonedVoice: false });
  };

  const handleToggleClonedVoice = () => {
    if (!narrationSettings?.clonedVoiceId) return;
    updateNarration({ useClonedVoice: !narrationSettings.useClonedVoice });
  };

  const handlePreviewVoice = async (voiceId: AIVoiceId) => {
    const wasPreviewingThis = previewingVoiceId === voiceId;
    await stopAllAudio();
    if (wasPreviewingThis) return;

    setPreviewingVoiceId(voiceId);
    const preview = AI_VOICE_PREVIEWS[voiceId];
    const result = await playElevenLabsAudio('voice_preview', 0, preview.sample, voiceId, () => setPreviewingVoiceId(null));
    if (!result.success) {
      Speech.speak(preview.sample, {
        rate: preview.rate, pitch: preview.pitch,
        onDone: () => setPreviewingVoiceId(null),
        onStopped: () => setPreviewingVoiceId(null),
        onError: () => setPreviewingVoiceId(null),
      });
    }
  };

  const handlePreviewClone = async () => {
    const voiceId = narrationSettings?.clonedVoiceId;
    if (!voiceId) return;
    if (isPreviewingClone) {
      await stopElevenLabsPlayback();
      setIsPreviewingClone(false);
      return;
    }
    await stopAllAudio();
    setIsPreviewingClone(true);
    const result = await playElevenLabsAudio(
      'voice_clone_preview', 0,
      'Hello! This is your voice clone. Your child will hear their stories narrated in this AI version of your voice.',
      voiceId,
      () => setIsPreviewingClone(false),
    );
    if (!result.success) setIsPreviewingClone(false);
  };

  const handleDeleteClone = () => {
    Alert.alert(
      'Remove Voice Clone',
      'This will permanently delete your voice clone from ElevenLabs. You can re-record anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const voiceId = narrationSettings?.clonedVoiceId;
            if (voiceId) deleteClonedVoice(voiceId);
            await updateNarration({ clonedVoiceId: undefined, useClonedVoice: false });
          },
        },
      ]
    );
  };

  // ── Library helpers ─────────────────────────────────────────────────────────

  const filteredStories = (): Story[] => {
    if (libTab === 'preloaded') return stories.filter(s => isPreloadedStory(s) && s.approved);
    if (libTab === 'ai')        return stories.filter(s => !isPreloadedStory(s) && s.approved);
    return stories.filter(s => !s.approved);
  };

  const handleToggleApproval = async (story: Story) => {
    const updated = await updateStory(story.id, { approved: !story.approved });
    if (updated) setStories(prev => prev.map(s => s.id === story.id ? updated : s));
  };

  // ── Active voice logic ──────────────────────────────────────────────────────

  const isAIVoiceActive = (voiceId: AIVoiceId) =>
    narrationSettings?.aiVoiceId === voiceId && !narrationSettings.useClonedVoice;

  const isCloneActive = () => !!narrationSettings?.useClonedVoice && !!narrationSettings?.clonedVoiceId;

  const libCounts = {
    preloaded: stories.filter(s => isPreloadedStory(s) && s.approved).length,
    ai:        stories.filter(s => !isPreloadedStory(s) && s.approved).length,
    pending:   stories.filter(s => !s.approved).length,
  };

  if (!narrationSettings) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryStart, Colors.primaryEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parent Settings</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ═══════════════════════════════════════════════════════════════════
            NARRATION SETUP
        ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionEmoji}>🎧</Text>
            <Text style={styles.sectionLabel}>Narration Setup</Text>
          </View>

          {/* Voice card row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.voiceRow}
          >
            {/* AI voice cards */}
            {AI_VOICE_OPTIONS.map(voice => {
              const active = isAIVoiceActive(voice.id as AIVoiceId);
              const previewing = previewingVoiceId === voice.id;
              return (
                <TouchableOpacity
                  key={voice.id}
                  style={[styles.voiceCard, active && styles.voiceCardActive]}
                  onPress={() => handleSelectAIVoice(voice.id as AIVoiceId)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.voiceCardEmoji}>{voice.emoji}</Text>
                  <Text style={[styles.voiceCardName, active && styles.voiceCardNameActive]}>{voice.name}</Text>
                  <Text style={styles.voiceCardDesc} numberOfLines={2}>{voice.description}</Text>
                  {active && <View style={styles.activeDot} />}
                  <TouchableOpacity
                    style={[styles.previewBtn, previewing && styles.previewBtnActive]}
                    onPress={() => handlePreviewVoice(voice.id as AIVoiceId)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={[styles.previewBtnText, previewing && styles.previewBtnTextActive]}>
                      {previewing ? '■' : '▶'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            {/* Custom voice card */}
            {narrationSettings.clonedVoiceId ? (
              <TouchableOpacity
                style={[styles.voiceCard, styles.cloneCard, isCloneActive() && styles.voiceCardActive]}
                onPress={handleToggleClonedVoice}
                activeOpacity={0.8}
              >
                <Text style={styles.voiceCardEmoji}>👤</Text>
                <Text style={[styles.voiceCardName, isCloneActive() && styles.voiceCardNameActive]}>My Voice</Text>
                <Text style={styles.voiceCardDesc}>Your cloned voice</Text>
                {isCloneActive() && <View style={styles.activeDot} />}
                <View style={styles.cloneActions}>
                  <TouchableOpacity
                    style={[styles.previewBtn, isPreviewingClone && styles.previewBtnActive]}
                    onPress={handlePreviewClone}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={[styles.previewBtnText, isPreviewingClone && styles.previewBtnTextActive]}>
                      {isPreviewingClone ? '■' : '▶'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDeleteClone}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.deleteCloneText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.voiceCard, styles.addVoiceCard]}
                onPress={() => router.push('/recording-studio')}
                activeOpacity={0.8}
              >
                <Text style={styles.addVoiceIcon}>+</Text>
                <Text style={styles.addVoiceName}>Your Voice</Text>
                <Text style={styles.addVoiceDesc}>Clone your voice with ElevenLabs</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Narration mode toggle — page-by-page recordings vs AI */}
          <View style={styles.modeRow}>
            <View style={styles.modeInfo}>
              <Text style={styles.modeLabel}>Page-by-page Recordings</Text>
              <Text style={styles.modeDesc}>Use your voice recordings per story page instead of AI</Text>
            </View>
            <Switch
              value={narrationSettings.preferredSource === 'Human'}
              onValueChange={v => updateNarration({ preferredSource: v ? 'Human' : 'AI' })}
              trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
              thumbColor={narrationSettings.preferredSource === 'Human' ? '#7C3AED' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            CREATE
        ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionEmoji}>⚡</Text>
            <Text style={styles.sectionLabel}>Create</Text>
          </View>

          <TouchableOpacity
            style={styles.createCard}
            onPress={() => router.push('/story-create')}
            activeOpacity={0.8}
          >
            <View style={styles.createCardLeft}>
              <Text style={styles.createCardEmoji}>📖</Text>
              <View>
                <Text style={styles.createCardTitle}>Your Own Story</Text>
                <Text style={styles.createCardDesc}>Generate a custom story with AI</Text>
              </View>
            </View>
            <Text style={styles.createCardArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createCard}
            onPress={() => router.push('/recording-studio')}
            activeOpacity={0.8}
          >
            <View style={styles.createCardLeft}>
              <Text style={styles.createCardEmoji}>🎙️</Text>
              <View>
                <Text style={styles.createCardTitle}>Your Own Voice</Text>
                <Text style={styles.createCardDesc}>
                  {narrationSettings.clonedVoiceId ? 'Re-record or update your voice clone' : 'Clone your voice for story narration'}
                </Text>
              </View>
            </View>
            <Text style={styles.createCardArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            MANAGE LIBRARY
        ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionEmoji}>📚</Text>
            <Text style={styles.sectionLabel}>Manage Library</Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {([
              { key: 'preloaded', label: 'Preloaded', count: libCounts.preloaded },
              { key: 'ai',        label: 'AI Stories', count: libCounts.ai },
              { key: 'pending',   label: 'Pending',    count: libCounts.pending },
            ] as { key: LibTab; label: string; count: number }[]).map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, libTab === tab.key && styles.tabActive]}
                onPress={() => setLibTab(tab.key)}
              >
                <Text style={[styles.tabText, libTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.tabBadge, libTab === tab.key && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, libTab === tab.key && styles.tabBadgeTextActive]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Story list */}
          <View style={styles.storyList}>
            {filteredStories().length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>
                  {libTab === 'preloaded' ? '📚' : libTab === 'ai' ? '🤖' : '⏳'}
                </Text>
                <Text style={styles.emptyText}>
                  {libTab === 'preloaded' ? 'No preloaded stories found'
                   : libTab === 'ai' ? 'No AI-generated stories yet'
                   : 'No pending stories'}
                </Text>
              </View>
            ) : (
              filteredStories().map(story => (
                <View key={story.id} style={styles.storyRow}>
                  <View style={styles.storyInfo}>
                    <Text style={styles.storyTitle} numberOfLines={1}>{story.title}</Text>
                    <Text style={styles.storyMeta}>
                      {story.difficulty} · {story.tags?.slice(0, 2).join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.approveToggle, story.approved && styles.approveToggleOn]}
                    onPress={() => handleToggleApproval(story)}
                  >
                    <Text style={[styles.approveToggleText, story.approved && styles.approveToggleTextOn]}>
                      {story.approved ? '✓ On' : 'Off'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════
            BOTTOM BUTTONS
        ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => router.push('/advanced-settings')}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomBtnEmoji}>⚙️</Text>
            <Text style={styles.bottomBtnText}>Advanced</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => router.push('/parent-home')}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomBtnEmoji}>📋</Text>
            <Text style={styles.bottomBtnText}>Logs</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280', fontWeight: '600' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 36 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },

  // Section wrapper
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionEmoji: { fontSize: 18 },
  sectionLabel: { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: 0.2 },

  // ── Voice cards ────────────────────────────────────────────────────────────
  voiceRow: { paddingRight: 8, gap: 10, paddingBottom: 4 },
  voiceCard: {
    width: 110,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  voiceCardActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  voiceCardEmoji: { fontSize: 26 },
  voiceCardName: { fontSize: 13, fontWeight: '700', color: '#374151', textAlign: 'center' },
  voiceCardNameActive: { color: '#7C3AED' },
  voiceCardDesc: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', lineHeight: 13 },
  activeDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#7C3AED', marginTop: 2,
  },
  previewBtn: {
    marginTop: 6, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  previewBtnActive: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED' },
  previewBtnText: { color: '#6B7280', fontSize: 11, fontWeight: '700' },
  previewBtnTextActive: { color: '#7C3AED' },

  // Clone card
  cloneCard: { borderStyle: 'dashed', borderColor: '#A78BFA' },
  cloneActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  deleteCloneText: { color: '#EF4444', fontSize: 13, fontWeight: '700', paddingTop: 5 },

  // Add voice card
  addVoiceCard: {
    borderStyle: 'dashed',
    borderColor: '#C4B5FD',
    backgroundColor: '#FAFAFF',
    justifyContent: 'center',
    minHeight: 130,
  },
  addVoiceIcon: { fontSize: 28, color: '#7C3AED', fontWeight: '300', textAlign: 'center' },
  addVoiceName: { fontSize: 13, fontWeight: '700', color: '#7C3AED', textAlign: 'center' },
  addVoiceDesc: { fontSize: 10, color: '#A78BFA', textAlign: 'center', lineHeight: 13 },

  // Mode toggle
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modeInfo: { flex: 1, paddingRight: 12 },
  modeLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modeDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // ── Create cards ──────────────────────────────────────────────────────────
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  createCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  createCardEmoji: { fontSize: 24 },
  createCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  createCardDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  createCardArrow: { fontSize: 18, color: '#9CA3AF', fontWeight: '300' },

  // ── Library ───────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#111827' },
  tabBadge: { backgroundColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: '#EDE9FE' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  tabBadgeTextActive: { color: '#7C3AED' },

  storyList: { gap: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },

  storyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  storyInfo: { flex: 1, paddingRight: 8 },
  storyTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  storyMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  approveToggle: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, backgroundColor: '#F3F4F6',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  approveToggleOn: { backgroundColor: '#F0FDF4', borderColor: '#22C55E' },
  approveToggleText: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  approveToggleTextOn: { color: '#16A34A' },

  // ── Bottom row ─────────────────────────────────────────────────────────────
  bottomRow: { flexDirection: 'row', gap: 12 },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomBtnEmoji: { fontSize: 18 },
  bottomBtnText: { fontSize: 15, fontWeight: '700', color: '#374151' },
});

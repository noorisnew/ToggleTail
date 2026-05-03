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

export default function ParentSettingsScreen() {
  const router = useRouter();

  // Narration
  const [narrationSettings, setNarrationSettings] = useState<NarrationSettings | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<AIVoiceId | null>(null);
  const [isPreviewingClone, setIsPreviewingClone] = useState(false);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const loadAll = async () => {
    const narration = await getNarrationSettings();
    setNarrationSettings(narration);
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

  // ── Active voice logic ──────────────────────────────────────────────────────

  const isAIVoiceActive = (voiceId: AIVoiceId) =>
    narrationSettings?.aiVoiceId === voiceId && !narrationSettings.useClonedVoice;

  const isCloneActive = () => !!narrationSettings?.useClonedVoice && !!narrationSettings?.clonedVoiceId;

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

          <View style={styles.voiceCloneNotice}>
            <Text style={styles.voiceCloneNoticeText}>
              Currently, to keep the app free, we can only offer 1 voice clone at a time.
            </Text>
          </View>

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

        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionEmoji}>🎙️</Text>
            <Text style={styles.sectionLabel}>Voice Tools</Text>
          </View>

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

  voiceCloneNotice: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  voiceCloneNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#92400E',
    fontWeight: '600',
  },

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

});

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { cloneVoice } from '../src/data/api/elevenLabsApi';
import { getNarrationSettings, saveNarrationSettings } from '../src/data/storage/narrationStorage';
import {
    cancelRecording,
    formatDuration,
    playRecording,
    startRecording,
    stopPlayback,
    stopRecording,
} from '../src/services/narrationService';

type Step = 'idle' | 'recording' | 'reviewing' | 'processing' | 'done';

const BAR_COUNT = 7;
const BAR_BASE_HEIGHTS = [36, 52, 64, 72, 64, 52, 36];
const BAR_DURATIONS    = [360, 290, 440, 310, 470, 300, 390];

export default function RecordingStudio() {
  const [step, setStep]               = useState<Step>('idle');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [durationMs, setDurationMs]   = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [cloneError, setCloneError]   = useState<string | null>(null);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const barAnims     = useRef(BAR_BASE_HEIGHTS.map(() => new Animated.Value(0.12))).current;
  const barLoopRefs  = useRef<Animated.CompositeAnimation[]>([]);
  const micScale     = useRef(new Animated.Value(1)).current;
  const micPulseRef  = useRef<Animated.CompositeAnimation | null>(null);
  const doneScale    = useRef(new Animated.Value(0)).current;

  useEffect(() => () => { cleanupAll(); }, []);

  const cleanupAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopBars();
    cancelRecording().catch(() => {});
    stopPlayback().catch(() => {});
  };

  // ── Bar animation ─────────────────────────────────────────────────────────

  const startBars = () => {
    barLoopRefs.current.forEach(a => a.stop());
    barLoopRefs.current = barAnims.map((anim, i) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 0.7 + Math.random() * 0.3, duration: BAR_DURATIONS[i], useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.1 + Math.random() * 0.2, duration: BAR_DURATIONS[i], useNativeDriver: true }),
        ])
      );
      setTimeout(() => loop.start(), i * 55);
      return loop;
    });

    micPulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(micScale, { toValue: 1.14, duration: 650, useNativeDriver: true }),
        Animated.timing(micScale, { toValue: 1,    duration: 650, useNativeDriver: true }),
      ])
    );
    micPulseRef.current.start();
  };

  const stopBars = () => {
    barLoopRefs.current.forEach(a => a.stop());
    barAnims.forEach(a =>
      Animated.timing(a, { toValue: 0.12, duration: 250, useNativeDriver: true }).start()
    );
    micPulseRef.current?.stop();
    micScale.setValue(1);
  };

  const animateDone = () => {
    Animated.spring(doneScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    barAnims.forEach(a =>
      Animated.timing(a, { toValue: 0.65, duration: 400, useNativeDriver: true }).start()
    );
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setCloneError(null);
    const result = await startRecording();
    if (!result.success) {
      const msg =
        result.error === 'expo_go_unsupported'
          ? 'Voice recording requires a native build — not Expo Go.'
          : result.error === 'permission_denied'
          ? 'Microphone access is required. Please allow it in your device settings.'
          : result.message ?? 'Could not start recording. Please try again.';
      Alert.alert('Cannot Record', msg);
      return;
    }
    setTimerSeconds(0);
    setStep('recording');
    startBars();
    timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
  };

  const handleStop = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopBars();
    const result = await stopRecording();
    if (!result) {
      setStep('idle');
      Alert.alert('Recording Error', 'Failed to save the recording. Please try again.');
      return;
    }
    setRecordingUri(result.uri);
    setDurationMs(result.durationMs);
    setStep('reviewing');
  };

  const handleCancel = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopBars();
    await cancelRecording();
    await stopPlayback();
    setTimerSeconds(0);
    setRecordingUri(null);
    setIsPlayingPreview(false);
    setStep('idle');
  };

  const handlePlayPreview = async () => {
    if (!recordingUri) return;
    if (isPlayingPreview) {
      await stopPlayback();
      setIsPlayingPreview(false);
      return;
    }
    setIsPlayingPreview(true);
    await playRecording(recordingUri, () => setIsPlayingPreview(false));
  };

  const handleCreateClone = async () => {
    if (!recordingUri) return;
    await stopPlayback();
    setIsPlayingPreview(false);
    setCloneError(null);
    setStep('processing');

    const result = await cloneVoice(recordingUri, 'My Voice');
    if (!result.success) {
      setCloneError(result.error ?? 'Voice cloning failed. Please try again.');
      setStep('reviewing');
      return;
    }

    const settings = await getNarrationSettings();
    await saveNarrationSettings({ ...settings, clonedVoiceId: result.voiceId, useClonedVoice: true });

    setStep('done');
    animateDone();
    setTimeout(() => router.back(), 2400);
  };

  const fmtTimer = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const barColor = step === 'recording' ? '#F87171' : step === 'done' ? '#34D399' : '#A78BFA';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0D001F', '#1E0545', '#140334']} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => { cleanupAll(); router.back(); }}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recording Studio</Text>
        <View style={styles.elBadge}>
          <Text style={styles.elBadgeText}>ElevenLabs</Text>
        </View>
      </View>

      <View style={styles.content}>

        {/* Studio visual area */}
        <View style={styles.studioArea}>
          <Animated.View style={[styles.micOuter, { transform: [{ scale: micScale }] }]}>
            <LinearGradient
              colors={step === 'recording' ? ['#EF4444', '#B91C1C'] : step === 'done' ? ['#10B981', '#059669'] : ['#7C3AED', '#4C1D95']}
              style={styles.micCircle}
            >
              <Text style={styles.micEmoji}>🎙️</Text>
            </LinearGradient>
          </Animated.View>

          <View style={styles.barsRow}>
            {barAnims.map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.bar,
                  {
                    height: BAR_BASE_HEIGHTS[i],
                    backgroundColor: barColor,
                    transform: [{ scaleY: anim }],
                    opacity: step === 'idle' ? 0.18 : 0.85,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Step content */}
        {step === 'idle' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Ready to Record</Text>
            <Text style={styles.stepDesc}>
              Read aloud for at least 30 seconds — a passage from a book, a bedtime story, anything natural. Your voice will become an AI narrator your child hears in every story.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStart} activeOpacity={0.85}>
              <View style={styles.recDot} />
              <Text style={styles.primaryBtnText}>Start Recording</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'recording' && (
          <View style={styles.stepContent}>
            <View style={styles.recIndicator}>
              <View style={styles.recDotLive} />
              <Text style={styles.recLabel}>RECORDING</Text>
            </View>
            <Text style={styles.timerText}>{fmtTimer(timerSeconds)}</Text>
            <Text style={styles.recordingHint}>
              {timerSeconds < 10
                ? 'Keep going — minimum 10 seconds'
                : timerSeconds < 30
                ? 'Good! Longer gives better quality'
                : "Great! Stop when you're ready"}
            </Text>
            <View style={styles.dualActions}>
              <TouchableOpacity style={styles.ghostBtn} onPress={handleCancel}>
                <Text style={styles.ghostBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stopBtn, timerSeconds < 10 && styles.stopBtnDisabled]}
                onPress={timerSeconds >= 10 ? handleStop : undefined}
                activeOpacity={timerSeconds >= 10 ? 0.85 : 1}
              >
                <Text style={styles.stopBtnText}>■  Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'reviewing' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review Recording</Text>
            <Text style={styles.reviewDuration}>
              Duration: {formatDuration(durationMs)}
            </Text>
            {cloneError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{cloneError}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.playBtn, isPlayingPreview && styles.playBtnActive]}
              onPress={handlePlayPreview}
              activeOpacity={0.85}
            >
              <Text style={styles.playBtnText}>
                {isPlayingPreview ? '■  Stop Playback' : '▶  Play Recording'}
              </Text>
            </TouchableOpacity>
            <View style={styles.dualActions}>
              <TouchableOpacity style={styles.ghostBtn} onPress={handleCancel}>
                <Text style={styles.ghostBtnText}>Re-record</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cloneBtn} onPress={handleCreateClone} activeOpacity={0.85}>
                <Text style={styles.cloneBtnText}>Create Voice Clone →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 'processing' && (
          <View style={styles.stepContent}>
            <ActivityIndicator size="large" color="#A78BFA" style={{ marginBottom: 20 }} />
            <Text style={styles.stepTitle}>Cloning Your Voice</Text>
            <Text style={styles.stepDesc}>
              ElevenLabs is processing your recording. This usually takes 30–60 seconds.
            </Text>
          </View>
        )}

        {step === 'done' && (
          <View style={styles.stepContent}>
            <Animated.Text style={[styles.doneEmoji, { transform: [{ scale: doneScale }] }]}>
              ✅
            </Animated.Text>
            <Text style={styles.stepTitle}>Voice Clone Ready!</Text>
            <Text style={styles.stepDesc}>
              Your voice has been cloned. Your child will hear you narrate every story.
            </Text>
            <Text style={styles.doneFootnote}>Returning to settings…</Text>
          </View>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D001F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  elBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
  },
  elBadgeText: { color: '#C4B5FD', fontSize: 11, fontWeight: '600' },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  // Studio visual
  studioArea: { alignItems: 'center', marginBottom: 48 },
  micOuter: { marginBottom: 32 },
  micCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 16,
  },
  micEmoji: { fontSize: 52 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bar: { width: 8, borderRadius: 4 },

  // Step content
  stepContent: { width: '100%', alignItems: 'center' },
  stepTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Recording state
  recIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  recDotLive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F87171',
    marginRight: 8,
  },
  recLabel: { color: '#F87171', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  timerText: {
    color: '#fff',
    fontSize: 52,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 4,
    marginBottom: 12,
  },
  recordingHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 32,
    textAlign: 'center',
  },

  // Reviewing state
  reviewDuration: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { color: '#FCA5A5', fontSize: 13, textAlign: 'center' },

  // Done state
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneFootnote: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 30,
    gap: 10,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  dualActions: { flexDirection: 'row', gap: 12, width: '100%' },
  ghostBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  ghostBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },

  stopBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  stopBtnDisabled: { backgroundColor: 'rgba(239,68,68,0.35)' },
  stopBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  playBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
    alignItems: 'center',
    marginBottom: 16,
  },
  playBtnActive: { backgroundColor: 'rgba(124,58,237,0.25)', borderColor: '#7C3AED' },
  playBtnText: { color: '#C4B5FD', fontSize: 15, fontWeight: '600' },

  cloneBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  cloneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

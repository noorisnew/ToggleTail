import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { cloneVoice } from '../src/data/api/elevenLabsApi';
import { getStoryById } from '../src/data/api/storyApi';
import {
    finalizeStoryRecording,
    getPageRecording,
    getStoryRecordingsForNarrator,
    NarratorSlot,
    StoryRecordings,
} from '../src/data/storage/narrationRecordingStorage';
import { getNarrationSettings, ParentVoiceLabel, saveNarrationSettings } from '../src/data/storage/narrationStorage';
import { getStories } from '../src/data/storage/storyStorage';
import { normalizeError } from '../src/domain/services/errorService';
import {
    cancelRecording,
    formatDuration,
    playRecording,
    requestRecordingPermissions,
    saveRecording,
    startRecording,
    stopPlayback,
    stopRecording,
} from '../src/services/narrationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RecordNarrationScreen() {
  const router = useRouter();
  const { id, source, narratorSlot } = useLocalSearchParams<{ id: string; source?: string; narratorSlot?: NarratorSlot }>();
  
  const [story, setStory] = useState<{ id: string; title: string; text: string } | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [tempRecording, setTempRecording] = useState<{ uri: string; durationMs: number } | null>(null);
  const [existingRecording, setExistingRecording] = useState<{ uri: string; durationMs: number } | null>(null);
  const [storyRecordings, setStoryRecordings] = useState<StoryRecordings | null>(null);
  const [isExpoGo, setIsExpoGo] = useState(false);
  const [selectedNarratorSlot, setSelectedNarratorSlot] = useState<NarratorSlot>('Mom');
  
  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Detect if running in Expo Go (recording won't work there)
    const isRunningInExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    setIsExpoGo(isRunningInExpoGo);
    
    loadStory();
    return () => {
      stopPlayback();
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [id, source]);

  useEffect(() => {
    if (story) {
      loadExistingRecording();
      loadNarratorRecordings();
    }
  }, [currentPage, story, selectedNarratorSlot]);

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const loadStory = async () => {
    try {
      const settings = await getNarrationSettings();
      const preferredSlot = narratorSlot === 'Dad' || narratorSlot === 'Mom'
        ? narratorSlot
        : settings.parentVoiceLabel === 'Dad'
        ? 'Dad'
        : 'Mom';
      setSelectedNarratorSlot(preferredSlot);

      if (source === 'library') {
        const result = await getStoryById(id || '');
        if (result.success && result.story) {
          setStory({
            id: result.story._id,
            title: result.story.title,
            text: result.story.text || '',
          });
          const storyPages = (result.story.text || '').split('\n\n').filter(p => p.trim());
          setPages(storyPages.length > 0 ? storyPages : [result.story.text || '']);
        }
      } else {
        const stories = await getStories();
        const found = stories.find(s => s.id === id);
        if (found) {
          setStory({ id: found.id, title: found.title, text: found.text });
          const storyPages = found.text.split('\n\n').filter(p => p.trim());
          setPages(storyPages.length > 0 ? storyPages : [found.text]);
        }
      }
      
    } catch (error) {
      console.error('loadStory error:', normalizeError(error));
      Alert.alert('Error', 'Could not load story');
    } finally {
      setLoading(false);
    }
  };

  const loadNarratorRecordings = async () => {
    if (!story) return;
    try {
      const recordings = await getStoryRecordingsForNarrator(story.id, selectedNarratorSlot);
      setStoryRecordings(recordings);
    } catch (error) {
      console.error('loadNarratorRecordings error:', normalizeError(error));
    }
  };

  const loadExistingRecording = async () => {
    if (!story) return;
    try {
      const recording = await getPageRecording(story.id, currentPage, selectedNarratorSlot);
      if (recording) {
        setExistingRecording({ uri: recording.fileUri, durationMs: recording.durationMs });
      } else {
        setExistingRecording(null);
      }
    } catch (error) {
      console.error('loadExistingRecording error:', normalizeError(error));
    }
  };

  const handleStartRecording = async () => {
    // Show warning if running in Expo Go
    if (isExpoGo) {
      Alert.alert(
        'Native Build Required',
        'Recording doesn\'t work in Expo Go. Please build the app using:\n\nnpm run prebuild\nnpm run run:android (or run:ios)',
        [{ text: 'OK' }]
      );
      return;
    }

    const hasPermission = await requestRecordingPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please allow microphone access to record narration.');
      return;
    }

    setTempRecording(null);
    setRecordingDuration(0);
    
    const result = await startRecording();
    if (result.success) {
      setIsRecording(true);
      // Start duration timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(d => d + 1000);
      }, 1000);
    } else {
      // Show detailed error message based on error type
      if (result.error === 'expo_go_unsupported') {
        Alert.alert(
          'Native Build Required',
          result.message,
          [{ text: 'OK' }]
        );
      } else if (result.error === 'permission_denied') {
        Alert.alert('Permission Required', 'Please allow microphone access to record narration.');
      } else {
        Alert.alert('Recording Failed', `Could not start recording: ${result.message}`);
      }
    }
  };

  const handleStopRecording = async () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    setIsRecording(false);
    const result = await stopRecording();
    if (result) {
      setTempRecording(result);
    }
  };

  const handleCancelRecording = async () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    setIsRecording(false);
    setRecordingDuration(0);
    await cancelRecording();
  };

  const handlePlayRecording = async (uri: string) => {
    if (isPlaying) {
      await stopPlayback();
      setIsPlaying(false);
      return;
    }
    
    setIsPlaying(true);
    await playRecording(uri, () => {
      setIsPlaying(false);
    });
  };

  const handleSaveRecording = async () => {
    if (!tempRecording || !story) return;
    
    const saved = await saveRecording(
      story.id,
      story.title,
      currentPage,
      pages.length,
      tempRecording.uri,
      tempRecording.durationMs,
      selectedNarratorSlot
    );
    
    if (saved) {
      setExistingRecording({ uri: saved.fileUri, durationMs: saved.durationMs });
      setTempRecording(null);

      // Refresh story recordings
      const recordings = await getStoryRecordingsForNarrator(story.id, selectedNarratorSlot);
      setStoryRecordings(recordings);

      // Clone voice in background — fire and forget
      // Only clones once; if a cloned voice already exists the ID is overwritten
      // with the latest recording for a fresher sample.
      cloneVoice(saved.fileUri).then(async (result) => {
        if (result.success) {
          const settings = await getNarrationSettings();
          await saveNarrationSettings({ ...settings, clonedVoiceId: result.voiceId });
        }
      }).catch(() => {});

      Alert.alert('Saved!', 'Recording saved successfully.');
    } else {
      Alert.alert('Error', 'Could not save recording.');
    }
  };

  const handleDiscardRecording = () => {
    Alert.alert(
      'Discard Recording?',
      'This recording will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            if (tempRecording) {
              await cancelRecording();
            }
            setTempRecording(null);
          },
        },
      ]
    );
  };

  const handleNextPage = () => {
    stopPlayback();
    setIsPlaying(false);
    setTempRecording(null);
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    stopPlayback();
    setIsPlaying(false);
    setTempRecording(null);
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getRecordedPagesCount = () => {
    return storyRecordings?.recordings.length || 0;
  };

  const isLastPage = currentPage === pages.length - 1;
  const canFinalizeStory = isLastPage && !!storyRecordings?.isComplete && !storyRecordings?.isFinalized && !isRecording && !tempRecording;
  const narratorSlotLabel = `${selectedNarratorSlot}'s Voice`;

  const handleFinalizeStoryRecording = async () => {
    if (!story) return;

    const finalized = await finalizeStoryRecording(story.id, selectedNarratorSlot);
    if (!finalized) {
      Alert.alert('Not Ready Yet', 'Record and save every page before saving the full narration.');
      return;
    }

    setStoryRecordings(finalized);
    Alert.alert(
      'Recording Saved',
      `The full ${narratorSlotLabel} narration is now saved to this story and can be played back anytime.`,
      [{ text: 'Done', onPress: () => router.back() }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>🎙️</Text>
          <Text style={styles.loadingText}>Loading story...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!story) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😢</Text>
          <Text style={styles.errorText}>Story not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3E8FF" />
      <View style={styles.container}>
        {/* Expo Go Warning Banner */}
        {isExpoGo && (
          <View style={styles.expoGoBanner}>
            <Text style={styles.expoGoBannerEmoji}>⚠️</Text>
            <View style={styles.expoGoBannerTextContainer}>
              <Text style={styles.expoGoBannerTitle}>Running in Expo Go</Text>
              <Text style={styles.expoGoBannerText}>Recording requires a native build. Run "npm run prebuild" then "npm run run:android" (or run:ios).</Text>
            </View>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{story.title}</Text>
            <Text style={styles.headerSubtitle}>
              🎙️ {narratorSlotLabel} • {getRecordedPagesCount()}/{pages.length} pages
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentPage + 1) / pages.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.pageIndicator}>Page {currentPage + 1} of {pages.length}</Text>
        </View>

        <View style={styles.narratorSelectorContainer}>
          <Text style={styles.narratorSelectorLabel}>Choose who is recording this version</Text>
          <View style={styles.narratorOptionsRow}>
            {(['Mom', 'Dad'] as ParentVoiceLabel[]).map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[
                  styles.narratorOptionChip,
                  selectedNarratorSlot === slot && styles.narratorOptionChipActive,
                ]}
                onPress={() => {
                  stopPlayback();
                  setIsPlaying(false);
                  setTempRecording(null);
                  setSelectedNarratorSlot(slot);
                }}
                disabled={isRecording}
              >
                <Text
                  style={[
                    styles.narratorOptionText,
                    selectedNarratorSlot === slot && styles.narratorOptionTextActive,
                  ]}
                >
                  {slot}'s Voice
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Story Text */}
        <View style={styles.storyCard}>
          <Text style={styles.storyText}>{pages[currentPage]}</Text>
        </View>

        {/* Recording Status */}
        {existingRecording && !tempRecording && !isRecording && (
          <View style={styles.existingRecordingBanner}>
            <Text style={styles.existingRecordingText}>
              ✅ Page recorded ({formatDuration(existingRecording.durationMs)})
            </Text>
            <TouchableOpacity 
              style={styles.playExistingBtn}
              onPress={() => handlePlayRecording(existingRecording.uri)}
            >
              <Text style={styles.playExistingBtnText}>
                {isPlaying ? '⏹️ Stop' : '▶️ Play'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recording Controls */}
        <View style={styles.recordingSection}>
          {isRecording ? (
            // Recording in progress
            <View style={styles.recordingActive}>
              <Animated.View style={[styles.recordingIndicator, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.recordingDot}>🔴</Text>
              </Animated.View>
              <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
              <Text style={styles.recordingLabel}>Recording...</Text>
              
              <View style={styles.recordingButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRecording}>
                  <Text style={styles.cancelBtnText}>❌ Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stopBtn} onPress={handleStopRecording}>
                  <Text style={styles.stopBtnText}>⏹️ Stop</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : tempRecording ? (
            // Review recording
            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>🎧 Preview Recording</Text>
              <Text style={styles.reviewDuration}>{formatDuration(tempRecording.durationMs)}</Text>
              
              <TouchableOpacity 
                style={styles.playBtn}
                onPress={() => handlePlayRecording(tempRecording.uri)}
              >
                <Text style={styles.playBtnText}>
                  {isPlaying ? '⏹️ Stop' : '▶️ Play'}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.reviewButtons}>
                <TouchableOpacity style={styles.discardBtn} onPress={handleDiscardRecording}>
                  <Text style={styles.discardBtnText}>🗑️ Discard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRecording}>
                  <Text style={styles.saveBtnText}>💾 Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Ready to record
            <TouchableOpacity style={styles.recordBtn} onPress={handleStartRecording}>
              <Text style={styles.recordBtnEmoji}>🎙️</Text>
              <Text style={styles.recordBtnText}>
                {existingRecording ? 'Re-record Page' : 'Record Page'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navBtn, currentPage === 0 && styles.navBtnDisabled]}
            onPress={handlePrevPage}
            disabled={currentPage === 0 || isRecording}
          >
            <Text style={styles.navBtnText}>← Previous</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, currentPage === pages.length - 1 && styles.navBtnDisabled]}
            onPress={handleNextPage}
            disabled={currentPage === pages.length - 1 || isRecording}
          >
            <Text style={styles.navBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>

        {canFinalizeStory && (
          <View style={styles.finalizeSection}>
            <Text style={styles.finalizeHint}>All pages are recorded for {narratorSlotLabel}. Save the full narration to finish this version.</Text>
            <TouchableOpacity style={styles.finalizeBtn} onPress={handleFinalizeStoryRecording}>
              <Text style={styles.finalizeBtnText}>💾 Save Recording</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* All Done Banner */}
        {storyRecordings?.isComplete && (
          <View style={styles.completeBanner}>
            <Text style={styles.completeBannerText}>
              {storyRecordings.isFinalized ? `🎉 ${narratorSlotLabel} saved!` : `🎉 All ${narratorSlotLabel} pages recorded!`}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3E8FF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '700',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeBtnText: {
    fontSize: 24,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  progressContainer: {
    padding: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  pageIndicator: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  narratorSelectorContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: '#FFF',
    borderRadius: 16,
  },
  narratorSelectorLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B21A8',
    marginBottom: 10,
    textAlign: 'center',
  },
  narratorOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  narratorOptionChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  narratorOptionChipActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#8B5CF6',
  },
  narratorOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  narratorOptionTextActive: {
    color: '#6D28D9',
  },
  storyCard: {
    flex: 1,
    margin: 16,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  storyText: {
    fontSize: 18,
    color: '#333',
    lineHeight: 28,
    textAlign: 'center',
  },
  existingRecordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  existingRecordingText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  playExistingBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  playExistingBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  recordingSection: {
    alignItems: 'center',
    padding: 16,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  recordBtnEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  recordBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  recordingActive: {
    alignItems: 'center',
  },
  recordingIndicator: {
    marginBottom: 8,
  },
  recordingDot: {
    fontSize: 32,
  },
  recordingTime: {
    fontSize: 32,
    fontWeight: '700',
    color: '#EF4444',
    fontVariant: ['tabular-nums'],
  },
  recordingLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  recordingButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  stopBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  stopBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  reviewSection: {
    alignItems: 'center',
  },
  reviewLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  reviewDuration: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  playBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 12,
  },
  playBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  reviewButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  discardBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  discardBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  saveBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  finalizeSection: {
    backgroundColor: '#FFF7ED',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
    alignItems: 'center',
  },
  finalizeHint: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9A3412',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  finalizeBtn: {
    backgroundColor: '#F97316',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    minWidth: 220,
    alignItems: 'center',
  },
  finalizeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  navBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F0E6FF',
    borderRadius: 12,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  completeBanner: {
    backgroundColor: '#4CAF50',
    padding: 12,
    alignItems: 'center',
  },
  completeBannerText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  expoGoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  expoGoBannerEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  expoGoBannerTextContainer: {
    flex: 1,
  },
  expoGoBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  expoGoBannerText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
});

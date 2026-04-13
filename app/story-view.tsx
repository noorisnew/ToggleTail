import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getStoryById } from '../src/data/api/storyApi';
import { addEvent } from '../src/data/storage/eventLogStorage';
import { getPageRecording, getStoryRecordings, StoryRecordings } from '../src/data/storage/narrationRecordingStorage';
import { AIVoiceId, getNarrationSettings } from '../src/data/storage/narrationStorage';
import { recordCompletedStoryReading } from '../src/data/storage/profileStorage';
import { addScreenTime, checkScreenTimeLimit, startSession } from '../src/data/storage/settingsStorage';
import { getStories, Story, updateStory } from '../src/data/storage/storyStorage';
import { normalizeError } from '../src/domain/services/errorService';
import { precacheMultiplePages } from '../src/services/elevenLabsPlaybackService';
import { playStoryPage, stopAllPlayback } from '../src/services/storyPlaybackService';
import {
    getSpeechRecognitionUnavailableMessage,
    isSpeechRecognitionAvailable,
    SafeSpeechRecognitionModule,
    useSpeechRecognitionEventSafe,
} from '../src/utils/speechRecognitionSafe';

type ReadingMode = 'read-to-me' | 'read-myself' | 'help-me-read' | null;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium Children's App Color Palette
const PREMIUM_COLORS = {
  // Soft pastels
  lavender: '#E8DEF8',
  lavenderDark: '#D0BCFF',
  peach: '#FFE5D9',
  peachDark: '#FFB4A2',
  mint: '#D8F3DC',
  mintDark: '#95D5B2',
  sky: '#D4E4FF',
  skyDark: '#A2C9FF',
  rose: '#FFD6E0',
  roseDark: '#FF8FAB',
  cream: '#FFF8E7',
  gold: '#FFD93D',
  
  // Text
  textDark: '#2D3047',
  textMuted: '#6B7280',
  white: '#FFFFFF',
  
  // Card backgrounds
  cardPink: '#FFF0F5',
  cardBlue: '#EEF4FF',
  cardGreen: '#F0FDF4',
  cardPurple: '#FAF5FF',
};

// Category-specific emojis
const CATEGORY_EMOJIS: Record<string, string[]> = {
  'Super Heroes': ['🦸', '🦸‍♀️', '💪', '⚡', '🛡️'],
  'Dragons & Magic': ['🐲', '🧙‍♂️', '✨', '🔮', '🪄'],
  'Fairy Tales': ['👸', '🤴', '🏰', '👗', '🦋'],
  'Mystery & Puzzles': ['🔍', '🕵️', '❓', '🗝️', '🔐'],
  'Dinosaurs': ['🦕', '🦖', '🥚', '🌋', '🦴'],
  'Ocean Adventures': ['🐳', '🐠', '🦈', '🐙', '🐚'],
  'Cute Animals': ['🐰', '🐶', '🐱', '🦊', '🐼'],
  'Space & Robots': ['🚀', '🤖', '👽', '🛸', '🌟'],
  'Adventure': ['🗺️', '🏔️', '🌋', '🚀', '🏴‍☠️'],
  'Animals': ['🦁', '🐘', '🦋', '🐬', '🦊'],
  'Bedtime': ['🌙', '⭐', '🛏️', '💤', '🧸'],
  'Fantasy': ['🧙‍♂️', '🦄', '🐉', '🏰', '✨'],
  'Science': ['🔬', '🧪', '🔭', '🧲', '⚗️'],
  'Values': ['💝', '🤗', '🌟', '🕊️', '🎯'],
  'General': ['📚', '📖', '🌈', '⭐', '🎉'],
};

// Kid-friendly pastel colors per category  
const CATEGORY_COLORS: Record<string, { bg: string; accent: string; gradient: string[] }> = {
  'Super Heroes': { bg: '#FFF8E7', accent: '#FFD93D', gradient: ['#FFE066', '#FFD93D'] },
  'Dragons & Magic': { bg: '#F3E8FF', accent: '#C4A7FF', gradient: ['#D8B4FE', '#A78BFA'] },
  'Fairy Tales': { bg: '#FFF0F5', accent: '#FFB8D9', gradient: ['#FBCFE8', '#F472B6'] },
  'Mystery & Puzzles': { bg: '#E6F7FF', accent: '#7DD3FC', gradient: ['#BAE6FD', '#38BDF8'] },
  'Dinosaurs': { bg: '#E6FFF0', accent: '#86EFAC', gradient: ['#BBF7D0', '#4ADE80'] },
  'Ocean Adventures': { bg: '#E6F7FF', accent: '#7DD3FC', gradient: ['#BAE6FD', '#38BDF8'] },
  'Cute Animals': { bg: '#FFF9E6', accent: '#FBBF24', gradient: ['#FDE68A', '#F59E0B'] },
  'Space & Robots': { bg: '#F3E8FF', accent: '#A78BFA', gradient: ['#C4B5FD', '#8B5CF6'] },
  'Adventure': { bg: '#D8F3DC', accent: '#52B788', gradient: ['#95D5B2', '#52B788'] },
  'Animals': { bg: '#FFE5D9', accent: '#FF8C61', gradient: ['#FFB4A2', '#FF8C61'] },
  'Bedtime': { bg: '#E8DEF8', accent: '#A78BFA', gradient: ['#D0BCFF', '#A78BFA'] },
  'Fantasy': { bg: '#FFD6E0', accent: '#FF6B9D', gradient: ['#FF8FAB', '#FF6B9D'] },
  'Science': { bg: '#D4E4FF', accent: '#3B82F6', gradient: ['#A2C9FF', '#3B82F6'] },
  'Values': { bg: '#FFD6E0', accent: '#EC4899', gradient: ['#FF8FAB', '#EC4899'] },
  'General': { bg: '#E8DEF8', accent: '#8B5CF6', gradient: ['#D0BCFF', '#8B5CF6'] },
};

export default function StoryViewScreen() {
  const router = useRouter();
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showModeModal, setShowModeModal] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ReadingMode>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const autoPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Speech recognition state for "Help Me Read" mode
  const [isListening, setIsListening] = useState(false);
  const [recognizedWords, setRecognizedWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect' | null; message: string }>({ type: null, message: '' });
  const [pageWords, setPageWords] = useState<string[]>([]);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [showGreatJob, setShowGreatJob] = useState(false);
  // Index of the word that triggered the last feedback (for green/red highlight)
  const [feedbackWordIndex, setFeedbackWordIndex] = useState(-1);
  const [naturalVoice, setNaturalVoice] = useState<Speech.Voice | null>(null);
  
  // Parent narration state
  const [narrationMode, setNarrationMode] = useState<'AI' | 'Human'>('AI');
  const [aiVoiceId, setAiVoiceId] = useState<AIVoiceId>('Rachel');
  const [clonedVoiceId, setClonedVoiceId] = useState<string | undefined>();
  const [storyRecordings, setStoryRecordings] = useState<StoryRecordings | null>(null);
  const [hasParentRecording, setHasParentRecording] = useState(false);
  const [isPlayingParentAudio, setIsPlayingParentAudio] = useState(false);
  
  // AI narration loading state (ElevenLabs fetch/generation)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const readingSessionStartedAtRef = useRef<number | null>(null);
  const screenTimeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storyCompletedRef = useRef(false);
  const readStopLoggedRef = useRef(false);

  // Load best available voice and narration mode
  useEffect(() => {
    loadBestVoice();
    loadNarrationSettings();
  }, []);

  // Check for parent recordings when story/page changes
  useEffect(() => {
    if (story) {
      checkForParentRecording();
    }
  }, [story, currentPage]);

  const loadNarrationSettings = async () => {
    try {
      const settings = await getNarrationSettings();
      setNarrationMode(settings.preferredSource);
      setAiVoiceId(settings.aiVoiceId);
      setClonedVoiceId(settings.clonedVoiceId);
    } catch (error) {
      console.log('Could not load narration settings:', error);
    }
  };

  const checkForParentRecording = async () => {
    if (!story) return;
    try {
      const recordings = await getStoryRecordings(story.id);
      setStoryRecordings(recordings);
      
      const pageRecording = await getPageRecording(story.id, currentPage);
      setHasParentRecording(!!pageRecording);
    } catch (error) {
      console.log('Could not check parent recordings:', error);
    }
  };

  const loadBestVoice = async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      // Prefer high-quality English voices (Samantha, Karen, Daniel, etc.)
      const preferredVoiceNames = ['Samantha', 'Karen', 'Daniel', 'Moira', 'Rishi', 'Fiona'];
      let bestVoice = voices.find(v => 
        v.language.startsWith('en') && 
        preferredVoiceNames.some(name => v.name?.includes(name) || v.identifier?.includes(name))
      );
      if (!bestVoice) {
        // Fallback to any English voice
        bestVoice = voices.find(v => v.language.startsWith('en'));
      }
      if (bestVoice) {
        setNaturalVoice(bestVoice);
      }
    } catch (error) {
      console.log('Could not load voices:', error);
    }
  };

  // Speech recognition event handlers (only active if native module is available)
  useSpeechRecognitionEventSafe('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEventSafe('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEventSafe('result', (event) => {
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0]?.transcript || '';
      processRecognizedSpeech(transcript);
    }
  });

  useSpeechRecognitionEventSafe('error', (event) => {
    console.log('Speech recognition error:', event.error);
    setIsListening(false);
  });

  // Process what the child said
  const processRecognizedSpeech = useCallback((transcript: string) => {
    if (!transcript || pageWords.length === 0) return;

    const spokenWords = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const expectedWord = pageWords[currentWordIndex]?.toLowerCase().replace(/[.,!?;:'"]/g, '') || '';

    // Check each spoken word against the expected word
    for (const spoken of spokenWords) {
      const cleanSpoken = spoken.replace(/[.,!?;:'"]/g, '');

      if (cleanSpoken === expectedWord || isSimilarWord(cleanSpoken, expectedWord)) {
        // Correct — highlight the matched word green, then advance
        const matchedIndex = currentWordIndex;
        setFeedbackWordIndex(matchedIndex);
        setFeedback({ type: 'correct', message: getEncouragement() });
        setWordsCompleted(prev => prev + 1);
        setCurrentWordIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= pageWords.length) {
            setShowGreatJob(true);
            setTimeout(() => setShowGreatJob(false), 2000);
          }
          return nextIndex;
        });

        setTimeout(() => {
          setFeedback({ type: null, message: '' });
          setFeedbackWordIndex(-1);
        }, 1500);
        return;
      }
    }

    // No match — highlight current word red and speak it
    if (spokenWords.length > 0) {
      setFeedbackWordIndex(currentWordIndex);
      setFeedback({
        type: 'incorrect',
        message: `Try again! The word is: "${pageWords[currentWordIndex]}"`,
      });
      speakWord(pageWords[currentWordIndex]);
      setTimeout(() => {
        setFeedback({ type: null, message: '' });
        setFeedbackWordIndex(-1);
      }, 3000);
    }
  }, [currentWordIndex, pageWords]);

  // Check if words are similar (handles minor pronunciation differences)
  const isSimilarWord = (spoken: string, expected: string): boolean => {
    if (spoken === expected) return true;
    // Allow for common phonetic similarities
    const distance = levenshteinDistance(spoken, expected);
    return distance <= Math.max(1, Math.floor(expected.length * 0.3)); // 30% tolerance
  };

  // Simple Levenshtein distance for word comparison
  const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    return matrix[b.length][a.length];
  };

  // Fun encouragements for correct words
  const getEncouragement = (): string => {
    const phrases = [
      '🌟 Great job!',
      '⭐ Amazing!',
      '🎉 You got it!',
      '👏 Wonderful!',
      '💪 Super reader!',
      '🏆 Excellent!',
      '✨ Perfect!',
      '🚀 Awesome!',
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  // Speak a single word naturally
  const speakWord = (word: string) => {
    Speech.speak(word, {
      rate: 0.75,
      pitch: 1.05,
      language: 'en-US',
      voice: naturalVoice?.identifier,
    });
  };

  // Start listening to the child
  const startListening = async () => {
    try {
      // Check if speech recognition is available
      if (!isSpeechRecognitionAvailable()) {
        Alert.alert(
          'Feature Not Available',
          getSpeechRecognitionUnavailableMessage(),
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await SafeSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Permission Needed', 'Please allow microphone access so I can hear you read!');
        return;
      }

      // Reset state for new listening session
      setRecognizedWords([]);
      
      await SafeSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
      });
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      Alert.alert('Oops!', 'Could not start listening. Please try again.');
    }
  };

  // Stop listening
  const stopListening = async () => {
    try {
      await SafeSpeechRecognitionModule.stop();
    } catch (error) {
      console.log('Error stopping speech recognition:', error);
    }
  };

  // Update page words when page changes
  useEffect(() => {
    if (pages[currentPage]) {
      const words = pages[currentPage].split(/\s+/).filter(w => w.length > 0);
      setPageWords(words);
      setCurrentWordIndex(0);
      setWordsCompleted(0);
      setFeedbackWordIndex(-1);
      setFeedback({ type: null, message: '' });
    }
  }, [currentPage, pages]);

  useEffect(() => {
    loadStory();
    return () => {
      void finalizeReadingSession();
      stopAllPlayback();
      try {
        SafeSpeechRecognitionModule.stop();
      } catch (e) {
        // Ignore errors on cleanup
      }
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, [id, source]);

  const clearScreenTimeTimeout = () => {
    if (screenTimeTimeoutRef.current) {
      clearTimeout(screenTimeTimeoutRef.current);
      screenTimeTimeoutRef.current = null;
    }
  };

  const logReadStopIfNeeded = async () => {
    if (!story?.id || !selectedMode || readStopLoggedRef.current) {
      return;
    }

    readStopLoggedRef.current = true;
    try {
      await addEvent({ type: 'READ_STOP', storyId: story.id });
    } catch (error) {
      console.error('logReadStopIfNeeded:', normalizeError(error));
    }
  };

  const finalizeReadingSession = async () => {
    clearScreenTimeTimeout();
    await logReadStopIfNeeded();

    const startedAt = readingSessionStartedAtRef.current;
    if (!startedAt) {
      return;
    }

    readingSessionStartedAtRef.current = null;

    const elapsedMinutes = Math.max(1, Math.ceil((Date.now() - startedAt) / 60000));
    await addScreenTime(elapsedMinutes);
  };

  const completeStoryIfNeeded = async () => {
    if (!story || storyCompletedRef.current) {
      return;
    }

    storyCompletedRef.current = true;

    await recordCompletedStoryReading();

    if (source !== 'library') {
      const updatedStory = await updateStory(story.id, {
        readCount: (story.readCount ?? 0) + 1,
      });

      if (updatedStory) {
        setStory(updatedStory);
      }
    }
  };

  const beginReadingSession = async (): Promise<boolean> => {
    const limitStatus = await checkScreenTimeLimit();
    if (!limitStatus.allowed) {
      Alert.alert(
        'Daily Reading Limit Reached',
        'Reading time is finished for today. Ask your parent to change your limit in Parent Settings.'
      );
      return false;
    }

    if (!readingSessionStartedAtRef.current) {
      readingSessionStartedAtRef.current = Date.now();
      await startSession();
    }

    clearScreenTimeTimeout();

    if (limitStatus.minutesRemaining > 0) {
      screenTimeTimeoutRef.current = setTimeout(() => {
        void finalizeReadingSession();
        stopPlaybackAndClearTimeout();
        setIsAutoPlaying(false);
        Alert.alert(
          'Daily Reading Limit Reached',
          'Nice reading session. Your time is up for today.',
          [{ text: 'OK', onPress: () => router.replace('/child-home') }]
        );
      }, limitStatus.minutesRemaining * 60 * 1000);
    }

    return true;
  };

  // Auto-play effect for "Read to Me" mode
  useEffect(() => {
    if (selectedMode === 'read-to-me' && isAutoPlaying && pages.length > 0) {
      playCurrentPage();
    }
  }, [currentPage, isAutoPlaying, selectedMode]);

  const loadStory = async () => {
    try {
      // Load narration settings first so we can start pre-caching with the right voice
      const settings = await getNarrationSettings();
      const voiceId = settings.aiVoiceId;
      
      if (source === 'library') {
        const result = await getStoryById(id || '');
        if (result.success && result.story) {
          const libraryStory: Story = {
            id: result.story._id,
            title: result.story.title,
            text: result.story.text || 'Story content is loading...',
            theme: result.story.category, // Map category to theme
            createdAt: new Date().toISOString(),
            approved: true,
            difficulty: (result.story.readingLevel || 'Easy') as 'Easy' | 'Medium' | 'Hard',
            tags: [result.story.category],
            isFavorite: false,
            readCount: 0,
          };
          setStory(libraryStory);
          const storyPages = libraryStory.text.split('\n\n').filter(p => p.trim());
          const finalPages = storyPages.length > 0 ? storyPages : [libraryStory.text];
          setPages(finalPages);
          
          // Start pre-caching first 3 pages immediately (fire-and-forget)
          precacheMultiplePages(libraryStory.id, finalPages, 0, 3, voiceId).catch(() => {});
          
          await addEvent({ type: 'STORY_OPEN', storyId: libraryStory.id });
        }
      } else {
        const stories = await getStories();
        const found = stories.find((s) => s.id === id);
        setStory(found || null);
        if (found) {
          const storyPages = found.text.split('\n\n').filter(p => p.trim());
          const finalPages = storyPages.length > 0 ? storyPages : [found.text];
          setPages(finalPages);
          
          // Start pre-caching first 3 pages immediately (fire-and-forget)
          precacheMultiplePages(found.id, finalPages, 0, 3, voiceId).catch(() => {});
          
          await addEvent({ type: 'STORY_OPEN', storyId: found.id });
        }
      }
    } catch (error) {
      console.error('loadStory:', normalizeError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMode = async (mode: ReadingMode) => {
    // Check if speech recognition is available for help-me-read mode
    if (mode === 'help-me-read' && !isSpeechRecognitionAvailable()) {
      Alert.alert(
        'Feature Not Available',
        'The "Read with Help" mode requires a native app build and is not available in Expo Go.\n\nPlease choose "Listen to Story" or "Read Myself" instead.',
        [{ text: 'OK' }]
      );
      return;
    }

    const sessionStarted = await beginReadingSession();
    if (!sessionStarted) {
      return;
    }

    setSelectedMode(mode);
    setShowModeModal(false);
    
    // Start auto-playing if "Read to Me" mode
    if (mode === 'read-to-me') {
      setIsAutoPlaying(true);
    }
    
    if (story?.id) {
      try {
        await addEvent({ type: 'READ_START', storyId: story.id });
      } catch (error) {
        console.error('handleSelectMode:', normalizeError(error));
      }
    }
  };

  const playCurrentPage = async () => {
    if (!pages[currentPage] || !story) return;
    
    // Show loading state while fetching/generating audio
    // Don't set isSpeaking until audio actually starts
    setIsLoadingAudio(true);
    
    // Helper for auto-advance logic (used in multiple callbacks)
    const handlePlaybackComplete = () => {
      setIsSpeaking(false);
      if (isAutoPlaying && currentPage < pages.length - 1) {
        autoPlayTimeoutRef.current = setTimeout(() => {
          animatePageFlip(() => {
            setCurrentPage(prev => prev + 1);
          });
        }, 2000);
      } else if (currentPage === pages.length - 1) {
        void completeStoryIfNeeded();
        setIsAutoPlaying(false);
      }
    };

    await playStoryPage(
      story.id,
      currentPage,
      pages[currentPage],
      narrationMode,
      hasParentRecording,
      {
        rate: 0.78,
        pitch: 1.0,
        language: 'en-US',
        voiceIdentifier: naturalVoice?.identifier,
      },
      {
        onParentStart: () => {
          setIsLoadingAudio(false);
          setIsPlayingParentAudio(true);
          setIsSpeaking(true);
        },
        onParentComplete: () => {
          setIsPlayingParentAudio(false);
          handlePlaybackComplete();
        },
        onParentFailed: () => setIsPlayingParentAudio(false),
        onElevenLabsStart: () => {
          // ElevenLabs audio has started playing
          setIsLoadingAudio(false);
          setIsSpeaking(true);
          
          // Pre-cache next 2 pages in background (fire-and-forget)
          if (currentPage < pages.length - 1 && story) {
            precacheMultiplePages(story.id, pages, currentPage + 1, 2, aiVoiceId)
              .catch(() => {}); // Ignore errors
          }
        },
        onElevenLabsFallback: () => {
          // ElevenLabs failed, TTS starts immediately after this callback
          setIsLoadingAudio(false);
          setIsSpeaking(true);
          console.log('ElevenLabs unavailable, using local TTS fallback');
        },
        onTTSComplete: handlePlaybackComplete,
        onTTSStopped: () => {
          setIsLoadingAudio(false);
          setIsSpeaking(false);
        },
        onTTSError: () => {
          setIsLoadingAudio(false);
          setIsSpeaking(false);
        },
      },
      aiVoiceId,
      clonedVoiceId
    );
  };

  const animatePageFlip = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  // Helper: stops all audio and clears pending auto-advance timeout
  // Does NOT reset isAutoPlaying (caller decides)
  const stopPlaybackAndClearTimeout = () => {
    stopAllPlayback();
    setIsLoadingAudio(false);
    setIsSpeaking(false);
    setIsPlayingParentAudio(false);
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }
  };

  const handlePlayPause = () => {
    if (isSpeaking || isLoadingAudio) {
      // Stop playback or cancel pending audio fetch
      stopPlaybackAndClearTimeout();
      setIsAutoPlaying(false);
    } else {
      setIsAutoPlaying(true);
      playCurrentPage();
    }
  };

  const handleNextPage = () => {
    stopPlaybackAndClearTimeout();
    if (currentPage < pages.length - 1) {
      animatePageFlip(() => {
        setCurrentPage(currentPage + 1);
      });
    }
  };

  const handlePrevPage = () => {
    stopPlaybackAndClearTimeout();
    if (currentPage > 0) {
      animatePageFlip(() => {
        setCurrentPage(currentPage - 1);
      });
    }
  };

  const handleClose = () => {
    if (currentPage === pages.length - 1) {
      void completeStoryIfNeeded();
    }
    void finalizeReadingSession();
    stopPlaybackAndClearTimeout();
    stopListening();
    setIsAutoPlaying(false);
    router.replace('/child-home');
  };

  // Get category-specific styling (using theme field)
  const category = story?.theme || story?.tags?.[0] || 'General';
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['General'];
  const emojis = CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS['General'];
  const emoji = emojis[currentPage % emojis.length];

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#FFF9E6' }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>📖</Text>
          <Text style={styles.loadingText}>Loading story...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!story) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#FFF9E6' }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😢</Text>
          <Text style={styles.errorText}>Story not found</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.replace('/child-home')}>
            <Text style={styles.errorButtonText}>Go Back Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Mode Selection Screen - Premium Children's App UI
  if (showModeModal) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <ScrollView 
          style={styles.modeContainer}
          contentContainerStyle={styles.modeScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium Header with Back Button */}
          <View style={styles.premiumHeader}>
            <TouchableOpacity 
              style={styles.backButtonPremium} 
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.backIconText}>←</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Section - Large Book Illustration */}
          <View style={styles.heroSection}>
            <View style={[styles.heroIllustration, { backgroundColor: PREMIUM_COLORS.white }]}>
              <LinearGradient
                colors={(colors.gradient || ['#D0BCFF', '#8B5CF6']) as [string, string]}
                style={styles.heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.heroEmoji}>{emojis[0]}</Text>
              </LinearGradient>
            </View>

            {/* Story Title - Children's Book Style */}
            <Text style={styles.heroTitle}>{story.title}</Text>
            
            {/* Story Meta */}
            <View style={styles.storyMeta}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaEmoji}>📖</Text>
                <Text style={styles.metaText}>{pages.length} pages</Text>
              </View>
              {story.theme && (
                <View style={[styles.metaBadge, { backgroundColor: '#E8DEF8' }]}>
                  <Text style={styles.metaEmoji}>✨</Text>
                  <Text style={styles.metaText}>{story.theme}</Text>
                </View>
              )}
            </View>
          </View>

          {/* How Would You Like to Read? */}
          <Text style={styles.modeQuestion}>How would you like to read?</Text>

          {/* Reading Mode Cards - Premium Design */}
          <View style={styles.modeCardsContainer}>
            
            {/* 📖 Read Myself Card */}
            <TouchableOpacity
              style={[styles.premiumModeCard, { backgroundColor: PREMIUM_COLORS.cardBlue }]}
              onPress={() => handleSelectMode('read-myself')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#60A5FA', '#3B82F6']}
                style={styles.modeIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.modeIconLarge}>📖</Text>
              </LinearGradient>
              <View style={styles.modeCardTextContainer}>
                <Text style={[styles.modeCardTitlePremium, { color: '#1E40AF' }]}>
                  Read Myself
                </Text>
                <Text style={styles.modeCardDescPremium}>
                  Turn pages at your own pace
                </Text>
              </View>
              <View style={styles.modeArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </TouchableOpacity>

            {/* 🔊 Listen to Story Card */}
            <TouchableOpacity
              style={[styles.premiumModeCard, { backgroundColor: PREMIUM_COLORS.cardPink }]}
              onPress={() => handleSelectMode('read-to-me')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#F472B6', '#EC4899']}
                style={styles.modeIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.modeIconLarge}>🔊</Text>
              </LinearGradient>
              <View style={styles.modeCardTextContainer}>
                <Text style={[styles.modeCardTitlePremium, { color: '#BE185D' }]}>
                  Listen to Story
                </Text>
                <Text style={styles.modeCardDescPremium}>
                  Sit back and enjoy the narration
                </Text>
              </View>
              <View style={styles.modeArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </TouchableOpacity>

            {/* ✨ Read with Help Card */}
            <TouchableOpacity
              style={[
                styles.premiumModeCard,
                { backgroundColor: isSpeechRecognitionAvailable() ? PREMIUM_COLORS.cardGreen : '#F3F4F6' },
                !isSpeechRecognitionAvailable() && { opacity: 0.75 },
              ]}
              onPress={() => handleSelectMode('help-me-read')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isSpeechRecognitionAvailable() ? ['#4ADE80', '#22C55E'] : ['#D1D5DB', '#9CA3AF']}
                style={styles.modeIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.modeIconLarge}>✨</Text>
              </LinearGradient>
              <View style={styles.modeCardTextContainer}>
                <Text style={[
                  styles.modeCardTitlePremium,
                  { color: isSpeechRecognitionAvailable() ? '#15803D' : '#6B7280' },
                ]}>
                  Read with Help
                </Text>
                <Text style={styles.modeCardDescPremium}>
                  {isSpeechRecognitionAvailable()
                    ? 'Read aloud — I listen and help!'
                    : 'Needs a native build'}
                </Text>
              </View>
              <View style={styles.modeArrow}>
                <Text style={styles.arrowText}>
                  {isSpeechRecognitionAvailable() ? '→' : '🔒'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Fun Footer Message */}
          <View style={styles.funFooter}>
            <Text style={styles.funFooterText}>✨ Let's start the adventure! ✨</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Story Reading View - Premium Children's App UI
  const pageScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.95, 1],
  });

  const getModeLabel = () => {
    switch (selectedMode) {
      case 'read-to-me': return '🔊 Listen Mode';
      case 'read-myself': return '📖 Reading Mode';
      case 'help-me-read': return '✨ Practice Mode';
      default: return '📖 Reading';
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.readerContainer}>
        {/* Premium Header */}
        <View style={styles.premiumReaderHeader}>
          <TouchableOpacity 
            style={styles.closeButtonPremium} 
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeIconText}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.headerTitleArea}>
            <Text style={styles.readerHeaderTitle} numberOfLines={1}>
              {story.title}
            </Text>
            <View style={[styles.modeBadgePremium, { backgroundColor: colors.accent }]}>
              <Text style={styles.modeBadgeTextPremium}>{getModeLabel()}</Text>
            </View>
          </View>
          
          <View style={styles.pageCountBadge}>
            <Text style={styles.pageCountText}>{currentPage + 1}/{pages.length}</Text>
          </View>
        </View>

        {/* Premium Progress Bar */}
        <View style={styles.premiumProgressContainer}>
          <View style={styles.premiumProgressBg}>
            <LinearGradient
              colors={(colors.gradient || ['#D0BCFF', '#8B5CF6']) as [string, string]}
              style={[
                styles.premiumProgressFill, 
                { width: `${((currentPage + 1) / pages.length) * 100}%` }
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <View style={styles.progressStars}>
            {pages.map((_, idx) => (
              <Text key={idx} style={styles.progressStar}>
                {idx <= currentPage ? '⭐' : '☆'}
              </Text>
            ))}
          </View>
        </View>

        {/* Premium Story Card */}
        <Animated.View 
          style={[
            styles.premiumStoryCard, 
            { transform: [{ scale: pageScale }] }
          ]}
        >
          {/* Large Hero Illustration */}
          <View style={styles.premiumIllustration}>
            <LinearGradient
              colors={(colors.gradient || ['#D0BCFF', '#8B5CF6']) as [string, string]}
              style={styles.illustrationGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.premiumEmoji}>{emoji}</Text>
            </LinearGradient>
          </View>

          {/* Feedback Message */}
          {feedback.type && (
            <Animated.View style={[
              styles.premiumFeedbackBanner,
              { backgroundColor: feedback.type === 'correct' ? '#D1FAE5' : '#FEE2E2' }
            ]}>
              <Text style={[
                styles.premiumFeedbackText,
                { color: feedback.type === 'correct' ? '#065F46' : '#991B1B' }
              ]}>
                {feedback.message}
              </Text>
            </Animated.View>
          )}

          {/* Great Job Banner */}
          {showGreatJob && (
            <View style={styles.premiumGreatJobBanner}>
              <Text style={styles.premiumGreatJobText}>🎉 Amazing! Great Reading! 🌟</Text>
            </View>
          )}

          {/* Story Text Area */}
          <View style={styles.premiumTextContainer}>
            {selectedMode === 'help-me-read' ? (
              // Word-by-word display with highlighting
              <View style={styles.premiumWordsContainer}>
                {pageWords.map((word, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => speakWord(word)}
                    activeOpacity={0.7}
                    style={styles.wordTouchable}
                  >
                    <Text style={[
                      styles.premiumWordText,
                      // Feedback highlight takes highest priority
                      index === feedbackWordIndex && feedback.type === 'correct' && styles.premiumCorrectWord,
                      index === feedbackWordIndex && feedback.type === 'incorrect' && styles.premiumIncorrectWord,
                      // Current word (no active feedback on it)
                      index === currentWordIndex && index !== feedbackWordIndex && styles.premiumCurrentWord,
                      // Already-read words (not currently showing feedback)
                      index < currentWordIndex && index !== feedbackWordIndex && styles.premiumCompletedWord,
                    ]}>
                      {word}{' '}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // Regular text display
              <Text style={styles.premiumStoryText}>{pages[currentPage]}</Text>
            )}
          </View>

          {/* Word Progress (Help Me Read mode only) */}
          {selectedMode === 'help-me-read' && (
            <View style={styles.premiumWordProgress}>
              <View style={styles.wordProgressBar}>
                <View 
                  style={[
                    styles.wordProgressFill,
                    { width: `${(currentWordIndex / Math.max(pageWords.length, 1)) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.premiumWordProgressText}>
                {currentWordIndex}/{pageWords.length} words ⭐
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Premium Control Area */}
        <View style={styles.premiumControlArea}>
          {/* Audio Controls based on mode */}
          {selectedMode === 'read-to-me' && (
            <TouchableOpacity
              style={[
                styles.premiumPlayButton,
                { backgroundColor: isLoadingAudio ? '#FDE68A' : isSpeaking ? '#FCA5A5' : colors.accent }
              ]}
              onPress={handlePlayPause}
              activeOpacity={0.85}
            >
              <Text style={styles.premiumPlayEmoji}>
                {isLoadingAudio ? '⏳' : isSpeaking ? '⏸️' : '▶️'}
              </Text>
              <Text style={styles.premiumPlayText}>
                {isLoadingAudio ? 'Loading...' : isSpeaking ? 'Pause' : 'Play'}
              </Text>
            </TouchableOpacity>
          )}

          {selectedMode === 'help-me-read' && (
            <View style={styles.helpMeReadControlsPremium}>
              <TouchableOpacity
                style={[
                  styles.premiumMicButton,
                  { backgroundColor: isListening ? '#FCA5A5' : '#86EFAC' }
                ]}
                onPress={isListening ? stopListening : startListening}
                activeOpacity={0.85}
              >
                <Text style={styles.premiumMicEmoji}>
                  {isListening ? '⏹️' : '🎤'}
                </Text>
                <Text style={styles.premiumMicText}>
                  {isListening ? 'Stop' : 'Read Aloud'}
                </Text>
              </TouchableOpacity>
              
              {isListening && (
                <View style={styles.listeningPulse}>
                  <Text style={styles.pulseText}>🔴 Listening...</Text>
                </View>
              )}
              
              <Text style={styles.helpHintText}>
                💡 Tap words you don't know!
              </Text>
            </View>
          )}

          {/* Premium Navigation Buttons */}
          <View style={styles.premiumNavigation}>
            <TouchableOpacity
              style={[
                styles.premiumNavButton,
                currentPage === 0 && styles.premiumNavButtonDisabled
              ]}
              onPress={handlePrevPage}
              disabled={currentPage === 0}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={currentPage === 0 ? ['#E5E7EB', '#D1D5DB'] : ['#A78BFA', '#8B5CF6']}
                style={styles.navButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.premiumNavEmoji}>←</Text>
              </LinearGradient>
              <Text style={styles.premiumNavLabel}>Back</Text>
            </TouchableOpacity>

            <View style={styles.premiumPageDots}>
              {pages.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.premiumPageDot,
                    idx === currentPage && [styles.premiumPageDotActive, { backgroundColor: colors.accent }]
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.premiumNavButton,
                currentPage === pages.length - 1 && styles.premiumNavButtonDisabled
              ]}
              onPress={handleNextPage}
              disabled={currentPage === pages.length - 1}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={currentPage === pages.length - 1 ? ['#E5E7EB', '#D1D5DB'] : ['#A78BFA', '#8B5CF6']}
                style={styles.navButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.premiumNavEmoji}>→</Text>
              </LinearGradient>
              <Text style={styles.premiumNavLabel}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Finish Button (on last page) */}
        {currentPage === pages.length - 1 && (
          <TouchableOpacity
            style={styles.premiumFinishButton}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#4ADE80', '#22C55E']}
              style={styles.finishButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.premiumFinishEmoji}>🎉</Text>
              <Text style={styles.premiumFinishText}>All Done! Great Job!</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Base
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 20,
    color: PREMIUM_COLORS.textDark,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 22,
    color: PREMIUM_COLORS.textDark,
    fontWeight: '700',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#4ADE80',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 24,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  errorButtonText: {
    color: PREMIUM_COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },

  // ========== MODE SELECTION PREMIUM STYLES ==========
  modeContainer: {
    flex: 1,
  },
  modeScrollContent: {
    paddingBottom: 40,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButtonPremium: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PREMIUM_COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backIconText: {
    fontSize: 24,
    color: PREMIUM_COLORS.textDark,
    fontWeight: '600',
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroIllustration: {
    width: SCREEN_WIDTH * 0.55,
    aspectRatio: 1,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 24,
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 100,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: PREMIUM_COLORS.textDark,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
    paddingHorizontal: 16,
  },
  storyMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.cream,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  metaEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
    color: PREMIUM_COLORS.textDark,
  },
  
  // Mode Question
  modeQuestion: {
    fontSize: 24,
    fontWeight: '700',
    color: PREMIUM_COLORS.textDark,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  
  // Premium Mode Cards
  modeCardsContainer: {
    paddingHorizontal: 20,
    gap: 14,
  },
  premiumModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  modeIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeIconLarge: {
    fontSize: 32,
  },
  modeCardTextContainer: {
    flex: 1,
  },
  modeCardTitlePremium: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modeCardDescPremium: {
    fontSize: 14,
    color: PREMIUM_COLORS.textMuted,
    lineHeight: 20,
  },
  modeArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '700',
    color: PREMIUM_COLORS.textDark,
  },
  
  // Fun Footer
  funFooter: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
  },
  funFooterText: {
    fontSize: 18,
    fontWeight: '600',
    color: PREMIUM_COLORS.textMuted,
  },

  // ========== READER PREMIUM STYLES ==========
  readerContainer: {
    flex: 1,
  },
  premiumReaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButtonPremium: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PREMIUM_COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  closeIconText: {
    fontSize: 20,
    color: PREMIUM_COLORS.textDark,
    fontWeight: '700',
  },
  headerTitleArea: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  readerHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PREMIUM_COLORS.textDark,
    marginBottom: 6,
  },
  modeBadgePremium: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modeBadgeTextPremium: {
    fontSize: 12,
    fontWeight: '600',
    color: PREMIUM_COLORS.white,
  },
  pageCountBadge: {
    backgroundColor: PREMIUM_COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pageCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: PREMIUM_COLORS.textDark,
  },
  
  // Premium Progress
  premiumProgressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  premiumProgressBg: {
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  premiumProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 4,
  },
  progressStar: {
    fontSize: 16,
  },
  
  // Premium Story Card
  premiumStoryCard: {
    flex: 1,
    margin: 16,
    backgroundColor: PREMIUM_COLORS.white,
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  premiumIllustration: {
    width: SCREEN_WIDTH * 0.45,
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  illustrationGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumEmoji: {
    fontSize: 72,
  },
  
  // Feedback
  premiumFeedbackBanner: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  premiumFeedbackText: {
    fontSize: 18,
    fontWeight: '700',
  },
  premiumGreatJobBanner: {
    backgroundColor: '#FEF9C3',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FDE047',
  },
  premiumGreatJobText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#A16207',
    textAlign: 'center',
  },
  
  // Text Area
  premiumTextContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  premiumStoryText: {
    fontSize: 22,
    color: PREMIUM_COLORS.textDark,
    textAlign: 'center',
    lineHeight: 34,
    fontWeight: '500',
  },
  premiumWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordTouchable: {
    marginVertical: 2,
  },
  premiumWordText: {
    fontSize: 24,
    color: PREMIUM_COLORS.textMuted,
    lineHeight: 40,
    fontWeight: '500',
  },
  premiumCurrentWord: {
    color: '#2563EB',
    backgroundColor: '#DBEAFE',
    fontWeight: '700',
    borderRadius: 6,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  premiumCompletedWord: {
    color: '#16A34A',
    fontWeight: '600',
  },
  premiumCorrectWord: {
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    fontWeight: '700',
    borderRadius: 6,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  premiumIncorrectWord: {
    color: '#B91C1C',
    backgroundColor: '#FEE2E2',
    fontWeight: '700',
    borderRadius: 6,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },

  // Word Progress
  premiumWordProgress: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  wordProgressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  wordProgressFill: {
    height: '100%',
    backgroundColor: '#4ADE80',
    borderRadius: 4,
  },
  premiumWordProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: PREMIUM_COLORS.textMuted,
  },
  
  // Premium Controls
  premiumControlArea: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: PREMIUM_COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  premiumPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 16,
    minWidth: 160,
  },
  premiumPlayEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  premiumPlayText: {
    fontSize: 18,
    fontWeight: '700',
    color: PREMIUM_COLORS.textDark,
  },
  
  // Help Me Read Controls
  helpMeReadControlsPremium: {
    alignItems: 'center',
    paddingTop: 16,
  },
  premiumMicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 180,
  },
  premiumMicEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  premiumMicText: {
    fontSize: 18,
    fontWeight: '700',
    color: PREMIUM_COLORS.textDark,
  },
  listeningPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
  },
  pulseText: {
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '600',
  },
  helpHintText: {
    marginTop: 12,
    fontSize: 14,
    color: PREMIUM_COLORS.textMuted,
    textAlign: 'center',
  },
  
  // Premium Navigation
  premiumNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  premiumNavButton: {
    alignItems: 'center',
  },
  premiumNavButtonDisabled: {
    opacity: 0.4,
  },
  navButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  premiumNavEmoji: {
    fontSize: 24,
    color: PREMIUM_COLORS.white,
    fontWeight: '700',
  },
  premiumNavLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: PREMIUM_COLORS.textMuted,
  },
  premiumPageDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 20,
  },
  premiumPageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  premiumPageDotActive: {
    transform: [{ scale: 1.4 }],
  },
  
  // Premium Finish Button
  premiumFinishButton: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  finishButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  premiumFinishEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  premiumFinishText: {
    fontSize: 20,
    fontWeight: '700',
    color: PREMIUM_COLORS.white,
  },
});

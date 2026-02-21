import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    View,
} from 'react-native';
import { playPageRecording, stopPlayback as stopAudioPlayback } from '../src/data/api/narrationService';
import { getStoryById } from '../src/data/api/storyApi';
import { addEvent } from '../src/data/storage/eventLogStorage';
import { getPageRecording, getStoryRecordings, StoryRecordings } from '../src/data/storage/narrationRecordingStorage';
import { getNarrationMode } from '../src/data/storage/narrationStorage';
import { getStories, Story } from '../src/data/storage/storyStorage';
import { normalizeError } from '../src/domain/services/errorService';

type ReadingMode = 'read-to-me' | 'help-me-read' | null;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  'General': ['📚', '📖', '🌈', '⭐', '🎉'],
};

// Kid-friendly pastel colors per category
const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  'Super Heroes': { bg: '#FFF9E6', accent: '#FFE066' },
  'Dragons & Magic': { bg: '#F3E8FF', accent: '#C4A7FF' },
  'Fairy Tales': { bg: '#FFF0F5', accent: '#FFB8D9' },
  'Mystery & Puzzles': { bg: '#E6F7FF', accent: '#7DD3FC' },
  'Dinosaurs': { bg: '#E6FFF0', accent: '#86EFAC' },
  'Ocean Adventures': { bg: '#E6F7FF', accent: '#7DD3FC' },
  'Cute Animals': { bg: '#FFF9E6', accent: '#FBBF24' },
  'Space & Robots': { bg: '#F3E8FF', accent: '#A78BFA' },
  'General': { bg: '#FFF0F5', accent: '#F0ABFC' },
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
  const [naturalVoice, setNaturalVoice] = useState<Speech.Voice | null>(null);
  
  // Parent narration state
  const [narrationMode, setNarrationMode] = useState<'AI' | 'Human'>('AI');
  const [storyRecordings, setStoryRecordings] = useState<StoryRecordings | null>(null);
  const [hasParentRecording, setHasParentRecording] = useState(false);
  const [isPlayingParentAudio, setIsPlayingParentAudio] = useState(false);

  // Load best available voice and narration mode
  useEffect(() => {
    loadBestVoice();
    loadNarrationMode();
  }, []);

  // Check for parent recordings when story/page changes
  useEffect(() => {
    if (story) {
      checkForParentRecording();
    }
  }, [story, currentPage]);

  const loadNarrationMode = async () => {
    try {
      const mode = await getNarrationMode();
      setNarrationMode(mode);
    } catch (error) {
      console.log('Could not load narration mode:', error);
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

  // Speech recognition event handlers
  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0]?.transcript || '';
      processRecognizedSpeech(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Speech recognition error:', event.error);
    setIsListening(false);
  });

  // Process what the child said
  const processRecognizedSpeech = useCallback((transcript: string) => {
    if (!transcript || pageWords.length === 0) return;
    
    const spokenWords = transcript.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const expectedWord = pageWords[currentWordIndex]?.toLowerCase().replace(/[.,!?;:'"]/g, '') || '';
    
    // Check each spoken word
    for (const spoken of spokenWords) {
      const cleanSpoken = spoken.replace(/[.,!?;:'"]/g, '');
      
      if (cleanSpoken === expectedWord || isSimilarWord(cleanSpoken, expectedWord)) {
        // Correct word!
        setFeedback({ type: 'correct', message: getEncouragement() });
        setWordsCompleted(prev => prev + 1);
        setCurrentWordIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= pageWords.length) {
            // Completed all words on this page!
            setShowGreatJob(true);
            setTimeout(() => setShowGreatJob(false), 2000);
          }
          return nextIndex;
        });
        
        // Clear feedback after a moment
        setTimeout(() => setFeedback({ type: null, message: '' }), 1500);
        return;
      }
    }
    
    // If no match found, help the child
    if (spokenWords.length > 0) {
      setFeedback({ 
        type: 'incorrect', 
        message: `Try again! The word is: "${pageWords[currentWordIndex]}"` 
      });
      // Read the word for them
      speakWord(pageWords[currentWordIndex]);
      setTimeout(() => setFeedback({ type: null, message: '' }), 3000);
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
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Permission Needed', 'Please allow microphone access so I can hear you read!');
        return;
      }

      // Reset state for new listening session
      setRecognizedWords([]);
      
      await ExpoSpeechRecognitionModule.start({
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
      await ExpoSpeechRecognitionModule.stop();
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
    }
  }, [currentPage, pages]);

  useEffect(() => {
    loadStory();
    return () => {
      Speech.stop();
      stopAudioPlayback();
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (e) {
        // Ignore errors on cleanup
      }
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, [id, source]);

  // Auto-play effect for "Read to Me" mode
  useEffect(() => {
    if (selectedMode === 'read-to-me' && isAutoPlaying && pages.length > 0) {
      playCurrentPage();
    }
  }, [currentPage, isAutoPlaying, selectedMode]);

  const loadStory = async () => {
    try {
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
          setPages(storyPages.length > 0 ? storyPages : [libraryStory.text]);
          await addEvent({ type: 'STORY_OPEN', storyId: libraryStory.id });
        }
      } else {
        const stories = await getStories();
        const found = stories.find((s) => s.id === id);
        setStory(found || null);
        if (found) {
          const storyPages = found.text.split('\n\n').filter(p => p.trim());
          setPages(storyPages.length > 0 ? storyPages : [found.text]);
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
    
    setIsSpeaking(true);
    
    // Check if we should use parent recording
    if (narrationMode === 'Human' && hasParentRecording) {
      // Play parent recording
      setIsPlayingParentAudio(true);
      const success = await playPageRecording(
        story.id,
        currentPage,
        () => {
          // On complete
          setIsSpeaking(false);
          setIsPlayingParentAudio(false);
          // Auto advance to next page after a short delay
          if (isAutoPlaying && currentPage < pages.length - 1) {
            autoPlayTimeoutRef.current = setTimeout(() => {
              animatePageFlip(() => {
                setCurrentPage(prev => prev + 1);
              });
            }, 2000);
          } else if (currentPage === pages.length - 1) {
            setIsAutoPlaying(false);
          }
        }
      );
      
      if (!success) {
        // Fallback to TTS if recording fails
        setIsPlayingParentAudio(false);
        playWithTTS();
      }
    } else {
      // Use TTS
      playWithTTS();
    }
  };

  const playWithTTS = () => {
    // Add natural pauses by breaking text at punctuation
    const textToSpeak = pages[currentPage]
      .replace(/\. /g, '.\n')  // Add pause after sentences
      .replace(/! /g, '!\n')
      .replace(/\? /g, '?\n');
    
    Speech.speak(textToSpeak, {
      rate: 0.78, // Slower, more natural pace for kids
      pitch: 1.0, // Natural pitch (1.1 was too high)
      language: 'en-US',
      voice: naturalVoice?.identifier, // Use the best available voice
      onDone: () => {
        setIsSpeaking(false);
        // Auto advance to next page after a short delay
        if (isAutoPlaying && currentPage < pages.length - 1) {
          autoPlayTimeoutRef.current = setTimeout(() => {
            animatePageFlip(() => {
              setCurrentPage(prev => prev + 1);
            });
          }, 2000); // 2 second pause between pages
        } else if (currentPage === pages.length - 1) {
          // Story finished
          setIsAutoPlaying(false);
        }
      },
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
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

  const handlePlayPause = () => {
    if (isSpeaking) {
      Speech.stop();
      stopAudioPlayback();
      setIsSpeaking(false);
      setIsAutoPlaying(false);
      setIsPlayingParentAudio(false);
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    } else {
      setIsAutoPlaying(true);
      playCurrentPage();
    }
  };

  const handleNextPage = () => {
    Speech.stop();
    stopAudioPlayback();
    setIsSpeaking(false);
    setIsPlayingParentAudio(false);
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }
    if (currentPage < pages.length - 1) {
      animatePageFlip(() => {
        setCurrentPage(currentPage + 1);
      });
    }
  };

  const handlePrevPage = () => {
    Speech.stop();
    stopAudioPlayback();
    setIsSpeaking(false);
    setIsPlayingParentAudio(false);
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }
    if (currentPage > 0) {
      animatePageFlip(() => {
        setCurrentPage(currentPage - 1);
      });
    }
  };

  const handleClose = () => {
    Speech.stop();
    stopAudioPlayback();
    stopListening();
    setIsAutoPlaying(false);
    setIsPlayingParentAudio(false);
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }
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

  // Mode Selection Screen
  if (showModeModal) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <View style={styles.modeContainer}>
          {/* Header */}
          <View style={[styles.modeHeader, { backgroundColor: colors.accent }]}>
            <TouchableOpacity style={styles.backButton} onPress={handleClose}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.modeHeaderContent}>
              <Text style={styles.modeHeaderEmoji}>{emojis[0]}</Text>
              <Text style={styles.modeHeaderTitle} numberOfLines={2}>{story.title}</Text>
            </View>
          </View>

          <View style={styles.modeContent}>
            <Text style={styles.modeQuestion}>How do you want to read? 🤔</Text>

            {/* Read to Me Option */}
            <TouchableOpacity
              style={[styles.modeCard, { backgroundColor: '#FFE4EC' }]}
              onPress={() => handleSelectMode('read-to-me')}
              activeOpacity={0.8}
            >
              <View style={[styles.modeIconCircle, { backgroundColor: '#FF6B9D' }]}>
                <Text style={styles.modeIcon}>🔊</Text>
              </View>
              <View style={styles.modeCardContent}>
                <Text style={styles.modeCardTitle}>Read to Me! 📖</Text>
                <Text style={styles.modeCardDesc}>
                  Sit back and listen to the story! Pages turn automatically.
                </Text>
                <View style={styles.modeBadges}>
                  <View style={[styles.modeBadge, { backgroundColor: '#FFB8D9' }]}>
                    <Text style={styles.modeBadgeText}>🎧 Listens</Text>
                  </View>
                  <View style={[styles.modeBadge, { backgroundColor: '#FFB8D9' }]}>
                    <Text style={styles.modeBadgeText}>✨ Auto-flip</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Help Me Read Option */}
            <TouchableOpacity
              style={[styles.modeCard, { backgroundColor: '#E4FFE4' }]}
              onPress={() => handleSelectMode('help-me-read')}
              activeOpacity={0.8}
            >
              <View style={[styles.modeIconCircle, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.modeIcon}>🎤</Text>
              </View>
              <View style={styles.modeCardContent}>
                <Text style={[styles.modeCardTitle, { color: '#2E7D32' }]}>Help Me Read! 🌟</Text>
                <Text style={styles.modeCardDesc}>
                  Read along yourself! Tap to hear words when you need help.
                </Text>
                <View style={styles.modeBadges}>
                  <View style={[styles.modeBadge, { backgroundColor: '#A5D6A7' }]}>
                    <Text style={styles.modeBadgeText}>💪 Practice</Text>
                  </View>
                  <View style={[styles.modeBadge, { backgroundColor: '#A5D6A7' }]}>
                    <Text style={styles.modeBadgeText}>⭐ Learn</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Story Reading View
  const pageScale = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.95, 1],
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.readerContainer}>
        {/* Header */}
        <View style={[styles.readerHeader, { backgroundColor: colors.accent }]}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>{emojis[0]}</Text>
            <Text style={styles.headerMode}>
              {selectedMode === 'read-to-me' ? '🔊 Reading Mode' : '🎤 Practice Mode'}
            </Text>
          </View>
          <View style={styles.pageIndicator}>
            <Text style={styles.pageText}>{currentPage + 1}/{pages.length}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${((currentPage + 1) / pages.length) * 100}%`,
                  backgroundColor: colors.accent 
                }
              ]} 
            />
          </View>
        </View>

        {/* Story Content */}
        <Animated.View 
          style={[
            styles.storyCard, 
            { 
              backgroundColor: '#FFFFFF',
              transform: [{ scale: pageScale }]
            }
          ]}
        >
          {/* Large Emoji Illustration */}
          <View style={[styles.illustrationBox, { backgroundColor: colors.accent }]}>
            <Text style={styles.illustrationEmoji}>{emoji}</Text>
          </View>

          {/* Feedback Message */}
          {feedback.type && (
            <View style={[
              styles.feedbackBanner,
              { backgroundColor: feedback.type === 'correct' ? '#E6FFE6' : '#FFE6E6' }
            ]}>
              <Text style={[
                styles.feedbackText,
                { color: feedback.type === 'correct' ? '#2E7D32' : '#C62828' }
              ]}>
                {feedback.message}
              </Text>
            </View>
          )}

          {/* Great Job Banner */}
          {showGreatJob && (
            <View style={styles.greatJobBanner}>
              <Text style={styles.greatJobText}>🎉 Page Complete! Great Reading! 🌟</Text>
            </View>
          )}

          {/* Story Text - Different display for each mode */}
          <View style={styles.textContainer}>
            {selectedMode === 'help-me-read' ? (
              // Word-by-word display with highlighting
              <View style={styles.wordsContainer}>
                {pageWords.map((word, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => speakWord(word)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.wordText,
                      index === currentWordIndex && styles.currentWord,
                      index < currentWordIndex && styles.completedWord,
                    ]}>
                      {word}{' '}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              // Regular text display for "Read to Me"
              <Text style={styles.storyText}>{pages[currentPage]}</Text>
            )}
          </View>

          {/* Word Progress (Help Me Read mode only) */}
          {selectedMode === 'help-me-read' && (
            <View style={styles.wordProgressContainer}>
              <Text style={styles.wordProgressText}>
                Words: {currentWordIndex}/{pageWords.length} ⭐
              </Text>
            </View>
          )}

          {/* Audio Control - Different for each mode */}
          {selectedMode === 'read-to-me' ? (
            <TouchableOpacity
              style={[
                styles.audioButton,
                { backgroundColor: isSpeaking ? '#FF6B6B' : colors.accent }
              ]}
              onPress={handlePlayPause}
              activeOpacity={0.8}
            >
              <Text style={styles.audioButtonEmoji}>
                {isSpeaking ? '⏸️' : '▶️'}
              </Text>
              <Text style={styles.audioButtonText}>
                {isSpeaking ? 'Pause' : 'Play Story'}
              </Text>
            </TouchableOpacity>
          ) : (
            // Help Me Read controls
            <View style={styles.helpMeReadControls}>
              <TouchableOpacity
                style={[
                  styles.listenButton,
                  { backgroundColor: isListening ? '#FF6B6B' : '#4CAF50' }
                ]}
                onPress={isListening ? stopListening : startListening}
                activeOpacity={0.8}
              >
                <Text style={styles.listenButtonEmoji}>
                  {isListening ? '⏹️' : '🎤'}
                </Text>
                <Text style={styles.listenButtonText}>
                  {isListening ? 'Stop Listening' : 'Start Reading!'}
                </Text>
              </TouchableOpacity>
              
              {isListening && (
                <View style={styles.listeningIndicator}>
                  <Text style={styles.listeningDot}>🔴</Text>
                  <Text style={styles.listeningText}>I'm listening...</Text>
                </View>
              )}
              
              <Text style={styles.helpText}>
                💡 Tap any word to hear it!
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentPage === 0 && styles.navButtonDisabled
            ]}
            onPress={handlePrevPage}
            disabled={currentPage === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonEmoji}>⬅️</Text>
            <Text style={styles.navButtonLabel}>Back</Text>
          </TouchableOpacity>

          <View style={styles.pageDotsContainer}>
            {pages.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.pageDot,
                  idx === currentPage && { backgroundColor: colors.accent, transform: [{ scale: 1.3 }] }
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentPage === pages.length - 1 && styles.navButtonDisabled
            ]}
            onPress={handleNextPage}
            disabled={currentPage === pages.length - 1}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonEmoji}>➡️</Text>
            <Text style={styles.navButtonLabel}>Next</Text>
          </TouchableOpacity>
        </View>

        {/* Finish Button (on last page) */}
        {currentPage === pages.length - 1 && (
          <TouchableOpacity
            style={[styles.finishButton, { backgroundColor: '#4CAF50' }]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.finishButtonEmoji}>🎉</Text>
            <Text style={styles.finishButtonText}>Finished! Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    color: '#666666',
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
    color: '#333333',
    fontWeight: '700',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Mode Selection
  modeContainer: {
    flex: 1,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333333',
    fontWeight: '700',
  },
  modeHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeHeaderEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  modeHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  modeContent: {
    flex: 1,
    padding: 20,
  },
  modeQuestion: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 24,
  },
  modeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  modeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modeIcon: {
    fontSize: 28,
  },
  modeCardContent: {
    flex: 1,
  },
  modeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C2185B',
    marginBottom: 4,
  },
  modeCardDesc: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
    marginBottom: 8,
  },
  modeBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  // Reader
  readerContainer: {
    flex: 1,
  },
  readerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#333333',
    fontWeight: '700',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  headerMode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageIndicator: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  progressBg: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  storyCard: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  illustrationBox: {
    width: SCREEN_WIDTH * 0.5,
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  illustrationEmoji: {
    fontSize: 80,
  },
  textContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  storyText: {
    fontSize: 20,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '500',
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 20,
    marginTop: 16,
  },
  audioButtonEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  audioButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  navButton: {
    alignItems: 'center',
    padding: 8,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  navButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  pageDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 20,
  },
  finishButtonEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Help Me Read styles
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordText: {
    fontSize: 22,
    color: '#666666',
    lineHeight: 36,
    fontWeight: '500',
  },
  currentWord: {
    color: '#1976D2',
    backgroundColor: '#E3F2FD',
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  completedWord: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  feedbackBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: '700',
  },
  greatJobBanner: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFB74D',
  },
  greatJobText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E65100',
    textAlign: 'center',
  },
  wordProgressContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  wordProgressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
  },
  helpMeReadControls: {
    alignItems: 'center',
    marginTop: 16,
  },
  listenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 200,
    justifyContent: 'center',
  },
  listenButtonEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  listenButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  listeningDot: {
    fontSize: 12,
    marginRight: 6,
  },
  listeningText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  helpText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
});

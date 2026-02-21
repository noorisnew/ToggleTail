import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/design';
import { generateStory } from '../src/data/api/storyApi';
import { signOut } from '../src/data/storage/authStorage';
import { AvatarType, ChildProfile, getProfile, updateProfile } from '../src/data/storage/profileStorage';
import { AppSettings, getSettings, updateSettings } from '../src/data/storage/settingsStorage';
import { getStories, Story } from '../src/data/storage/storyStorage';
import { normalizeError } from '../src/domain/services/errorService';

// Avatar emoji mapping
const AVATAR_EMOJIS: Record<AvatarType, string> = {
  Lion: '🦁',
  Bear: '🐻',
  Bunny: '🐰',
  Panda: '🐼',
  Fox: '🦊',
  Koala: '🐨',
  Unicorn: '🦄',
  Frog: '🐸',
  Owl: '🦉',
  Octopus: '🐙',
  Dino: '🦖',
  Cat: '🐱',
};

const AVATAR_OPTIONS: AvatarType[] = ['Unicorn', 'Lion', 'Bear', 'Bunny', 'Panda', 'Fox', 'Koala', 'Frog', 'Owl', 'Octopus', 'Dino', 'Cat'];

// Story themes
const STORY_THEMES = [
  { id: 'forest', name: 'Forest', emoji: '🌲' },
  { id: 'space', name: 'Space', emoji: '🚀' },
  { id: 'castle', name: 'Castle', emoji: '🏰' },
  { id: 'ocean', name: 'Ocean', emoji: '🌊' },
];

// AI Agents
const AI_AGENTS = [
  { id: 'creative', name: 'Creative', emoji: '🎨' },
  { id: 'educational', name: 'Educational', emoji: '📚' },
  { id: 'adventurous', name: 'Adventurous', emoji: '⚔️' },
  { id: 'calming', name: 'Calming', emoji: '🌙' },
];

// Reading levels
const READING_LEVELS = [
  { id: 'Beginner', name: 'Beginner', emoji: '🌱' },
  { id: 'Intermediate', name: 'Medium', emoji: '🌿' },
  { id: 'Advanced', name: 'Advanced', emoji: '🌳' },
];

// Voice options
const VOICE_OPTIONS = [
  { id: 'cheerful', name: 'Cheerful Child', emoji: '🌟' },
  { id: 'rachel', name: 'Rachel (Warm)', emoji: '🎀' },
  { id: 'josh', name: 'Josh (Energetic)', emoji: '⚡' },
  { id: 'dorothy', name: 'Dorothy (Grandma)', emoji: '🍪' },
];

type MainTab = 'child' | 'parent';
type ParentTab = 'settings' | 'create';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [settings, setSettingsState] = useState<AppSettings | null>(null);
  const [storiesCount, setStoriesCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  
  // Tab state
  const [mainTab, setMainTab] = useState<MainTab>('child');
  const [parentTab, setParentTab] = useState<ParentTab>('settings');
  
  // Avatar picker modal
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  
  // Story creation state
  const [storyTitle, setStoryTitle] = useState('');
  const [includeChild, setIncludeChild] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState('creative');
  const [selectedTheme, setSelectedTheme] = useState('forest');
  const [mainCharacter, setMainCharacter] = useState('');
  const [storyLength, setStoryLength] = useState<'Short' | 'Medium' | 'Long'>('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Settings state
  const [dailyTimeLimit, setDailyTimeLimit] = useState(30);
  const [selectedVoice, setSelectedVoice] = useState('cheerful');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [readingLevel, setReadingLevel] = useState('Beginner');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, storiesData, settingsData] = await Promise.all([
        getProfile(),
        getStories(),
        getSettings(),
      ]);
      
      setProfile(profileData);
      setStoriesCount(storiesData.filter((s: Story) => s.approved).length);
      setFavoritesCount(storiesData.filter((s: Story) => s.isFavorite).length);
      
      if (settingsData) {
        setSettingsState(settingsData);
        setDailyTimeLimit(settingsData.dailyTimeLimit || 30);
        setSelectedVoice(settingsData.selectedVoice || 'cheerful');
        setVoiceSpeed(settingsData.voiceSpeed || 1.0);
        setSoundEffects(settingsData.soundEffects ?? true);
        setAutoPlay(settingsData.autoPlay ?? false);
        setReadingLevel(settingsData.readingLevel || 'Beginner');
      }
    } catch (error) {
      console.error('loadData:', normalizeError(error));
    }
  };

  const handleAvatarChange = async (avatar: AvatarType) => {
    try {
      await updateProfile({ avatar });
      setProfile((prev: ChildProfile | null) => prev ? { ...prev, avatar } : null);
      setShowAvatarPicker(false);
    } catch (error) {
      console.error('handleAvatarChange:', normalizeError(error));
      Alert.alert('Error', 'Could not update avatar.');
    }
  };

  const handleSettingsChange = async (key: keyof AppSettings, value: number | string | boolean) => {
    try {
      await updateSettings({ [key]: value });
      setSettingsState((prev: AppSettings | null) => {
        if (!prev) return null;
        return { ...prev, [key]: value };
      });
    } catch (error) {
      console.error('handleSettingsChange:', normalizeError(error));
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
              router.replace('/onboarding/welcome');
            } else {
              Alert.alert('Error', 'Could not sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleGenerateStory = async () => {
    if (!storyTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a story title.');
      return;
    }

    setIsGenerating(true);
    try {
      const theme = STORY_THEMES.find(t => t.id === selectedTheme);
      const agent = AI_AGENTS.find(a => a.id === selectedAgent);
      
      const result = await generateStory({
        childName: includeChild && profile?.name ? profile.name : undefined,
        age: profile?.age || 6,
        readingLevel: readingLevel as 'Beginner' | 'Intermediate' | 'Advanced',
        interests: [theme?.name || 'Adventure'],
        title: storyTitle,
        theme: theme?.name,
        mainCharacter: mainCharacter || undefined,
        storyLength: storyLength,
        agentStyle: agent?.id,
      });

      if (result.success) {
        Alert.alert(
          'Story Generated! 🎉',
          `"${result.title}" has been created and is ready for review.`,
          [
            { text: 'View Story', onPress: () => router.push(`/story-view?id=${result.id}`) },
            { text: 'OK' },
          ]
        );
        
        // Reset form
        setStoryTitle('');
        setMainCharacter('');
      } else {
        Alert.alert('Error', result.error || 'Could not generate story.');
      }
    } catch (error) {
      console.error('handleGenerateStory:', normalizeError(error));
      Alert.alert('Error', 'Could not generate story. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const avatarEmoji = profile?.avatar ? AVATAR_EMOJIS[profile.avatar] : '🦄';

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primaryStart, Colors.primaryEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Main Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'child' && styles.mainTabActive]}
          onPress={() => setMainTab('child')}
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={[styles.tabText, mainTab === 'child' && styles.tabTextActive]}>
            {profile?.name || 'Child'}'s Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'parent' && styles.mainTabActive]}
          onPress={() => setMainTab('parent')}
        >
          <Text style={styles.tabIcon}>🔒</Text>
          <Text style={[styles.tabText, mainTab === 'parent' && styles.tabTextActive]}>
            Parent View
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {mainTab === 'child' ? (
          // Child Profile Tab
          <View style={styles.childProfile}>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
              </View>
              <Text style={styles.childName}>{profile?.name || 'Child'}</Text>
              <TouchableOpacity
                style={styles.changeAvatarButton}
                onPress={() => setShowAvatarPicker(true)}
              >
                <LinearGradient
                  colors={[Colors.primaryStart, Colors.primaryEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.changeAvatarGradient}
                >
                  <Text style={styles.changeAvatarText}>Change Avatar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: '#fef9c3' }]}>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Stories Read</Text>
                  <Text style={styles.statValue}>{storiesCount}</Text>
                </View>
                <Text style={styles.statEmoji}>📚</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#f3e8ff', borderColor: Colors.primaryStart }]}>
                <View style={styles.statContent}>
                  <Text style={[styles.statLabel, { color: Colors.primaryStart }]}>Reading Streak</Text>
                  <Text style={styles.statValue}>{profile?.readingStreak || 0} days</Text>
                </View>
                <Text style={styles.statEmoji}>🔥</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#fce7f3', borderColor: '#ec4899' }]}>
                <View style={styles.statContent}>
                  <Text style={[styles.statLabel, { color: '#ec4899' }]}>Favorite Stories</Text>
                  <Text style={styles.statValue}>{favoritesCount}</Text>
                </View>
                <Text style={styles.statEmoji}>⭐</Text>
              </View>
            </View>
          </View>
        ) : (
          // Parent View Tab
          <View style={styles.parentView}>
            {/* Parent Sub-tabs */}
            <View style={styles.parentTabContainer}>
              <TouchableOpacity
                style={[styles.parentTab, parentTab === 'settings' && styles.parentTabActiveStyle]}
                onPress={() => setParentTab('settings')}
              >
                <Text style={styles.parentTabIcon}>⚙️</Text>
                <Text style={[styles.parentTabText, parentTab === 'settings' && styles.parentTabTextActive]}>
                  Settings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.parentTab, parentTab === 'create' && styles.parentTabActiveStyle]}
                onPress={() => setParentTab('create')}
              >
                <Text style={styles.parentTabIcon}>➕</Text>
                <Text style={[styles.parentTabText, parentTab === 'create' && styles.parentTabTextActive]}>
                  Create Story
                </Text>
              </TouchableOpacity>
            </View>

            {parentTab === 'settings' ? (
              // Settings Tab Content
              <View style={styles.settingsContent}>
                {/* Daily Time Limit */}
                <View style={styles.settingCard}>
                  <View style={styles.settingHeader}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#f3e8ff' }]}>
                      <Text style={styles.settingIcon}>⏰</Text>
                    </View>
                    <Text style={[styles.settingTitle, { color: Colors.primaryStart }]}>Daily Time Limit</Text>
                  </View>
                  <Text style={styles.settingValue}>{dailyTimeLimit} minutes</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={10}
                    maximumValue={120}
                    step={5}
                    value={dailyTimeLimit}
                    onValueChange={setDailyTimeLimit}
                    onSlidingComplete={(value) => handleSettingsChange('dailyTimeLimit', value)}
                    minimumTrackTintColor={Colors.primaryStart}
                    maximumTrackTintColor="#e5e7eb"
                    thumbTintColor={Colors.primaryStart}
                  />
                </View>

                {/* AI Voice Settings */}
                <View style={styles.settingCard}>
                  <View style={styles.settingHeader}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#f3e8ff' }]}>
                      <Text style={styles.settingIcon}>🎙️</Text>
                    </View>
                    <Text style={[styles.settingTitle, { color: Colors.primaryStart }]}>AI Voice Settings</Text>
                  </View>
                  
                  <View style={styles.dropdown}>
                    <Text style={styles.dropdownText}>
                      {VOICE_OPTIONS.find(v => v.id === selectedVoice)?.name} {VOICE_OPTIONS.find(v => v.id === selectedVoice)?.emoji}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </View>
                  
                  <Text style={styles.speedLabel}>Speed: {voiceSpeed.toFixed(1)}x</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0.5}
                    maximumValue={2.0}
                    step={0.1}
                    value={voiceSpeed}
                    onValueChange={setVoiceSpeed}
                    onSlidingComplete={(value) => handleSettingsChange('voiceSpeed', value)}
                    minimumTrackTintColor={Colors.primaryStart}
                    maximumTrackTintColor="#e5e7eb"
                    thumbTintColor={Colors.primaryStart}
                  />
                </View>

                {/* Record Your Voice */}
                <View style={[styles.settingCard, { backgroundColor: '#fdf2f8', borderColor: '#ec4899' }]}>
                  <View style={styles.settingHeader}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#fce7f3' }]}>
                      <Text style={styles.settingIcon}>🎤</Text>
                    </View>
                    <Text style={[styles.settingTitle, { color: '#ec4899' }]}>Record Your Voice</Text>
                  </View>
                  
                  <View style={styles.recordingPrompt}>
                    <Text style={styles.promptText}>
                      "Once upon a time, in a magical forest filled with wonder, there lived a curious little {profile?.name || 'child'}..."
                    </Text>
                  </View>
                  
                  <TouchableOpacity style={styles.recordButton}>
                    <LinearGradient
                      colors={['#ec4899', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.recordButtonGradient}
                    >
                      <Text style={styles.recordButtonIcon}>🎙️</Text>
                      <Text style={styles.recordButtonText}>Start Recording</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Toggles */}
                <View style={styles.togglesContainer}>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Sound Effects</Text>
                    <Switch
                      value={soundEffects}
                      onValueChange={(value) => {
                        setSoundEffects(value);
                        handleSettingsChange('soundEffects', value);
                      }}
                      trackColor={{ false: '#e5e7eb', true: Colors.primaryStart }}
                      thumbColor="#fff"
                    />
                  </View>
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Auto-Play</Text>
                    <Switch
                      value={autoPlay}
                      onValueChange={(value) => {
                        setAutoPlay(value);
                        handleSettingsChange('autoPlay', value);
                      }}
                      trackColor={{ false: '#e5e7eb', true: Colors.primaryStart }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>

                {/* Reading Level */}
                <View style={styles.settingCard}>
                  <View style={styles.settingHeader}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#f3e8ff' }]}>
                      <Text style={styles.settingIcon}>📖</Text>
                    </View>
                    <Text style={[styles.settingTitle, { color: Colors.primaryStart }]}>Reading Level</Text>
                  </View>
                  
                  <View style={styles.levelOptions}>
                    {READING_LEVELS.map((level) => (
                      <TouchableOpacity
                        key={level.id}
                        style={[
                          styles.levelOption,
                          readingLevel === level.id && styles.levelOptionActive,
                        ]}
                        onPress={() => {
                          setReadingLevel(level.id);
                          handleSettingsChange('readingLevel', level.id);
                        }}
                      >
                        <Text style={styles.levelEmoji}>{level.emoji}</Text>
                        <Text style={[
                          styles.levelText,
                          readingLevel === level.id && styles.levelTextActive,
                        ]}>
                          {level.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Sign Out */}
                <TouchableOpacity
                  style={styles.signOutButton}
                  onPress={handleSignOut}
                >
                  <Text style={styles.signOutIcon}>🚪</Text>
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Create Story Tab Content
              <View style={styles.createContent}>
                {/* Upload PDF */}
                <View style={[styles.settingCard, { backgroundColor: '#fef9c3', borderColor: '#facc15' }]}>
                  <View style={styles.settingHeader}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#fef08a' }]}>
                      <Text style={styles.settingIcon}>📤</Text>
                    </View>
                    <Text style={[styles.settingTitle, { color: '#ca8a04' }]}>Upload PDF Story</Text>
                  </View>
                  
                  <TouchableOpacity style={styles.uploadArea}>
                    <Text style={styles.uploadIcon}>📄</Text>
                    <Text style={styles.uploadText}>Click to upload PDF</Text>
                  </TouchableOpacity>
                </View>

                {/* AI Story Generator */}
                <View style={[styles.settingCard, { backgroundColor: '#fdf2f8', borderColor: '#ec4899' }]}>
                  <View style={styles.settingHeader}>
                    <View style={[styles.settingIconBg, { backgroundColor: '#fce7f3' }]}>
                      <Text style={styles.settingIcon}>✨</Text>
                    </View>
                    <Text style={[styles.settingTitle, { color: '#ec4899' }]}>AI Story Generator</Text>
                  </View>

                  {/* Story Title */}
                  <Text style={styles.inputLabel}>Story Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`e.g., ${profile?.name || 'Child'}'s Adventure`}
                    placeholderTextColor={Colors.textMuted}
                    value={storyTitle}
                    onChangeText={setStoryTitle}
                  />

                  {/* Include Child Toggle */}
                  <View style={styles.toggleRow}>
                    <Text style={styles.toggleLabel}>Include {profile?.name || 'child'}</Text>
                    <Switch
                      value={includeChild}
                      onValueChange={setIncludeChild}
                      trackColor={{ false: '#e5e7eb', true: Colors.primaryStart }}
                      thumbColor="#fff"
                    />
                  </View>

                  {/* AI Agent */}
                  <Text style={styles.inputLabel}>AI Agent</Text>
                  <View style={styles.dropdown}>
                    <Text style={styles.dropdownText}>
                      {AI_AGENTS.find(a => a.id === selectedAgent)?.emoji} {AI_AGENTS.find(a => a.id === selectedAgent)?.name}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </View>

                  {/* Story Theme */}
                  <Text style={styles.inputLabel}>Story Theme</Text>
                  <View style={styles.themeOptions}>
                    {STORY_THEMES.map((theme) => (
                      <TouchableOpacity
                        key={theme.id}
                        style={[
                          styles.themeOption,
                          selectedTheme === theme.id && styles.themeOptionActive,
                        ]}
                        onPress={() => setSelectedTheme(theme.id)}
                      >
                        <Text style={styles.themeEmoji}>{theme.emoji}</Text>
                        <Text style={styles.themeText}>{theme.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Main Character */}
                  <Text style={styles.inputLabel}>Main Character</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., A brave little bear"
                    placeholderTextColor={Colors.textMuted}
                    value={mainCharacter}
                    onChangeText={setMainCharacter}
                  />

                  {/* Length */}
                  <Text style={styles.inputLabel}>Length</Text>
                  <View style={styles.lengthOptions}>
                    {(['Short', 'Medium', 'Long'] as const).map((length) => (
                      <TouchableOpacity
                        key={length}
                        style={[
                          styles.lengthOption,
                          storyLength === length && styles.lengthOptionActive,
                        ]}
                        onPress={() => setStoryLength(length)}
                      >
                        <Text style={[
                          styles.lengthText,
                          storyLength === length && styles.lengthTextActive,
                        ]}>
                          {length}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Generate Button */}
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={handleGenerateStory}
                    disabled={isGenerating}
                  >
                    <LinearGradient
                      colors={[Colors.primaryStart, Colors.primaryEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.generateButtonGradient}
                    >
                      <Text style={styles.generateButtonIcon}>✨</Text>
                      <Text style={styles.generateButtonText}>
                        {isGenerating ? 'Generating...' : 'Generate Story'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal
        visible={showAvatarPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((avatar) => (
                <TouchableOpacity
                  key={avatar}
                  style={[
                    styles.avatarOption,
                    profile?.avatar === avatar && styles.avatarOptionActive,
                  ]}
                  onPress={() => handleAvatarChange(avatar)}
                >
                  <Text style={styles.avatarOptionEmoji}>{AVATAR_EMOJIS[avatar]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAvatarPicker(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 50,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    marginHorizontal: Spacing.md,
    marginTop: -10,
    borderRadius: BorderRadius.card,
    padding: 4,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
  },
  mainTabActive: {
    backgroundColor: '#fff',
    ...Shadows.card,
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabText: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.semibold,
  },
  tabTextActive: {
    color: Colors.primaryStart,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },

  // Child Profile Styles
  childProfile: {
    paddingBottom: Spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fce7f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarEmoji: {
    fontSize: 50,
  },
  childName: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  changeAvatarButton: {
    borderRadius: BorderRadius.button,
    overflow: 'hidden',
  },
  changeAvatarGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  changeAvatarText: {
    color: '#fff',
    fontWeight: Typography.weights.semibold,
    fontSize: Typography.sizes.body,
  },
  statsContainer: {
    gap: Spacing.md,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    borderColor: '#facc15',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: Typography.sizes.body,
    color: '#ca8a04',
    fontWeight: Typography.weights.semibold,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  statEmoji: {
    fontSize: 40,
  },

  // Parent View Styles
  parentView: {
    paddingBottom: Spacing.xl,
  },
  parentTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: BorderRadius.card,
    padding: 4,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  parentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
  },
  parentTabActiveStyle: {
    backgroundColor: '#f3f4f6',
  },
  parentTabIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  parentTabText: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.semibold,
  },
  parentTabTextActive: {
    color: Colors.textPrimary,
  },

  // Settings Styles
  settingsContent: {
    gap: Spacing.md,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primaryStart,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  settingIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  settingIcon: {
    fontSize: 18,
  },
  settingTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
  },
  settingValue: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: BorderRadius.button,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dropdownText: {
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
  dropdownArrow: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  speedLabel: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  recordingPrompt: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.button,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  promptText: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  recordButton: {
    borderRadius: BorderRadius.button,
    overflow: 'hidden',
  },
  recordButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  recordButtonIcon: {
    fontSize: 18,
  },
  recordButtonText: {
    color: '#fff',
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.body,
  },
  togglesContainer: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  toggleLabel: {
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
  },
  levelOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  levelOption: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelOptionActive: {
    backgroundColor: '#f3e8ff',
    borderColor: Colors.primaryStart,
  },
  levelEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  levelText: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  levelTextActive: {
    color: Colors.primaryStart,
    fontWeight: Typography.weights.bold,
  },

  // Create Story Styles
  createContent: {
    gap: Spacing.md,
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#facc15',
    borderRadius: BorderRadius.button,
    backgroundColor: '#fffef0',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  uploadText: {
    fontSize: Typography.sizes.body,
    color: '#ca8a04',
  },
  inputLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: BorderRadius.button,
    padding: Spacing.md,
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeOptionActive: {
    backgroundColor: '#f3e8ff',
    borderColor: Colors.primaryStart,
  },
  themeEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  themeText: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
  },
  lengthOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  lengthOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.button,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  lengthOptionActive: {
    backgroundColor: '#f3e8ff',
    borderColor: Colors.primaryStart,
  },
  lengthText: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  lengthTextActive: {
    color: Colors.primaryStart,
    fontWeight: Typography.weights.bold,
  },
  generateButton: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.button,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  generateButtonIcon: {
    fontSize: 18,
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.body,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionActive: {
    borderColor: Colors.primaryStart,
    backgroundColor: '#f3e8ff',
  },
  avatarOptionEmoji: {
    fontSize: 30,
  },
  modalCloseButton: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.semibold,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  signOutIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  signOutText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: '#ef4444',
  },
});

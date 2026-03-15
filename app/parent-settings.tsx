import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors, Shadows } from '../constants/design';
import { signOut } from '../src/data/storage/authStorage';
import {
    AvatarType,
    ChildProfile,
    getProfile,
    InterestType,
    updateProfile,
} from '../src/data/storage/profileStorage';
import {
    ALL_GENRES,
    AppSettings,
    getScreenTime,
    getSettings,
    ScreenTimeData,
    updateSettings,
} from '../src/data/storage/settingsStorage';

// Avatar options with emojis
const AVATARS: { type: AvatarType; emoji: string }[] = [
  { type: 'Lion', emoji: '🦁' },
  { type: 'Bear', emoji: '🐻' },
  { type: 'Bunny', emoji: '🐰' },
  { type: 'Panda', emoji: '🐼' },
  { type: 'Fox', emoji: '🦊' },
  { type: 'Koala', emoji: '🐨' },
  { type: 'Unicorn', emoji: '🦄' },
  { type: 'Frog', emoji: '🐸' },
  { type: 'Owl', emoji: '🦉' },
  { type: 'Octopus', emoji: '🐙' },
  { type: 'Dino', emoji: '🦕' },
  { type: 'Cat', emoji: '🐱' },
];

// Interest options with emojis
const INTERESTS: { type: InterestType; emoji: string }[] = [
  { type: 'Super Heroes', emoji: '🦸' },
  { type: 'Dragons & Magic', emoji: '🐲' },
  { type: 'Fairy Tales', emoji: '👸' },
  { type: 'Mystery & Puzzles', emoji: '🔍' },
  { type: 'Dinosaurs', emoji: '🦕' },
  { type: 'Ocean Adventures', emoji: '🐳' },
  { type: 'Cute Animals', emoji: '🐰' },
  { type: 'Space & Robots', emoji: '🚀' },
];

// Genre options with emojis
const GENRES = [
  { name: 'Animals', emoji: '🦁' },
  { name: 'Adventure', emoji: '🗺️' },
  { name: 'Bedtime', emoji: '🌙' },
  { name: 'Fantasy', emoji: '🧙' },
  { name: 'Science', emoji: '🔬' },
  { name: 'Values', emoji: '💝' },
];

type SettingsSection = 'screenTime' | 'readingLevel' | 'voice' | 'content' | 'profile';

export default function ParentSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [screenTime, setScreenTime] = useState<ScreenTimeData | null>(null);
  const [expandedSection, setExpandedSection] = useState<SettingsSection | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const [settingsData, profileData, screenTimeData] = await Promise.all([
      getSettings(),
      getProfile(),
      getScreenTime(),
    ]);
    setSettings(settingsData);
    setProfile(profileData);
    setScreenTime(screenTimeData);
    setTempName(profileData?.name || '');
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setHasChanges(true);
    await updateSettings(updates);
  };

  const handleUpdateProfile = async (updates: Partial<ChildProfile>) => {
    if (!profile) return;
    const updated = await updateProfile(updates);
    if (updated) {
      setProfile(updated);
      setHasChanges(true);
    }
  };

  const toggleSection = (section: SettingsSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleGenre = (genre: string) => {
    if (!settings) return;
    const current = settings.allowedGenres || [];
    const updated = current.includes(genre)
      ? current.filter(g => g !== genre)
      : [...current, genre];
    
    if (updated.length === 0) {
      Alert.alert('Error', 'At least one genre must be enabled');
      return;
    }
    handleUpdateSettings({ allowedGenres: updated });
  };

  const toggleInterest = (interest: InterestType) => {
    if (!profile) return;
    const current = profile.interests || [];
    const updated = current.includes(interest)
      ? current.filter(i => i !== interest)
      : [...current, interest];
    handleUpdateProfile({ interests: updated });
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? This will clear all data including stories and settings.',
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

  if (!settings || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>⚙️</Text>
          <Text style={styles.loadingText}>Loading settings...</Text>
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
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>⚙️</Text>
          <Text style={styles.headerTitle}>Parent Settings</Text>
        </View>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Time Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('screenTime')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionEmoji}>⏱️</Text>
            <View>
              <Text style={styles.sectionTitle}>Screen Time</Text>
              <Text style={styles.sectionSubtitle}>
                {settings.screenTimeEnabled 
                  ? `${settings.dailyTimeLimit} min daily limit`
                  : 'Unlimited'}
              </Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>
            {expandedSection === 'screenTime' ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'screenTime' && (
          <View style={styles.sectionContent}>
            {/* Today's Usage */}
            {screenTime && (
              <View style={styles.usageCard}>
                <Text style={styles.usageTitle}>Today's Usage</Text>
                <View style={styles.usageStats}>
                  <View style={styles.usageStat}>
                    <Text style={styles.usageNumber}>{screenTime.minutesUsed}</Text>
                    <Text style={styles.usageLabel}>minutes</Text>
                  </View>
                  <View style={styles.usageDivider} />
                  <View style={styles.usageStat}>
                    <Text style={styles.usageNumber}>{screenTime.sessionsCount}</Text>
                    <Text style={styles.usageLabel}>sessions</Text>
                  </View>
                </View>
                {settings.screenTimeEnabled && settings.dailyTimeLimit > 0 && (
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <View 
                        style={[
                          styles.progressBarFill,
                          { 
                            width: `${Math.min(100, (screenTime.minutesUsed / settings.dailyTimeLimit) * 100)}%`,
                            backgroundColor: screenTime.minutesUsed >= settings.dailyTimeLimit ? '#EF4444' : '#22C55E'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.max(0, settings.dailyTimeLimit - screenTime.minutesUsed)} min remaining
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Enable Screen Time */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Enable Time Limits</Text>
                <Text style={styles.settingDesc}>Restrict daily reading time</Text>
              </View>
              <Switch
                value={settings.screenTimeEnabled}
                onValueChange={(value) => handleUpdateSettings({ screenTimeEnabled: value })}
                trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                thumbColor={settings.screenTimeEnabled ? '#7C3AED' : '#F3F4F6'}
              />
            </View>

            {/* Time Limit Slider */}
            {settings.screenTimeEnabled && (
              <View style={styles.sliderContainer}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Daily Limit</Text>
                  <Text style={styles.sliderValue}>{settings.dailyTimeLimit} min</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={15}
                  maximumValue={120}
                  step={5}
                  value={settings.dailyTimeLimit}
                  onValueChange={(value) => handleUpdateSettings({ dailyTimeLimit: value })}
                  minimumTrackTintColor="#7C3AED"
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor="#7C3AED"
                />
                <View style={styles.sliderMarks}>
                  <Text style={styles.sliderMark}>15m</Text>
                  <Text style={styles.sliderMark}>1hr</Text>
                  <Text style={styles.sliderMark}>2hr</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Reading Level Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('readingLevel')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionEmoji}>📚</Text>
            <View>
              <Text style={styles.sectionTitle}>Reading Level</Text>
              <Text style={styles.sectionSubtitle}>
                Level {settings.readingLevel} - {
                  settings.readingLevel === 1 ? 'Beginner (Ages 3-5)' :
                  settings.readingLevel === 2 ? 'Intermediate (Ages 5-7)' :
                  'Advanced (Ages 7-9)'
                }
              </Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>
            {expandedSection === 'readingLevel' ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'readingLevel' && (
          <View style={styles.sectionContent}>
            {/* Level Selection */}
            <View style={styles.levelButtons}>
              {[1, 2, 3].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelButton,
                    settings.readingLevel === level && styles.levelButtonActive
                  ]}
                  onPress={() => handleUpdateSettings({ readingLevel: level as 1 | 2 | 3 })}
                >
                  <Text style={styles.levelEmoji}>
                    {level === 1 ? '🌱' : level === 2 ? '🌿' : '🌳'}
                  </Text>
                  <Text style={[
                    styles.levelText,
                    settings.readingLevel === level && styles.levelTextActive
                  ]}>
                    Level {level}
                  </Text>
                  <Text style={styles.levelDesc}>
                    {level === 1 ? 'Simple words' : level === 2 ? 'Short sentences' : 'Full stories'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Auto-adjust */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-Adjust Level</Text>
                <Text style={styles.settingDesc}>Automatically increase level based on progress</Text>
              </View>
              <Switch
                value={settings.autoAdjustLevel}
                onValueChange={(value) => handleUpdateSettings({ autoAdjustLevel: value })}
                trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                thumbColor={settings.autoAdjustLevel ? '#7C3AED' : '#F3F4F6'}
              />
            </View>
          </View>
        )}

        {/* Voice Settings Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('voice')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionEmoji}>🔊</Text>
            <View>
              <Text style={styles.sectionTitle}>Voice & Audio</Text>
              <Text style={styles.sectionSubtitle}>
                Speed: {settings.voiceSpeed}x | {settings.narrationMode} Narration
              </Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>
            {expandedSection === 'voice' ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'voice' && (
          <View style={styles.sectionContent}>
            {/* Narration Mode */}
            <View style={styles.modeSelector}>
              <Text style={styles.modeSelectorLabel}>Narration Mode</Text>
              <View style={styles.modeButtons}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    settings.narrationMode === 'AI' && styles.modeButtonActive
                  ]}
                  onPress={() => handleUpdateSettings({ narrationMode: 'AI' })}
                >
                  <Text style={styles.modeEmoji}>🤖</Text>
                  <Text style={[
                    styles.modeText,
                    settings.narrationMode === 'AI' && styles.modeTextActive
                  ]}>AI Voice</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    settings.narrationMode === 'Human' && styles.modeButtonActive
                  ]}
                  onPress={() => handleUpdateSettings({ narrationMode: 'Human' })}
                >
                  <Text style={styles.modeEmoji}>🎤</Text>
                  <Text style={[
                    styles.modeText,
                    settings.narrationMode === 'Human' && styles.modeTextActive
                  ]}>Your Voice</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Voice Speed */}
            <View style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Voice Speed</Text>
                <Text style={styles.sliderValue}>{settings.voiceSpeed.toFixed(1)}x</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={1.5}
                step={0.1}
                value={settings.voiceSpeed}
                onValueChange={(value) => handleUpdateSettings({ voiceSpeed: value })}
                minimumTrackTintColor="#7C3AED"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#7C3AED"
              />
              <View style={styles.sliderMarks}>
                <Text style={styles.sliderMark}>Slow</Text>
                <Text style={styles.sliderMark}>Normal</Text>
                <Text style={styles.sliderMark}>Fast</Text>
              </View>
            </View>

            {/* Voice Pitch */}
            <View style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderLabel}>Voice Pitch</Text>
                <Text style={styles.sliderValue}>{settings.voicePitch.toFixed(1)}x</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={1.5}
                step={0.1}
                value={settings.voicePitch}
                onValueChange={(value) => handleUpdateSettings({ voicePitch: value })}
                minimumTrackTintColor="#7C3AED"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#7C3AED"
              />
              <View style={styles.sliderMarks}>
                <Text style={styles.sliderMark}>Low</Text>
                <Text style={styles.sliderMark}>Normal</Text>
                <Text style={styles.sliderMark}>High</Text>
              </View>
            </View>

            {/* Audio Toggles */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <Text style={styles.settingDesc}>Page turns, celebrations</Text>
              </View>
              <Switch
                value={settings.soundEffects}
                onValueChange={(value) => handleUpdateSettings({ soundEffects: value })}
                trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                thumbColor={settings.soundEffects ? '#7C3AED' : '#F3F4F6'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Auto-Play Stories</Text>
                <Text style={styles.settingDesc}>Automatically start narration</Text>
              </View>
              <Switch
                value={settings.autoPlay}
                onValueChange={(value) => handleUpdateSettings({ autoPlay: value })}
                trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                thumbColor={settings.autoPlay ? '#7C3AED' : '#F3F4F6'}
              />
            </View>
          </View>
        )}

        {/* Content Filters Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('content')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionEmoji}>🎯</Text>
            <View>
              <Text style={styles.sectionTitle}>Content Filters</Text>
              <Text style={styles.sectionSubtitle}>
                {settings.allowedGenres.length} of {ALL_GENRES.length} genres enabled
              </Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>
            {expandedSection === 'content' ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'content' && (
          <View style={styles.sectionContent}>
            {/* Safe Mode */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Safe Mode</Text>
                <Text style={styles.settingDesc}>Filter all content for children</Text>
              </View>
              <Switch
                value={settings.contentSafeMode}
                onValueChange={(value) => handleUpdateSettings({ contentSafeMode: value })}
                trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                thumbColor={settings.contentSafeMode ? '#7C3AED' : '#F3F4F6'}
              />
            </View>

            {/* Genre Selection */}
            <Text style={styles.genresLabel}>Allowed Genres</Text>
            <View style={styles.genresGrid}>
              {GENRES.map((genre) => (
                <TouchableOpacity
                  key={genre.name}
                  style={[
                    styles.genreChip,
                    settings.allowedGenres.includes(genre.name) && styles.genreChipActive
                  ]}
                  onPress={() => toggleGenre(genre.name)}
                >
                  <Text style={styles.genreEmoji}>{genre.emoji}</Text>
                  <Text style={[
                    styles.genreText,
                    settings.allowedGenres.includes(genre.name) && styles.genreTextActive
                  ]}>{genre.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Child Profile Section */}
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('profile')}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionEmoji}>👶</Text>
            <View>
              <Text style={styles.sectionTitle}>Child Profile</Text>
              <Text style={styles.sectionSubtitle}>
                {profile.name || 'Unknown'}, Age {profile.age}
              </Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>
            {expandedSection === 'profile' ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {expandedSection === 'profile' && (
          <View style={styles.sectionContent}>
            {/* Name */}
            <View style={styles.profileField}>
              <Text style={styles.profileLabel}>Name</Text>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={tempName}
                    onChangeText={setTempName}
                    autoFocus
                    placeholder="Enter name"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => {
                      if (tempName.trim()) {
                        handleUpdateProfile({ name: tempName.trim() });
                      }
                      setEditingName(false);
                    }}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.profileValueRow}
                  onPress={() => setEditingName(true)}
                >
                  <Text style={styles.profileValue}>{profile.name}</Text>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Age */}
            <View style={styles.profileField}>
              <Text style={styles.profileLabel}>Age</Text>
              <View style={styles.ageButtons}>
                {[3, 4, 5, 6, 7, 8, 9].map((age) => (
                  <TouchableOpacity
                    key={age}
                    style={[
                      styles.ageButton,
                      profile.age === age && styles.ageButtonActive
                    ]}
                    onPress={() => handleUpdateProfile({ age })}
                  >
                    <Text style={[
                      styles.ageText,
                      profile.age === age && styles.ageTextActive
                    ]}>{age}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Avatar */}
            <View style={styles.profileField}>
              <Text style={styles.profileLabel}>Avatar</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.avatarScroll}
              >
                {AVATARS.map((avatar) => (
                  <TouchableOpacity
                    key={avatar.type}
                    style={[
                      styles.avatarOption,
                      profile.avatar === avatar.type && styles.avatarOptionActive
                    ]}
                    onPress={() => handleUpdateProfile({ avatar: avatar.type })}
                  >
                    <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Interests */}
            <View style={styles.profileField}>
              <Text style={styles.profileLabel}>Interests</Text>
              <View style={styles.interestsGrid}>
                {INTERESTS.map((interest) => (
                  <TouchableOpacity
                    key={interest.type}
                    style={[
                      styles.interestChip,
                      profile.interests?.includes(interest.type) && styles.interestChipActive
                    ]}
                    onPress={() => toggleInterest(interest.type)}
                  >
                    <Text style={styles.interestEmoji}>{interest.emoji}</Text>
                    <Text style={[
                      styles.interestText,
                      profile.interests?.includes(interest.type) && styles.interestTextActive
                    ]}>{interest.type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reading Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>📊 Reading Stats</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profile.readingStreak || 0}</Text>
                  <Text style={styles.statLabel}>Day Streak 🔥</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{profile.totalStoriesRead || 0}</Text>
                  <Text style={styles.statLabel}>Stories Read 📚</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Sign Out Section */}
        <View style={styles.signOutSection}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutIcon}>🚪</Text>
            <Text style={styles.signOutText}>Sign Out & Reset App</Text>
          </TouchableOpacity>
          <Text style={styles.signOutHint}>This will clear all data and restart onboarding</Text>
        </View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    color: '#6B7280',
    fontWeight: '600',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 44,
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    ...Shadows.card,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  
  // Section Content
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginTop: -4,
    ...Shadows.card,
  },
  
  // Usage Card
  usageCard: {
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  usageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 12,
    textAlign: 'center',
  },
  usageStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usageStat: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  usageNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5B21B6',
  },
  usageLabel: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 2,
  },
  usageDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#C4B5FD',
  },
  progressBarContainer: {
    marginTop: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#DDD6FE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#7C3AED',
    textAlign: 'center',
    marginTop: 6,
  },
  
  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  
  // Slider
  sliderContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7C3AED',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderMark: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  
  // Level Buttons
  levelButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  levelButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },
  levelButtonActive: {
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  levelEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  levelTextActive: {
    color: '#7C3AED',
  },
  levelDesc: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
  },
  
  // Mode Selector
  modeSelector: {
    marginBottom: 16,
  },
  modeSelectorLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  modeButtonActive: {
    backgroundColor: '#EDE9FE',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  modeEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeTextActive: {
    color: '#7C3AED',
  },
  
  // Genres
  genresLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genreChipActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  genreEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  genreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  genreTextActive: {
    color: '#7C3AED',
  },
  
  // Profile
  profileField: {
    marginBottom: 20,
  },
  profileLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  profileValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
  },
  profileValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  editIcon: {
    fontSize: 16,
  },
  nameEditRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nameInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  saveButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Age Buttons
  ageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ageButtonActive: {
    backgroundColor: '#7C3AED',
  },
  ageText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  ageTextActive: {
    color: '#FFFFFF',
  },
  
  // Avatar
  avatarScroll: {
    marginHorizontal: -4,
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarOptionActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  
  // Interests
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  interestChipActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7C3AED',
  },
  interestEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  interestText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  interestTextActive: {
    color: '#7C3AED',
  },
  
  // Stats Card
  statsCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    textAlign: 'center',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#166534',
  },
  statLabel: {
    fontSize: 12,
    color: '#22C55E',
    marginTop: 2,
  },
  
  bottomSpacer: {
    height: 40,
  },
  
  // Sign Out
  signOutSection: {
    marginTop: 24,
    paddingHorizontal: 4,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  signOutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signOutHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});

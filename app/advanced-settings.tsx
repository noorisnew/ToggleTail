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
import { Colors } from '../constants/design';
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

const AVATARS: { type: AvatarType; emoji: string }[] = [
  { type: 'Lion',    emoji: '🦁' }, { type: 'Bear',    emoji: '🐻' },
  { type: 'Bunny',   emoji: '🐰' }, { type: 'Panda',   emoji: '🐼' },
  { type: 'Fox',     emoji: '🦊' }, { type: 'Koala',   emoji: '🐨' },
  { type: 'Unicorn', emoji: '🦄' }, { type: 'Frog',    emoji: '🐸' },
  { type: 'Owl',     emoji: '🦉' }, { type: 'Octopus', emoji: '🐙' },
  { type: 'Dino',    emoji: '🦕' }, { type: 'Cat',     emoji: '🐱' },
];

const INTERESTS: { type: InterestType; emoji: string }[] = [
  { type: 'Super Heroes',    emoji: '🦸' }, { type: 'Dragons & Magic', emoji: '🐲' },
  { type: 'Fairy Tales',     emoji: '👸' }, { type: 'Mystery & Puzzles', emoji: '🔍' },
  { type: 'Dinosaurs',       emoji: '🦕' }, { type: 'Ocean Adventures',  emoji: '🐳' },
  { type: 'Cute Animals',    emoji: '🐰' }, { type: 'Space & Robots',    emoji: '🚀' },
];

const GENRES = [
  { name: 'Animals',   emoji: '🦁' }, { name: 'Adventure', emoji: '🗺️' },
  { name: 'Bedtime',   emoji: '🌙' }, { name: 'Fantasy',   emoji: '🧙' },
  { name: 'Science',   emoji: '🔬' }, { name: 'Values',    emoji: '💝' },
];

type Section = 'screenTime' | 'readingLevel' | 'content' | 'profile';

export default function AdvancedSettings() {
  const router = useRouter();
  const [settings,   setSettings]   = useState<AppSettings | null>(null);
  const [profile,    setProfile]    = useState<ChildProfile | null>(null);
  const [screenTime, setScreenTime] = useState<ScreenTimeData | null>(null);
  const [expanded,   setExpanded]   = useState<Section | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [tempName,    setTempName]    = useState('');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const [s, p, st] = await Promise.all([getSettings(), getProfile(), getScreenTime()]);
    setSettings(s); setProfile(p); setScreenTime(st);
    setTempName(p?.name || '');
  };

  const toggle = (s: Section) => setExpanded(prev => prev === s ? null : s);

  const updateSetting = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...updates };
    setSettings(next);
    await updateSettings(updates);
  };

  const updateProfileField = async (updates: Partial<ChildProfile>) => {
    if (!profile) return;
    const updated = await updateProfile(updates);
    if (updated) setProfile(updated);
  };

  const toggleGenre = (genre: string) => {
    if (!settings) return;
    const current = settings.allowedGenres || [];
    const updated = current.includes(genre)
      ? current.filter(g => g !== genre)
      : [...current, genre];
    if (updated.length === 0) { Alert.alert('Error', 'At least one genre must be enabled'); return; }
    updateSetting({ allowedGenres: updated });
  };

  const toggleInterest = (interest: InterestType) => {
    if (!profile) return;
    const current = profile.interests || [];
    const updated = current.includes(interest)
      ? current.filter(i => i !== interest)
      : [...current, interest];
    updateProfileField({ interests: updated });
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out & Delete Local Account',
      'This app stores accounts only on this device. Signing out permanently erases this profile, stories, and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const ok = await signOut();
            if (ok) router.replace('/onboarding/welcome');
            else Alert.alert('Error', 'Could not sign out. Please try again.');
          },
        },
      ]
    );
  };

  if (!settings || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <Text style={styles.loadingEmoji}>⚙️</Text>
          <Text style={styles.loadingText}>Loading settings…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[Colors.primaryStart, Colors.primaryEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advanced Settings</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Screen Time ─────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle('screenTime')} activeOpacity={0.7}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionEmoji}>⏱️</Text>
            <View>
              <Text style={styles.sectionTitle}>Screen Time</Text>
              <Text style={styles.sectionSub}>
                {settings.screenTimeEnabled ? `${settings.dailyTimeLimit} min daily` : 'Unlimited'}
              </Text>
            </View>
          </View>
          <Text style={styles.chevron}>{expanded === 'screenTime' ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {expanded === 'screenTime' && (
          <View style={styles.sectionBody}>
            {screenTime && (
              <View style={styles.usageCard}>
                <Text style={styles.usageTitle}>Today's Usage</Text>
                <View style={styles.usageStats}>
                  <View style={styles.usageStat}>
                    <Text style={styles.usageNum}>{screenTime.minutesUsed}</Text>
                    <Text style={styles.usageLabel}>minutes</Text>
                  </View>
                  <View style={styles.usageDivider} />
                  <View style={styles.usageStat}>
                    <Text style={styles.usageNum}>{screenTime.sessionsCount}</Text>
                    <Text style={styles.usageLabel}>sessions</Text>
                  </View>
                </View>
                {settings.screenTimeEnabled && settings.dailyTimeLimit > 0 && (
                  <View style={styles.progressWrap}>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, {
                        width: `${Math.min(100, (screenTime.minutesUsed / settings.dailyTimeLimit) * 100)}%` as any,
                        backgroundColor: screenTime.minutesUsed >= settings.dailyTimeLimit ? '#EF4444' : '#22C55E',
                      }]} />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.max(0, settings.dailyTimeLimit - screenTime.minutesUsed)} min remaining
                    </Text>
                  </View>
                )}
              </View>
            )}
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Enable Time Limits</Text>
                <Text style={styles.settingDesc}>Restrict daily reading time</Text>
              </View>
              <Switch
                value={settings.screenTimeEnabled}
                onValueChange={v => updateSetting({ screenTimeEnabled: v })}
                trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                thumbColor={settings.screenTimeEnabled ? '#7C3AED' : '#F3F4F6'}
              />
            </View>
            {settings.screenTimeEnabled && (
              <View style={styles.sliderWrap}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.sliderLabel}>Daily Limit</Text>
                  <Text style={styles.sliderValue}>{settings.dailyTimeLimit} min</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={15} maximumValue={120} step={5}
                  value={settings.dailyTimeLimit}
                  onValueChange={v => updateSetting({ dailyTimeLimit: v })}
                  minimumTrackTintColor="#7C3AED" maximumTrackTintColor="#E5E7EB" thumbTintColor="#7C3AED"
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

        {/* ── Reading Level ────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle('readingLevel')} activeOpacity={0.7}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionEmoji}>📚</Text>
            <View>
              <Text style={styles.sectionTitle}>Reading Level</Text>
              <Text style={styles.sectionSub}>
                Level {settings.readingLevel} —{' '}
                {settings.readingLevel === 1 ? 'Beginner' : settings.readingLevel === 2 ? 'Intermediate' : 'Advanced'}
              </Text>
            </View>
          </View>
          <Text style={styles.chevron}>{expanded === 'readingLevel' ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {expanded === 'readingLevel' && (
          <View style={styles.sectionBody}>
            <View style={styles.levelButtons}>
              {([1, 2, 3] as const).map(level => (
                <TouchableOpacity
                  key={level}
                  style={[styles.levelBtn, settings.readingLevel === level && styles.levelBtnActive]}
                  onPress={() => updateSetting({ readingLevel: level })}
                >
                  <Text style={styles.levelEmoji}>{level === 1 ? '🌱' : level === 2 ? '🌿' : '🌳'}</Text>
                  <Text style={[styles.levelText, settings.readingLevel === level && styles.levelTextActive]}>
                    Level {level}
                  </Text>
                  <Text style={styles.levelDesc}>
                    {level === 1 ? 'Simple words' : level === 2 ? 'Short sentences' : 'Full stories'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Auto-Adjust Level</Text>
                <Text style={styles.settingDesc}>Increase level based on progress</Text>
              </View>
              <Switch
                value={settings.autoAdjustLevel}
                onValueChange={v => updateSetting({ autoAdjustLevel: v })}
                trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
                thumbColor={settings.autoAdjustLevel ? '#7C3AED' : '#F3F4F6'}
              />
            </View>
          </View>
        )}

        {/* ── Content Filters ──────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle('content')} activeOpacity={0.7}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionEmoji}>🎯</Text>
            <View>
              <Text style={styles.sectionTitle}>Content Filters</Text>
              <Text style={styles.sectionSub}>{settings.allowedGenres.length} of {ALL_GENRES.length} genres enabled</Text>
            </View>
          </View>
          <Text style={styles.chevron}>{expanded === 'content' ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {expanded === 'content' && (
          <View style={styles.sectionBody}>
            <Text style={styles.gridLabel}>Allowed Genres</Text>
            <View style={styles.chipGrid}>
              {GENRES.map(g => (
                <TouchableOpacity
                  key={g.name}
                  style={[styles.chip, settings.allowedGenres.includes(g.name) && styles.chipActive]}
                  onPress={() => toggleGenre(g.name)}
                >
                  <Text style={styles.chipEmoji}>{g.emoji}</Text>
                  <Text style={[styles.chipText, settings.allowedGenres.includes(g.name) && styles.chipTextActive]}>
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Child Profile ────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle('profile')} activeOpacity={0.7}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionEmoji}>👶</Text>
            <View>
              <Text style={styles.sectionTitle}>Child Profile</Text>
              <Text style={styles.sectionSub}>{profile.name || 'Unknown'}, Age {profile.age}</Text>
            </View>
          </View>
          <Text style={styles.chevron}>{expanded === 'profile' ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {expanded === 'profile' && (
          <View style={styles.sectionBody}>
            {/* Name */}
            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Name</Text>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={tempName}
                    onChangeText={setTempName}
                    maxLength={30}
                    autoFocus
                    placeholder="Enter name"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={() => {
                      const t = tempName.trim();
                      if (t) updateProfileField({ name: t.slice(0, 30) });
                      setEditingName(false);
                    }}
                  >
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.valueRow} onPress={() => setEditingName(true)}>
                  <Text style={styles.fieldValue}>{profile.name}</Text>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Age */}
            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Age</Text>
              <View style={styles.ageGrid}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(age => (
                  <TouchableOpacity
                    key={age}
                    style={[styles.ageBtn, profile.age === age && styles.ageBtnActive]}
                    onPress={() => updateProfileField({ age })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.ageNum, profile.age === age && styles.ageNumActive]}>{age}</Text>
                    <Text style={[styles.ageYr, profile.age === age && styles.ageYrActive]}>yr</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Avatar */}
            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Avatar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarScroll}>
                {AVATARS.map(a => (
                  <TouchableOpacity
                    key={a.type}
                    style={[styles.avatarBtn, profile.avatar === a.type && styles.avatarBtnActive]}
                    onPress={() => updateProfileField({ avatar: a.type })}
                  >
                    <Text style={styles.avatarEmoji}>{a.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Interests */}
            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Interests</Text>
              <View style={styles.chipGrid}>
                {INTERESTS.map(i => (
                  <TouchableOpacity
                    key={i.type}
                    style={[styles.chip, profile.interests?.includes(i.type) && styles.chipActive]}
                    onPress={() => toggleInterest(i.type)}
                  >
                    <Text style={styles.chipEmoji}>{i.emoji}</Text>
                    <Text style={[styles.chipText, profile.interests?.includes(i.type) && styles.chipTextActive]}>
                      {i.type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>📊 Reading Stats</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{profile.readingStreak || 0}</Text>
                  <Text style={styles.statLabel}>Day Streak 🔥</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{profile.totalStoriesRead || 0}</Text>
                  <Text style={styles.statLabel}>Stories Read 📚</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Sign Out ─────────────────────────────────────────────────────── */}
        <View style={styles.signOutSection}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutIcon}>🚪</Text>
            <Text style={styles.signOutText}>Sign Out & Reset App</Text>
          </TouchableOpacity>
          <Text style={styles.signOutHint}>
            Permanently deletes this device-only account and restarts onboarding.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingEmoji: { fontSize: 48, marginBottom: 12 },
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  chevron: { color: '#9CA3AF', fontSize: 12 },

  sectionBody: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  settingDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  usageCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 },
  usageTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  usageStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  usageStat: { flex: 1, alignItems: 'center' },
  usageNum: { fontSize: 28, fontWeight: '700', color: '#7C3AED' },
  usageLabel: { fontSize: 12, color: '#6B7280' },
  usageDivider: { width: 1, height: 36, backgroundColor: '#E5E7EB' },
  progressWrap: { gap: 6 },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, color: '#6B7280' },

  sliderWrap: { gap: 8 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  sliderValue: { fontSize: 14, fontWeight: '700', color: '#7C3AED' },
  slider: { width: '100%', height: 40 },
  sliderMarks: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderMark: { fontSize: 11, color: '#9CA3AF' },

  levelButtons: { flexDirection: 'row', gap: 8 },
  levelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  levelBtnActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  levelEmoji: { fontSize: 22, marginBottom: 4 },
  levelText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  levelTextActive: { color: '#7C3AED' },
  levelDesc: { fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },

  gridLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#F5F3FF', borderColor: '#7C3AED' },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#7C3AED', fontWeight: '700' },

  profileField: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  nameEditRow: { flexDirection: 'row', gap: 8 },
  nameInput: {
    flex: 1, borderWidth: 1.5, borderColor: '#7C3AED',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 15, color: '#111827',
  },
  saveBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldValue: { fontSize: 15, color: '#111827', fontWeight: '600' },
  editIcon: { fontSize: 16 },

  ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageBtn: {
    width: 52, alignItems: 'center', paddingVertical: 8,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  ageBtnActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  ageNum: { fontSize: 16, fontWeight: '700', color: '#374151' },
  ageNumActive: { color: '#7C3AED' },
  ageYr: { fontSize: 10, color: '#9CA3AF' },
  ageYrActive: { color: '#A78BFA' },

  avatarScroll: { marginBottom: 4 },
  avatarBtn: {
    width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#E5E7EB', marginRight: 8,
  },
  avatarBtnActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  avatarEmoji: { fontSize: 28 },

  statsCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 },
  statsTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '700', color: '#7C3AED' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  signOutSection: { marginTop: 8, alignItems: 'center', gap: 8 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FFF5F5',
  },
  signOutIcon: { fontSize: 18 },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  signOutHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 24 },
});

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/design';
import { signOut } from '../src/data/storage/authStorage';
import { AvatarType, ChildProfile, getProfile, updateProfile } from '../src/data/storage/profileStorage';
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

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [storiesCount, setStoriesCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  
  // Avatar picker modal
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, storiesData] = await Promise.all([
        getProfile(),
        getStories(),
      ]);
      
      setProfile(profileData);
      setStoriesCount(storiesData.filter((s: Story) => s.approved).length);
      setFavoritesCount(storiesData.filter((s: Story) => s.isFavorite).length);
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

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Child Profile */}
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

          {/* Parent Settings Link */}
          <TouchableOpacity
            style={styles.parentSettingsLink}
            onPress={() => router.push('/parent-settings')}
          >
            <View style={styles.parentSettingsContent}>
              <Text style={styles.parentSettingsIcon}>⚙️</Text>
              <View>
                <Text style={styles.parentSettingsTitle}>Parent Settings</Text>
                <Text style={styles.parentSettingsDesc}>Time limits, reading level, content filters</Text>
              </View>
            </View>
            <Text style={styles.parentSettingsArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Always visible Sign Out button at bottom */}
      <View style={styles.signOutSection}>
        <TouchableOpacity
          style={styles.signOutButtonMain}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonIcon}>🚪</Text>
          <Text style={styles.signOutButtonMainText}>Sign Out & Reset App</Text>
        </TouchableOpacity>
        <Text style={styles.signOutHint}>This will clear all data and restart onboarding</Text>
      </View>

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

  // Parent Settings Link
  parentSettingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.primaryStart,
  },
  parentSettingsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  parentSettingsIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  parentSettingsTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryStart,
  },
  parentSettingsDesc: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  parentSettingsArrow: {
    fontSize: 20,
    color: Colors.primaryStart,
    fontWeight: Typography.weights.bold,
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
  
  // Main Sign Out Section (always visible at bottom)
  signOutSection: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  signOutButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: BorderRadius.button,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  signOutButtonIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  signOutButtonMainText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    color: '#fff',
  },
  signOutHint: {
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

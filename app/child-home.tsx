/**
 * Child Home Screen
 * 
 * Main story browsing screen organized by genres with age-appropriate sections.
 * Auto-opens to child's favorite genre selected during onboarding.
 * 
 * IMPORTANT: Stories are loaded from storyApprovalService, showing only
 * parent-approved stories from AsyncStorage (not the raw manifest).
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { AvatarType, ChildProfile, getProfile, InterestType, saveProfile } from '../src/data/storage/profileStorage';
import { normalizeError } from '../src/domain/services/errorService';
import { ChildDisplayStory, getVisibleStoriesForChild } from '../src/domain/services/storyApprovalService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Genre definitions with display info
type GenreId = 'animals' | 'adventure' | 'bedtime' | 'science' | 'values' | 'fantasy';

const GENRES: { id: GenreId; name: string; emoji: string; color: string }[] = [
  { id: 'animals', name: 'Animals', emoji: '🐾', color: '#86EFAC' },
  { id: 'adventure', name: 'Adventure', emoji: '🗺️', color: '#FBBF24' },
  { id: 'bedtime', name: 'Bedtime', emoji: '🌙', color: '#C4B5FD' },
  { id: 'science', name: 'Science', emoji: '🔬', color: '#7DD3FC' },
  { id: 'values', name: 'Values', emoji: '💝', color: '#FDA4AF' },
  { id: 'fantasy', name: 'Fantasy', emoji: '✨', color: '#D8B4FE' },
];

// Map interests to genres for auto-selection
const INTEREST_TO_GENRE: Record<InterestType, GenreId> = {
  'Super Heroes': 'adventure',
  'Dragons & Magic': 'fantasy',
  'Fairy Tales': 'fantasy',
  'Mystery & Puzzles': 'adventure',
  'Dinosaurs': 'animals',
  'Ocean Adventures': 'adventure',
  'Cute Animals': 'animals',
  'Space & Robots': 'science',
};

// Age range definitions
type AgeRange = '3-5' | '5-7' | '7-9';

const AGE_RANGES: { id: AgeRange; label: string; shortLabel: string }[] = [
  { id: '3-5', label: 'Ages 3-5', shortLabel: 'Little Readers' },
  { id: '5-7', label: 'Ages 5-7', shortLabel: 'Growing Readers' },
  { id: '7-9', label: 'Ages 7-9', shortLabel: 'Big Readers' },
];

// Get age range for a given age
function getAgeRange(age: number): AgeRange {
  if (age <= 5) return '3-5';
  if (age <= 7) return '5-7';
  return '7-9';
}

// Category emojis for variety
const CATEGORY_EMOJIS: Record<string, string[]> = {
  'Animals': ['🐾', '🐰', '🦊', '🐻', '🐼', '🐨'],
  'Adventure': ['🗺️', '🏔️', '⛵', '🎒', '🧭', '🌄'],
  'Bedtime': ['🌙', '⭐', '💤', '🌟', '🛏️', '😴'],
  'Science': ['🔬', '🧪', '🔭', '🧲', '🦠', '⚗️'],
  'Values': ['💝', '🤝', '💕', '🌈', '❤️', '🙏'],
  'Fantasy': ['✨', '🔮', '🧙', '🦄', '🏰', '🐲'],
};

type DisplayStory = {
  id: string;
  title: string;
  text: string;
  category: string;
  genre: GenreId;
  ageRange: AgeRange;
  readingLevel: string;
  isLibrary: boolean;
  isFavorite: boolean;
  libraryData?: ChildDisplayStory;
  emoji?: string;
  readCount?: number;
};

export default function ChildHomeScreen() {
  const router = useRouter();
  // Stories loaded asynchronously from approval service (only approved stories)
  const [libraryStories, setLibraryStories] = useState<ChildDisplayStory[]>([]);
  const [profile, setProfileState] = useState<ChildProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<GenreId | 'favorites'>('animals');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  // Loading state for async story loading
  const [loadingStories, setLoadingStories] = useState(true);
  const [initialGenreSet, setInitialGenreSet] = useState(false);

  // Determine child's age range
  const childAgeRange = useMemo(() => {
    return profile?.age ? getAgeRange(profile.age) : '3-5';
  }, [profile?.age]);

  useEffect(() => {
    checkProfileAndRedirect();
  }, []);

  // Auto-select genre based on first interest
  useEffect(() => {
    if (profile?.interests && profile.interests.length > 0 && !initialGenreSet) {
      const firstInterest = profile.interests[0];
      const genre = INTEREST_TO_GENRE[firstInterest];
      if (genre) {
        setSelectedGenre(genre);
        setInitialGenreSet(true);
      }
    }
  }, [profile?.interests, initialGenreSet]);

  const checkProfileAndRedirect = async () => {
    try {
      const data = await getProfile();
      if (!data) {
        router.replace('/onboarding/welcome');
        return;
      }
      setProfileState(data);
      if (data.favoriteStories) {
        setFavorites(new Set(data.favoriteStories));
      }
      // Load approved stories after profile
      await loadStories();
      setIsReady(true);
    } catch (error) {
      console.error('checkProfileAndRedirect:', normalizeError(error));
      router.replace('/onboarding/welcome');
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isReady) {
        loadProfile();
        loadStories(); // Refresh stories on focus
      }
    }, [isReady])
  );

  // Load approved stories from approval service
  const loadStories = async () => {
    try {
      setLoadingStories(true);
      const stories = await getVisibleStoriesForChild();
      setLibraryStories(stories);
    } catch (error) {
      console.error('loadStories:', normalizeError(error));
    } finally {
      setLoadingStories(false);
    }
  };

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfileState(data);
      if (data?.favoriteStories) {
        setFavorites(new Set(data.favoriteStories));
      }
    } catch (error) {
      console.error('loadProfile:', normalizeError(error));
    }
  };

  const toggleFavorite = async (storyId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(storyId)) {
      newFavorites.delete(storyId);
    } else {
      newFavorites.add(storyId);
    }
    setFavorites(newFavorites);
    
    if (profile) {
      const updatedProfile = {
        ...profile,
        favoriteStories: Array.from(newFavorites),
      };
      try {
        await saveProfile(updatedProfile);
        setProfileState(updatedProfile);
      } catch (error) {
        console.error('Failed to save favorites:', normalizeError(error));
      }
    }
  };

  const handleStoryPress = (story: DisplayStory) => {
    if (story.isLibrary && story.libraryData) {
      router.push({ pathname: '/story-view', params: { id: story.libraryData._id, source: 'library' } });
    } else {
      router.push({ pathname: '/story-view', params: { id: story.id } });
    }
  };

  if (!isReady) {
    return null;
  }

  const avatarEmoji = profile?.avatar ? AVATAR_EMOJIS[profile.avatar] : '🦖';

  // Map category name to genre id
  const categoryToGenre = (category: string): GenreId => {
    const lower = category.toLowerCase();
    if (GENRES.some(g => g.id === lower)) return lower as GenreId;
    return 'animals';
  };

  // Convert library stories to display format
  const allStories: DisplayStory[] = libraryStories.map((s, index) => ({
    id: s._id,
    title: s.title,
    text: s.text || '',
    category: s.category || 'Animals',
    genre: categoryToGenre(s.category || 'Animals'),
    ageRange: (s.ageBand as AgeRange) || '3-5',
    readingLevel: s.readingLevel || 'Beginner',
    isLibrary: true,
    isFavorite: favorites.has(s._id),
    libraryData: s,
    emoji: s.emoji || CATEGORY_EMOJIS[s.category || 'Animals']?.[index % 6] || '📚',
    readCount: s.readCount ?? 0,
  }));

  // Get stories for selected genre, organized by age
  const getStoriesByGenreAndAge = () => {
    if (selectedGenre === 'favorites') {
      const favoriteStories = allStories.filter(s => s.isFavorite);
      // Get read stories (readCount > 0) that aren't already in favorites
      const readStories = allStories
        .filter(s => (s.readCount ?? 0) > 0 && !s.isFavorite)
        .sort((a, b) => (b.readCount ?? 0) - (a.readCount ?? 0)); // Most read first
      return { forYou: favoriteStories, younger: readStories, older: [] };
    }

    const genreStories = allStories.filter(s => s.genre === selectedGenre);
    
    // Get current age range index
    const currentAgeIndex = AGE_RANGES.findIndex(a => a.id === childAgeRange);
    
    // Sort stories by age range
    const forYou = genreStories.filter(s => s.ageRange === childAgeRange);
    const younger = genreStories.filter(s => 
      AGE_RANGES.findIndex(a => a.id === s.ageRange) < currentAgeIndex
    );
    const older = genreStories.filter(s => 
      AGE_RANGES.findIndex(a => a.id === s.ageRange) > currentAgeIndex
    );

    return { forYou, younger, older };
  };

  const { forYou, younger, older } = getStoriesByGenreAndAge();

  // Get story emoji with variety
  const getStoryEmoji = (category: string, index: number) => {
    const emojis = CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS['Animals'];
    return emojis[index % emojis.length];
  };

  const getGenreColor = (genreId: GenreId): string => {
    return GENRES.find(g => g.id === genreId)?.color || '#86EFAC';
  };

  const renderStoryCard = (item: DisplayStory, index: number) => {
    const bgColor = getGenreColor(item.genre);
    const emoji = item.emoji || getStoryEmoji(item.category, index);
    const pageCount = item.text?.split('\n\n').length || 8;

    return (
      <View key={item.id} style={styles.storyCardWrapper}>
        <TouchableOpacity
          style={[styles.storyCard, { backgroundColor: bgColor }]}
          onPress={() => handleStoryPress(item)}
          activeOpacity={0.9}
        >
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.favoriteIcon}>
              {item.isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.ageBadge}>
            <Text style={styles.ageBadgeText}>{item.ageRange}</Text>
          </View>
          
          <Text style={styles.storyCardEmoji}>{emoji}</Text>
        </TouchableOpacity>
        
        <Text style={styles.storyCardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.storyCardMeta}>{pageCount} pages • {item.readingLevel}</Text>
        
        <TouchableOpacity
          style={styles.readButton}
          onPress={() => handleStoryPress(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.readButtonEmoji}>📖</Text>
          <Text style={styles.readButtonText}>Read Now!</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHorizontalStoryList = (stories: DisplayStory[], title: string, emoji: string, subtitle?: string) => {
    if (stories.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>{emoji}</Text>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
          </View>
          <Text style={styles.sectionCount}>{stories.length} stories</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          {stories.map((story, index) => renderStoryCard(story, index))}
        </ScrollView>
      </View>
    );
  };

  const renderGenreTab = (genre: typeof GENRES[0]) => {
    const isActive = selectedGenre === genre.id;
    
    return (
      <TouchableOpacity
        key={genre.id}
        style={[styles.genreTab, isActive && styles.genreTabActive, { borderColor: isActive ? genre.color : '#E0E0E0' }]}
        onPress={() => setSelectedGenre(genre.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.genreTabEmoji}>{genre.emoji}</Text>
        <Text style={[styles.genreTabText, isActive && styles.genreTabTextActive]}>
          {genre.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const getCurrentGenreName = () => {
    if (selectedGenre === 'favorites') return 'My Favorites';
    return GENRES.find(g => g.id === selectedGenre)?.name || 'Stories';
  };

  const getCurrentGenreEmoji = () => {
    if (selectedGenre === 'favorites') return '❤️';
    return GENRES.find(g => g.id === selectedGenre)?.emoji || '📚';
  };

  // Get age range label
  const getAgeRangeLabel = (ageRange: AgeRange) => {
    return AGE_RANGES.find(a => a.id === ageRange)?.shortLabel || 'Readers';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9E6" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.avatarBubble}
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
            >
              <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Hey {profile?.name || 'there'}! 👋</Text>
              <Text style={styles.subGreeting}>What shall we read today?</Text>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[
                styles.favoritesButton,
                selectedGenre === 'favorites' && styles.favoritesButtonActive,
              ]}
              onPress={() => setSelectedGenre('favorites')}
              activeOpacity={0.7}
            >
              <Text style={styles.favoritesEmoji}>❤️</Text>
              {favorites.size > 0 && (
                <View style={styles.favBadge}>
                  <Text style={styles.favBadgeText}>{favorites.size}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsEmoji}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Genre Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.genreScroll}
          contentContainerStyle={styles.genreScrollContent}
        >
          {GENRES.map(renderGenreTab)}
        </ScrollView>

        {/* Genre Title */}
        <View style={styles.genreTitleContainer}>
          <Text style={styles.genreTitleEmoji}>{getCurrentGenreEmoji()}</Text>
          <Text style={styles.genreTitle}>{getCurrentGenreName()}</Text>
        </View>

        {/* Stories Content */}
        <ScrollView
          style={styles.storiesScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.storiesScrollContent}
        >
          {selectedGenre === 'favorites' ? (
            <>
              {/* Favorites Section */}
              {forYou.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionEmoji}>❤️</Text>
                    <View style={styles.sectionTitleContainer}>
                      <Text style={styles.sectionTitle}>My Favorites</Text>
                      <Text style={styles.sectionSubtitle}>Stories you love</Text>
                    </View>
                    <Text style={styles.sectionCount}>{forYou.length} stories</Text>
                  </View>
                  <View style={styles.favoritesGrid}>
                    {forYou.map((story, index) => renderStoryCard(story, index))}
                  </View>
                </>
              )}
              
              {/* Recently Read Section */}
              {younger.length > 0 && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Text style={styles.sectionEmoji}>📖</Text>
                    <View style={styles.sectionTitleContainer}>
                      <Text style={styles.sectionTitle}>Recently Read</Text>
                      <Text style={styles.sectionSubtitle}>Stories you've enjoyed</Text>
                    </View>
                    <Text style={styles.sectionCount}>{younger.length} stories</Text>
                  </View>
                  <View style={styles.favoritesGrid}>
                    {younger.map((story, index) => renderStoryCard(story, index))}
                  </View>
                </>
              )}
              
              {/* Empty state if no favorites AND no read stories */}
              {forYou.length === 0 && younger.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>💝</Text>
                  <Text style={styles.emptyText}>No favorites yet!</Text>
                  <Text style={styles.emptySubtext}>
                    Tap the heart ❤️ on any story to add it here!
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* For You Section - Child's age range (shown first) */}
              {renderHorizontalStoryList(
                forYou,
                '⭐ Perfect for You!',
                '🎯',
                `Made for ${getAgeRangeLabel(childAgeRange)}`
              )}

              {/* Younger Stories Section */}
              {renderHorizontalStoryList(
                younger,
                'Easy Adventures',
                '🌟',
                'Quick & simple reads'
              )}

              {/* Older Stories Section */}
              {renderHorizontalStoryList(
                older,
                'Challenge Yourself!',
                '🚀',
                'For advanced readers'
              )}

              {/* Empty state if no stories in genre */}
              {forYou.length === 0 && younger.length === 0 && older.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>📚</Text>
                  <Text style={styles.emptyText}>No stories found!</Text>
                  <Text style={styles.emptySubtext}>
                    Try selecting a different genre.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              // Go to first interest's genre or animals
              const firstGenre = profile?.interests?.[0] 
                ? INTEREST_TO_GENRE[profile.interests[0]] 
                : 'animals';
              setSelectedGenre(firstGenre);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconBg, selectedGenre !== 'favorites' && styles.navIconBgActive]}>
              <Text style={styles.navIcon}>🏠</Text>
            </View>
            <Text style={[styles.navLabel, selectedGenre !== 'favorites' && styles.navLabelActive]}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setSelectedGenre('favorites')}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconBg, selectedGenre === 'favorites' && styles.navIconBgActive]}>
              <Text style={styles.navIcon}>❤️</Text>
            </View>
            <Text style={[styles.navLabel, selectedGenre === 'favorites' && styles.navLabelActive]}>Favorites</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push('/parent-gate')}
            activeOpacity={0.7}
          >
            <View style={styles.navIconBg}>
              <Text style={styles.navIcon}>👨‍👩‍👧</Text>
            </View>
            <Text style={styles.navLabel}>Parents</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9E6',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF9E6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 3,
    borderColor: '#81C784',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
  },
  subGreeting: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoritesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3F3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFB4B4',
  },
  favoritesButtonActive: {
    backgroundColor: '#FFE4E4',
    borderColor: '#FF6B6B',
  },
  favoritesEmoji: {
    fontSize: 20,
  },
  favBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  favBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  settingsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    padding: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#C4B5FD',
  },
  settingsEmoji: {
    fontSize: 20,
  },
  genreScroll: {
    maxHeight: 56,
    marginTop: 12,
  },
  genreScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  genreTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginRight: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  genreTabActive: {
    backgroundColor: '#FFFEF0',
    borderWidth: 3,
  },
  genreTabEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  genreTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  genreTabTextActive: {
    color: '#333333',
    fontWeight: '700',
  },
  genreTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  genreTitleEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  genreTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333333',
  },
  storiesScroll: {
    flex: 1,
  },
  storiesScrollContent: {
    paddingBottom: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  sectionCount: {
    fontSize: 12,
    color: '#888888',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  storyCardWrapper: {
    width: (SCREEN_WIDTH - 56) / 2,
    marginBottom: 8,
  },
  storyCard: {
    aspectRatio: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  ageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5D4037',
  },
  storyCardEmoji: {
    fontSize: 56,
  },
  storyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 2,
    lineHeight: 18,
  },
  storyCardMeta: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 8,
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  readButtonEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  readButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  navIconBgActive: {
    backgroundColor: '#E8F5E9',
  },
  navIcon: {
    fontSize: 22,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888888',
  },
  navLabelActive: {
    color: '#4CAF50',
    fontWeight: '700',
  },
});

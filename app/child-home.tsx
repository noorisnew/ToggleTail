import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getLibraryStories, LibraryStory } from '../src/data/api/storyApi';
import { AvatarType, ChildProfile, getProfile, InterestType, saveProfile } from '../src/data/storage/profileStorage';
import { getStories, Story } from '../src/data/storage/storyStorage';
import { normalizeError } from '../src/domain/services/errorService';

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

// Category-specific emojis (multiple per category for variety)
const CATEGORY_EMOJIS: Record<string, string[]> = {
  'Super Heroes': ['🦸', '🦸‍♀️', '💪', '⚡', '🛡️', '🎭'],
  'Dragons & Magic': ['🐲', '🧙‍♂️', '✨', '🔮', '🪄', '🏰'],
  'Fairy Tales': ['👸', '🤴', '🏰', '👗', '🦋', '🌹'],
  'Mystery & Puzzles': ['🔍', '🕵️', '❓', '🗝️', '🔐', '🧩'],
  'Dinosaurs': ['🦕', '🦖', '🥚', '🌋', '🦴', '🌿'],
  'Ocean Adventures': ['🐳', '🐠', '🦈', '🐙', '🐚', '🧜‍♀️'],
  'Cute Animals': ['🐰', '🐶', '🐱', '🦊', '🐼', '🐨'],
  'Space & Robots': ['🚀', '🤖', '👽', '🛸', '🌟', '🪐'],
  'General': ['📚', '📖', '🌈', '⭐', '🎉', '💫'],
};

// Kid-friendly pastel card colors per category
const CATEGORY_COLORS: Record<string, string> = {
  'Super Heroes': '#FFE066',     // Sunny yellow
  'Dragons & Magic': '#C4A7FF',  // Soft purple
  'Fairy Tales': '#FFB8D9',      // Soft pink
  'Mystery & Puzzles': '#7DD3FC', // Sky blue
  'Dinosaurs': '#86EFAC',        // Mint green
  'Ocean Adventures': '#7DD3FC', // Ocean blue
  'Cute Animals': '#FBBF24',     // Warm orange
  'Space & Robots': '#A78BFA',   // Violet
  'General': '#F0ABFC',          // Light purple
};

// All categories for tabs
const ALL_CATEGORIES = [
  'All',
  'Super Heroes',
  'Dragons & Magic', 
  'Fairy Tales',
  'Mystery & Puzzles',
  'Dinosaurs',
  'Ocean Adventures',
  'Cute Animals',
  'Space & Robots',
];

type DisplayStory = {
  id: string;
  title: string;
  text: string;
  category: string;
  readingLevel: string;
  isLibrary: boolean;
  isFavorite: boolean;
  libraryData?: LibraryStory;
};

export default function ChildHomeScreen() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [libraryStories, setLibraryStories] = useState<LibraryStory[]>([]);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'stories' | 'favorites'>('stories');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isOffline, setIsOffline] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);

  useEffect(() => {
    checkProfileAndRedirect();
  }, []);

  const checkProfileAndRedirect = async () => {
    try {
      const data = await getProfile();
      if (!data) {
        router.replace('/onboarding/welcome');
        return;
      }
      setProfile(data);
      // Load favorites from profile
      if (data.favoriteStories) {
        setFavorites(new Set(data.favoriteStories));
      }
      setIsReady(true);
    } catch (error) {
      console.error('checkProfileAndRedirect:', normalizeError(error));
      router.replace('/onboarding/welcome');
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isReady) {
        loadStories();
        loadLibraryStories();
        loadProfile();
      }
    }, [isReady])
  );

  const loadStories = async () => {
    try {
      const data = await getStories();
      setStories(data.filter((s) => s.approved));
    } catch (error) {
      console.error('loadStories:', normalizeError(error));
    }
  };

  const loadLibraryStories = async () => {
    try {
      setLoadingStories(true);
      const result = await getLibraryStories({ limit: 50 });
      if (result.success) {
        // Track if we're showing cached data (offline mode)
        setIsOffline(result.fromCache || false);
        
        let filteredStories = result.stories;
        if (profile?.interests && profile.interests.length > 0) {
          const interestSet = new Set(profile.interests);
          const matchingStories = filteredStories.filter(s => interestSet.has(s.category as InterestType));
          const otherStories = filteredStories.filter(s => !interestSet.has(s.category as InterestType));
          filteredStories = [...matchingStories, ...otherStories];
        }
        setLibraryStories(filteredStories);
      } else {
        setIsOffline(true);
      }
    } catch (error) {
      console.error('loadLibraryStories:', normalizeError(error));
      setIsOffline(true);
    } finally {
      setLoadingStories(false);
    }
  };

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
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
    
    // Save to profile
    if (profile) {
      const updatedProfile = {
        ...profile,
        favoriteStories: Array.from(newFavorites),
      };
      try {
        await saveProfile(updatedProfile);
        setProfile(updatedProfile);
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

  // Combine and prepare all stories
  const allStories: DisplayStory[] = [
    ...stories.map(s => ({ 
      id: s.id,
      title: s.title,
      text: s.text || '',
      category: s.theme || 'General',
      readingLevel: s.difficulty || 'Beginner',
      isLibrary: false,
      isFavorite: favorites.has(s.id),
    })),
    ...libraryStories.map(s => ({ 
      id: s._id,
      title: s.title,
      text: s.text || '',
      category: s.category || 'General',
      readingLevel: s.readingLevel || 'Beginner',
      isLibrary: true,
      isFavorite: favorites.has(s._id),
      libraryData: s
    }))
  ];

  // Filter by category and tab
  let displayStories = allStories;
  if (activeTab === 'favorites') {
    displayStories = allStories.filter(s => s.isFavorite);
  }
  if (selectedCategory !== 'All') {
    displayStories = displayStories.filter(s => s.category === selectedCategory);
  }

  // Get emoji for story based on category with variety
  const getStoryEmoji = (category: string, index: number) => {
    const emojis = CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS['General'];
    return emojis[index % emojis.length];
  };

  // Get color for story based on category
  const getStoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['General'];
  };

  const renderCategoryTab = (category: string) => {
    const isActive = selectedCategory === category;
    const emoji = category === 'All' ? '🌈' : (CATEGORY_EMOJIS[category]?.[0] || '📚');
    
    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryTab, isActive && styles.categoryTabActive]}
        onPress={() => setSelectedCategory(category)}
        activeOpacity={0.7}
      >
        <Text style={styles.categoryTabEmoji}>{emoji}</Text>
        <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]} numberOfLines={1}>
          {category === 'All' ? 'All Stories' : category.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStoryCard = ({ item, index }: { item: DisplayStory; index: number }) => {
    const bgColor = getStoryColor(item.category);
    const emoji = getStoryEmoji(item.category, index);
    const pageCount = item.text?.split('\n\n').length || 8;

    return (
      <View style={styles.storyCardWrapper}>
        <TouchableOpacity
          style={[styles.storyCard, { backgroundColor: bgColor }]}
          onPress={() => handleStoryPress(item)}
          activeOpacity={0.9}
        >
          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.favoriteIcon}>
              {item.isFavorite ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
          
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {item.category.split(' ')[0]}
            </Text>
          </View>
          
          {/* Story Emoji */}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9E6" />
      <View style={styles.container}>
        {/* Offline Banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineIcon}>📴</Text>
            <Text style={styles.offlineText}>Offline Mode - Showing saved stories</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.avatarBubble}>
              <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Hey {profile?.name || 'there'}! 👋</Text>
              <Text style={styles.subGreeting}>What shall we read today?</Text>
            </View>
          </View>
          <View style={styles.starBadge}>
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.starCount}>{favorites.size}</Text>
          </View>
        </View>

        {/* Main Tab Switcher */}
        <View style={styles.mainTabBar}>
          <TouchableOpacity
            style={[styles.mainTab, activeTab === 'stories' && styles.mainTabActive]}
            onPress={() => setActiveTab('stories')}
            activeOpacity={0.8}
          >
            <Text style={styles.mainTabEmoji}>📚</Text>
            <Text style={[styles.mainTabText, activeTab === 'stories' && styles.mainTabTextActive]}>
              All Stories
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, activeTab === 'favorites' && styles.mainTabActive]}
            onPress={() => setActiveTab('favorites')}
            activeOpacity={0.8}
          >
            <Text style={styles.mainTabEmoji}>❤️</Text>
            <Text style={[styles.mainTabText, activeTab === 'favorites' && styles.mainTabTextActive]}>
              My Favorites
            </Text>
            {favorites.size > 0 && (
              <View style={styles.favBadge}>
                <Text style={styles.favBadgeText}>{favorites.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Category Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {ALL_CATEGORIES.map(renderCategoryTab)}
        </ScrollView>

        {/* Stories Grid */}
        <FlatList
          data={displayStories}
          keyExtractor={(item) => item.id}
          numColumns={2}
          style={styles.storiesList}
          contentContainerStyle={styles.storiesContent}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>
                {activeTab === 'favorites' ? '💝' : '📚'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'favorites' ? 'No favorites yet!' : 'No stories found!'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'favorites' 
                  ? 'Tap the heart ❤️ on any story to add it here!'
                  : 'Try selecting a different category.'}
              </Text>
            </View>
          }
          renderItem={renderStoryCard}
        />

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('stories')}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconBg, activeTab === 'stories' && styles.navIconBgActive]}>
              <Text style={styles.navIcon}>🏠</Text>
            </View>
            <Text style={[styles.navLabel, activeTab === 'stories' && styles.navLabelActive]}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('favorites')}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconBg, activeTab === 'favorites' && styles.navIconBgActive]}>
              <Text style={styles.navIcon}>❤️</Text>
            </View>
            <Text style={[styles.navLabel, activeTab === 'favorites' && styles.navLabelActive]}>Favorites</Text>
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
    backgroundColor: '#FFF9E6', // Warm cream background
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF9E6',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFB74D',
  },
  offlineIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  offlineText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
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
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFD54F',
  },
  starIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  starCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#795548',
  },
  mainTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  mainTabActive: {
    backgroundColor: '#FFE082',
    borderColor: '#FFB74D',
  },
  mainTabEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  mainTabTextActive: {
    color: '#5D4037',
    fontWeight: '700',
  },
  favBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  favBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryScroll: {
    maxHeight: 48,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  categoryTabActive: {
    backgroundColor: '#B2DFDB',
    borderColor: '#4DB6AC',
  },
  categoryTabEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  categoryTabTextActive: {
    color: '#00695C',
    fontWeight: '700',
  },
  storiesList: {
    flex: 1,
  },
  storiesContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  columnWrapper: {
    gap: 16,
  },
  storyCardWrapper: {
    flex: 1,
    marginBottom: 16,
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
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
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

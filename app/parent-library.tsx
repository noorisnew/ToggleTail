/**
 * Parent Library Screen
 *
 * Parent-only story library management. Shows Preloaded, My Generated, and
 * Recently Deleted collections with soft-delete / restore / permanent-delete
 * actions. Reached from Parent Settings — NOT accessible by the child.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '../constants/design';
import { normalizeError } from '../src/domain/services/errorService';
import {
    ChildDisplayStory,
    getStoriesByType,
    permanentlyDeleteStory,
    restoreStory,
    softDeleteStory,
} from '../src/domain/services/storyApprovalService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_EMOJIS: Record<string, string[]> = {
  Animals: ['🐾', '🐰', '🦊', '🐻', '🐼', '🐨'],
  Adventure: ['🗺️', '🏔️', '⛵', '🎒', '🧭', '🌄'],
  Bedtime: ['🌙', '⭐', '💤', '🌟', '🛏️', '😴'],
  Science: ['🔬', '🧪', '🔭', '🧲', '🦠', '⚗️'],
  Values: ['💝', '🤝', '💕', '🌈', '❤️', '🙏'],
  Fantasy: ['✨', '🔮', '🧙', '🦄', '🏰', '🐲'],
};

const CATEGORY_COLORS: Record<string, string> = {
  Animals: '#86EFAC',
  Adventure: '#FBBF24',
  Bedtime: '#C4B5FD',
  Science: '#7DD3FC',
  Values: '#FDA4AF',
  Fantasy: '#D8B4FE',
};

type SectionType = 'preloaded' | 'generated' | 'deleted';

export default function ParentLibraryScreen() {
  const router = useRouter();
  const [preloaded, setPreloaded] = useState<ChildDisplayStory[]>([]);
  const [generated, setGenerated] = useState<ChildDisplayStory[]>([]);
  const [deleted, setDeleted] = useState<ChildDisplayStory[]>([]);
  const [expandedPreloaded, setExpandedPreloaded] = useState(true);
  const [expandedGenerated, setExpandedGenerated] = useState(true);
  const [expandedDeleted, setExpandedDeleted] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getStoriesByType();
      setPreloaded(result.preloaded);
      setGenerated(result.generated);
      setDeleted(result.deleted);
    } catch (error) {
      console.error('parent-library load:', normalizeError(error));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSoftDelete = (storyId: string, title: string) => {
    Alert.alert(
      'Remove story?',
      `"${title}" will be hidden from the child and moved to Recently Deleted. You can restore it here anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const ok = await softDeleteStory(storyId);
            if (ok) await load();
          },
        },
      ]
    );
  };

  const handleRestore = async (storyId: string) => {
    const ok = await restoreStory(storyId);
    if (ok) await load();
  };

  const handlePermanentDelete = (storyId: string, title: string) => {
    Alert.alert(
      'Delete permanently?',
      `"${title}" will be deleted forever and cannot be recovered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = await permanentlyDeleteStory(storyId);
            if (ok) await load();
          },
        },
      ]
    );
  };

  const getEmoji = (s: ChildDisplayStory, index: number) => {
    if (s.emoji) return s.emoji;
    const pool = CATEGORY_EMOJIS[s.category || 'Animals'] || CATEGORY_EMOJIS.Animals;
    return pool[index % pool.length];
  };

  const renderCard = (story: ChildDisplayStory, index: number, section: SectionType) => {
    const bg = CATEGORY_COLORS[story.category || 'Animals'] || '#86EFAC';
    return (
      <View key={story._id} style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: bg }]}>
          <Text style={styles.cardEmoji}>{getEmoji(story, index)}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {story.title}
        </Text>
        {section === 'deleted' ? (
          <View style={styles.deletedActions}>
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={() => handleRestore(story._id)}
              activeOpacity={0.8}
            >
              <Text style={styles.restoreButtonText}>↩ Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.permanentDeleteButton}
              onPress={() => handlePermanentDelete(story._id, story.title)}
              activeOpacity={0.8}
            >
              <Text style={styles.permanentDeleteText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.softDeleteButton}
            onPress={() => handleSoftDelete(story._id, story.title)}
            activeOpacity={0.8}
          >
            <Text style={styles.softDeleteText}>🗑️ Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSection = (
    title: string,
    emoji: string,
    stories: ChildDisplayStory[],
    expanded: boolean,
    setExpanded: (v: boolean) => void,
    section: SectionType
  ) => {
    const bg =
      section === 'preloaded' ? '#E8F5E9' : section === 'generated' ? '#E3F2FD' : '#FFEBEE';
    const border =
      section === 'preloaded' ? '#81C784' : section === 'generated' ? '#64B5F6' : '#E57373';

    return (
      <View style={styles.section} key={section}>
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: bg, borderColor: border }]}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionEmoji}>{emoji}</Text>
            <View>
              <Text style={styles.sectionTitle}>{title}</Text>
              <Text style={styles.sectionCount}>
                {stories.length} {stories.length === 1 ? 'story' : 'stories'}
              </Text>
            </View>
          </View>
          <Text style={styles.sectionArrow}>{expanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.sectionContent}>
            {stories.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {section === 'deleted' ? 'No deleted stories' : 'No stories yet'}
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {stories.map((s, i) => renderCard(s, i, section))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.primaryStart, Colors.primaryEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>📚</Text>
          <Text style={styles.headerTitle}>Story Library</Text>
        </View>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderSection(
          'Preloaded Stories',
          '📖',
          preloaded,
          expandedPreloaded,
          setExpandedPreloaded,
          'preloaded'
        )}
        {renderSection(
          'My Generated Stories',
          '✨',
          generated,
          expandedGenerated,
          setExpandedGenerated,
          'generated'
        )}
        {renderSection(
          'Recently Deleted',
          '🗑️',
          deleted,
          expandedDeleted,
          setExpandedDeleted,
          'deleted'
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF9E6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { fontSize: 22, color: '#fff', fontWeight: '700' },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  placeholder: { width: 40 },
  content: { flex: 1 },
  contentContainer: { paddingVertical: 16, paddingBottom: 40 },
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    marginHorizontal: 16,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionEmoji: { fontSize: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  sectionCount: { fontSize: 12, color: '#666', marginTop: 2 },
  sectionArrow: { fontSize: 14, color: '#666' },
  sectionContent: { marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  empty: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#888', fontStyle: 'italic' },
  cardWrapper: { width: (SCREEN_WIDTH - 56) / 2, marginBottom: 8 },
  card: {
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardEmoji: { fontSize: 44 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, lineHeight: 17 },
  softDeleteButton: {
    backgroundColor: '#FFF3F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  softDeleteText: { fontSize: 12, color: '#E57373', fontWeight: '600' },
  deletedActions: { flexDirection: 'row', gap: 8 },
  restoreButton: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#81C784',
  },
  restoreButtonText: { fontSize: 11, color: '#4CAF50', fontWeight: '600' },
  permanentDeleteButton: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E57373',
  },
  permanentDeleteText: { fontSize: 14 },
});

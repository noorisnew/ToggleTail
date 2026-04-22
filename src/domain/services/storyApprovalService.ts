/**
 * Story Approval Service
 * Location: src/domain/services/storyApprovalService.ts
 * 
 * Manages parent approval of stories for child visibility.
 * Preloaded stories ARE visible by default (auto-approved on startup).
 * AI-generated stories require parent approval before becoming visible.
 * 
 * Child View: Only sees stories with approved=true
 * Parent View: Can approve/unapprove stories individually or in batches
 * 
 * NOTE: Moved from src/data/storage/ to domain layer as this contains
 * business logic (approval workflow), not just persistence.
 */

import type { StoryWithPreloadedMeta } from '../../data/seeder/PreloadedSeeder';
import { getStories, saveStories, type Story } from '../../data/storage/storyStorage';
import { normalizeError } from './errorService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ApprovalResult = {
  success: boolean;
  approvedCount: number;
  error?: string;
};

export type ApprovalStats = {
  totalStories: number;
  approvedCount: number;
  pendingCount: number;
  preloadedCount: number;
  preloadedApprovedCount: number;
  preloadedPendingCount: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a story is preloaded
 */
function isPreloaded(story: Story | StoryWithPreloadedMeta): story is StoryWithPreloadedMeta {
  return 'preloaded' in story && (story as StoryWithPreloadedMeta).preloaded?.isPreloaded === true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Child View Queries (Approved Only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get stories visible to child (approved=true only)
 * This is the ONLY function child views should use to query stories
 */
export async function getVisibleStories(): Promise<StoryWithPreloadedMeta[]> {
  const stories = await getStories() as StoryWithPreloadedMeta[];
  return stories.filter(s => s.approved === true);
}

/**
 * Get visible stories filtered by genre
 */
export async function getVisibleStoriesByGenre(genre: string): Promise<StoryWithPreloadedMeta[]> {
  const visible = await getVisibleStories();
  return visible.filter(s => s.theme === genre || s.tags?.includes(genre));
}

/**
 * Check if a specific story is visible to child
 */
export async function isStoryVisible(storyId: string): Promise<boolean> {
  const stories = await getStories() as StoryWithPreloadedMeta[];
  const story = stories.find(s => s.id === storyId);
  return story?.approved === true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parent View Queries (All Stories)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all preloaded stories (for parent management view)
 */
export async function getPreloadedStoriesForParent(): Promise<StoryWithPreloadedMeta[]> {
  const stories = await getStories() as StoryWithPreloadedMeta[];
  return stories.filter(isPreloaded);
}

/**
 * Get preloaded stories pending approval
 */
export async function getPendingApprovalStories(): Promise<StoryWithPreloadedMeta[]> {
  const stories = await getStories() as StoryWithPreloadedMeta[];
  return stories.filter(s => isPreloaded(s) && !s.approved);
}

/**
 * Get already approved preloaded stories
 */
export async function getApprovedPreloadedStories(): Promise<StoryWithPreloadedMeta[]> {
  const stories = await getStories() as StoryWithPreloadedMeta[];
  return stories.filter(s => isPreloaded(s) && s.approved);
}

/**
 * Get preloaded stories by genre (for parent view)
 */
export async function getPreloadedStoriesByGenre(genre: string): Promise<StoryWithPreloadedMeta[]> {
  const preloaded = await getPreloadedStoriesForParent();
  return preloaded.filter(s => s.theme === genre || s.tags?.includes(genre));
}

/**
 * Get approval statistics
 */
export async function getApprovalStats(): Promise<ApprovalStats> {
  const stories = await getStories() as StoryWithPreloadedMeta[];
  const preloaded = stories.filter(isPreloaded);
  
  return {
    totalStories: stories.length,
    approvedCount: stories.filter(s => s.approved).length,
    pendingCount: stories.filter(s => !s.approved).length,
    preloadedCount: preloaded.length,
    preloadedApprovedCount: preloaded.filter(s => s.approved).length,
    preloadedPendingCount: preloaded.filter(s => !s.approved).length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Approval Operations (Idempotent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approve a single story by ID
 * Idempotent: If already approved, returns success without changes
 */
export async function approveStory(storyId: string): Promise<ApprovalResult> {
  try {
    const stories = await getStories() as StoryWithPreloadedMeta[];
    const index = stories.findIndex(s => s.id === storyId);
    
    if (index === -1) {
      return { success: false, approvedCount: 0, error: 'Story not found' };
    }
    
    // Idempotent: already approved
    if (stories[index].approved) {
      return { success: true, approvedCount: 0 };
    }
    
    stories[index] = { ...stories[index], approved: true };
    await saveStories(stories);
    
    return { success: true, approvedCount: 1 };
  } catch (error) {
    return { success: false, approvedCount: 0, error: normalizeError(error) };
  }
}

/**
 * Approve multiple stories by IDs
 * Idempotent: Skips already-approved stories
 */
export async function approveStories(storyIds: string[]): Promise<ApprovalResult> {
  try {
    const stories = await getStories() as StoryWithPreloadedMeta[];
    const idsSet = new Set(storyIds);
    let approvedCount = 0;
    
    for (let i = 0; i < stories.length; i++) {
      if (idsSet.has(stories[i].id) && !stories[i].approved) {
        stories[i] = { ...stories[i], approved: true };
        approvedCount++;
      }
    }
    
    if (approvedCount > 0) {
      await saveStories(stories);
    }
    
    return { success: true, approvedCount };
  } catch (error) {
    return { success: false, approvedCount: 0, error: normalizeError(error) };
  }
}

/**
 * Approve next N pending preloaded stories
 * Default: 20 stories (one batch)
 * Idempotent: Only approves stories that aren't already approved
 */
export async function approveNextBatch(count: number = 20): Promise<ApprovalResult> {
  try {
    const stories = await getStories() as StoryWithPreloadedMeta[];
    
    // Find pending preloaded stories
    const pendingIndices: number[] = [];
    for (let i = 0; i < stories.length && pendingIndices.length < count; i++) {
      if (isPreloaded(stories[i]) && !stories[i].approved) {
        pendingIndices.push(i);
      }
    }
    
    if (pendingIndices.length === 0) {
      return { success: true, approvedCount: 0 };
    }
    
    // Approve them
    for (const idx of pendingIndices) {
      stories[idx] = { ...stories[idx], approved: true };
    }
    
    await saveStories(stories);
    
    return { success: true, approvedCount: pendingIndices.length };
  } catch (error) {
    return { success: false, approvedCount: 0, error: normalizeError(error) };
  }
}

/**
 * Approve all preloaded stories in a specific genre
 * Idempotent: Skips already-approved stories
 */
export async function approveAllInGenre(genre: string): Promise<ApprovalResult> {
  try {
    const stories = await getStories() as StoryWithPreloadedMeta[];
    let approvedCount = 0;
    
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const matchesGenre = story.theme === genre || story.tags?.includes(genre);
      
      if (isPreloaded(story) && matchesGenre && !story.approved) {
        stories[i] = { ...story, approved: true };
        approvedCount++;
      }
    }
    
    if (approvedCount > 0) {
      await saveStories(stories);
    }
    
    return { success: true, approvedCount };
  } catch (error) {
    return { success: false, approvedCount: 0, error: normalizeError(error) };
  }
}

/**
 * Approve all pending preloaded stories
 * Idempotent: Skips already-approved stories
 */
export async function approveAllPreloaded(): Promise<ApprovalResult> {
  try {
    const stories = await getStories() as StoryWithPreloadedMeta[];
    let approvedCount = 0;
    
    for (let i = 0; i < stories.length; i++) {
      if (isPreloaded(stories[i]) && !stories[i].approved) {
        stories[i] = { ...stories[i], approved: true };
        approvedCount++;
      }
    }
    
    if (approvedCount > 0) {
      await saveStories(stories);
    }
    
    return { success: true, approvedCount };
  } catch (error) {
    return { success: false, approvedCount: 0, error: normalizeError(error) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Remove Approval Operations (Idempotent)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove approval from a single story
 * Idempotent: If already unapproved, returns success without changes
 */
export async function removeApproval(storyId: string): Promise<ApprovalResult> {
  try {
    const stories = await getStories() as StoryWithPreloadedMeta[];
    const index = stories.findIndex(s => s.id === storyId);
    
    if (index === -1) {
      return { success: false, approvedCount: 0, error: 'Story not found' };
    }
    
    // Idempotent: already unapproved
    if (!stories[index].approved) {
      return { success: true, approvedCount: 0 };
    }
    
    stories[index] = { ...stories[index], approved: false };
    await saveStories(stories);
    
    return { success: true, approvedCount: 1 };
  } catch (error) {
    return { success: false, approvedCount: 0, error: normalizeError(error) };
  }
}

/**
 * Remove approval from multiple stories
 * Idempotent: Skips already-unapproved stories
 */
export async function removeApprovals(storyIds: string[]): Promise<ApprovalResult> {
  try {
    const stories = await getStories() as StoryWithPreloadedMeta[];
    const idsSet = new Set(storyIds);
    let removedCount = 0;
    
    for (let i = 0; i < stories.length; i++) {
      if (idsSet.has(stories[i].id) && stories[i].approved) {
        stories[i] = { ...stories[i], approved: false };
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      await saveStories(stories);
    }
    
    return { success: true, approvedCount: removedCount };
  } catch (error) {
    return { success: false, approvedCount: 0, error: normalizeError(error) };
  }
}

/**
 * Remove approval from all stories in a genre
 * Idempotent: Skips already-unapproved stories
 */
export async function removeAllApprovalsInGenre(genre: string): Promise<ApprovalResult> {
  try {
    const stories = await getStories() as StoryWithPreloadedMeta[];
    let removedCount = 0;
    
    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      const matchesGenre = story.theme === genre || story.tags?.includes(genre);
      
      if (matchesGenre && story.approved) {
        stories[i] = { ...story, approved: false };
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      await saveStories(stories);
    }
    
    return { success: true, approvedCount: removedCount };
  } catch (error) {
    return { success: false, approvedCount: 0, error: normalizeError(error) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Child Display Adapter (LibraryStory Format)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LibraryStory type for child display (matches storyApi.ts format)
 */
export type ChildDisplayStory = {
  _id: string;
  title: string;
  category: string;
  ageBand: string;
  readingLevel: string;
  provider: string;
  coverUrl: string | null;
  wordCount: number;
  text?: string;
  author?: string;
  emoji?: string;
  readCount?: number;
  isFavorite?: boolean;
};

/**
 * Genre to category mapping
 */
const GENRE_TO_CATEGORY: Record<string, string> = {
  animals: 'Animals',
  adventure: 'Adventure',
  bedtime: 'Bedtime',
  science: 'Science',
  values: 'Values',
  fantasy: 'Fantasy',
};

/**
 * Convert StoryWithPreloadedMeta to ChildDisplayStory format
 * This bridges the storage format to the display format for child-home
 */
function storyToChildDisplay(story: StoryWithPreloadedMeta): ChildDisplayStory {
  const ageRange = (story as any).ageRange || '3-5';
  const readingLevel = (story as any).readingLevel || 'Beginner';
  
  return {
    _id: story.id,
    title: story.title,
    category: GENRE_TO_CATEGORY[story.theme || ''] || story.theme || 'Animals',
    ageBand: ageRange,
    readingLevel: readingLevel,
    provider: story.preloaded?.isPreloaded ? 'preloaded' : 'generated',
    coverUrl: null,
    wordCount: story.text?.split(/\s+/).length || 0,
    text: story.text,
    author: story.preloaded?.author,
    emoji: (story as any).emoji,
    readCount: story.readCount ?? 0,
    isFavorite: story.isFavorite ?? false,
  };
}

/**
 * Get visible stories in child display format
 * 
 * This is the primary function child-home should use to get stories.
 * Returns only approved stories in the format child-home expects.
 * 
 * @param category - Optional category filter (e.g., 'Animals')
 * @returns Array of stories in LibraryStory-compatible format
 */
export async function getVisibleStoriesForChild(category?: string): Promise<ChildDisplayStory[]> {
  const visible = await getVisibleStories();
  
  let filtered = visible;
  if (category) {
    // Map category to genre for filtering
    const genre = Object.entries(GENRE_TO_CATEGORY)
      .find(([_, cat]) => cat === category)?.[0];
    if (genre) {
      filtered = visible.filter(s => s.theme === genre);
    }
  }
  
  return filtered.map(storyToChildDisplay);
}

// ─────────────────────────────────────────────────────────────────────────────
// Migrations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-approve all preloaded stories
 * 
 * Called on app startup to ensure preloaded stories are visible by default.
 * This migrates existing installs where preloaded stories were hidden by default.
 */
export async function autoApprovePreloadedStories(): Promise<number> {
  try {
    const stories = await getStories() as StoryWithPreloadedMeta[];
    let approvedCount = 0;
    
    const updatedStories = stories.map(story => {
      if (isPreloaded(story) && !story.approved) {
        approvedCount++;
        return { ...story, approved: true };
      }
      return story;
    });
    
    if (approvedCount > 0) {
      await saveStories(updatedStories);
      console.log(`[StoryApproval] Auto-approved ${approvedCount} preloaded stories`);
    }
    
    return approvedCount;
  } catch (error) {
    console.error('[StoryApproval] Auto-approve failed:', normalizeError(error));
    return 0;
  }
}

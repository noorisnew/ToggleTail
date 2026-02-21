import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeError } from '../../domain/services/errorService';
import { STORIES_KEY } from './storageKeys';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type Story = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
  approved: boolean;
  difficulty: Difficulty;
  tags: string[];
  isFavorite?: boolean;
  theme?: string;
  readCount?: number;
};

/**
 * Normalize a story object to ensure all fields exist with defaults
 * Provides backwards compatibility for older stored stories
 */
function normalizeStory(raw: Partial<Story>): Story {
  return {
    id: raw.id ?? Date.now().toString(),
    title: raw.title ?? '',
    text: raw.text ?? '',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    approved: raw.approved ?? false,
    difficulty: raw.difficulty ?? 'Easy',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    isFavorite: raw.isFavorite ?? false,
    theme: raw.theme,
    readCount: raw.readCount ?? 0,
  };
}

/**
 * Get all stories from storage
 * Returns normalized stories with defaults for missing fields
 */
export async function getStories(): Promise<Story[]> {
  try {
    const json = await AsyncStorage.getItem(STORIES_KEY);
    if (!json) {
      return [];
    }
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      console.error('getStories: stored data is not an array, returning []');
      return [];
    }
    return parsed.map(normalizeStory);
  } catch (error) {
    console.error('getStories:', normalizeError(error));
    return [];
  }
}

/**
 * Add a new story
 * Returns the new story or null on failure (never throws)
 */
export async function addStory(
  story: Omit<Story, 'id' | 'createdAt'>
): Promise<Story | null> {
  try {
    const stories = await getStories();
    const newStory: Story = {
      ...story,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      approved: story.approved ?? false,
      difficulty: story.difficulty ?? 'Easy',
      tags: Array.isArray(story.tags) ? story.tags : [],
    };
    stories.push(newStory);
    await AsyncStorage.setItem(STORIES_KEY, JSON.stringify(stories));
    return newStory;
  } catch (error) {
    console.error('addStory:', normalizeError(error));
    return null;
  }
}

/**
 * Delete a story by ID
 * Returns true on success, false on failure (never throws)
 */
export async function deleteStory(id: string): Promise<boolean> {
  try {
    const stories = await getStories();
    const filtered = stories.filter((s) => s.id !== id);
    await AsyncStorage.setItem(STORIES_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('deleteStory:', normalizeError(error));
    return false;
  }
}

/**
 * Update a story by ID
 * Returns the updated story or null on failure (never throws)
 */
export async function updateStory(
  id: string,
  updates: Partial<Omit<Story, 'id' | 'createdAt'>>
): Promise<Story | null> {
  try {
    const stories = await getStories();
    const index = stories.findIndex((s) => s.id === id);
    if (index === -1) {
      console.error('updateStory: story not found');
      return null;
    }
    const updated: Story = { ...stories[index], ...updates };
    stories[index] = updated;
    await AsyncStorage.setItem(STORIES_KEY, JSON.stringify(stories));
    return updated;
  } catch (error) {
    console.error('updateStory:', normalizeError(error));
    return null;
  }
}

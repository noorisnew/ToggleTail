import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeError } from '../../domain/services/errorService';
import { EVENT_LOG_KEY } from './storageKeys';

export type EventType = 'READ_START' | 'READ_STOP' | 'STORY_OPEN' | 'PIN_SUCCESS' | 'PIN_FAIL';

export type LogEvent = {
  id: string;
  type: EventType;
  storyId?: string;
  timestamp: string;
};

/**
 * Add a new event to the log
 */
export async function addEvent(
  event: Omit<LogEvent, 'id' | 'timestamp'>
): Promise<LogEvent> {
  try {
    const events = await getEvents();
    const newEvent: LogEvent = {
      ...event,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    events.unshift(newEvent);
    await AsyncStorage.setItem(EVENT_LOG_KEY, JSON.stringify(events));
    return newEvent;
  } catch (error) {
    console.error('addEvent:', normalizeError(error));
    throw new Error(normalizeError(error));
  }
}

/**
 * Get all logged events
 */
export async function getEvents(): Promise<LogEvent[]> {
  try {
    const json = await AsyncStorage.getItem(EVENT_LOG_KEY);
    if (!json) {
      return [];
    }
    const events = JSON.parse(json);
    return Array.isArray(events) ? events : [];
  } catch (error) {
    console.error('getEvents:', normalizeError(error));
    return [];
  }
}

/**
 * Clear all logged events
 */
export async function clearEvents(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EVENT_LOG_KEY);
  } catch (error) {
    console.error('clearEvents:', normalizeError(error));
    throw new Error(normalizeError(error));
  }
}

/**
 * Manifest Schema for Preloaded Stories
 * 
 * Defines the structure for story metadata including attribution.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attribution information for a story
 */
export type StoryAttribution = {
  /** Author of the story text */
  author: string;
  /** Illustrator of cover/images (optional) */
  illustrator?: string;
  /** Source platform (e.g., "StoryWeaver", "Public Domain") */
  source: string;
  /** License identifier (e.g., "CC BY 4.0", "CC0", "Public Domain") */
  license: string;
  /** URL to the original source (optional) */
  sourceUrl?: string;
};

/**
 * Individual story entry in the manifest
 */
export type ManifestStory = {
  /** Stable unique identifier (e.g., "sw-001", "pd-adventure-001") */
  id: string;
  /** Display title of the story */
  title: string;
  /** Genre category */
  genre: string;
  /** Language code (e.g., "en", "es", "fr") */
  language: string;
  /** Grade level (optional, e.g., "K-1", "2-3", "4-5") */
  gradeLevel?: string;
  /** Estimated reading time in seconds (optional) */
  readingTimeSec?: number;
  /** Relative path to cover image asset */
  coverAssetPath: string;
  /** Relative path to story text asset (JSON file) */
  textAssetPath: string;
  /** Attribution and licensing information */
  attribution: StoryAttribution;
};

/**
 * Root manifest structure
 */
export type StoryManifest = {
  /** Schema version for future compatibility (e.g., "1.0.0") */
  manifestVersion: string;
  /** ISO 8601 timestamp when manifest was created/updated */
  createdAt: string;
  /** Array of story entries */
  stories: ManifestStory[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationError = {
  path: string;
  message: string;
};

/**
 * Validates a manifest object against the schema
 * @returns Array of validation errors (empty if valid)
 */
export function validateManifest(manifest: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!manifest || typeof manifest !== 'object') {
    errors.push({ path: '', message: 'Manifest must be an object' });
    return errors;
  }

  const m = manifest as Record<string, unknown>;

  // Validate root fields
  if (typeof m.manifestVersion !== 'string' || !m.manifestVersion) {
    errors.push({ path: 'manifestVersion', message: 'manifestVersion is required and must be a string' });
  }

  if (typeof m.createdAt !== 'string' || !m.createdAt) {
    errors.push({ path: 'createdAt', message: 'createdAt is required and must be an ISO 8601 string' });
  } else if (isNaN(Date.parse(m.createdAt as string))) {
    errors.push({ path: 'createdAt', message: 'createdAt must be a valid ISO 8601 date' });
  }

  if (!Array.isArray(m.stories)) {
    errors.push({ path: 'stories', message: 'stories must be an array' });
    return errors;
  }

  // Validate each story
  const storyIds = new Set<string>();
  (m.stories as unknown[]).forEach((story, index) => {
    const storyErrors = validateStory(story, index, storyIds);
    errors.push(...storyErrors);
  });

  return errors;
}

/**
 * Validates a single story entry
 */
function validateStory(story: unknown, index: number, existingIds: Set<string>): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `stories[${index}]`;

  if (!story || typeof story !== 'object') {
    errors.push({ path: prefix, message: 'Story must be an object' });
    return errors;
  }

  const s = story as Record<string, unknown>;

  // Required string fields
  const requiredStrings = ['id', 'title', 'genre', 'language', 'coverAssetPath', 'textAssetPath'] as const;
  for (const field of requiredStrings) {
    if (typeof s[field] !== 'string' || !(s[field] as string).trim()) {
      errors.push({ path: `${prefix}.${field}`, message: `${field} is required and must be a non-empty string` });
    }
  }

  // Check for duplicate IDs
  if (typeof s.id === 'string') {
    if (existingIds.has(s.id)) {
      errors.push({ path: `${prefix}.id`, message: `Duplicate story ID: ${s.id}` });
    } else {
      existingIds.add(s.id);
    }
  }

  // Optional fields with type validation
  if (s.gradeLevel !== undefined && typeof s.gradeLevel !== 'string') {
    errors.push({ path: `${prefix}.gradeLevel`, message: 'gradeLevel must be a string if provided' });
  }

  if (s.readingTimeSec !== undefined) {
    if (typeof s.readingTimeSec !== 'number' || s.readingTimeSec < 0) {
      errors.push({ path: `${prefix}.readingTimeSec`, message: 'readingTimeSec must be a positive number if provided' });
    }
  }

  // Validate attribution
  const attrErrors = validateAttribution(s.attribution, `${prefix}.attribution`);
  errors.push(...attrErrors);

  return errors;
}

/**
 * Validates attribution object
 */
function validateAttribution(attribution: unknown, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!attribution || typeof attribution !== 'object') {
    errors.push({ path, message: 'attribution is required and must be an object' });
    return errors;
  }

  const a = attribution as Record<string, unknown>;

  // Required fields
  const requiredStrings = ['author', 'source', 'license'] as const;
  for (const field of requiredStrings) {
    if (typeof a[field] !== 'string' || !(a[field] as string).trim()) {
      errors.push({ path: `${path}.${field}`, message: `${field} is required and must be a non-empty string` });
    }
  }

  // Optional fields
  if (a.illustrator !== undefined && typeof a.illustrator !== 'string') {
    errors.push({ path: `${path}.illustrator`, message: 'illustrator must be a string if provided' });
  }

  if (a.sourceUrl !== undefined && typeof a.sourceUrl !== 'string') {
    errors.push({ path: `${path}.sourceUrl`, message: 'sourceUrl must be a string if provided' });
  }

  return errors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type guard to check if an object is a valid StoryManifest
 */
export function isValidManifest(manifest: unknown): manifest is StoryManifest {
  return validateManifest(manifest).length === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an empty manifest with current timestamp
 */
export function createEmptyManifest(): StoryManifest {
  return {
    manifestVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    stories: [],
  };
}

/**
 * Known license types for convenience
 */
export const KNOWN_LICENSES = {
  CC_BY_4: 'CC BY 4.0',
  CC_BY_SA_4: 'CC BY-SA 4.0',
  CC_BY_NC_4: 'CC BY-NC 4.0',
  CC0: 'CC0 1.0',
  PUBLIC_DOMAIN: 'Public Domain',
} as const;

/**
 * Common story sources
 */
export const KNOWN_SOURCES = {
  STORYWEAVER: 'StoryWeaver',
  GUTENBERG: 'Project Gutenberg',
  PUBLIC_DOMAIN: 'Public Domain',
  ORIGINAL: 'Original',
} as const;

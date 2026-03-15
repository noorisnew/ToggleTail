/**
 * Story Creation Service
 * Location: src/domain/services/storyCreationService.ts
 *
 * Pure business logic for generating stories locally.
 * Used as offline fallback when the story generation API is unavailable.
 *
 * This is domain logic (no side effects, no device APIs) so it belongs
 * in domain/services/, not services/.
 */

// ============================================================================
// Types
// ============================================================================

export type StoryLength = 'Short' | 'Medium' | 'Long';

export interface LocalStoryParams {
  title: string;
  childName?: string;
  theme: string;
  mainCharacter?: string;
  specialCharacters?: string;
  storyContext?: string;
  length: StoryLength;
}

// ============================================================================
// Story Templates (internal)
// ============================================================================

const STORY_TEMPLATES = {
  intros: {
    forest: 'Deep in an enchanted forest where tall trees whispered ancient secrets,',
    space: 'Far beyond the twinkling stars, in a galaxy full of wonder,',
    castle: 'In a magnificent castle with towers reaching toward the clouds,',
    ocean: 'Beneath the shimmering waves of a magical ocean,',
  } as Record<string, string>,

  adventures: [
    'discovered a hidden treasure map',
    'found a mysterious glowing stone',
    'met a friendly magical creature',
    'heard about a friend who needed help',
    'stumbled upon a secret passage',
  ],

  solutions: [
    'With courage and a kind heart,',
    'Using cleverness and teamwork,',
    'With patience and determination,',
    'By believing in themselves,',
    'Through friendship and bravery,',
  ],

  morals: [
    'And so they learned that kindness is the greatest magic of all.',
    'From that day on, they knew that true friends always help each other.',
    'And they discovered that being brave means trying even when you\'re scared.',
    'The adventure taught them that working together makes anything possible.',
    'And they lived happily, knowing that every problem has a solution.',
  ],
};

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Pick a random element from an array.
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generates a story locally using templates.
 * Used as offline fallback when the story generation API is unavailable.
 *
 * @param params - Story generation parameters
 * @returns Generated story text
 */
export function generateLocalStory(params: LocalStoryParams): string {
  const { childName, theme, mainCharacter, length } = params;

  // Trim and treat whitespace-only as empty
  const trimmedMainChar = mainCharacter?.trim();
  const trimmedChildName = childName?.trim();
  const heroName = trimmedMainChar || trimmedChildName || 'A curious adventurer';
  const intro = STORY_TEMPLATES.intros[theme] || STORY_TEMPLATES.intros.forest;
  const adventure = pickRandom(STORY_TEMPLATES.adventures);
  const solution = pickRandom(STORY_TEMPLATES.solutions);
  const moral = pickRandom(STORY_TEMPLATES.morals);

  const shortStory = `${intro} there lived ${heroName}.

One sunny day, ${heroName} ${adventure}. It was the beginning of an amazing adventure!

${solution} ${heroName} faced the challenge head-on. After much effort and determination, everything worked out wonderfully.

${moral}

The End.`;

  if (length === 'Short') return shortStory;

  // Medium/Long stories get more content
  const middlePart = `

Along the way, ${heroName} made new friends who joined the journey. Together, they overcame obstacles and shared many laughs. The path wasn't always easy, but ${heroName} never gave up.

"We can do this!" ${heroName} said with a smile. And they did!`;

  const longPart = length === 'Long' ? `

The adventure took them through winding paths and sparkling meadows. They discovered that the real treasure wasn't what they expected - it was the friendship and memories they made along the way.

${heroName} looked back at the journey and felt proud. Not just for completing the quest, but for all the kindness shared and lessons learned.` : '';

  return `${intro} there lived ${heroName}.

One sunny day, ${heroName} ${adventure}. It was the beginning of an incredible adventure!${middlePart}

${solution} ${heroName} faced the final challenge with everything learned along the way.${longPart}

${moral}

The End.`;
}

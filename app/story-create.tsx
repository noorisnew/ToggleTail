import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/design';
import { generateStory, getStorySuggestions, StorySuggestion } from '../src/data/api/storyApi';
import { ChildProfile, getProfile } from '../src/data/storage/profileStorage';
import { addStory } from '../src/data/storage/storyStorage';

// Story templates for AI generation
const storyTemplates = {
  intros: [
    'Once upon a time, in a magical land far away,',
    'In a cozy little village surrounded by tall mountains,',
    'Long ago, in a forest filled with wonder,',
    'In a bright and sunny meadow,',
    'Deep in an enchanted kingdom,',
  ],
  characters: [
    'a brave little {animal} named {name}',
    'a curious young {animal} called {name}',
    'a kind-hearted {animal} known as {name}',
    'a clever little {animal} named {name}',
    'a friendly {animal} called {name}',
  ],
  animals: ['rabbit', 'fox', 'bear', 'owl', 'deer', 'mouse', 'squirrel', 'hedgehog'],
  problems: [
    'lost their way in the deep, dark woods',
    'discovered that their favorite tree had fallen down',
    'found a friend who was feeling very sad',
    'noticed that the village well had run dry',
    'realized they had forgotten something very important',
  ],
  solutions: [
    'With courage and determination, {name} decided to help.',
    '{name} thought carefully and came up with a brilliant plan.',
    'Using kindness and patience, {name} found a way.',
    '{name} asked friends for help, and together they worked.',
    'With a brave heart, {name} faced the challenge head-on.',
  ],
  morals: [
    'And from that day on, everyone learned that kindness can solve any problem.',
    'The end! And the lesson was: true friends always help each other.',
    'And so, {name} discovered that being brave means trying even when you\'re scared.',
    'From then on, everyone remembered: working together makes everything possible.',
    'And they all lived happily, knowing that patience and love conquer all.',
  ],
};

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const generateStoryFromTitle = (title: string): string => {
  const titleLower = title.toLowerCase();
  const words = titleLower.split(/\s+/);
  
  // Try to extract a name from title, or generate one
  const possibleNames = ['Luna', 'Oliver', 'Maple', 'Finn', 'Rosie', 'Pip', 'Hazel', 'Theo'];
  let characterName = possibleNames.find(n => titleLower.includes(n.toLowerCase())) || pickRandom(possibleNames);
  
  // Try to match animal from title, or pick random
  let animal = storyTemplates.animals.find(a => titleLower.includes(a)) || pickRandom(storyTemplates.animals);
  
  const intro = pickRandom(storyTemplates.intros);
  const characterTemplate = pickRandom(storyTemplates.characters)
    .replace('{animal}', animal)
    .replace('{name}', characterName);
  const problem = pickRandom(storyTemplates.problems);
  const solution = pickRandom(storyTemplates.solutions).replace(/{name}/g, characterName);
  const moral = pickRandom(storyTemplates.morals).replace(/{name}/g, characterName);
  
  // Build the story
  const story = `${intro} there lived ${characterTemplate}.

One day, ${characterName} ${problem}. It seemed like a very big problem indeed!

${solution} After thinking hard and trying their best, things started to get better.

${moral}`;
  
  return story;
};

export default function StoryCreateScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [suggestions, setSuggestions] = useState<StorySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const childProfile = await getProfile();
    setProfile(childProfile);
    if (childProfile?.interests && childProfile.interests.length > 0) {
      loadSuggestions(childProfile.interests);
    }
  };

  const loadSuggestions = async (interests: string[]) => {
    setLoadingSuggestions(true);
    const result = await getStorySuggestions(interests as any, 3);
    setSuggestions(result.suggestions);
    setLoadingSuggestions(false);
  };

  const handleGenerateAIDraft = async () => {
    setGenerating(true);
    
    try {
      const result = await generateStory({
        childName: profile?.name || 'little reader',
        age: profile?.age || 5,
        readingLevel: profile?.readingLevel || 'Beginner',
        interests: profile?.interests || [],
        title: title.trim() || undefined,
      });

      if (result.success) {
        if (!title.trim()) {
          setTitle(result.title);
        }
        setText(result.text);
      } else {
        Alert.alert('Error', result.error || 'Could not generate story.');
      }
    } catch (error) {
      // Fallback to local generation
      const draft = generateStoryFromTitle(title || 'A Magical Adventure');
      setText(draft);
      Alert.alert('Offline Mode', 'Generated story locally.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseSuggestion = (suggestion: StorySuggestion) => {
    setTitle(suggestion.title);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title.');
      return;
    }
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter story text.');
      return;
    }

    setSaving(true);
    const result = await addStory({
      title: title.trim(),
      text: text.trim(),
      approved: false,
      difficulty: 'Easy',
      tags: [],
    });
    if (result) {
      router.replace('/parent-home');
    } else {
      Alert.alert('Error', 'Could not save story. Please try again.');
      setSaving(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.card}>
          <Text style={styles.emoji}>📝</Text>
          <Text style={styles.title}>Create Story</Text>
          <Text style={styles.subtitle}>
            {profile?.name ? `Create a personalized story for ${profile.name}` : 'Add a new story for your child'}
          </Text>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>✨ Suggested for {profile?.name}</Text>
              <View style={styles.suggestionsList}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => handleUseSuggestion(s)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionText}>{s.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Story Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a catchy title or leave blank for AI..."
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <TouchableOpacity
            onPress={handleGenerateAIDraft}
            disabled={generating}
            activeOpacity={0.8}
            style={styles.generateButtonWrapper}
          >
            <LinearGradient
              colors={generating ? ['#9ca3af', '#6b7280'] : ['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.generateButton}
            >
              <Text style={styles.generateButtonText}>
                {generating ? '🔮 Generating...' : '🤖 Generate AI Draft'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Story Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your story here..."
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={saving ? ['#9ca3af', '#6b7280'] : [Colors.primaryStart, Colors.primaryEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>
                {saving ? '⏳ Saving...' : '✨ Save Story'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    paddingTop: 60,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  suggestionsContainer: {
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: '#fef3c7',
    borderRadius: BorderRadius.button,
  },
  suggestionsTitle: {
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primaryStart,
  },
  suggestionText: {
    fontSize: Typography.sizes.small,
    color: Colors.primaryStart,
    fontWeight: Typography.weights.medium,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    color: Colors.textAccent,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.button,
    padding: Spacing.md,
    fontSize: Typography.sizes.body,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 180,
    textAlignVertical: 'top',
  },
  generateButtonWrapper: {
    marginBottom: Spacing.lg,
  },
  generateButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  generateButtonText: {
    color: Colors.textLight,
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
  },
  saveButton: {
    padding: Spacing.md,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    color: Colors.textLight,
    fontSize: Typography.sizes.button,
    fontWeight: Typography.weights.semibold,
  },
  cancelButton: {
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  cancelButtonText: {
    color: Colors.textAccent,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
});

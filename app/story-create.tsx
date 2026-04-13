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
    Switch,
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
import { generateLocalStory, StoryLength } from '../src/domain/services/storyCreationService';

// Story themes
const STORY_THEMES = [
  { id: 'forest', name: 'Forest', emoji: '🌲' },
  { id: 'space', name: 'Space', emoji: '🚀' },
  { id: 'castle', name: 'Castle', emoji: '🏰' },
  { id: 'ocean', name: 'Ocean', emoji: '🌊' },
];

// AI Agents
const AI_AGENTS = [
  { id: 'creative', name: 'Creative', emoji: '🎨' },
  { id: 'educational', name: 'Educational', emoji: '📚' },
  { id: 'adventurous', name: 'Adventurous', emoji: '⚔️' },
  { id: 'calming', name: 'Calming', emoji: '🌙' },
];

export default function StoryCreateScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [suggestions, setSuggestions] = useState<StorySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // Story creation options
  const [selectedTheme, setSelectedTheme] = useState('forest');
  const [selectedAgent, setSelectedAgent] = useState('creative');
  const [mainCharacter, setMainCharacter] = useState('');
  const [specialCharacters, setSpecialCharacters] = useState('');
  const [storyContext, setStoryContext] = useState('');
  const [storyLength, setStoryLength] = useState<StoryLength>('Medium');
  const [includeChild, setIncludeChild] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

// Popular kid-friendly emojis for story creation
const STORY_EMOJIS = [
  '🦁', '🐻', '🐰', '🦊', '🐼', '🐶', '🐱', '🦄',
  '🌟', '✨', '🌈', '🌸', '🌺', '🎈', '🎁', '🎪',
  '🏰', '🚀', '🎠', '⛵', '🌲', '🏔️', '🌊', '🌙',
  '👑', '🧙', '🧚', '🤴', '👸', '🦸', '🐉', '🦋',
];

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
    
    const theme = STORY_THEMES.find(t => t.id === selectedTheme);
    const agent = AI_AGENTS.find(a => a.id === selectedAgent);
    
    try {
      // Combine the selected theme with any profile interests so the backend
      // has the richest possible context for generation.
      const profileInterests = profile?.interests ?? [];
      const interestsList = [
        ...(theme?.name ? [theme.name] : []),
        ...profileInterests.filter(i => i !== theme?.name),
      ];

      const result = await generateStory({
        childName: includeChild && profile?.name ? profile.name : undefined,
        age: profile?.age || 5,
        readingLevel: profile?.readingLevel || 'Beginner',
        interests: interestsList,
        title: title.trim() || undefined,
        theme: theme?.name,
        mainCharacter: mainCharacter || undefined,
        specialCharacters: specialCharacters || undefined,
        storyContext: storyContext || undefined,
        storyLength: storyLength,
        agentStyle: agent?.id,
      });

      if (result.success && result.text) {
        if (!title.trim()) {
          setTitle(result.title);
        }
        setText(result.text);
      } else {
        // API failed - use local generation via service
        const localText = generateLocalStory({
          title: title || 'A Magical Adventure',
          childName: includeChild ? profile?.name : undefined,
          theme: selectedTheme,
          mainCharacter: mainCharacter || undefined,
          length: storyLength,
          readingLevel: profile?.readingLevel,
        });
        if (!title.trim()) {
          setTitle('A Magical Adventure');
        }
        setText(localText);
        Alert.alert('Offline Mode', 'Generated story locally. You can edit it below!');
      }
    } catch (error) {
      // Fallback to local generation via service
      const localText = generateLocalStory({
        title: title || 'A Magical Adventure',
        childName: includeChild ? profile?.name : undefined,
        theme: selectedTheme,
        mainCharacter: mainCharacter || undefined,
        length: storyLength,
        readingLevel: profile?.readingLevel,
      });
      if (!title.trim()) {
        setTitle('A Magical Adventure');
      }
      setText(localText);
      Alert.alert('Offline Mode', 'Generated story locally. You can edit it below!');
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

    const theme = STORY_THEMES.find(t => t.id === selectedTheme);
    
    setSaving(true);
    const result = await addStory({
      title: title.trim(),
      text: text.trim(),
      approved: true, // Parent-created stories are visible immediately
      difficulty: storyLength === 'Short' ? 'Easy' : storyLength === 'Long' ? 'Hard' : 'Medium',
      tags: [theme?.name || 'Adventure'],
      theme: theme?.name,
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

          {/* Include Child Toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Include {profile?.name || 'child'} in story</Text>
            <Switch
              value={includeChild}
              onValueChange={setIncludeChild}
              trackColor={{ false: '#e5e7eb', true: Colors.primaryStart }}
              thumbColor="#fff"
            />
          </View>

          {/* Story Theme */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Story Theme</Text>
            <View style={styles.optionsRow}>
              {STORY_THEMES.map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.optionButton,
                    selectedTheme === theme.id && styles.optionButtonActive,
                  ]}
                  onPress={() => setSelectedTheme(theme.id)}
                >
                  <Text style={styles.optionEmoji}>{theme.emoji}</Text>
                  <Text style={[
                    styles.optionText,
                    selectedTheme === theme.id && styles.optionTextActive,
                  ]}>{theme.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* AI Agent */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Story Style</Text>
            <View style={styles.optionsRow}>
              {AI_AGENTS.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  style={[
                    styles.optionButton,
                    selectedAgent === agent.id && styles.optionButtonActive,
                  ]}
                  onPress={() => setSelectedAgent(agent.id)}
                >
                  <Text style={styles.optionEmoji}>{agent.emoji}</Text>
                  <Text style={[
                    styles.optionText,
                    selectedAgent === agent.id && styles.optionTextActive,
                  ]}>{agent.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Main Character */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Main Character (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., A brave little bear"
              placeholderTextColor={Colors.textMuted}
              value={mainCharacter}
              onChangeText={setMainCharacter}
              maxLength={50}
            />
          </View>

          {/* Special Characters */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Other Characters (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., A wise owl, a playful bunny"
              placeholderTextColor={Colors.textMuted}
              value={specialCharacters}
              onChangeText={setSpecialCharacters}
              maxLength={100}
            />
            <Text style={styles.inputHint}>Add friends, pets, or companions for the adventure</Text>
          </View>

          {/* Story Context */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Story Details (optional)</Text>
            <TextInput
              style={[styles.input, styles.contextArea]}
              placeholder="Add any special details... e.g., 'Include a lesson about sharing' or 'Set it during winter'"
              placeholderTextColor={Colors.textMuted}
              value={storyContext}
              onChangeText={setStoryContext}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={200}
            />
          </View>

          {/* Emoji Picker */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.emojiToggle}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Text style={styles.inputLabel}>Add Fun Emojis ✨</Text>
              <Text style={styles.emojiToggleIcon}>{showEmojiPicker ? '▼' : '▶'}</Text>
            </TouchableOpacity>
            {showEmojiPicker && (
              <View style={styles.emojiGrid}>
                {STORY_EMOJIS.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.emojiButton}
                    onPress={() => setStoryContext(prev => prev + ' ' + emoji)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {showEmojiPicker && (
              <Text style={styles.inputHint}>Tap an emoji to add it to Story Details</Text>
            )}
          </View>

          {/* Story Length */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Story Length</Text>
            <View style={styles.lengthRow}>
              {(['Short', 'Medium', 'Long'] as const).map((length) => (
                <TouchableOpacity
                  key={length}
                  style={[
                    styles.lengthButton,
                    storyLength === length && styles.lengthButtonActive,
                  ]}
                  onPress={() => setStoryLength(length)}
                >
                  <Text style={[
                    styles.lengthText,
                    storyLength === length && styles.lengthTextActive,
                  ]}>{length}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  toggleLabel: {
    fontSize: Typography.sizes.body,
    color: Colors.textPrimary,
    fontWeight: Typography.weights.medium,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    backgroundColor: Colors.cardBackground,
    minWidth: 70,
  },
  optionButtonActive: {
    borderColor: Colors.primaryStart,
    backgroundColor: '#f3e8ff',
  },
  optionEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  optionText: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
  },
  optionTextActive: {
    color: Colors.primaryStart,
    fontWeight: Typography.weights.semibold,
  },
  lengthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lengthButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
  },
  lengthButtonActive: {
    borderColor: Colors.primaryStart,
    backgroundColor: '#f3e8ff',
  },
  lengthText: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
  },
  lengthTextActive: {
    color: Colors.primaryStart,
    fontWeight: Typography.weights.semibold,
  },
  inputHint: {
    fontSize: Typography.sizes.small,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  contextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  emojiToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emojiToggleIcon: {
    fontSize: Typography.sizes.small,
    color: Colors.textMuted,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: Spacing.sm,
    backgroundColor: '#fef3c7',
    borderRadius: BorderRadius.button,
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.borderCard,
  },
  emojiText: {
    fontSize: 22,
  },
});

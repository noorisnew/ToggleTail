import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/design';

type QuizQuestion = {
  id: number;
  emoji: string;
  question: string;
  options: string[];
  correctIndex: number;
};

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    emoji: '🦁',
    question: 'What animal is the King of the Jungle?',
    options: ['Elephant', 'Lion', 'Giraffe', 'Monkey'],
    correctIndex: 1,
  },
  {
    id: 2,
    emoji: '🌈',
    question: 'How many colors are in a rainbow?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
  },
  {
    id: 3,
    emoji: '🐻',
    question: 'What do bears love to eat?',
    options: ['Pizza', 'Honey', 'Ice Cream', 'Spaghetti'],
    correctIndex: 1,
  },
];

export default function DemoQuizScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const isSmallScreen = width < 380;
  const isLargeScreen = width > 600;
  const isLandscape = width > height;

  const question = QUIZ_QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100;

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);

    if (index === question.correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleContinue = () => {
    router.replace('/child-home');
  };

  const getOptionStyle = (index: number) => {
    if (!showResult) {
      return selectedAnswer === index ? styles.optionSelected : styles.option;
    }

    if (index === question.correctIndex) {
      return [styles.option, styles.optionCorrect];
    }

    if (selectedAnswer === index && index !== question.correctIndex) {
      return [styles.option, styles.optionWrong];
    }

    return styles.option;
  };

  const getOptionTextStyle = (index: number) => {
    if (!showResult && selectedAnswer === index) {
      return [styles.optionText, styles.optionTextSelected];
    }
    if (showResult && index === question.correctIndex) {
      return [styles.optionText, styles.optionTextCorrect];
    }
    if (showResult && selectedAnswer === index && index !== question.correctIndex) {
      return [styles.optionText, styles.optionTextWrong];
    }
    return styles.optionText;
  };

  if (quizComplete) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isLandscape && styles.scrollContentLandscape,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, isLargeScreen && styles.cardLarge]}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBorder}>
                  <View style={styles.logoInner}>
                    <Text style={[styles.logoText, isSmallScreen && styles.logoTextSmall]}>
                      Toggle{'\n'}tails
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.subtitle}>Demo Quiz Complete!</Text>
            </View>

            <View style={styles.content}>
              <Text style={[styles.resultEmoji, isSmallScreen && styles.resultEmojiSmall]}>
                {score === QUIZ_QUESTIONS.length ? '🎉' : score >= 2 ? '⭐' : '💪'}
              </Text>
              <Text style={[styles.resultTitle, isSmallScreen && styles.resultTitleSmall]}>
                {score === QUIZ_QUESTIONS.length
                  ? 'Perfect Score!'
                  : score >= 2
                  ? 'Great Job!'
                  : 'Good Try!'}
              </Text>
              <Text style={styles.resultScore}>
                You got {score} out of {QUIZ_QUESTIONS.length} correct!
              </Text>
              <Text style={[styles.resultMessage, isSmallScreen && styles.resultMessageSmall]}>
                Ready to explore amazing stories?
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={handleContinue}
                activeOpacity={0.8}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={[Colors.primaryStart, Colors.primaryEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Let's Go! 🚀</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isLandscape && styles.scrollContentLandscape,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, isLargeScreen && styles.cardLarge]}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoBorder, isSmallScreen && styles.logoBorderSmall]}>
                <View style={styles.logoInner}>
                  <Text style={[styles.logoText, isSmallScreen && styles.logoTextSmall]}>
                    Toggle{'\n'}tails
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.subtitle}>Let's play a quick quiz!</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.stepText}>
              Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
            </Text>
          </View>

          <View style={[styles.content, isLandscape && styles.contentLandscape]}>
            <Text style={[styles.questionEmoji, isSmallScreen && styles.questionEmojiSmall]}>
              {question.emoji}
            </Text>
            <Text style={[styles.questionText, isSmallScreen && styles.questionTextSmall]}>
              {question.question}
            </Text>

            <View style={[styles.optionsContainer, isLargeScreen && styles.optionsContainerLarge]}>
              {question.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[getOptionStyle(index), isSmallScreen && styles.optionSmall]}
                  onPress={() => handleSelectAnswer(index)}
                  activeOpacity={0.7}
                  disabled={showResult}
                >
                  <Text style={[getOptionTextStyle(index), isSmallScreen && styles.optionTextSmall]}>
                    {option}
                  </Text>
                  {showResult && index === question.correctIndex && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                  {showResult && selectedAnswer === index && index !== question.correctIndex && (
                    <Text style={styles.crossmark}>✗</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {showResult && (
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={handleNext}
                activeOpacity={0.8}
                style={styles.buttonWrapper}
              >
                <LinearGradient
                  colors={[Colors.primaryStart, Colors.primaryEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>
                    {currentQuestion < QUIZ_QUESTIONS.length - 1 ? 'Next Question →' : 'See Results →'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    minHeight: '100%',
  },
  scrollContentLandscape: {
    paddingVertical: Spacing.md,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.card,
    borderWidth: 4,
    borderColor: Colors.borderCard,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    ...Shadows.card,
  },
  cardLarge: {
    maxWidth: 600,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentYellow,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  logoBorderSmall: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: Colors.primaryStart,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: Typography.weights.bold,
    color: Colors.accentYellow,
    textAlign: 'center',
    lineHeight: 18,
  },
  logoTextSmall: {
    fontSize: 12,
    lineHeight: 14,
  },
  subtitle: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: Spacing.lg,
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#f3e8ff',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryStart,
    borderRadius: 9999,
  },
  stepText: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  content: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  contentLandscape: {
    paddingVertical: Spacing.sm,
  },
  questionEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  questionEmojiSmall: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  questionText: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.textAccent,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  questionTextSmall: {
    fontSize: 18,
    marginBottom: Spacing.md,
  },
  optionsContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  optionsContainerLarge: {
    maxWidth: 400,
  },
  option: {
    backgroundColor: '#f9fafb',
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  optionSmall: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  optionSelected: {
    backgroundColor: '#f3e8ff',
    borderRadius: BorderRadius.button,
    borderWidth: 2,
    borderColor: Colors.primaryStart,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  optionCorrect: {
    backgroundColor: '#d1fae5',
    borderColor: '#22c55e',
  },
  optionWrong: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  optionText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.textPrimary,
    flex: 1,
  },
  optionTextSmall: {
    fontSize: 14,
  },
  optionTextSelected: {
    color: Colors.primaryStart,
  },
  optionTextCorrect: {
    color: '#166534',
  },
  optionTextWrong: {
    color: '#dc2626',
  },
  checkmark: {
    fontSize: 20,
    color: '#22c55e',
    fontWeight: Typography.weights.bold,
    marginLeft: Spacing.sm,
  },
  crossmark: {
    fontSize: 20,
    color: '#ef4444',
    fontWeight: Typography.weights.bold,
    marginLeft: Spacing.sm,
  },
  actions: {
    paddingTop: Spacing.lg,
    borderTopWidth: 2,
    borderTopColor: Colors.backgroundLight,
    marginTop: Spacing.md,
  },
  buttonWrapper: {
    borderRadius: BorderRadius.button,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: Typography.sizes.button,
    fontWeight: Typography.weights.semibold,
  },
  // Result screen styles
  resultEmoji: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  resultEmojiSmall: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
    color: Colors.textAccent,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  resultTitleSmall: {
    fontSize: 22,
  },
  resultScore: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  resultMessage: {
    fontSize: Typography.sizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  resultMessageSmall: {
    fontSize: 14,
  },
});

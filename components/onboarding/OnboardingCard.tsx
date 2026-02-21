import { StyleSheet, View } from 'react-native';
import { BorderRadius, Colors, Shadows } from '../../constants/design';
import { OnboardingActions } from './OnboardingActions';
import { OnboardingContent } from './OnboardingContent';
import { OnboardingHeader } from './OnboardingHeader';
import { ProgressBar } from './ProgressBar';

interface OnboardingCardProps {
  currentStep?: number;
  totalSteps?: number;
  onNext?: () => void;
  buttonTitle?: string;
  children?: React.ReactNode;
}

export const OnboardingCard = ({
  currentStep = 1,
  totalSteps = 8,
  onNext,
  buttonTitle,
  children,
}: OnboardingCardProps) => {
  return (
    <View style={styles.card}>
      <OnboardingHeader />
      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
      {children || <OnboardingContent />}
      <OnboardingActions onNext={onNext} buttonTitle={buttonTitle} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    borderColor: Colors.borderCard,
    maxWidth: 768,
    width: '100%',
    maxHeight: 900,
    overflow: 'hidden',
    ...Shadows.card,
  },
});

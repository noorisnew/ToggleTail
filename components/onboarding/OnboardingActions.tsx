import { StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '../../constants/design';
import { Button } from './Button';

interface OnboardingActionsProps {
  onNext?: () => void;
  buttonTitle?: string;
  disabled?: boolean;
}

export const OnboardingActions = ({ 
  onNext, 
  buttonTitle = "Let's Get Started! 🚀",
  disabled = false 
}: OnboardingActionsProps) => {
  return (
    <View style={styles.container}>
      <Button 
        title={buttonTitle} 
        onPress={onNext} 
        disabled={disabled}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.xl,
    borderTopWidth: 2,
    borderTopColor: Colors.backgroundLight,
    gap: Spacing.lg,
  },
});

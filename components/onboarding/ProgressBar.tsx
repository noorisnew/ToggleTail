import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/design';

interface ProgressBarProps {
  currentStep?: number;
  totalSteps?: number;
}

export const ProgressBar = ({ currentStep = 1, totalSteps = 8 }: ProgressBarProps) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.trackContainer}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
      </View>
      <Text style={styles.stepText}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  trackContainer: {
    width: '100%',
  },
  track: {
    height: 12,
    backgroundColor: '#f3e8ff', // violet-100
    borderRadius: 9999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primaryStart,
    borderRadius: 9999,
  },
  stepText: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});

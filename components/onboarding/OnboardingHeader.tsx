import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/design';
import { Logo } from './Logo';

export const OnboardingHeader = () => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Logo />
      </View>
      <Text style={styles.subtitle}>
        Set up your child's reading adventure
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.sizes.small,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
});

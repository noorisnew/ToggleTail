import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/design';

interface ButtonProps {
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Button = ({ 
  title = "Let's Get Started! 🚀", 
  onPress, 
  disabled = false,
  style 
}: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, disabled && styles.disabled, style]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[Colors.primaryStart, Colors.primaryEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 56,
    borderRadius: BorderRadius.button,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  text: {
    color: Colors.textLight,
    fontSize: Typography.sizes.button,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

import React from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface KeyboardAwareViewProps {
  children: React.ReactNode;
  style?: object;
  scrollable?: boolean;
  contentContainerStyle?: object;
}

/**
 * KeyboardAwareView - A wrapper component that handles keyboard behavior on iOS/Android
 * 
 * Features:
 * - Dismisses keyboard when tapping outside input fields
 * - Adjusts view position when keyboard appears (KeyboardAvoidingView)
 * - Optional scrollable content
 */
export function KeyboardAwareView({
  children,
  style,
  scrollable = false,
  contentContainerStyle,
}: KeyboardAwareViewProps) {
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, style]}>{children}</View>
  );

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {content}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default KeyboardAwareView;
